import { Types } from "mongoose";

// ================================
// CHECKOUT
// ================================

export type CheckoutRequest = {
  planId: string;
  couponCode?: string | null;
};

export type CheckoutResponse = {
  success: boolean;
  message: string;
  payment?: any;
  plan?: any;
  subscription?: any;
  checkout?: {
    checkoutAttemptId: string;
    receipt: string;
    transactionType: string;
  };
  requiresPayment?: boolean;
};

// ================================
// CREATE ORDER (RAZORPAY)
// ================================

export type CreateOrderRequest = {
  checkoutAttemptId: string;
};

export type RazorpayOrderResponse = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  created_at: number;
};

export type CreateOrderResponse = {
  success: boolean;
  message: string;
  order?: RazorpayOrderResponse;
};

// ================================
// VERIFY PAYMENT
// ================================

export type VerifyPaymentRequest = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  checkoutAttemptId: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  message: string;
  subscriptionActivated?: boolean;
};

// ================================
// WEBHOOK TYPES
// ================================

export type RazorpayWebhookEvent = {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
      };
    };
    order?: {
      entity: {
        id: string;
        receipt: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
  };
  created_at: number;
};

// ================================
// COUPON
// ================================

export type CouponValidationResult = {
  valid: boolean;
  message?: string;
  discountAmount?: number;
  finalAmount?: number;
};

// ================================
// INTERNAL PAYMENT PROCESSING
// ================================

export type PaymentProcessContext = {
  userId: Types.ObjectId;
  paymentId: Types.ObjectId;
  subscriptionId?: Types.ObjectId | null;
  planId: Types.ObjectId;
};

export type PaymentVerificationResult = {
  verified: boolean;
  reason?: string;
};

// ================================
// ADMIN ANALYTICS
// ================================

export type RevenueSummary = {
  totalRevenue: number;
  totalTransactions: number;
  successCount: number;
  failedCount: number;
};

export type PlanRevenueBreakdown = {
  planId: string;
  totalRevenue: number;
  purchaseCount: number;
};