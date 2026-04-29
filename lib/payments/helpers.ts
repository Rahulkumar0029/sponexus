import { randomUUID } from "crypto";

type UserRole = "ORGANIZER" | "SPONSOR";
type PlanRole = "ORGANIZER" | "SPONSOR" | "BOTH";

/* ===============================
   IDS
=================================*/

export function buildCheckoutAttemptId(prefix = "chk") {
  return `${prefix}_${Date.now()}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 18)}`;
}

export function buildReceipt(prefix = "rcpt") {
  return `${prefix}_${Date.now()}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)}`;
}

/* ===============================
   ROLE VALIDATION
=================================*/

export function isPlanAllowedForRole(
  planRole: PlanRole,
  userRole: UserRole
) {
  return planRole === "BOTH" || planRole === userRole;
}

/* ===============================
   SANITIZERS
=================================*/

export function sanitizePlan(plan: any) {
  return {
    _id: String(plan._id),
    code: plan.code,
    role: plan.role,
    name: plan.name,
    description: plan.description ?? "",
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    durationInDays: plan.durationInDays,
    extraDays: plan.extraDays ?? 0,

    postingLimitPerDay: plan.postingLimitPerDay ?? null,
    dealRequestLimitPerDay: plan.dealRequestLimitPerDay ?? null,

    canPublish: Boolean(plan.canPublish),
    canContact: Boolean(plan.canContact),
    canUseMatch: Boolean(plan.canUseMatch),
    canRevealContact: Boolean(plan.canRevealContact),

    budgetMin: plan.budgetMin ?? null,
    budgetMax: plan.budgetMax ?? null,

    // ✅ IMPORTANT (added)
   features: {
  canPublishEvent: plan.features?.canPublishEvent !== false,
  canPublishSponsorship: plan.features?.canPublishSponsorship !== false,
  canUseMatch: plan.features?.canUseMatch !== false,
  canRevealContact: plan.features?.canRevealContact !== false,
  canSendDealRequest: plan.features?.canSendDealRequest !== false,
},

limits: {
  eventPostsPerDay: plan.limits?.eventPostsPerDay ?? null,
  sponsorshipPostsPerDay: plan.limits?.sponsorshipPostsPerDay ?? null,
  dealRequestsPerDay: plan.limits?.dealRequestsPerDay ?? null,
  contactRevealsPerDay: plan.limits?.contactRevealsPerDay ?? null,
  matchUsesPerDay: plan.limits?.matchUsesPerDay ?? null,

  eventPostsPerMonth: plan.limits?.eventPostsPerMonth ?? null,
  sponsorshipPostsPerMonth: plan.limits?.sponsorshipPostsPerMonth ?? null,
  dealRequestsPerMonth: plan.limits?.dealRequestsPerMonth ?? null,
  contactRevealsPerMonth: plan.limits?.contactRevealsPerMonth ?? null,
  matchUsesPerMonth: plan.limits?.matchUsesPerMonth ?? null,

  maxPostBudgetAmount: plan.limits?.maxPostBudgetAmount ?? null,
  maxVisibleBudgetAmount: plan.limits?.maxVisibleBudgetAmount ?? null,
},

    isActive: Boolean(plan.isActive),
    isArchived: Boolean(plan.isArchived),
    isVisible: Boolean(plan.isVisible),

    visibleToRoles: Array.isArray(plan.visibleToRoles)
      ? plan.visibleToRoles
      : [],

    visibleToLoggedOut: Boolean(plan.visibleToLoggedOut),
    sortOrder: typeof plan.sortOrder === "number" ? plan.sortOrder : 0,

    metadata: plan.metadata ?? {},

    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
}

export function sanitizePayment(payment: any) {
  const userId =
    payment.userId?._id != null
      ? String(payment.userId._id)
      : String(payment.userId);

  const subscriptionId =
    payment.subscriptionId?._id != null
      ? String(payment.subscriptionId._id)
      : payment.subscriptionId
      ? String(payment.subscriptionId)
      : null;

  const renewalOfSubscriptionId = payment.renewalOfSubscriptionId
    ? String(payment.renewalOfSubscriptionId)
    : null;

  const planId =
    payment.planId?._id != null
      ? String(payment.planId._id)
      : payment.planId
      ? String(payment.planId)
      : null;

  return {
    _id: String(payment._id),
    userId,
    subscriptionId,
    renewalOfSubscriptionId,
    planId,

    role: payment.role,
    transactionType: payment.transactionType,

    checkoutAttemptId: payment.checkoutAttemptId,
    receipt: payment.receipt,

    amountBeforeDiscount: payment.amountBeforeDiscount ?? 0,
    couponCode: payment.couponCode ?? null,
    couponDiscountAmount: payment.couponDiscountAmount ?? null,

    amount: payment.amount ?? 0,
    currency: payment.currency,

    status: payment.status,
    gateway: payment.gateway,
    method: payment.method,

    gatewayStatus: payment.gatewayStatus ?? null,
    gatewayOrderId: payment.gatewayOrderId ?? null,
    gatewayPaymentId: payment.gatewayPaymentId ?? null,

    verificationSource: payment.verificationSource ?? null,

    verifiedAt: payment.verifiedAt || null,
    paidAt: payment.paidAt || null,
    processedAt: payment.processedAt || null,

    webhookReceivedAt: payment.webhookReceivedAt || null,
    webhookConfirmedAt: payment.webhookConfirmedAt || null,
    isWebhookConfirmed: Boolean(payment.isWebhookConfirmed),

    fraudFlagged: Boolean(payment.fraudFlagged),

    invoiceNumber: payment.invoiceNumber ?? null,

    planSnapshot: payment.planSnapshot ?? null,

    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
  };
}

export function sanitizeSubscription(subscription: any) {
  return {
    _id: String(subscription._id),

    userId:
      subscription.userId?._id != null
        ? String(subscription.userId._id)
        : String(subscription.userId),

    role: subscription.role,

    planId:
      subscription.planId?._id != null
        ? String(subscription.planId._id)
        : subscription.planId
        ? String(subscription.planId)
        : null,

    status: subscription.status,

    startDate: subscription.startDate || null,
    endDate: subscription.endDate || null,
    graceEndDate: subscription.graceEndDate || null,

    activatedAt: subscription.activatedAt || null,
    expiredAt: subscription.expiredAt || null,
    cancelledAt: subscription.cancelledAt || null,

    autoRenew: Boolean(subscription.autoRenew),
    renewalCount: subscription.renewalCount || 0,

    source: subscription.source,

    baseDurationInDays: subscription.baseDurationInDays || 0,
    extraDaysApplied: subscription.extraDaysApplied || 0,

    lastPaymentId: subscription.lastPaymentId
      ? String(subscription.lastPaymentId)
      : null,

    grantedByAdminId: subscription.grantedByAdminId
      ? String(subscription.grantedByAdminId)
      : null,

    couponCodeUsed: subscription.couponCodeUsed ?? null,
    couponDiscountAmount: subscription.couponDiscountAmount ?? null,

    planSnapshot: subscription.planSnapshot ?? null,

    createdAt: subscription.createdAt || null,
    updatedAt: subscription.updatedAt || null,
  };
}