// ================================
// ROLES
// ================================

export const ROLES = {
  ORGANIZER: "ORGANIZER",
  SPONSOR: "SPONSOR",
  BOTH: "BOTH",
} as const;

// ================================
// GRACE PERIOD
// ================================

export const GRACE_PERIOD_DAYS = 3;

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
  CREATED: "CREATED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  FLAGGED: "FLAGGED",
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
// PAYMENT TRANSACTION TYPE
// ================================

export const PAYMENT_TRANSACTION_TYPE = {
  NEW_SUBSCRIPTION: "NEW_SUBSCRIPTION",
  RENEWAL: "RENEWAL",
  MANUAL_ADJUSTMENT: "MANUAL_ADJUSTMENT",
} as const;

// ================================
// PAYMENT VERIFICATION SOURCE
// ================================

export const PAYMENT_VERIFICATION_SOURCE = {
  FRONTEND_VERIFY: "FRONTEND_VERIFY",
  WEBHOOK: "WEBHOOK",
  ADMIN: "ADMIN",
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
// COUPON TYPES
// ================================

export const COUPON_TYPE = {
  PERCENTAGE: "PERCENTAGE",
  FLAT: "FLAT",
} as const;

// ================================
// USER ACTIONS
// ================================

export const ACTIONS = {
  PUBLISH_EVENT: "PUBLISH_EVENT",
  PUBLISH_SPONSORSHIP: "PUBLISH_SPONSORSHIP",
  SEND_INTEREST: "SEND_INTEREST",
  USE_MATCH: "USE_MATCH",
  REVEAL_CONTACT: "REVEAL_CONTACT",
} as const;

// ================================
// PAYMENT ADMIN ACCESS
// ================================

export const PAYMENT_ADMIN_ACCESS = {
  OTP_EXPIRY_MINUTES: 10,
  SESSION_EXPIRY_MINUTES: 60,
  MAX_OTP_ATTEMPTS: 5,
} as const;

// ================================
// EMAIL SETTINGS
// ================================

export const EMAIL = {
  BILLING_FROM: "Sponexus Billing <billing@sponexus.app>",
  SUPPORT_EMAIL: "support@sponexus.app",
} as const;

// ================================
// UI / BUSINESS MESSAGES
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
// TYPES
// ================================

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
export type UserAppRole = Exclude<AppRole, "BOTH">;

export type SubscriptionStatusType =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export type PaymentStatusType =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export type PaymentGatewayType =
  (typeof PAYMENT_GATEWAY)[keyof typeof PAYMENT_GATEWAY];

export type PaymentTransactionType =
  (typeof PAYMENT_TRANSACTION_TYPE)[keyof typeof PAYMENT_TRANSACTION_TYPE];

export type PaymentVerificationSourceType =
  (typeof PAYMENT_VERIFICATION_SOURCE)[keyof typeof PAYMENT_VERIFICATION_SOURCE];

export type SubscriptionSourceType =
  (typeof SUBSCRIPTION_SOURCE)[keyof typeof SUBSCRIPTION_SOURCE];

export type CouponType =
  (typeof COUPON_TYPE)[keyof typeof COUPON_TYPE];

export type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];

// ================================
// HELPERS
// ================================

export function isValidRole(value: unknown): value is AppRole {
  return Object.values(ROLES).includes(value as AppRole);
}

export function isValidUserRole(value: unknown): value is UserAppRole {
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

export function isValidPaymentTransactionType(
  value: unknown
): value is PaymentTransactionType {
  return Object.values(PAYMENT_TRANSACTION_TYPE).includes(
    value as PaymentTransactionType
  );
}

export function isValidPaymentVerificationSource(
  value: unknown
): value is PaymentVerificationSourceType {
  return Object.values(PAYMENT_VERIFICATION_SOURCE).includes(
    value as PaymentVerificationSourceType
  );
}

export function isValidSubscriptionSource(
  value: unknown
): value is SubscriptionSourceType {
  return Object.values(SUBSCRIPTION_SOURCE).includes(
    value as SubscriptionSourceType
  );
}

export function isValidCouponType(value: unknown): value is CouponType {
  return Object.values(COUPON_TYPE).includes(value as CouponType);
}

export function isValidAction(value: unknown): value is ActionType {
  return Object.values(ACTIONS).includes(value as ActionType);
}