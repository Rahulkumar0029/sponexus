/* ===============================
   CORE CURRENCY
=================================*/
export const PAYMENT_CURRENCY = "INR" as const;

export const CURRENCY_SUBUNIT_MULTIPLIER = 100 as const; // INR → paise

export type PaymentCurrency = typeof PAYMENT_CURRENCY;

/* ===============================
   PROVIDERS
=================================*/
export const PAYMENT_PROVIDER = Object.freeze({
  RAZORPAY: "RAZORPAY",
  CASHFREE: "CASHFREE", // future ready (already used in your code)
  MANUAL: "MANUAL",
} as const);

export type PaymentProviderType =
  (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

/* ===============================
   LIMITS (CRITICAL SECURITY)
=================================*/
export const PAYMENT_LIMITS = Object.freeze({
  MAX_AMOUNT_RUPEES: 100000000, // ₹10 Cr cap (safety)
  MAX_AMOUNT_SUBUNITS: 100000000 * CURRENCY_SUBUNIT_MULTIPLIER,

  CHECKOUT_ATTEMPT_ID_MAX_LENGTH: 120,
  RECEIPT_MAX_LENGTH: 120,

  GATEWAY_ORDER_ID_MAX_LENGTH: 200,
  GATEWAY_PAYMENT_ID_MAX_LENGTH: 200,
  GATEWAY_SIGNATURE_MAX_LENGTH: 500,

  COUPON_CODE_MAX_LENGTH: 100,
  FAILURE_CODE_MAX_LENGTH: 100,
  FAILURE_REASON_MAX_LENGTH: 1000,
  INVOICE_NUMBER_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 2000,
} as const);

/* ===============================
   PAYMENT ORDER DEFAULTS
=================================*/
export const PAYMENT_ORDER = Object.freeze({
  DEFAULT_STATUS: "CREATED",
  DEFAULT_CAPTURE: true,
} as const);

/* ===============================
   RETRY CONTROL (ANTI-SPAM)
=================================*/
export const PAYMENT_RETRY = Object.freeze({
  USER_CHECKOUT_RETRY_WINDOW_MINUTES: 15,
  MAX_OPEN_CHECKOUT_ATTEMPTS_PER_PLAN: 1,
} as const);

/* ===============================
   WEBHOOK CONTROL
=================================*/
export const WEBHOOK_PROCESSING = Object.freeze({
  MAX_EVENT_ID_LENGTH: 200,
  RAW_BODY_REQUIRED: true,
  DEFAULT_DUPLICATE_RESPONSE_MESSAGE: "Webhook already processed",
} as const);

/* ===============================
   COUPON SYSTEM
=================================*/
export const COUPON_PROCESSING = Object.freeze({
  DEFAULT_RESERVATION_WINDOW_MINUTES: 30,
} as const);

/* ===============================
   ANALYTICS
=================================*/
export const PAYMENT_ANALYTICS = Object.freeze({
  DEFAULT_MONTH_RANGE: 12,
} as const);