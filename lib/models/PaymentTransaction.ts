import mongoose, { Document, Model, Schema, Types } from "mongoose";

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

export type PaymentTransactionType =
  | "NEW_SUBSCRIPTION"
  | "RENEWAL"
  | "MANUAL_ADJUSTMENT";

export type VerificationSource = "FRONTEND_VERIFY" | "WEBHOOK" | "ADMIN" | null;

export interface IPlanSnapshot {
  planId: Types.ObjectId;
  code: string;
  name: string;
  role: "ORGANIZER" | "SPONSOR" | "BOTH";
  price: number;
  currency: "INR";
  durationInDays: number;
  extraDays: number;

  postingLimitPerDay: number | null;
  dealRequestLimitPerDay: number | null;

  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;

  budgetMin?: number | null;
  budgetMax?: number | null;

  features?: {
    canPublishEvent?: boolean;
    canPublishSponsorship?: boolean;
    canUseMatch?: boolean;
    canRevealContact?: boolean;
    canSendDealRequest?: boolean;
  };

  limits?: {
    eventPostsPerDay?: number | null;
    sponsorshipPostsPerDay?: number | null;
    dealRequestsPerDay?: number | null;
    contactRevealsPerDay?: number | null;
    matchUsesPerDay?: number | null;

    eventPostsPerMonth?: number | null;
    sponsorshipPostsPerMonth?: number | null;
    dealRequestsPerMonth?: number | null;
    contactRevealsPerMonth?: number | null;
    matchUsesPerMonth?: number | null;

    maxPostBudgetAmount?: number | null;
    maxVisibleBudgetAmount?: number | null;
  };
}

export interface IPaymentTransaction extends Document {
  userId: Types.ObjectId;
  subscriptionId?: Types.ObjectId | null;
  renewalOfSubscriptionId?: Types.ObjectId | null;
  planId: Types.ObjectId;

  planSnapshot?: IPlanSnapshot | null;

  role: "ORGANIZER" | "SPONSOR";
  transactionType: PaymentTransactionType;

  checkoutAttemptId: string;
  receipt: string;

  amountBeforeDiscount: number;
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

  gatewayResponse?: Record<string, any> | null;

  verificationSource?: VerificationSource;
  verifiedAt?: Date | null;
  paidAt?: Date | null;
  processedAt?: Date | null;

  webhookReceivedAt?: Date | null;
  webhookConfirmedAt?: Date | null;
  isWebhookConfirmed: boolean;

  fraudFlagged: boolean;

  failureCode?: string | null;
  failureReason?: string | null;
  refundReason?: string | null;

