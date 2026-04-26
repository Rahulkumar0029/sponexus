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

function isValidSubscriptionRole(role: unknown): role is "ORGANIZER" | "SPONSOR" {
  return role === "ORGANIZER" || role === "SPONSOR";
}

function isValidPlanRole(role: unknown): role is "ORGANIZER" | "SPONSOR" | "BOTH" {
  return role === "ORGANIZER" || role === "SPONSOR" || role === "BOTH";
}

function isPlanAllowedForRole(
  planRole: "ORGANIZER" | "SPONSOR" | "BOTH",
  userRole: "ORGANIZER" | "SPONSOR"
) {
  return planRole === "BOTH" || planRole === userRole;
}

async function movePaymentToManualReview(params: {
  payment: any;
  failureCode: string;
  failureReason: string;
  notes: string;
  webhookConfirmed?: boolean;
}) {
  const {
    payment,
    failureCode,
    failureReason,
    notes,
    webhookConfirmed = false,
  } = params;

  const now = new Date();

  payment.status = PAYMENT_STATUS.MANUAL_REVIEW;
  payment.fraudFlagged = true;
  payment.failureCode = failureCode;
  payment.failureReason = failureReason;
  payment.notes = notes;
  payment.processedAt = payment.processedAt || now;

  if (webhookConfirmed) {
    payment.isWebhookConfirmed = true;
    payment.webhookReceivedAt = payment.webhookReceivedAt || now;
    payment.webhookConfirmedAt = payment.webhookConfirmedAt || now;
  }

  await payment.save();
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

  if (status === PAYMENT_STATUS.FLAGGED || status === PAYMENT_STATUS.MANUAL_REVIEW) {
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
    const existingSubscription = await Subscription.findById(payment.subscriptionId);

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

  if (payment.status === PAYMENT_STATUS.SUCCESS && !payment.subscriptionId) {
    await movePaymentToManualReview({
      payment,
      failureCode: "SUCCESS_WITHOUT_SUBSCRIPTION",
      failureReason:
        "Payment is marked success but no subscription is linked.",
      notes: "Manual review required: successful payment has no subscriptionId.",
      webhookConfirmed,
    });

    throw new Error("Successful payment is missing subscription link.");
  }

  if (
    [
      PAYMENT_STATUS.FAILED,
      PAYMENT_STATUS.REFUNDED,
      PAYMENT_STATUS.CANCELLED,
      PAYMENT_STATUS.EXPIRED,
      PAYMENT_STATUS.FLAGGED,
      PAYMENT_STATUS.MANUAL_REVIEW,
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

  if (!isValidSubscriptionRole(payment.role)) {
    await movePaymentToManualReview({
      payment,
      failureCode: "INVALID_PAYMENT_ROLE",
      failureReason: "Payment role is invalid during finalization.",
      notes: "Manual review required: invalid payment role.",
      webhookConfirmed,
    });

    throw new Error("Invalid payment role during finalization.");
  }

  const snapshot = payment.planSnapshot;

  if (!snapshot) {
    await movePaymentToManualReview({
      payment,
      failureCode: "MISSING_PLAN_SNAPSHOT",
      failureReason:
        "Payment finalization blocked because plan snapshot is missing.",
      notes: "Moved to manual review because plan snapshot is missing.",
      webhookConfirmed,
    });

    throw new Error("Plan snapshot missing during payment finalization.");
  }

  if (!isValidPlanRole(snapshot.role) || !isPlanAllowedForRole(snapshot.role, payment.role)) {
    await movePaymentToManualReview({
      payment,
      failureCode: "PLAN_ROLE_MISMATCH",
      failureReason:
        "Plan snapshot role does not match payment role during finalization.",
      notes: "Manual review required: plan role mismatch.",
      webhookConfirmed,
    });

    throw new Error("Plan role mismatch during payment finalization.");
  }

  const baseDurationInDays = Number(snapshot.durationInDays || 0);
  const extraDaysApplied = Number(snapshot.extraDays || 0);
  const totalDays = baseDurationInDays + extraDaysApplied;

  if (!Number.isFinite(totalDays) || totalDays < 1) {
    await movePaymentToManualReview({
      payment,
      failureCode: "INVALID_PLAN_DURATION",
      failureReason: "Plan duration is invalid during finalization.",
      notes: "Moved to manual review because plan duration is invalid.",
      webhookConfirmed,
    });

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
      await movePaymentToManualReview({
        payment,
        failureCode: "RENEWAL_SUBSCRIPTION_NOT_FOUND",
        failureReason:
          "Renewal subscription not found during finalization.",
        notes: "Manual review: renewal subscription missing.",
        webhookConfirmed,
      });

      throw new Error("Renewal subscription not found.");
    }

    const renewalBaseDate =
      existingSubscription.endDate && new Date(existingSubscription.endDate) > now
        ? new Date(existingSubscription.endDate)
        : now;

    existingSubscription.planId = payment.planId;
    existingSubscription.planSnapshot = snapshot;
    existingSubscription.status = SUBSCRIPTION_STATUS.ACTIVE;
    existingSubscription.isActive = true;
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
    if (payment.subscriptionId) {
      subscription = await Subscription.findById(payment.subscriptionId);
    }

    if (!subscription) {
      subscription = await Subscription.create({
        userId: payment.userId,
        role: payment.role,
        planId: payment.planId,
        planSnapshot: snapshot,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        isActive: true,
        startDate: now,
        endDate: addDays(now, totalDays),
        graceEndDate: null,
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