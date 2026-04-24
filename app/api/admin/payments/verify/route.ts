import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import User from "@/lib/models/User";
import {
  sanitizePayment,
  sanitizeSubscription,
} from "@/lib/payments/helpers";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import {
  completeCouponRedemption,
  failCouponRedemption,
} from "@/lib/payments/coupon";
import {
  finalizeSuccessfulPayment,
  markPaymentFailed,
} from "@/lib/payments/verify";
import {
  PAYMENT_STATUS,
  PAYMENT_VERIFICATION_SOURCE,
} from "@/lib/subscription/constants";
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewedEmail,
} from "@/lib/email/subscription";
import { safeLogAudit } from "@/lib/audit/log";
import { detectAndRecordSuspiciousPattern } from "@/lib/security/suspicious-patterns";

/* ===============================
   RESPONSE
=================================*/
function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

/* ===============================
   VERIFY PAYMENT
=================================*/
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Authentication required.",
        },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId || !decoded?.email) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid or expired session.",
        },
        401
      );
    }

    const body = await request.json();

    const checkoutAttemptId =
      typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";

    const razorpayOrderId =
      typeof body.razorpay_order_id === "string"
        ? body.razorpay_order_id.trim()
        : "";

    const razorpayPaymentId =
      typeof body.razorpay_payment_id === "string"
        ? body.razorpay_payment_id.trim()
        : "";

    const razorpaySignature =
      typeof body.razorpay_signature === "string"
        ? body.razorpay_signature.trim()
        : "";

    if (
      !checkoutAttemptId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      await safeLogAudit({
        actorId: decoded.userId,
        action: "PAYMENT_VERIFY_FAILED",
        entityType: "SYSTEM",
        entityId: null,
        severity: "WARN",
        request,
        metadata: {
          reason: "MISSING_REQUIRED_FIELDS",
          checkoutAttemptId: checkoutAttemptId || null,
          hasOrderId: Boolean(razorpayOrderId),
          hasPaymentId: Boolean(razorpayPaymentId),
          hasSignature: Boolean(razorpaySignature),
        },
      });

      await detectAndRecordSuspiciousPattern({
        request,
        userId: decoded.userId,
        title: "Missing payment verification fields",
        reason: "Required Razorpay verification fields missing.",
        securityEventType: "PAYMENT_VERIFY_FAILED",
        entityType: "SYSTEM",
        recentVerifyCount: 1,
        metadata: {
          checkoutAttemptId: checkoutAttemptId || null,
          hasOrderId: Boolean(razorpayOrderId),
          hasPaymentId: Boolean(razorpayPaymentId),
          hasSignature: Boolean(razorpaySignature),
        },
      });

      return buildNoStoreResponse(
        {
          success: false,
          message:
            "checkoutAttemptId, razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
        },
        400
      );
    }

    const payment = await PaymentTransaction.findOne({
      checkoutAttemptId,
      userId: decoded.userId,
    }).select(
      "+gatewaySignature +gatewayResponse +failureReason +refundReason +notes"
    );

    if (!payment) {
      await safeLogAudit({
        actorId: decoded.userId,
        action: "PAYMENT_VERIFY_FAILED",
        entityType: "SYSTEM",
        entityId: null,
        severity: "WARN",
        request,
        metadata: {
          reason: "PAYMENT_ATTEMPT_NOT_FOUND",
          checkoutAttemptId,
          razorpayOrderId,
          razorpayPaymentId,
        },
      });

      await detectAndRecordSuspiciousPattern({
        request,
        userId: decoded.userId,
        title: "Invalid checkout attempt",
        reason: "Payment attempt not found during verification.",
        securityEventType: "PAYMENT_VERIFY_FAILED",
        entityType: "SYSTEM",
        recentVerifyCount: 2,
        metadata: {
          checkoutAttemptId,
          razorpayOrderId,
          razorpayPaymentId,
        },
      });

      return buildNoStoreResponse(
        {
          success: false,
          message: "Payment attempt not found.",
        },
        404
      );
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS && payment.subscriptionId) {
      const { subscription } = await finalizeSuccessfulPayment({
        payment,
        verificationSource: PAYMENT_VERIFICATION_SOURCE.FRONTEND_VERIFY,
        razorpayPaymentId,
        razorpaySignature,
        gatewayStatus: "paid",
        webhookConfirmed: false,
      });

      if (payment.couponCode) {
        await completeCouponRedemption({
          paymentTransactionId: payment._id,
          notes:
            "Coupon redemption already linked to successful payment verification.",
        });
      }

      await safeLogAudit({
        actorId: payment.userId,
        action: "PAYMENT_VERIFIED_ALREADY_PROCESSED",
        entityType: "PAYMENT",
        entityId: payment._id,
        severity: "INFO",
        request,
        metadata: {
          checkoutAttemptId: payment.checkoutAttemptId,
          razorpayOrderId,
          razorpayPaymentId,
          transactionType: payment.transactionType,
          subscriptionId: payment.subscriptionId
            ? String(payment.subscriptionId)
            : null,
        },
      });

      return buildNoStoreResponse(
        {
          success: true,
          message: "Payment already verified and processed.",
          payment: sanitizePayment(payment),
          subscription: subscription ? sanitizeSubscription(subscription) : null,
          subscriptionActivated: true,
          alreadyProcessed: true,
        },
        200
      );
    }

    if (!payment.gatewayOrderId) {
      if (payment.couponCode) {
        await failCouponRedemption({
          paymentTransactionId: payment._id,
          failureReason: "Missing Razorpay order for payment verification.",
          notes:
            "Coupon redemption failed because no Razorpay order was linked.",
        });
      }

      await safeLogAudit({
        actorId: payment.userId,
        action: "PAYMENT_VERIFY_FAILED",
        entityType: "PAYMENT",
        entityId: payment._id,
        severity: "WARN",
        request,
        metadata: {
          reason: "MISSING_GATEWAY_ORDER_ID",
          checkoutAttemptId: payment.checkoutAttemptId,
          razorpayOrderId,
          razorpayPaymentId,
          couponCode: payment.couponCode || null,
        },
      });

      const fraud = await detectAndRecordSuspiciousPattern({
        request,
        userId: payment.userId,
        paymentId: payment._id,
        title: "Missing gateway order ID",
        reason: "Payment verification attempted without gatewayOrderId.",
        securityEventType: "PAYMENT_VERIFY_FAILED",
        entityType: "PAYMENT",
        entityId: payment._id,
        missingGatewayOrder: true,
        metadata: {
          checkoutAttemptId: payment.checkoutAttemptId,
          razorpayOrderId,
          razorpayPaymentId,
          couponCode: payment.couponCode || null,
        },
      });

      if (fraud.hardBlock) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Suspicious activity detected.",
          },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: false,
          message: "No Razorpay order is linked to this payment attempt.",
        },
        400
      );
    }

    if (payment.gatewayOrderId !== razorpayOrderId) {
      await markPaymentFailed({
        payment,
        status: "FAILED",
        verificationSource: PAYMENT_VERIFICATION_SOURCE.FRONTEND_VERIFY,
        failureCode: "ORDER_MISMATCH",
        failureReason: "Gateway order mismatch during payment verification.",
        notes: "Payment verification failed due to gateway order mismatch.",
        gatewayStatus: "order_mismatch",
        razorpayPaymentId,
        razorpaySignature,
      });

      if (payment.couponCode) {
        await failCouponRedemption({
          paymentTransactionId: payment._id,
          failureReason: "Gateway order mismatch during payment verification.",
          notes:
            "Coupon redemption failed because verify request had mismatched order id.",
        });
      }

      await safeLogAudit({
        actorId: payment.userId,
        action: "PAYMENT_VERIFY_FAILED",
        entityType: "PAYMENT",
        entityId: payment._id,
        severity: "WARN",
        request,
        metadata: {
          reason: "ORDER_MISMATCH",
          expectedGatewayOrderId: payment.gatewayOrderId,
          receivedGatewayOrderId: razorpayOrderId,
          razorpayPaymentId,
          couponCode: payment.couponCode || null,
        },
      });

      const fraud = await detectAndRecordSuspiciousPattern({
        request,
        userId: payment.userId,
        paymentId: payment._id,
        title: "Order mismatch detected",
        reason: "Razorpay order ID mismatch during verification.",
        securityEventType: "PAYMENT_ORDER_MISMATCH",
        entityType: "PAYMENT",
        entityId: payment._id,
        orderMismatch: true,
        metadata: {
          expectedGatewayOrderId: payment.gatewayOrderId,
          receivedGatewayOrderId: razorpayOrderId,
          razorpayPaymentId,
          couponCode: payment.couponCode || null,
        },
      });

      if (fraud.hardBlock) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Suspicious activity detected.",
          },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: false,
          message: "Gateway order mismatch.",
        },
        400
      );
    }

    const duplicatePaymentId = await PaymentTransaction.findOne({
      gatewayPaymentId: razorpayPaymentId,
      _id: { $ne: payment._id },
    }).select("_id");

    if (duplicatePaymentId) {
      await markPaymentFailed({
        payment,
        status: "FLAGGED",
        verificationSource: PAYMENT_VERIFICATION_SOURCE.FRONTEND_VERIFY,
        failureCode: "DUPLICATE_PAYMENT_ID",
        failureReason: "Duplicate Razorpay payment id detected.",
        notes:
          "Payment verification blocked due to duplicate gateway payment id.",
        gatewayStatus: "duplicate_payment_id",
        razorpayPaymentId,
        razorpaySignature,
      });

      if (payment.couponCode) {
        await failCouponRedemption({
          paymentTransactionId: payment._id,
          failureReason: "Duplicate Razorpay payment id detected.",
          notes:
            "Coupon redemption failed because payment was flagged as duplicate.",
        });
      }

      await safeLogAudit({
        actorId: payment.userId,
        action: "PAYMENT_DUPLICATE_BLOCKED",
        entityType: "PAYMENT",
        entityId: payment._id,
        severity: "CRITICAL",
        request,
        metadata: {
          reason: "DUPLICATE_GATEWAY_PAYMENT_ID",
          duplicatePaymentRecordId: String(duplicatePaymentId._id),
          razorpayPaymentId,
          razorpayOrderId,
          couponCode: payment.couponCode || null,
        },
      });

      const fraud = await detectAndRecordSuspiciousPattern({
        request,
        userId: payment.userId,
        paymentId: payment._id,
        title: "Duplicate payment ID detected",
        reason: "Same Razorpay payment ID used multiple times.",
        securityEventType: "PAYMENT_DUPLICATE_DETECTED",
        entityType: "PAYMENT",
        entityId: payment._id,
        duplicatePaymentDetected: true,
        recentVerifyCount: 3,
        metadata: {
          duplicatePaymentRecordId: String(duplicatePaymentId._id),
          razorpayPaymentId,
          razorpayOrderId,
          couponCode: payment.couponCode || null,
        },
      });

      if (fraud.hardBlock) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Fraud detected. Blocked.",
          },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: false,
          message: "Duplicate payment detected. Review required.",
        },
        409
      );
    }

    const isValidSignature = verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      await markPaymentFailed({
        payment,
        status: "FAILED",
        verificationSource: PAYMENT_VERIFICATION_SOURCE.FRONTEND_VERIFY,
        failureCode: "INVALID_SIGNATURE",
        failureReason: "Invalid Razorpay signature.",
        notes: "Payment verification failed due to invalid signature.",
        gatewayStatus: "invalid_signature",
        razorpayPaymentId,
        razorpaySignature,
      });

      if (payment.couponCode) {
        await failCouponRedemption({
          paymentTransactionId: payment._id,
          failureReason: "Invalid Razorpay signature.",
          notes:
            "Coupon redemption failed because payment signature verification failed.",
        });
      }

      await safeLogAudit({
        actorId: payment.userId,
        action: "PAYMENT_SIGNATURE_INVALID",
        entityType: "PAYMENT",
        entityId: payment._id,
        severity: "CRITICAL",
        request,
        metadata: {
          razorpayOrderId,
          razorpayPaymentId,
          checkoutAttemptId: payment.checkoutAttemptId,
          couponCode: payment.couponCode || null,
        },
      });

      const fraud = await detectAndRecordSuspiciousPattern({
        request,
        userId: payment.userId,
        paymentId: payment._id,
        title: "Invalid payment signature",
        reason: "Razorpay signature verification failed.",
        securityEventType: "PAYMENT_INVALID_SIGNATURE",
        entityType: "PAYMENT",
        entityId: payment._id,
        invalidSignature: true,
        recentFailureCount: 2,
        metadata: {
          razorpayOrderId,
          razorpayPaymentId,
          checkoutAttemptId: payment.checkoutAttemptId,
          couponCode: payment.couponCode || null,
        },
      });

      if (fraud.hardBlock) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Fraudulent request blocked.",
          },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: false,
          message: "Payment signature verification failed.",
        },
        400
      );
    }

    const result = await finalizeSuccessfulPayment({
      payment,
      verificationSource: PAYMENT_VERIFICATION_SOURCE.FRONTEND_VERIFY,
      razorpayPaymentId,
      razorpaySignature,
      gatewayStatus: "paid",
      webhookConfirmed: false,
    });

    if (payment.couponCode) {
      await completeCouponRedemption({
        paymentTransactionId: payment._id,
        notes:
          "Coupon redemption completed after successful payment verification.",
      });
    }

    await safeLogAudit({
      actorId: payment.userId,
      action: "PAYMENT_VERIFIED",
      entityType: "PAYMENT",
      entityId: payment._id,
      severity: "INFO",
      request,
      metadata: {
        checkoutAttemptId: payment.checkoutAttemptId,
        razorpayOrderId,
        razorpayPaymentId,
        transactionType: payment.transactionType,
        isRenewal: result.isRenewal,
        alreadyProcessed: result.alreadyProcessed,
        subscriptionId: result.subscription?._id
          ? String(result.subscription._id)
          : null,
        couponCode: payment.couponCode || null,
        finalAmount: payment.amount,
      },
    });

    const user = await User.findById(payment.userId).select(
      "_id email firstName name companyName"
    );

    if (
      user?.email &&
      payment.planSnapshot?.name &&
      result.subscription &&
      !result.alreadyProcessed
    ) {
      const displayName =
        user.firstName?.trim() ||
        user.name?.trim() ||
        user.companyName?.trim() ||
        "User";

      try {
        if (result.isRenewal) {
          await sendSubscriptionRenewedEmail({
            to: user.email,
            name: displayName,
            planName: payment.planSnapshot.name,
            amount: payment.amount,
            startDate: result.subscription.startDate,
            endDate: result.subscription.endDate,
          });
        } else {
          await sendSubscriptionActivatedEmail({
            to: user.email,
            name: displayName,
            planName: payment.planSnapshot.name,
            amount: payment.amount,
            startDate: result.subscription.startDate,
            endDate: result.subscription.endDate,
          });
        }
      } catch (emailError) {
        console.error("Subscription payment email send error:", emailError);
      }
    }

    return buildNoStoreResponse(
      {
        success: true,
        message: result.isRenewal
          ? "Subscription renewed successfully."
          : "Subscription activated successfully.",
        payment: sanitizePayment(result.payment),
        subscription: result.subscription
          ? sanitizeSubscription(result.subscription)
          : null,
        subscriptionActivated: true,
        alreadyProcessed: result.alreadyProcessed,
      },
      200
    );
  } catch (error) {
    console.error("POST /api/payments/verify error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to verify payment.",
      },
      500
    );
  }
}