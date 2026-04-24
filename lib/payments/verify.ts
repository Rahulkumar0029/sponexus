import Subscription from "@/lib/models/Subscription";
import {
  PAYMENT_STATUS,
  PAYMENT_VERIFICATION_SOURCE,
  SUBSCRIPTION_SOURCE,
  SUBSCRIPTION_STATUS,
} from "@/lib/subscription/constants";

type VerificationSource = "FRONTEND_VERIFY" | "WEBHOOK" | "ADMIN";

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}

export async function markPaymentFailed(params: {
  payment: any;
  status?: "FAILED" | "FLAGGED" | "MANUAL_REVIEW";
  verificationSource?: VerificationSource;
  failureCode?: string | null;
  failureReason?: string | null;
  notes?: string | null;
  gatewayStatus?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  markProcessed?: boolean;
}) {
  const {
    payment,
    status = "FAILED",
    verificationSource,
    failureCode = null,
    failureReason = null,
    notes = null,
    gatewayStatus = null,
    razorpayPaymentId = null,
    razorpaySignature = null,
    markProcessed = true,
  } = params;

  const now = new Date();

  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    return payment;
  }

  payment.status = status;

  if (verificationSource) {
    payment.verificationSource = verificationSource;
  }

  payment.failureCode = failureCode;
  payment.failureReason = failureReason;
  payment.gatewayStatus = gatewayStatus;
  payment.notes = notes || payment.notes || "";

  if (razorpayPaymentId) payment.gatewayPaymentId = razorpayPaymentId;
  if (razorpaySignature) payment.gatewaySignature = razorpaySignature;

  if (status === PAYMENT_STATUS.FLAGGED) {
    payment.fraudFlagged = true;
  }

  if (markProcessed) {
    payment.processedAt = payment.processedAt || now;
  }

  await payment.save();
  return payment;
}

