export type PlanRole = "ORGANIZER" | "SPONSOR" | "BOTH";
export type PlanInterval = "CUSTOM" | "MONTHLY" | "YEARLY";

export type SubscriptionStatus =
  | "ACTIVE"
  | "GRACE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export type SubscriptionSource = "MANUAL" | "GATEWAY" | "ADMIN_GRANTED";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "VERIFIED"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED"
  | "EXPIRED"
  | "MANUAL_REVIEW"
  | "FLAGGED";

export type PaymentGateway = "RAZORPAY" | "CASHFREE" | "MANUAL";

export type PaymentVerificationSource =
  | "FRONTEND_VERIFY"
  | "WEBHOOK"
  | "ADMIN"
  | null;

export type PaymentTransactionType =
  | "NEW_SUBSCRIPTION"
  | "RENEWAL"
  | "MANUAL_ADJUSTMENT";

export type SubscriptionAction =
  | "PUBLISH_EVENT"
  | "PUBLISH_SPONSORSHIP"
  | "SEND_INTEREST"
  | "USE_MATCH"
  | "REVEAL_CONTACT";

export interface PlanDTO {
  _id: string;
  code: string;
  role: PlanRole;
  name: string;
  description?: string;
  price: number;
  currency: "INR";
  interval: PlanInterval;
  durationInDays: number;
  extraDays?: number;

  postingLimitPerDay?: number | null;
  dealRequestLimitPerDay?: number | null;

  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;

  budgetMin?: number | null;
  budgetMax?: number | null;

  isActive: boolean;
  isArchived?: boolean;
  isVisible?: boolean;

  visibleToRoles?: PlanRole[];
  visibleToLoggedOut?: boolean;

  sortOrder: number;
  metadata?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionDTO {
  _id: string;
  userId: string;
  role: "ORGANIZER" | "SPONSOR";
  planId: string | PlanDTO;
  status: SubscriptionStatus;
  isActive?: boolean;

  startDate: string;
  endDate: string;
  graceEndDate?: string | null;

  activatedAt?: string | null;
  expiredAt?: string | null;
  cancelledAt?: string | null;

  autoRenew: boolean;
  renewalCount: number;
  source: SubscriptionSource;

  baseDurationInDays?: number;
  extraDaysApplied?: number;

  lastPaymentId?: string | null;
  grantedByAdminId?: string | null;

  couponCodeUsed?: string | null;
  couponDiscountAmount?: number | null;

  planSnapshot?: Record<string, unknown> | null;
  notes?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentTransactionDTO {
  _id: string;
  userId: string;
  subscriptionId?: string | SubscriptionDTO | null;
  renewalOfSubscriptionId?: string | null;

  planId: string | PlanDTO;
  role: "ORGANIZER" | "SPONSOR";
  transactionType?: PaymentTransactionType;

  checkoutAttemptId?: string | null;
  receipt?: string | null;

  amountBeforeDiscount?: number;
  couponCode?: string | null;
  couponDiscountAmount?: number | null;

  amount: number;
  currency: "INR";

  status: PaymentStatus;
  gateway: PaymentGateway;
  method?: string;

  gatewayStatus?: string | null;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  gatewaySignature?: string | null;

  verificationSource?: PaymentVerificationSource;

  verifiedAt?: string | null;
  paidAt?: string | null;
  processedAt?: string | null;

  webhookReceivedAt?: string | null;
  webhookConfirmedAt?: string | null;
  isWebhookConfirmed?: boolean;

  fraudFlagged?: boolean;

  failureCode?: string | null;
  failureReason?: string | null;
  refundReason?: string | null;
  invoiceNumber?: string | null;
  notes?: string;

  planSnapshot?: Record<string, unknown> | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface MySubscriptionResponse {
  success: boolean;
  adminBypass?: boolean;
  hasActiveSubscription?: boolean;
  subscription?: SubscriptionDTO | null;
  plan?: PlanDTO | null;
  status?: string;
  remainingDays?: number | null;
  isExpiringSoon?: boolean;
  message?: string;
}

export interface PlansResponse {
  success: boolean;
  data?: PlanDTO[];
  plans?: PlanDTO[];
  message?: string;
}

export interface SubscriptionCheckoutResponse {
  success: boolean;
  message: string;
  payment?: PaymentTransactionDTO;
  subscription?: SubscriptionDTO | null;
  plan?: PlanDTO | null;
  requiresPayment?: boolean;
  checkout?: {
    checkoutAttemptId?: string;
    receipt?: string;
    transactionType?: PaymentTransactionType;
  };
  coupon?: {
    code?: string;
    discountAmount?: number | null;
    amountBeforeDiscount?: number;
    finalAmount?: number;
  } | null;
  gateway?: {
    provider?: string;
    orderCreated?: boolean;
    keyId?: string;
    order?: {
      id?: string;
      amount?: number;
      currency?: string;
      receipt?: string;
      status?: string;
    } | null;
  };
  nextStep?: string;
}

export interface AccessResult {
  allowed: boolean;
  reason:
    | "ADMIN_BYPASS"
    | "USER_NOT_FOUND"
    | "ACCOUNT_RESTRICTED"
    | "INVALID_ROLE"
    | "NO_USER"
    | "NO_SUBSCRIPTION"
    | "ROLE_MISMATCH"
    | "SUBSCRIPTION_INACTIVE"
    | "SUBSCRIPTION_EXPIRED"
    | "GRACE_ENDED"
    | "PLAN_MISSING"
    | "PLAN_INACTIVE"
    | "PLAN_ARCHIVED"
    | "PLAN_ROLE_MISMATCH"
    | "ACTION_NOT_ALLOWED"
    | "OK";
  message: string;
  adminBypass?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionId?: string | null;
  planId?: string | null;
}