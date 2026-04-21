export type PlanRole = "ORGANIZER" | "SPONSOR";
export type PlanInterval = "MONTHLY" | "YEARLY";

export type SubscriptionStatus =
  | "ACTIVE"
  | "GRACE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export type SubscriptionSource = "MANUAL" | "GATEWAY" | "ADMIN_GRANTED";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED"
  | "MANUAL_REVIEW";

export type PaymentGateway = "RAZORPAY" | "CASHFREE" | "MANUAL";

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
  postingLimit: number | null;
  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionDTO {
  _id: string;
  userId: string;
  role: PlanRole;
  planId: string | PlanDTO;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  graceEndDate?: string | null;
  autoRenew: boolean;
  renewalCount: number;
  source: SubscriptionSource;
  lastPaymentId?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentTransactionDTO {
  _id: string;
  userId: string;
  subscriptionId?: string | SubscriptionDTO | null;
  planId: string | PlanDTO;
  role: PlanRole;
  amount: number;
  currency: "INR";
  status: PaymentStatus;
  gateway: PaymentGateway;
  method?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  paidAt?: string | null;
  failureReason?: string;
  refundReason?: string;
  invoiceNumber?: string;
  notes?: string;
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
  message?: string;
}

export interface PlansResponse {
  success: boolean;
  plans?: PlanDTO[];
  message?: string;
}

export interface SubscriptionCheckoutResponse {
  success: boolean;
  message: string;
  payment?: PaymentTransactionDTO;
  subscription?: SubscriptionDTO;
  plan?: PlanDTO;
}

export interface AccessResult {
  allowed: boolean;
  reason:
    | "ADMIN_BYPASS"
    | "NO_USER"
    | "NO_SUBSCRIPTION"
    | "ROLE_MISMATCH"
    | "PLAN_MISSING"
    | "PLAN_INACTIVE"
    | "SUBSCRIPTION_INACTIVE"
    | "ACTION_NOT_ALLOWED"
    | "OK";
  message: string;
}