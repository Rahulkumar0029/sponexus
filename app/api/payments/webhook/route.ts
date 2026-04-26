import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import WebhookEvent from "@/lib/models/WebhookEvent";
import User from "@/lib/models/User";

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

export const runtime = "nodejs";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function getWebhookSecret() {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }

  return secret;
}

function verifyWebhookSignature(rawBody: string, signature: string) {
  try {
    const expected = crypto
      .createHmac("sha256", getWebhookSecret())
      .update(rawBody)
      .digest("hex");

    if (expected.length !== signature.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let webhookEvent: any = null;

  try {
    await connectDB();

    const signature =
      request.headers.get("x-razorpay-signature")?.trim() || "";

    const eventId =
      request.headers.get("x-razorpay-event-id")?.trim() || "";

    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    const event =
      typeof payload?.event === "string" ? payload.event.trim() : "";

    const paymentEntity = payload?.payload?.payment?.entity || null;
    const orderEntity = payload?.payload?.order?.entity || null;

    const gatewayPaymentId =
      typeof paymentEntity?.id === "string" ? paymentEntity.id.trim() : "";

    const gatewayOrderId =
      typeof paymentEntity?.order_id === "string"
        ? paymentEntity.order_id.trim()
        : typeof orderEntity?.id === "string"
        ? orderEntity.id.trim()
        : "";

    if (eventId) {
      const existing = await WebhookEvent.findOne({
        provider: "RAZORPAY",
        eventId,
      });

      if (existing) {
        return buildNoStoreResponse({ success: true }, 200);
      }
    }

    webhookEvent = await WebhookEvent.create({
      provider: "RAZORPAY",
      eventId: eventId || null,
      eventType: event || "unknown",
      externalPaymentId: gatewayPaymentId || null,
      externalOrderId: gatewayOrderId || null,
      signaturePresent: Boolean(signature),
      signatureVerified: false,
      processingStatus: "RECEIVED",
      payload,
      headers: Object.fromEntries(request.headers.entries()),
    });

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      webhookEvent.processingStatus = "FAILED";
      webhookEvent.processingError = "Invalid signature";
      await webhookEvent.save();

      return buildNoStoreResponse(
        { success: false, message: "Invalid signature." },
        400
      );
    }

    webhookEvent.signatureVerified = true;

    let payment = null;

    if (gatewayPaymentId) {
      payment = await PaymentTransaction.findOne({
        gatewayPaymentId,
      }).select(
        "+gatewayResponse +gatewaySignature +failureReason +refundReason +notes"
      );
    }

    if (!payment && gatewayOrderId) {
      payment = await PaymentTransaction.findOne({
        gatewayOrderId,
      }).select(
        "+gatewayResponse +gatewaySignature +failureReason +refundReason +notes"
      );
    }

    if (!payment) {
      webhookEvent.processingStatus = "IGNORED";
      webhookEvent.processingError = "Payment transaction not found";
      await webhookEvent.save();

      return buildNoStoreResponse({ success: true }, 200);
    }

    // 🔐 DUPLICATE PAYMENT ID PROTECTION (WEBHOOK LEVEL)
if (gatewayPaymentId) {
  const duplicate = await PaymentTransaction.findOne({
    gatewayPaymentId,
    _id: { $ne: payment._id },
  }).select("_id");

  if (duplicate) {
    webhookEvent.processingStatus = "FAILED";
    webhookEvent.processingError = "Duplicate gateway payment id detected";
    await webhookEvent.save();

    await markPaymentFailed({
      payment,
      status: "FLAGGED",
      verificationSource: PAYMENT_VERIFICATION_SOURCE.WEBHOOK,
      failureCode: "WEBHOOK_DUPLICATE_PAYMENT_ID",
      failureReason:
        "Duplicate Razorpay payment id detected via webhook.",
      gatewayStatus: "duplicate_payment_id",
      razorpayPaymentId: gatewayPaymentId,
    });

    if (payment.couponCode) {
      await failCouponRedemption({
        paymentTransactionId: payment._id,
        failureReason: "Duplicate payment id detected via webhook.",
        notes: "Coupon cancelled due to duplicate webhook payment id.",
      });
    }

    return buildNoStoreResponse({ success: true }, 200);
  }
}

    webhookEvent.paymentTransactionId = payment._id;

    if (payment.gateway !== "RAZORPAY") {
      webhookEvent.processingStatus = "IGNORED";
      webhookEvent.processingError = "Payment gateway is not Razorpay";
      await webhookEvent.save();

      return buildNoStoreResponse({ success: true }, 200);
    }

    if (payment.gatewayOrderId !== gatewayOrderId){
      webhookEvent.processingStatus = "FAILED";
      webhookEvent.processingError = "Gateway order mismatch";
      await webhookEvent.save();

      await markPaymentFailed({
        payment,
        status: "FLAGGED",
        verificationSource: PAYMENT_VERIFICATION_SOURCE.WEBHOOK,
        failureCode: "WEBHOOK_ORDER_MISMATCH",
        failureReason: "Webhook gateway order id does not match payment record.",
        gatewayStatus: "webhook_order_mismatch",
        razorpayPaymentId: gatewayPaymentId || null,
      });

      if (payment.couponCode) {
        await failCouponRedemption({
          paymentTransactionId: payment._id,
          failureReason: "Webhook gateway order mismatch.",
          notes:
            "Coupon redemption failed because webhook order id did not match payment record.",
        });
      }

      return buildNoStoreResponse({ success: true }, 200);
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      payment.isWebhookConfirmed = true;
      payment.webhookReceivedAt = payment.webhookReceivedAt || new Date();
      payment.webhookConfirmedAt = payment.webhookConfirmedAt || new Date();

     if (gatewayPaymentId) {
  payment.gatewayPaymentId = gatewayPaymentId;
}

      if (typeof paymentEntity?.status === "string") {
        payment.gatewayStatus = paymentEntity.status;
      }

      await payment.save();

      webhookEvent.processingStatus = "PROCESSED";
      await webhookEvent.save();

      return buildNoStoreResponse({ success: true }, 200);
    }

    if (event === "payment.failed") {
      await markPaymentFailed({
        payment,
        status: "FAILED",
        verificationSource: PAYMENT_VERIFICATION_SOURCE.WEBHOOK,
        failureCode:
          typeof paymentEntity?.error_code === "string"
            ? paymentEntity.error_code
            : "FAILED",
        failureReason:
          typeof paymentEntity?.error_description === "string"
            ? paymentEntity.error_description
            : "Webhook failed",
        gatewayStatus:
          typeof paymentEntity?.status === "string"
            ? paymentEntity.status
            : "failed",
        razorpayPaymentId: gatewayPaymentId || null,
      });

      if (payment.couponCode) {
        await failCouponRedemption({
          paymentTransactionId: payment._id,
          failureReason:
            typeof paymentEntity?.error_description === "string"
              ? paymentEntity.error_description
              : "Webhook failed",
          notes:
            "Coupon redemption failed because Razorpay webhook reported payment failure.",
        });
      }

      webhookEvent.processingStatus = "PROCESSED";
      await webhookEvent.save();

      return buildNoStoreResponse({ success: true }, 200);
    }

    if (event === "payment.captured") {
      const result = await finalizeSuccessfulPayment({
        payment,
        verificationSource: PAYMENT_VERIFICATION_SOURCE.WEBHOOK,
        razorpayPaymentId: gatewayPaymentId || null,
        webhookConfirmed: true,
        gatewayStatus:
          typeof paymentEntity?.status === "string"
            ? paymentEntity.status
            : "paid",
      });

      if (payment.couponCode) {
        await completeCouponRedemption({
          paymentTransactionId: payment._id,
          notes: result.alreadyProcessed
            ? "Coupon redemption already linked to successful webhook confirmation."
            : "Coupon redemption completed after successful Razorpay webhook.",
        });
      }

      webhookEvent.processingStatus = "PROCESSED";
      await webhookEvent.save();

      const paymentPlanName =
        typeof payment.planSnapshot?.name === "string" &&
        payment.planSnapshot.name.trim()
          ? payment.planSnapshot.name.trim()
          : null;

      const user = await User.findById(payment.userId).select(
        "_id email firstName name companyName"
      );

      if (
        user?.email &&
        paymentPlanName &&
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
              planName: paymentPlanName,
              amount: payment.amount,
              startDate: result.subscription.startDate,
              endDate: result.subscription.endDate,
            });
          } else {
            await sendSubscriptionActivatedEmail({
              to: user.email,
              name: displayName,
              planName: paymentPlanName,
              amount: payment.amount,
              startDate: result.subscription.startDate,
              endDate: result.subscription.endDate,
            });
          }
        } catch (emailError) {
          console.error("Webhook email error:", emailError);
        }
      }

      return buildNoStoreResponse({ success: true }, 200);
    }

    webhookEvent.processingStatus = "IGNORED";
    webhookEvent.processingError = `Unhandled event: ${event || "unknown"}`;
    await webhookEvent.save();

    return buildNoStoreResponse({ success: true }, 200);
  } catch (error: any) {
    console.error("Webhook error:", error);

    if (webhookEvent) {
      webhookEvent.processingStatus = "FAILED";
      webhookEvent.processingError = error?.message || "Webhook failed";
      await webhookEvent.save();
    }

    return buildNoStoreResponse(
      { success: false, message: "Webhook failed." },
      500
    );
  }
}