  invoiceNumber?: string | null;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_AMOUNT = 100000000;
const MAX_METHOD_LENGTH = 100;
const MAX_GATEWAY_ID_LENGTH = 200;
const MAX_SIGNATURE_LENGTH = 500;
const MAX_REASON_LENGTH = 1000;
const MAX_INVOICE_LENGTH = 100;
const MAX_NOTES_LENGTH = 2000;
const MAX_CHECKOUT_ATTEMPT_LENGTH = 120;
const MAX_RECEIPT_LENGTH = 120;
const MAX_COUPON_CODE_LENGTH = 100;
const MAX_FAILURE_CODE_LENGTH = 100;
const MAX_GATEWAY_STATUS_LENGTH = 100;

const planFeaturesSnapshotSchema = new Schema(
  {
    canPublishEvent: { type: Boolean, default: true },
    canPublishSponsorship: { type: Boolean, default: true },
    canUseMatch: { type: Boolean, default: true },
    canRevealContact: { type: Boolean, default: true },
    canSendDealRequest: { type: Boolean, default: true },
  },
  { _id: false }
);

const planLimitsSnapshotSchema = new Schema(
  {
    eventPostsPerDay: { type: Number, default: null },
    sponsorshipPostsPerDay: { type: Number, default: null },
    dealRequestsPerDay: { type: Number, default: null },
    contactRevealsPerDay: { type: Number, default: null },
    matchUsesPerDay: { type: Number, default: null },

    eventPostsPerMonth: { type: Number, default: null },
    sponsorshipPostsPerMonth: { type: Number, default: null },
    dealRequestsPerMonth: { type: Number, default: null },
    contactRevealsPerMonth: { type: Number, default: null },
    matchUsesPerMonth: { type: Number, default: null },

    maxPostBudgetAmount: { type: Number, default: null },
    maxVisibleBudgetAmount: { type: Number, default: null },
  },
  { _id: false }
);

const planSnapshotSchema = new Schema<IPlanSnapshot>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR", "BOTH"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR"],
      required: true,
      default: "INR",
    },

    durationInDays: {
      type: Number,
      required: true,
      min: 1,
    },

    extraDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    postingLimitPerDay: {
      type: Number,
      default: null,
    },

    dealRequestLimitPerDay: {
      type: Number,
      default: null,
    },

    canPublish: {
      type: Boolean,
      default: true,
    },

    canContact: {
      type: Boolean,
      default: true,
    },

    canUseMatch: {
      type: Boolean,
      default: true,
    },

    canRevealContact: {
      type: Boolean,
      default: true,
    },

    budgetMin: {
      type: Number,
      default: null,
    },

    budgetMax: {
      type: Number,
      default: null,
    },

    features: {
      type: planFeaturesSnapshotSchema,
      default: () => ({}),
    },

    limits: {
      type: planLimitsSnapshotSchema,
      default: () => ({}),
    },
  },
  {
    _id: false,
  }
);

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },

    renewalOfSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan is required"],
    },

    planSnapshot: {
      type: planSnapshotSchema,
      default: null,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Payment role is required"],
    },

    transactionType: {
      type: String,
      enum: ["NEW_SUBSCRIPTION", "RENEWAL", "MANUAL_ADJUSTMENT"],
      default: "NEW_SUBSCRIPTION",
      required: true,
    },

    checkoutAttemptId: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_CHECKOUT_ATTEMPT_LENGTH,
    },

    receipt: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_RECEIPT_LENGTH,
    },

    amountBeforeDiscount: {
      type: Number,
      required: true,
      min: [0, "Original amount cannot be negative"],
      max: [MAX_AMOUNT, `Original amount cannot exceed ${MAX_AMOUNT}`],
      validate: {
        validator: Number.isFinite,
        message: "Original amount must be a valid number",
      },
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      maxlength: MAX_COUPON_CODE_LENGTH,
    },

    couponDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Coupon discount cannot be negative"],
      max: [MAX_AMOUNT, `Coupon discount cannot exceed ${MAX_AMOUNT}`],
    },

    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Payment amount cannot be negative"],
      max: [MAX_AMOUNT, `Payment amount cannot exceed ${MAX_AMOUNT}`],
      validate: {
        validator: Number.isFinite,
        message: "Payment amount must be a valid number",
      },
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "PENDING",
        "VERIFIED",
        "SUCCESS",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
        "EXPIRED",
        "MANUAL_REVIEW",
        "FLAGGED",
      ],
      default: "CREATED",
      required: true,
    },

    gateway: {
      type: String,
      enum: ["RAZORPAY", "CASHFREE", "MANUAL"],
      default: "MANUAL",
      required: true,
    },

    method: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_METHOD_LENGTH,
    },

    gatewayStatus: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_GATEWAY_STATUS_LENGTH,
    },

    gatewayOrderId: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_GATEWAY_ID_LENGTH,
    },

    gatewayPaymentId: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_GATEWAY_ID_LENGTH,
    },

    gatewaySignature: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_SIGNATURE_LENGTH,
      select: false,
    },

    gatewayResponse: {
      type: Schema.Types.Mixed,
      default: null,
      select: false,
    },

    verificationSource: {
      type: String,
      enum: ["FRONTEND_VERIFY", "WEBHOOK", "ADMIN", null],
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    webhookReceivedAt: {
      type: Date,
      default: null,
    },

    webhookConfirmedAt: {
      type: Date,
      default: null,
    },

    isWebhookConfirmed: {
      type: Boolean,
      default: false,
    },

    fraudFlagged: {
      type: Boolean,
      default: false,
    },

    failureCode: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_FAILURE_CODE_LENGTH,
    },

    failureReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_REASON_LENGTH,
      select: false,
    },

    refundReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_REASON_LENGTH,
      select: false,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_INVOICE_LENGTH,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_NOTES_LENGTH,
      select: false,
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.gatewaySignature;
        delete ret.gatewayResponse;
        delete ret.failureReason;
        delete ret.refundReason;
        delete ret.notes;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.gatewaySignature;
        delete ret.gatewayResponse;
        delete ret.failureReason;
        delete ret.refundReason;
        delete ret.notes;
        return ret;
      },
    },
  }
);

