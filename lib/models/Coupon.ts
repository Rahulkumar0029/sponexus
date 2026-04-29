import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CouponType = "PERCENTAGE" | "FLAT";
export type CouponRole = "ORGANIZER" | "SPONSOR" | "BOTH";

export interface ICoupon extends Document {
  code: string;
  name: string;
  description?: string;

  type: CouponType;
  value: number;

  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;

  applicableRoles: CouponRole[];
  applicablePlanIds: Types.ObjectId[];

  startsAt?: Date | null;
  expiresAt?: Date | null;

  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;

  usedCount: number;
  reservedCount: number;

  isActive: boolean;
  isArchived: boolean;

  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;

  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_CODE_LENGTH = 100;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_VALUE = 100000000;
const MAX_DISCOUNT_AMOUNT = 100000000;
const MAX_USAGE_LIMIT = 100000000;

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: MAX_CODE_LENGTH,
    },

    name: {
      type: String,
      required: [true, "Coupon name is required"],
      trim: true,
      maxlength: MAX_NAME_LENGTH,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_DESCRIPTION_LENGTH,
    },

    type: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: [true, "Coupon type is required"],
    },

    value: {
      type: Number,
      required: [true, "Coupon value is required"],
      min: [0, "Coupon value cannot be negative"],
      max: [MAX_VALUE, `Coupon value cannot exceed ${MAX_VALUE}`],
      validate: {
        validator: Number.isFinite,
        message: "Coupon value must be a valid number",
      },
    },

    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Max discount amount cannot be negative"],
      max: [MAX_DISCOUNT_AMOUNT, `Max discount amount cannot exceed ${MAX_DISCOUNT_AMOUNT}`],
    },

    minOrderAmount: {
      type: Number,
      default: null,
      min: [0, "Minimum order amount cannot be negative"],
      max: [MAX_VALUE, `Minimum order amount cannot exceed ${MAX_VALUE}`],
    },

    applicableRoles: {
      type: [String],
      enum: ["ORGANIZER", "SPONSOR", "BOTH"],
      default: ["BOTH"],
    },

    applicablePlanIds: {
      type: [Schema.Types.ObjectId],
      ref: "Plan",
      default: [],
    },

    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    totalUsageLimit: {
      type: Number,
      default: null,
      min: [1, "Total usage limit must be at least 1 when provided"],
      max: [MAX_USAGE_LIMIT, `Total usage limit cannot exceed ${MAX_USAGE_LIMIT}`],
    },

    perUserUsageLimit: {
      type: Number,
      default: null,
      min: [1, "Per-user usage limit must be at least 1 when provided"],
      max: [MAX_USAGE_LIMIT, `Per-user usage limit cannot exceed ${MAX_USAGE_LIMIT}`],
    },

    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
    },

    reservedCount: {
      type: Number,
      default: 0,
      min: [0, "Reserved count cannot be negative"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

couponSchema.pre("validate", function (next) {
  if (typeof this.code === "string") this.code = this.code.trim().toUpperCase();
  if (typeof this.name === "string") this.name = this.name.trim();
  if (typeof this.description === "string") this.description = this.description.trim();

  if (Array.isArray(this.applicableRoles) && this.applicableRoles.length === 0) {
    this.applicableRoles = ["BOTH"];
  }

  if (this.type === "PERCENTAGE" && (this.value < 0 || this.value > 100)) {
    return next(new Error("Percentage coupon value must be between 0 and 100"));
  }

  if (
    this.type === "FLAT" &&
    this.maxDiscountAmount != null &&
    this.maxDiscountAmount < this.value
  ) {
    return next(new Error("For flat coupons, maxDiscountAmount cannot be less than value"));
  }

  if (this.startsAt && this.expiresAt && this.expiresAt <= this.startsAt) {
    return next(new Error("expiresAt must be later than startsAt"));
  }

  if (this.totalUsageLimit != null && this.usedCount > this.totalUsageLimit) {
    return next(new Error("usedCount cannot exceed totalUsageLimit"));
  }

  if (
    this.totalUsageLimit != null &&
    this.usedCount + this.reservedCount > this.totalUsageLimit
  ) {
    return next(new Error("usedCount plus reservedCount cannot exceed totalUsageLimit"));
  }

  next();
});

couponSchema.index({ code: 1, isArchived: 1 });
couponSchema.index({ isActive: 1, isArchived: 1, expiresAt: 1 });
couponSchema.index({ applicableRoles: 1, isActive: 1, isArchived: 1 });
couponSchema.index({ startsAt: 1, expiresAt: 1 });
couponSchema.index({ createdAt: -1 });

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", couponSchema);

export default Coupon;