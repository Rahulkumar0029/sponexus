// ================================
// PLAN CODES
// ================================

export const PLAN_CODES = {
  ORGANIZER_MONTHLY: "ORG_MONTHLY",
  ORGANIZER_YEARLY: "ORG_YEARLY",
  SPONSOR_MONTHLY: "SPN_MONTHLY",
  SPONSOR_YEARLY: "SPN_YEARLY",
} as const;

// ================================
// PLAN PRICING (SOURCE OF TRUTH)
// ================================

export const PLAN_PRICING = {
  [PLAN_CODES.ORGANIZER_MONTHLY]: 199,
  [PLAN_CODES.SPONSOR_MONTHLY]: 499,
  [PLAN_CODES.ORGANIZER_YEARLY]: 199 * 11,
  [PLAN_CODES.SPONSOR_YEARLY]: 499 * 11,
} as const;

// ================================
// PLAN DURATION
// ================================

export const PLAN_DURATION_DAYS = {
  MONTHLY: 30,
  YEARLY: 365,
} as const;

// ================================
// GRACE PERIOD
// ================================

export const GRACE_PERIOD_DAYS = 3;

// ================================
// ROLES
// ================================

export const ROLES = {
  ORGANIZER: "ORGANIZER",
  SPONSOR: "SPONSOR",
} as const;

// ================================
// SUBSCRIPTION STATUS
// ================================

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "ACTIVE",
  GRACE: "GRACE",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
} as const;

// ================================
// PAYMENT STATUS
// ================================

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;

// ================================
// PAYMENT GATEWAY
// ================================

export const PAYMENT_GATEWAY = {
  MANUAL: "MANUAL",
  RAZORPAY: "RAZORPAY",
  CASHFREE: "CASHFREE",
} as const;

// ================================
// SUBSCRIPTION SOURCE
// ================================

export const SUBSCRIPTION_SOURCE = {
  MANUAL: "MANUAL",
  GATEWAY: "GATEWAY",
  ADMIN_GRANTED: "ADMIN_GRANTED",
} as const;

// ================================
// USER ACTIONS (IMPORTANT)
// ================================

export const ACTIONS = {
  PUBLISH_EVENT: "PUBLISH_EVENT",
  PUBLISH_SPONSORSHIP: "PUBLISH_SPONSORSHIP",
  SEND_INTEREST: "SEND_INTEREST",
  USE_MATCH: "USE_MATCH",
  REVEAL_CONTACT: "REVEAL_CONTACT",
} as const;

// ================================
// TYPES
// ================================

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];
export type SubscriptionStatusType =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
export type PaymentStatusType =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type PaymentGatewayType =
  (typeof PAYMENT_GATEWAY)[keyof typeof PAYMENT_GATEWAY];
export type SubscriptionSourceType =
  (typeof SUBSCRIPTION_SOURCE)[keyof typeof SUBSCRIPTION_SOURCE];
export type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];

// ================================
// EMAIL SETTINGS
// ================================

export const EMAIL = {
  BILLING_FROM: "Sponexus Billing <billing@sponexus.app>",
  SUPPORT_EMAIL: "support@sponexus.app",
} as const;

// ================================
// UI MESSAGES
// ================================

export const SUBSCRIPTION_MESSAGES = {
  UPGRADE_REQUIRED:
    "Upgrade your plan to access this feature on Sponexus.",
  EXPIRED:
    "Your subscription has expired. Renew to continue using this feature.",
  GRACE:
    "Your plan is in grace period. Renew soon to avoid losing access.",
  ACTIVE:
    "Your subscription is active. Enjoy your plan!",
  NO_ACTIVE_SUBSCRIPTION:
    "No active subscription found.",
  INVALID_ROLE:
    "Invalid subscription role.",
  ROLE_MISMATCH:
    "Role mismatch for subscription access.",
  PLAN_NOT_FOUND:
    "Active plan not found.",
  PLAN_INACTIVE:
    "Your current plan is inactive.",
  PLAN_ROLE_MISMATCH:
    "Plan role mismatch.",
  ACCESS_GRANTED:
    "Access granted.",
  ACCOUNT_RESTRICTED:
    "Account access restricted.",
} as const;

// ================================
// PLAN FEATURE MATRIX
// ================================

export const PLAN_FEATURES = {
  [PLAN_CODES.ORGANIZER_MONTHLY]: {
    role: ROLES.ORGANIZER,
    canPublish: true,
    canContact: true,
    canUseMatch: true,
    canRevealContact: true,
  },
  [PLAN_CODES.ORGANIZER_YEARLY]: {
    role: ROLES.ORGANIZER,
    canPublish: true,
    canContact: true,
    canUseMatch: true,
    canRevealContact: true,
  },
  [PLAN_CODES.SPONSOR_MONTHLY]: {
    role: ROLES.SPONSOR,
    canPublish: true,
    canContact: true,
    canUseMatch: true,
    canRevealContact: true,
  },
  [PLAN_CODES.SPONSOR_YEARLY]: {
    role: ROLES.SPONSOR,
    canPublish: true,
    canContact: true,
    canUseMatch: true,
    canRevealContact: true,
  },
} as const;

// ================================
// HELPERS
// ================================

export function isValidRole(value: unknown): value is AppRole {
  return value === ROLES.ORGANIZER || value === ROLES.SPONSOR;
}

export function isValidSubscriptionStatus(
  value: unknown
): value is SubscriptionStatusType {
  return Object.values(SUBSCRIPTION_STATUS).includes(
    value as SubscriptionStatusType
  );
}

export function isValidPaymentStatus(
  value: unknown
): value is PaymentStatusType {
  return Object.values(PAYMENT_STATUS).includes(value as PaymentStatusType);
}

export function isValidPaymentGateway(
  value: unknown
): value is PaymentGatewayType {
  return Object.values(PAYMENT_GATEWAY).includes(value as PaymentGatewayType);
}

export function isValidSubscriptionSource(
  value: unknown
): value is SubscriptionSourceType {
  return Object.values(SUBSCRIPTION_SOURCE).includes(
    value as SubscriptionSourceType
  );
}

export function isValidAction(value: unknown): value is ActionType {
  return Object.values(ACTIONS).includes(value as ActionType);
}