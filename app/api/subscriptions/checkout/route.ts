import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import User from "@/lib/models/User";
import {
  PAYMENT_GATEWAY,
  PAYMENT_STATUS,
  SUBSCRIPTION_SOURCE,
  SUBSCRIPTION_STATUS,
} from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewedEmail,
} from "@/lib/email/subscription";

const MAX_PLAN_CODE_LENGTH = 50;

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

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

function sanitizePlan(plan: any) {
  return {
    _id: String(plan._id),
    code: plan.code,
    name: plan.name,
    role: plan.role,
    price: plan.price,
    currency: plan.currency,
    durationInDays: plan.durationInDays,
    isActive: plan.isActive,
  };
}

function sanitizePayment(payment: any) {
  return {
    _id: String(payment._id),
    userId: String(payment.userId),
    subscriptionId: payment.subscriptionId ? String(payment.subscriptionId) : null,
    planId: payment.planId ? String(payment.planId) : null,
    role: payment.role,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    gateway: payment.gateway,
    method: payment.method,
    paidAt: payment.paidAt || null,
    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
  };
}

function sanitizeSubscription(subscription: any) {
  return {
    _id: String(subscription._id),
    userId: String(subscription.userId),
    role: subscription.role,
    planId: subscription.planId ? String(subscription.planId) : null,
    status: subscription.status,
    startDate: subscription.startDate || null,
    endDate: subscription.endDate || null,
    graceEndDate: subscription.graceEndDate || null,
    autoRenew: Boolean(subscription.autoRenew),
    renewalCount: subscription.renewalCount || 0,
    source: subscription.source,
    lastPaymentId: subscription.lastPaymentId
      ? String(subscription.lastPaymentId)
      : null,
    createdAt: subscription.createdAt || null,
    updatedAt: subscription.updatedAt || null,
  };
}

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
    const rawPlanCode = typeof body.planCode === "string" ? body.planCode.trim() : "";
    const planCode = rawPlanCode.toUpperCase();

    if (!planCode) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Valid plan code is required.",
        },
        400
      );
    }

    if (planCode.length > MAX_PLAN_CODE_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Plan code is too long.",
        },
        400
      );
    }

    const user = await User.findById(decoded.userId).select(
      "_id email role adminRole firstName name companyName accountStatus"
    );

    if (!user) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "User not found.",
        },
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
      code: planCode,
      isActive: true,
    }).select("_id code name role price currency durationInDays isActive");

    if (!plan) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Selected plan not found or inactive.",
        },
        404
      );
    }

    if (plan.role !== user.role) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "This plan does not match your account role.",
        },
        400
      );
    }

    const now = new Date();

    const existingSubscription = await Subscription.findOne({
      userId: user._id,
      role: user.role,
    }).sort({ endDate: -1, createdAt: -1 });

    const allowManualActivation =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_MANUAL_SUBSCRIPTION_CHECKOUT === "true";

    if (!allowManualActivation) {
      const pendingPayment = await PaymentTransaction.create({
        userId: user._id,
        subscriptionId: existingSubscription?._id || null,
        planId: plan._id,
        role: user.role,
        amount: plan.price,
        currency: plan.currency,
        status: PAYMENT_STATUS.PENDING,
        gateway: PAYMENT_GATEWAY.MANUAL,
        method: "manual-checkout-request",
        paidAt: null,
        notes:
          "Pending checkout request created. Subscription activation must happen only after verified payment confirmation.",
      });

      return buildNoStoreResponse(
        {
          success: true,
          message:
            "Checkout request created. Subscription will activate only after verified payment confirmation.",
          requiresVerification: true,
          payment: sanitizePayment(pendingPayment),
          subscription: existingSubscription
            ? sanitizeSubscription(existingSubscription)
            : null,
          plan: sanitizePlan(plan),
        },
        202
      );
    }

    const payment = await PaymentTransaction.create({
      userId: user._id,
      subscriptionId: existingSubscription?._id || null,
      planId: plan._id,
      role: user.role,
      amount: plan.price,
      currency: plan.currency,
      status: PAYMENT_STATUS.SUCCESS,
      gateway: PAYMENT_GATEWAY.MANUAL,
      method: "manual-initial-checkout",
      paidAt: now,
      notes: "Manual subscription checkout recorded in non-production test mode.",
    });

    let subscription;
    let isRenewal = false;

    const renewableStatuses: string[] = [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.GRACE,
      SUBSCRIPTION_STATUS.EXPIRED,
      SUBSCRIPTION_STATUS.CANCELLED,
    ];

    if (
      existingSubscription &&
      renewableStatuses.includes(existingSubscription.status)
    ) {
      isRenewal = true;

      const baseStartDate =
        existingSubscription.endDate &&
        new Date(existingSubscription.endDate) > now
          ? new Date(existingSubscription.endDate)
          : now;

      const newEndDate = addDays(baseStartDate, plan.durationInDays);

      existingSubscription.planId = plan._id;
      existingSubscription.status = SUBSCRIPTION_STATUS.ACTIVE;
      existingSubscription.startDate = now;
      existingSubscription.endDate = newEndDate;
      existingSubscription.graceEndDate = null;
      existingSubscription.autoRenew = false;
      existingSubscription.renewalCount =
        (existingSubscription.renewalCount || 0) + 1;
      existingSubscription.source = SUBSCRIPTION_SOURCE.MANUAL;
      existingSubscription.lastPaymentId = payment._id;
      existingSubscription.notes =
        "Subscription renewed through checkout route in non-production test mode.";

      subscription = await existingSubscription.save();
    } else {
      const endDate = addDays(now, plan.durationInDays);

      subscription = await Subscription.create({
        userId: user._id,
        role: user.role,
        planId: plan._id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        startDate: now,
        endDate,
        graceEndDate: null,
        autoRenew: false,
        renewalCount: 0,
        source: SUBSCRIPTION_SOURCE.MANUAL,
        lastPaymentId: payment._id,
        notes:
          "Subscription created through checkout route in non-production test mode.",
      });
    }

    payment.subscriptionId = subscription._id;
    await payment.save();

    const displayName =
      user.firstName?.trim() ||
      user.name?.trim() ||
      user.companyName?.trim() ||
      "User";

    try {
      if (isRenewal) {
        await sendSubscriptionRenewedEmail({
          to: user.email,
          name: displayName,
          planName: plan.name,
          amount: plan.price,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        });
      } else {
        await sendSubscriptionActivatedEmail({
          to: user.email,
          name: displayName,
          planName: plan.name,
          amount: plan.price,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        });
      }
    } catch (emailError) {
      console.error("Subscription email send error:", emailError);
    }

    return buildNoStoreResponse(
      {
        success: true,
        message: isRenewal
          ? "Subscription renewed successfully."
          : "Subscription activated successfully.",
        payment: sanitizePayment(payment),
        subscription: sanitizeSubscription(subscription),
        plan: sanitizePlan(plan),
      },
      200
    );
  } catch (error) {
    console.error("POST /api/subscriptions/checkout error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to process subscription checkout.",
      },
      500
    );
  }
}