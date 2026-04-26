import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CouponRedemptionStatus =
  | "RESERVED"
  | "COMPLETED"
  | "FAILED"
  | "RELEASED";

export interface ICouponRedemption extends Document {
  couponId: Types.ObjectId;
  paymentTransactionId: Types.ObjectId;

  userId: Types.ObjectId;
  planId: Types.ObjectId;

  codeSnapshot: string;

  role: "ORGANIZER" | "SPONSOR";

  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;

  amountBeforeDiscount: number;
  discountAmount: number;
  finalAmount: number;

  status: CouponRedemptionStatus;

  reservedAt?: Date | null;
  completedAt?: Date | null;
  releasedAt?: Date | null;
  failedAt?: Date | null;

  failureReason?: string | null;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_CODE_LENGTH = 100;
const MAX_AMOUNT = 100000000;
const MAX_REASON_LENGTH = 1000;
const MAX_NOTES_LENGTH = 2000;

const couponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },

    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      unique: true, // 🔥 VERY IMPORTANT: 1 payment = 1 redemption
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    codeSnapshot: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: MAX_CODE_LENGTH,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_AMOUNT,
    },

    amountBeforeDiscount: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_AMOUNT,
    },

    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_AMOUNT,
    },

    finalAmount: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_AMOUNT,
    },

    status: {
      type: String,
      enum: ["RESERVED", "COMPLETED", "FAILED", "RELEASED"],
      default: "RESERVED",
    },

    reservedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
      maxlength: MAX_REASON_LENGTH,
      select: false,
    },

    notes: {
      type: String,
      default: "",
      maxlength: MAX_NOTES_LENGTH,
      select: false,
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

/* ===============================
   PRE VALIDATION
=================================*/
couponRedemptionSchema.pre("validate", function (next) {
  // normalize
  if (typeof this.codeSnapshot === "string") {
    this.codeSnapshot = this.codeSnapshot.trim().toUpperCase();
  }

  if (typeof this.failureReason === "string") {
    this.failureReason = this.failureReason.trim();
  }

  if (typeof this.notes === "string") {
    this.notes = this.notes.trim();
  }

  // 🔒 Safety checks
  if (this.discountAmount > this.amountBeforeDiscount) {
    return next(
      new Error("Discount amount cannot exceed amountBeforeDiscount")
    );
  }

  if (this.finalAmount > this.amountBeforeDiscount) {
    return next(
      new Error("Final amount cannot exceed amountBeforeDiscount")
    );
  }

  if (this.finalAmount < 0) {
    return next(new Error("Final amount cannot be negative"));
  }

  /* ===============================
     STATUS TIMESTAMP CONTROL
  =================================*/
  if (this.status === "COMPLETED") {
    this.completedAt = this.completedAt || new Date();
    this.failedAt = null;
    this.releasedAt = null;
  }

  if (this.status === "FAILED") {
    this.failedAt = this.failedAt || new Date();
    this.completedAt = null;
    this.releasedAt = null;
  }

  if (this.status === "RELEASED") {
    this.releasedAt = this.releasedAt || new Date();
    this.completedAt = null;
    this.failedAt = null;
  }

  if (this.status === "RESERVED") {
    this.reservedAt = this.reservedAt || new Date();
    this.completedAt = null;
    this.failedAt = null;
    this.releasedAt = null;
  }

  next();
});

/* ===============================
   INDEXES (IMPORTANT FOR ANALYTICS + FRAUD)
=================================*/
couponRedemptionSchema.index({ couponId: 1, status: 1, createdAt: -1 });
couponRedemptionSchema.index({ userId: 1, couponId: 1, createdAt: -1 });
couponRedemptionSchema.index({ codeSnapshot: 1, createdAt: -1 });
couponRedemptionSchema.index({ planId: 1, createdAt: -1 });
couponRedemptionSchema.index({ role: 1, createdAt: -1 });

const CouponRedemption: Model<ICouponRedemption> =
  mongoose.models.CouponRedemption ||
  mongoose.model<ICouponRedemption>(
    "CouponRedemption",
    couponRedemptionSchema
  );

export default CouponRedemption;