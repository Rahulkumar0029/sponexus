import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import {
  PAYMENT_GATEWAY,
  PAYMENT_STATUS,
  SUBSCRIPTION_SOURCE,
  SUBSCRIPTION_STATUS,
} from "@/lib/subscription/constants";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";
import { addDays, getSubscriptionRenewalBaseDate } from "@/lib/subscription/date";
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewedEmail,
} from "@/lib/email/subscription";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token =
      request.cookies.get("token")?.value ||
      request.cookies.get("auth-token")?.value ||
      request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      planCode,
      gateway = PAYMENT_GATEWAY.MANUAL,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      paymentStatus,
      invoiceNumber,
      notes,
    }: {
      planCode?: string;
      gateway?: string;
      gatewayOrderId?: string;
      gatewayPaymentId?: string;
      gatewaySignature?: string;
      paymentStatus?: string;
      invoiceNumber?: string;
      notes?: string;
    } = body || {};

    if (!planCode || typeof planCode !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid plan code is required." },
        { status: 400 }
      );
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (isAdminBypass(user)) {
      return NextResponse.json(
        { success: false, message: "Admins do not need payment verification." },
        { status: 400 }
      );
    }

    const plan = await Plan.findOne({
      code: planCode.trim().toUpperCase(),
      isActive: true,
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, message: "Selected plan not found or inactive." },
        { status: 404 }
      );
    }

    if (plan.role !== user.role) {
      return NextResponse.json(
        { success: false, message: "This plan does not match your account role." },
        { status: 400 }
      );
    }

    const normalizedGateway =
      gateway === PAYMENT_GATEWAY.RAZORPAY ||
      gateway === PAYMENT_GATEWAY.CASHFREE
        ? gateway
        : PAYMENT_GATEWAY.MANUAL;

    const normalizedPaymentStatus =
      paymentStatus === PAYMENT_STATUS.SUCCESS
        ? PAYMENT_STATUS.SUCCESS
        : paymentStatus === PAYMENT_STATUS.FAILED
        ? PAYMENT_STATUS.FAILED
        : paymentStatus === PAYMENT_STATUS.PENDING
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.SUCCESS;

    const existingSubscription = await Subscription.findOne({
      userId: user._id,
      role: user.role,
    }).sort({ endDate: -1, createdAt: -1 });

    const payment = await PaymentTransaction.create({
      userId: user._id,
      subscriptionId: existingSubscription?._id || null,
      planId: plan._id,
      role: user.role,
      amount: plan.price,
      currency: plan.currency,
      status: normalizedPaymentStatus,
      gateway: normalizedGateway,
      gatewayOrderId: gatewayOrderId || "",
      gatewayPaymentId: gatewayPaymentId || "",
      gatewaySignature: gatewaySignature || "",
      invoiceNumber: invoiceNumber || "",
      notes:
        typeof notes === "string" && notes.trim()
          ? notes.trim()
          : "Payment verification recorded by system.",
      paidAt: normalizedPaymentStatus === PAYMENT_STATUS.SUCCESS ? new Date() : null,
      method:
        normalizedGateway === PAYMENT_GATEWAY.MANUAL
          ? "manual-verification"
          : "gateway-verification",
    });

    if (normalizedPaymentStatus !== PAYMENT_STATUS.SUCCESS) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment verification failed or is pending.",
          payment,
        },
        { status: 400 }
      );
    }

    let subscription;
    let isRenewal = false;

    if (existingSubscription) {
      isRenewal = true;

      const renewalBaseDate = getSubscriptionRenewalBaseDate(
        existingSubscription.endDate
      );

      existingSubscription.planId = plan._id;
      existingSubscription.status = SUBSCRIPTION_STATUS.ACTIVE;
      existingSubscription.startDate = new Date();
      existingSubscription.endDate = addDays(
        renewalBaseDate,
        plan.durationInDays
      );
      existingSubscription.graceEndDate = null;
      existingSubscription.autoRenew = false;
      existingSubscription.renewalCount =
        (existingSubscription.renewalCount || 0) + 1;
      existingSubscription.source = SUBSCRIPTION_SOURCE.GATEWAY;
      existingSubscription.lastPaymentId = payment._id;
      existingSubscription.notes = "Subscription verified through payment route.";

      subscription = await existingSubscription.save();
    } else {
      const startDate = new Date();
      const endDate = addDays(startDate, plan.durationInDays);

      subscription = await Subscription.create({
        userId: user._id,
        role: user.role,
        planId: plan._id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        startDate,
        endDate,
        graceEndDate: null,
        autoRenew: false,
        renewalCount: 0,
        source: SUBSCRIPTION_SOURCE.GATEWAY,
        lastPaymentId: payment._id,
        notes: "Subscription created through payment verification route.",
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
      console.error("Payment verification email send error:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: isRenewal
        ? "Payment verified and subscription renewed successfully."
        : "Payment verified and subscription activated successfully.",
      payment,
      subscription,
      plan,
    });
  } catch (error) {
    console.error("POST /api/payments/verify error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to verify payment." },
      { status: 500 }
    );
  }
}