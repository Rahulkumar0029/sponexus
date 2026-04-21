import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED"
  | "MANUAL_REVIEW";

export type PaymentGateway = "RAZORPAY" | "CASHFREE" | "MANUAL";

export interface IPaymentTransaction extends Document {
  userId: Types.ObjectId;
  subscriptionId?: Types.ObjectId | null;
  planId: Types.ObjectId;

  role: "ORGANIZER" | "SPONSOR";

  amount: number;
  currency: "INR";

  status: PaymentStatus;
  gateway: PaymentGateway;
  method?: string;

  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;

  paidAt?: Date | null;
  failureReason?: string;
  refundReason?: string;

  invoiceNumber?: string;
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

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan is required"],
      index: true,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Payment role is required"],
      index: true,
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
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED", "MANUAL_REVIEW"],
      default: "PENDING",
      required: true,
      index: true,
    },

    gateway: {
      type: String,
      enum: ["RAZORPAY", "CASHFREE", "MANUAL"],
      default: "MANUAL",
      required: true,
      index: true,
    },

    method: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_METHOD_LENGTH,
    },

    gatewayOrderId: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_GATEWAY_ID_LENGTH,
      index: true,
    },

    gatewayPaymentId: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_GATEWAY_ID_LENGTH,
      index: true,
    },

    gatewaySignature: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_SIGNATURE_LENGTH,
      select: false,
    },

    paidAt: {
      type: Date,
      default: null,
      index: true,
    },

    failureReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_REASON_LENGTH,
      select: false,
    },

    refundReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_REASON_LENGTH,
      select: false,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_INVOICE_LENGTH,
      index: true,
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
        delete ret.failureReason;
        delete ret.refundReason;
        delete ret.notes;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.gatewaySignature;
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

  if (typeof this.gatewayOrderId === "string") {
    this.gatewayOrderId = this.gatewayOrderId.trim();
  }

  if (typeof this.gatewayPaymentId === "string") {
    this.gatewayPaymentId = this.gatewayPaymentId.trim();
  }

  if (typeof this.gatewaySignature === "string") {
    this.gatewaySignature = this.gatewaySignature.trim();
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

  if (this.status === "SUCCESS" && !this.paidAt) {
    this.paidAt = new Date();
  }

  if (this.status !== "FAILED") {
    this.failureReason = "";
  }

  if (this.status !== "REFUNDED") {
    this.refundReason = "";
  }

  next();
});

paymentTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ role: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ gateway: 1, status: 1, createdAt: -1 });
paymentTransactionSchema.index({ subscriptionId: 1, createdAt: -1 });
paymentTransactionSchema.index({ planId: 1, createdAt: -1 });
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