paymentTransactionSchema.pre("validate", function (next) {
  if (typeof this.method === "string") {
    this.method = this.method.trim();
  }

  if (typeof this.checkoutAttemptId === "string") {
    this.checkoutAttemptId = this.checkoutAttemptId.trim();
  }

  if (typeof this.receipt === "string") {
    this.receipt = this.receipt.trim();
  }

  if (typeof this.couponCode === "string") {
    this.couponCode = this.couponCode.trim().toUpperCase();
  }

  if (typeof this.gatewayStatus === "string") {
    this.gatewayStatus = this.gatewayStatus.trim();
  }

  if (typeof this.gatewayOrderId === "string") {
    this.gatewayOrderId = this.gatewayOrderId.trim();
  }

  if (typeof this.gatewayPaymentId === "string") {
    this.gatewayPaymentId = this.gatewayPaymentId.trim();
  }

  if (typeof this.gatewaySignature === "string") {
    this.gatewaySignature = this.gatewaySignature.trim();
  }

  if (typeof this.failureCode === "string") {
    this.failureCode = this.failureCode.trim();
  }

  if (typeof this.failureReason === "string") {
    this.failureReason = this.failureReason.trim();
  }

  if (typeof this.refundReason === "string") {
    this.refundReason = this.refundReason.trim();
  }

  if (typeof this.invoiceNumber === "string") {
    this.invoiceNumber = this.invoiceNumber.trim();
  }

  if (typeof this.notes === "string") {
    this.notes = this.notes.trim();
  }

  if (
    this.couponDiscountAmount != null &&
    this.couponDiscountAmount > this.amountBeforeDiscount
  ) {
    return next(new Error("Coupon discount cannot exceed original amount"));
  }

  if (this.amount > this.amountBeforeDiscount) {
    return next(new Error("Final amount cannot exceed original amount"));
  }

  if (
    this.planSnapshot?.budgetMin != null &&
    this.planSnapshot?.budgetMax != null &&
    this.planSnapshot.budgetMin > this.planSnapshot.budgetMax
  ) {
    return next(new Error("Plan snapshot budgetMin cannot exceed budgetMax"));
  }

  const maxPostBudgetAmount = this.planSnapshot?.limits?.maxPostBudgetAmount;
  const maxVisibleBudgetAmount =
    this.planSnapshot?.limits?.maxVisibleBudgetAmount;

  if (
    maxPostBudgetAmount != null &&
    maxVisibleBudgetAmount != null &&
    maxPostBudgetAmount > maxVisibleBudgetAmount
  ) {
    return next(
      new Error(
        "Plan snapshot maxPostBudgetAmount cannot exceed maxVisibleBudgetAmount"
      )
    );
  }

  if (["SUCCESS", "VERIFIED"].includes(this.status) && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }

  if (this.status === "SUCCESS" && !this.paidAt) {
    this.paidAt = new Date();
  }

  if (
    ["SUCCESS", "FAILED", "REFUNDED", "CANCELLED", "EXPIRED"].includes(
      this.status
    ) &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }

  if (!["FAILED", "FLAGGED", "MANUAL_REVIEW"].includes(this.status)) {
  this.failureReason = null;
  this.failureCode = null;
}

  if (this.status !== "REFUNDED") {
    this.refundReason = null;
  }

  next();
});

paymentTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ role: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ gateway: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ subscriptionId: 1, createdAt: -1 });
paymentTransactionSchema.index({ renewalOfSubscriptionId: 1, createdAt: -1 });
paymentTransactionSchema.index({ planId: 1, createdAt: -1 });
paymentTransactionSchema.index({
  transactionType: 1,
  status: 1,
  createdAt: -1,
});
paymentTransactionSchema.index({ couponCode: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ isWebhookConfirmed: 1, status: 1 });
paymentTransactionSchema.index({ fraudFlagged: 1, status: 1, createdAt: -1 });

paymentTransactionSchema.index(
  { checkoutAttemptId: 1 },
  {
    unique: true,
  }
);

paymentTransactionSchema.index(
  { receipt: 1 },
  {
    unique: true,
  }
);

paymentTransactionSchema.index(
  { gateway: 1, gatewayOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayOrderId: { $type: "string", $ne: "" } },
  }
);

paymentTransactionSchema.index(
  { gateway: 1, gatewayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayPaymentId: { $type: "string", $ne: "" } },
  }
);

paymentTransactionSchema.index(
  { invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { invoiceNumber: { $type: "string", $ne: "" } },
  }
);

const PaymentTransaction: Model<IPaymentTransaction> =
  mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>(
    "PaymentTransaction",
    paymentTransactionSchema
  );

export default PaymentTransaction;