export async function finalizeSuccessfulPayment(params: {
  payment: any;
  verificationSource: VerificationSource;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  gatewayStatus?: string | null;
  webhookConfirmed?: boolean;
}) {
  const {
    payment,
    verificationSource,
    razorpayPaymentId = null,
    razorpaySignature = null,
    gatewayStatus = "paid",
    webhookConfirmed = false,
  } = params;

  const now = new Date();

  if (payment.status === PAYMENT_STATUS.SUCCESS && payment.subscriptionId) {
    const existingSubscription = await Subscription.findById(
      payment.subscriptionId
    );

    if (webhookConfirmed) {
      payment.isWebhookConfirmed = true;
      payment.webhookReceivedAt = payment.webhookReceivedAt || now;
      payment.webhookConfirmedAt = payment.webhookConfirmedAt || now;
      payment.verificationSource =
        payment.verificationSource || PAYMENT_VERIFICATION_SOURCE.WEBHOOK;
      payment.gatewayStatus = gatewayStatus;
      await payment.save();
    }

    return {
      payment,
      subscription: existingSubscription,
      alreadyProcessed: true,
      isRenewal: payment.transactionType === "RENEWAL",
    };
  }

  if (
    [
      PAYMENT_STATUS.FAILED,
      PAYMENT_STATUS.REFUNDED,
      PAYMENT_STATUS.CANCELLED,
      PAYMENT_STATUS.EXPIRED,
      PAYMENT_STATUS.FLAGGED,
    ].includes(payment.status)
  ) {
    throw new Error(`Cannot finalize payment in ${payment.status} state.`);
  }

  if (
    typeof payment.amount !== "number" ||
    !Number.isFinite(payment.amount) ||
    payment.amount < 0
  ) {
    throw new Error("Invalid payment amount during finalization.");
  }

  const snapshot = payment.planSnapshot;

  if (!snapshot) {
    payment.status = PAYMENT_STATUS.MANUAL_REVIEW;
    payment.fraudFlagged = true;
    payment.failureCode = "MISSING_PLAN_SNAPSHOT";
    payment.failureReason =
      "Payment finalization blocked because plan snapshot is missing.";
    payment.notes = "Moved to manual review because plan snapshot is missing.";
    payment.processedAt = payment.processedAt || now;

    if (webhookConfirmed) {
      payment.isWebhookConfirmed = true;
      payment.webhookReceivedAt = payment.webhookReceivedAt || now;
      payment.webhookConfirmedAt = payment.webhookConfirmedAt || now;
    }

    await payment.save();
    throw new Error("Plan snapshot missing during payment finalization.");
  }

  const baseDurationInDays = Number(snapshot.durationInDays || 0);
  const extraDaysApplied = Number(snapshot.extraDays || 0);
  const totalDays = baseDurationInDays + extraDaysApplied;

  if (!Number.isFinite(totalDays) || totalDays < 1) {
    payment.status = PAYMENT_STATUS.MANUAL_REVIEW;
    payment.fraudFlagged = true;
    payment.failureCode = "INVALID_PLAN_DURATION";
    payment.failureReason = "Plan duration is invalid during finalization.";
    payment.notes = "Moved to manual review because plan duration is invalid.";
    payment.processedAt = payment.processedAt || now;
    await payment.save();

    throw new Error("Invalid plan duration during payment finalization.");
  }

  let subscription = null;
  let isRenewal = false;

  if (payment.transactionType === "RENEWAL") {
    isRenewal = true;

    const existingSubscription = payment.renewalOfSubscriptionId
      ? await Subscription.findById(payment.renewalOfSubscriptionId)
      : null;

    if (!existingSubscription) {
      payment.status = PAYMENT_STATUS.MANUAL_REVIEW;
      payment.fraudFlagged = true;
      payment.failureCode = "RENEWAL_SUBSCRIPTION_NOT_FOUND";
      payment.failureReason =
        "Renewal subscription not found during finalization.";
      payment.notes = "Manual review: renewal subscription missing.";
      payment.processedAt = payment.processedAt || now;

      await payment.save();
      throw new Error("Renewal subscription not found.");
    }

    const renewalBaseDate =
      existingSubscription.endDate &&
      new Date(existingSubscription.endDate) > now
        ? new Date(existingSubscription.endDate)
        : now;

    existingSubscription.planId = payment.planId;
    existingSubscription.planSnapshot = snapshot;
    existingSubscription.status = SUBSCRIPTION_STATUS.ACTIVE;
    existingSubscription.startDate = now;
    existingSubscription.endDate = addDays(renewalBaseDate, totalDays);
    existingSubscription.graceEndDate = null;
    existingSubscription.activatedAt = existingSubscription.activatedAt || now;
    existingSubscription.expiredAt = null;
    existingSubscription.cancelledAt = null;
    existingSubscription.autoRenew = false;
    existingSubscription.renewalCount =
      (existingSubscription.renewalCount || 0) + 1;
    existingSubscription.source = SUBSCRIPTION_SOURCE.GATEWAY;
    existingSubscription.baseDurationInDays = baseDurationInDays;
    existingSubscription.extraDaysApplied = extraDaysApplied;
    existingSubscription.lastPaymentId = payment._id;
    existingSubscription.couponCodeUsed = payment.couponCode || null;
    existingSubscription.couponDiscountAmount =
      payment.couponDiscountAmount ?? null;

    subscription = await existingSubscription.save();
  } else {
    subscription = await Subscription.create({
      userId: payment.userId,
      role: payment.role,
      planId: payment.planId,
      planSnapshot: snapshot,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      startDate: now,
      endDate: addDays(now, totalDays),
      activatedAt: now,
      autoRenew: false,
      renewalCount: 0,
      source: SUBSCRIPTION_SOURCE.GATEWAY,
      baseDurationInDays,
      extraDaysApplied,
      lastPaymentId: payment._id,
      couponCodeUsed: payment.couponCode || null,
      couponDiscountAmount: payment.couponDiscountAmount ?? null,
    });
  }

  payment.subscriptionId = subscription._id;

  if (razorpayPaymentId) payment.gatewayPaymentId = razorpayPaymentId;
  if (razorpaySignature) payment.gatewaySignature = razorpaySignature;

  payment.verificationSource = verificationSource;
  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.verifiedAt = payment.verifiedAt || now;
  payment.paidAt = payment.paidAt || now;
  payment.processedAt = payment.processedAt || now;
  payment.gatewayStatus = gatewayStatus;
  payment.failureCode = null;
  payment.failureReason = null;

  if (webhookConfirmed) {
    payment.isWebhookConfirmed = true;
    payment.webhookReceivedAt = payment.webhookReceivedAt || now;
    payment.webhookConfirmedAt = payment.webhookConfirmedAt || now;
  }

  await payment.save();

  return {
    payment,
    subscription,
    alreadyProcessed: false,
    isRenewal,
  };
}