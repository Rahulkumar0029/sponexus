import {
  handleIdempotency,
  generateRequestHash,
  storeIdempotencyResponse,
} from "@/lib/payments/idempotency";

import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import User from "@/lib/models/User";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";
import {
  buildCheckoutAttemptId,
  buildReceipt,
  isPlanAllowedForRole,
  sanitizePlan,
  sanitizePayment,
  sanitizeSubscription,
} from "@/lib/payments/helpers";
import { buildPlanSnapshot } from "@/lib/payments/plan-snapshot";
import {
  reserveCouponRedemption,
  releaseCouponRedemption,
} from "@/lib/payments/coupon";

import { validateCouponForPlan } from "@/lib/payments/coupon-engine";
import { safeLogAudit } from "@/lib/audit/log";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { rateLimit, buildRateLimitKey } from "@/lib/security/rate-limit";
import { detectAndRecordSuspiciousPattern } from "@/lib/security/suspicious-patterns";

export const runtime = "nodejs";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(request: NextRequest) {
  let idemRecord: any = null;
let reservedPayment: any = null;
let couponReservationShouldRelease = false;

  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId || !decoded?.email) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid or expired session." },
        401
      );
    }

    const rl = await rateLimit({
      key: buildRateLimitKey({
        request,
        userId: decoded.userId,
        route: "subscription-checkout",
      }),
      limit: 10,
      windowMs: 60 * 1000,
    });

    if (!rl.allowed) {
      await detectAndRecordSuspiciousPattern({
        request,
        userId: decoded.userId,
        title: "Checkout spam detected",
        reason: "Too many checkout attempts in a short time.",
        securityEventType: "PAYMENT_CREATE_ORDER_ABUSE",
        entityType: "PAYMENT",
        recentCreateOrderCount: 10,
      });

      return buildNoStoreResponse(
        { success: false, message: "Too many checkout attempts. Try later." },
        429
      );
    }

    const body = await request.json();

    const rawPlanId =
      typeof body.planId === "string" ? body.planId.trim() : "";

    const rawCouponCode =
      typeof body.couponCode === "string" ? body.couponCode.trim() : "";

    if (!rawPlanId || !mongoose.Types.ObjectId.isValid(rawPlanId)) {
      return buildNoStoreResponse(
        { success: false, message: "Valid planId is required." },
        400
      );
    }

    const idempotencyKey = request.headers.get("x-idempotency-key") || "";

    if (!idempotencyKey) {
      return buildNoStoreResponse(
        { success: false, message: "Missing idempotency key." },
        400
      );
    }

    const requestHash = generateRequestHash(body);

    const idem = await handleIdempotency({
      key: idempotencyKey,
      userId: decoded.userId,
      endpoint: "subscription-checkout",
      requestHash,
    });

   if (idem.isLocked) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "Checkout is already processing. Please wait.",
    },
    409
  );
}

    idemRecord = idem.record ?? null;

    const user = await User.findById(decoded.userId).select(
      "_id email role adminRole firstName name companyName accountStatus isDeleted"
    );

    if (!user || user.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "User not found." },
        404
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Your account is not allowed to purchase a subscription.",
        },
        403
      );
    }

    if (user.role !== "ORGANIZER" && user.role !== "SPONSOR") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Only organizers and sponsors can purchase subscriptions.",
        },
        403
      );
    }

    if (isAdminBypass(user)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Admins do not need to purchase a subscription.",
        },
        400
      );
    }

    const plan = await Plan.findOne({
      _id: rawPlanId,
      isActive: true,
      isArchived: false,
      isVisible: true,
    }).select(
      "_id code name role price currency interval durationInDays extraDays postingLimitPerDay dealRequestLimitPerDay canPublish canContact canUseMatch canRevealContact budgetMin budgetMax features limits isActive isArchived isVisible visibleToRoles visibleToLoggedOut sortOrder metadata"
    );

    if (!plan) {
      return buildNoStoreResponse(
        { success: false, message: "Selected plan not found or inactive." },
        404
      );
    }

    if (
      typeof plan.price !== "number" ||
      !Number.isFinite(plan.price) ||
      plan.price < 0
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid plan configuration." },
        500
      );
    }

    if (!isPlanAllowedForRole(plan.role, user.role)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "This plan does not match your account role.",
        },
        400
      );
    }

    const latestSubscription = await Subscription.findOne({
      userId: user._id,
      role: user.role,
    }).sort({ endDate: -1, createdAt: -1 });

    const isRenewal =
      !!latestSubscription &&
      ["ACTIVE", "GRACE", "EXPIRED", "CANCELLED"].includes(
        latestSubscription.status
      );

    const existingOpenTransaction = await PaymentTransaction.findOne({
      userId: user._id,
      role: user.role,
      planId: plan._id,
      transactionType: isRenewal ? "RENEWAL" : "NEW_SUBSCRIPTION",
      status: { $in: ["CREATED", "PENDING"] },
    }).sort({ createdAt: -1 });

    if (existingOpenTransaction) {
      await detectAndRecordSuspiciousPattern({
        request,
        userId: user._id,
        paymentId: existingOpenTransaction._id,
        title: "Repeated checkout attempt",
        reason: "User already has an open checkout attempt.",
        securityEventType: "PAYMENT_CREATE_ORDER_ABUSE",
        entityType: "PAYMENT",
        recentCheckoutCount: 2,
      });

      const existingResponse = {
        success: true,
        message: "An existing checkout attempt is already pending.",
        requiresPayment: true,
        payment: sanitizePayment(existingOpenTransaction),
        subscription: latestSubscription
          ? sanitizeSubscription(latestSubscription)
          : null,
        plan: sanitizePlan(plan),
        checkout: {
          checkoutAttemptId: existingOpenTransaction.checkoutAttemptId,
          receipt: existingOpenTransaction.receipt,
          transactionType: existingOpenTransaction.transactionType,
        },
        gateway: {
          provider: "RAZORPAY",
          keyId:
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            process.env.RAZORPAY_KEY_ID ||
            "",
          orderCreated: Boolean(existingOpenTransaction.gatewayOrderId),
          order: existingOpenTransaction.gatewayOrderId
            ? {
                id: existingOpenTransaction.gatewayOrderId,
                amount: Math.round(
                  Number(existingOpenTransaction.amount || 0) * 100
                ),
                currency: existingOpenTransaction.currency,
                receipt: existingOpenTransaction.receipt ?? null,
                status: existingOpenTransaction.gatewayStatus ?? null,
              }
            : null,
        },
      };

      if (idemRecord) {
        await storeIdempotencyResponse({
          record: idemRecord,
          response: existingResponse,
          statusCode: 200,
        });
      }

      return buildNoStoreResponse(existingResponse, 200);
    }

    let amountBeforeDiscount = Number(plan.price) || 0;
    let couponCode: string | null = null;
    let couponDiscountAmount: number | null = null;
    let finalAmount = Number(plan.price) || 0;
    let validatedCoupon: Awaited<ReturnType<typeof validateCouponForPlan>> | null =
  null;

    if (rawCouponCode) {
      validatedCoupon = await validateCouponForPlan({
  code: rawCouponCode,
  userId: String(user._id),
  role: user.role,
  planId: String(plan._id),
  amountBeforeDiscount: Number(plan.price),
});

      if (!validatedCoupon.valid) {
        await safeLogAudit({
          actorId: user._id,
          action: "SUBSCRIPTION_CHECKOUT_COUPON_REJECTED",
          entityType: "PLAN",
          entityId: plan._id,
          severity: "WARN",
          request,
          metadata: {
            userRole: user.role,
            couponCodeAttempted: rawCouponCode.toUpperCase(),
            reason: validatedCoupon.message,
            transactionType: isRenewal ? "RENEWAL" : "NEW_SUBSCRIPTION",
            planCode: plan.code,
            planName: plan.name,
            baseAmount: Number(plan.price),
          },
        });

        await detectAndRecordSuspiciousPattern({
          request,
          userId: user._id,
          title: "Coupon abuse during checkout",
          reason: validatedCoupon.message || "Invalid coupon used.",
          securityEventType: "COUPON_ABUSE",
          entityType: "COUPON",
          recentFailureCount: 1,
          couponAbusePattern: true,
          metadata: {
            code: rawCouponCode.toUpperCase(),
            planId: String(plan._id),
          },
        });

        return buildNoStoreResponse(
          { success: false, message: validatedCoupon.message },
          400
        );
      }

      amountBeforeDiscount = validatedCoupon.pricing.amountBeforeDiscount;
couponDiscountAmount = validatedCoupon.pricing.discountAmount;
finalAmount = validatedCoupon.pricing.finalAmount;
couponCode = validatedCoupon.coupon.code;
    }

    if (
      !Number.isFinite(finalAmount) ||
      finalAmount < 0 ||
      finalAmount > amountBeforeDiscount
    ) {
      await detectAndRecordSuspiciousPattern({
        request,
        userId: user._id,
        title: "Invalid checkout amount",
        reason: "Final amount is invalid or greater than original amount.",
        securityEventType: "PAYMENT_INVALID_AMOUNT",
        entityType: "PAYMENT",
        invalidAmount: true,
        metadata: {
          amountBeforeDiscount,
          finalAmount,
          planId: String(plan._id),
        },
      });

      return buildNoStoreResponse(
        { success: false, message: "Invalid payment amount." },
        400
      );
    }

    const checkoutAttemptId = buildCheckoutAttemptId("chk");
    const receipt = buildReceipt("rcpt");
    const planSnapshot = buildPlanSnapshot(plan);

    const payment = await PaymentTransaction.create({
      userId: user._id,
      subscriptionId: latestSubscription?._id || null,
      renewalOfSubscriptionId: isRenewal
        ? latestSubscription?._id || null
        : null,
      planId: plan._id,
      planSnapshot,
      role: user.role,
      transactionType: isRenewal ? "RENEWAL" : "NEW_SUBSCRIPTION",
      checkoutAttemptId,
      receipt,
      amountBeforeDiscount,
      couponCode,
      couponDiscountAmount,
      amount: finalAmount,
      currency: plan.currency,
      status: "CREATED",
      gateway: "RAZORPAY",
      method: "subscription-checkout-init",
      gatewayOrderId: null,
      gatewayPaymentId: null,
      gatewaySignature: null,
      gatewayStatus: null,
      verificationSource: null,
      verifiedAt: null,
      paidAt: null,
      processedAt: null,
      webhookReceivedAt: null,
      webhookConfirmedAt: null,
      isWebhookConfirmed: false,
      fraudFlagged: false,
      notes:
        "Checkout attempt created. Subscription activation must happen only after verified payment.",
    });

    reservedPayment = payment;

    if (validatedCoupon?.valid) {
      const couponType = validatedCoupon.coupon.type;
      const couponValue = validatedCoupon.coupon.value;

      if (
        !couponType ||
        (couponType !== "PERCENTAGE" && couponType !== "FLAT") ||
        typeof couponValue !== "number"
      ) {
        return buildNoStoreResponse(
          { success: false, message: "Coupon configuration is invalid." },
          400
        );
      }

      await reserveCouponRedemption({
       couponId: new mongoose.Types.ObjectId(validatedCoupon.coupon.id),
        paymentTransactionId: payment._id,
        userId: user._id,
        planId: plan._id,
        role: user.role,
        codeSnapshot: validatedCoupon.coupon.code,
        discountType: couponType,
        discountValue: couponValue,
        amountBeforeDiscount: validatedCoupon.pricing.amountBeforeDiscount,
discountAmount: validatedCoupon.pricing.discountAmount,
finalAmount: validatedCoupon.pricing.finalAmount,
      });
      couponReservationShouldRelease = true;
    }

    let razorpayOrder: any;

    try {
      razorpayOrder = await createRazorpayOrder({
        amountInRupees: finalAmount,
        receipt,
        notes: {
          userId: String(user._id),
          planId: String(plan._id),
          checkoutAttemptId,
        },
      });
    } catch (razorpayError) {
      if (couponCode && reservedPayment?._id) {
        try {
          await releaseCouponRedemption({
            paymentTransactionId: reservedPayment._id,
            notes:
              "Coupon reservation released because Razorpay order creation failed.",
          });
        } catch (releaseError) {
          console.error(
            "Coupon release after Razorpay order failure error:",
            releaseError
          );
        }
      }

      payment.status = "MANUAL_REVIEW";
      payment.failureCode = "RAZORPAY_ORDER_CREATE_FAILED";
      payment.failureReason = "Failed to create Razorpay order.";
      payment.gatewayStatus = "order_create_failed";
      payment.notes = "Checkout failed during Razorpay order creation.";
      payment.processedAt = new Date();
      await payment.save();
      payment.status = "PENDING";

      await detectAndRecordSuspiciousPattern({
        request,
        userId: user._id,
        paymentId: payment._id,
        title: "Razorpay order creation failed",
        reason: "Gateway order creation failed during subscription checkout.",
        securityEventType: "PAYMENT_VERIFY_FAILED",
        entityType: "PAYMENT",
      });

      throw razorpayError;
    }

    payment.gatewayOrderId = razorpayOrder.id;
    payment.gatewayStatus = razorpayOrder.status || "created";
    payment.gatewayResponse = razorpayOrder;
    payment.status = "PENDING";
    payment.notes = "Checkout + Razorpay order created successfully.";
    await payment.save();
    couponReservationShouldRelease = false;

    await safeLogAudit({
      actorId: user._id,
      action: isRenewal
        ? "SUBSCRIPTION_RENEWAL_CHECKOUT_CREATED"
        : "SUBSCRIPTION_CHECKOUT_CREATED",
      entityType: "PAYMENT",
      entityId: payment._id,
      severity: "INFO",
      request,
      metadata: {
        transactionType: payment.transactionType,
        role: user.role,
        planId: String(plan._id),
        planCode: plan.code,
        planName: plan.name,
        subscriptionId: latestSubscription?._id
          ? String(latestSubscription._id)
          : null,
        checkoutAttemptId,
        receipt,
        amountBeforeDiscount,
        couponCode,
        couponDiscountAmount,
        finalAmount,
        gateway: "RAZORPAY",
        gatewayOrderId: razorpayOrder.id,
      },
    });

    const responseBody = {
      success: true,
      message: "Checkout + Razorpay order created successfully.",
      requiresPayment: true,
      payment: sanitizePayment(payment),
      subscription: latestSubscription
        ? sanitizeSubscription(latestSubscription)
        : null,
      plan: sanitizePlan(plan),
      checkout: {
        checkoutAttemptId,
        receipt,
        transactionType: payment.transactionType,
      },
      coupon: couponCode
        ? {
            code: couponCode,
            discountAmount: couponDiscountAmount,
            amountBeforeDiscount,
            finalAmount,
          }
        : null,
      gateway: {
        provider: "RAZORPAY",
        orderCreated: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
          status: razorpayOrder.status,
        },
      },
      nextStep: "Open Razorpay checkout and complete payment.",
    };

    if (idemRecord) {
      await storeIdempotencyResponse({
        record: idemRecord,
        response: responseBody,
        statusCode: 201,
      });
    }

    return buildNoStoreResponse(responseBody, 201);
 } catch (error) {
  console.error("POST /api/subscriptions/checkout error:", error);

if (couponReservationShouldRelease && reservedPayment?._id) {
    try {
      await releaseCouponRedemption({
        paymentTransactionId: reservedPayment._id,
        notes: "Coupon reservation released because checkout failed.",
      });
    } catch (releaseError) {
      console.error("Coupon release after checkout failure error:", releaseError);
    }
  }
    if (idemRecord) {
      try {
        idemRecord.locked = false;
        await idemRecord.save();
      } catch (unlockError) {
        console.error("Idempotency unlock error:", unlockError);
      }
    }

    return buildNoStoreResponse(
      { success: false, message: "Failed to process subscription checkout." },
      500
    );
  }
}