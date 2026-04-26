import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type SubscriptionStatus =
  | "ACTIVE"
  | "GRACE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export type SubscriptionSource = "MANUAL" | "GATEWAY" | "ADMIN_GRANTED";

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
  matchUsesPerDay?: number | null;
matchUsesPerMonth?: number | null;
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
    matchUsesPerDay: number | null;
    eventPostsPerMonth?: number | null;
    sponsorshipPostsPerMonth?: number | null;
    dealRequestsPerMonth?: number | null;
    contactRevealsPerMonth?: number | null;
    matchUsesPerMonth: number | null;
    maxPostBudgetAmount?: number | null;
    maxVisibleBudgetAmount?: number | null;
  };
}

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  role: "ORGANIZER" | "SPONSOR";
  planId: Types.ObjectId;
  planSnapshot?: IPlanSnapshot | null;
  status: SubscriptionStatus;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  graceEndDate?: Date | null;
  activatedAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
  autoRenew: boolean;
  renewalCount: number;
  source: SubscriptionSource;
  baseDurationInDays: number;
  extraDaysApplied: number;
  lastPaymentId?: Types.ObjectId | null;
  grantedByAdminId?: Types.ObjectId | null;
  couponCodeUsed?: string | null;
  couponDiscountAmount?: number | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_NOTES_LENGTH = 2000;
const MAX_COUPON_CODE_LENGTH = 100;

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
    eventPostsPerDay: { type: Number, default: null, min: 0 },
    sponsorshipPostsPerDay: { type: Number, default: null, min: 0 },
    dealRequestsPerDay: { type: Number, default: null, min: 0 },
    contactRevealsPerDay: { type: Number, default: null, min: 0 },
   matchUsesPerDay: { type: Number, default: null, min: 0 },
    eventPostsPerMonth: { type: Number, default: null, min: 0 },
    sponsorshipPostsPerMonth: { type: Number, default: null, min: 0 },
    dealRequestsPerMonth: { type: Number, default: null, min: 0 },
    contactRevealsPerMonth: { type: Number, default: null, min: 0 },
   matchUsesPerMonth: { type: Number, default: null, min: 0 },
    maxPostBudgetAmount: { type: Number, default: null, min: 0 },
    maxVisibleBudgetAmount: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const planSnapshotSchema = new Schema<IPlanSnapshot>(
  {
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR", "BOTH"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR"], required: true, default: "INR" },
    durationInDays: { type: Number, required: true, min: 1 },
    extraDays: { type: Number, default: 0, min: 0 },
    postingLimitPerDay: { type: Number, default: null, min: 0 },
    dealRequestLimitPerDay: { type: Number, default: null, min: 0 },
    canPublish: { type: Boolean, default: true },
    canContact: { type: Boolean, default: true },
    canUseMatch: { type: Boolean, default: true },
    canRevealContact: { type: Boolean, default: true },
    budgetMin: { type: Number, default: null, min: 0 },
    budgetMax: { type: Number, default: null, min: 0 },
    features: { type: planFeaturesSnapshotSchema, default: () => ({}) },
    limits: { type: planLimitsSnapshotSchema, default: () => ({}) },
  },
  { _id: false }
);

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Subscription role is required"],
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

    status: {
      type: String,
      enum: ["ACTIVE", "GRACE", "EXPIRED", "CANCELLED", "SUSPENDED"],
      default: "ACTIVE",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    graceEndDate: {
      type: Date,
      default: null,
    },

    activatedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    autoRenew: {
      type: Boolean,
      default: false,
    },

    renewalCount: {
      type: Number,
      default: 0,
      min: [0, "Renewal count cannot be negative"],
    },

    source: {
      type: String,
      enum: ["MANUAL", "GATEWAY", "ADMIN_GRANTED"],
      default: "MANUAL",
      required: true,
    },

    baseDurationInDays: {
      type: Number,
      required: true,
      min: [1, "Base duration must be at least 1 day"],
    },

    extraDaysApplied: {
      type: Number,
      default: 0,
      min: [0, "Extra days cannot be negative"],
    },

    lastPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
    },

    grantedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    couponCodeUsed: {
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
        delete ret.notes;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.notes;
        return ret;
      },
    },
  }
);

subscriptionSchema.pre("validate", function (next) {
  if (typeof this.notes === "string") this.notes = this.notes.trim();

  if (typeof this.couponCodeUsed === "string") {
    this.couponCodeUsed = this.couponCodeUsed.trim().toUpperCase();
  }

  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error("End date cannot be before start date"));
  }

  if (
    this.status === "GRACE" &&
    (!this.graceEndDate || this.graceEndDate < this.endDate)
  ) {
    return next(
      new Error("Grace period subscriptions must have a valid graceEndDate")
    );
  }

  if (this.status !== "GRACE") this.graceEndDate = null;

  if (this.couponDiscountAmount != null && this.couponDiscountAmount < 0) {
    return next(new Error("Coupon discount amount cannot be negative"));
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

  next();
});

subscriptionSchema.index({ userId: 1, role: 1, status: 1 });
subscriptionSchema.index({ userId: 1, endDate: -1 });
subscriptionSchema.index({ role: 1, status: 1, endDate: 1 });
subscriptionSchema.index({ userId: 1, role: 1, endDate: -1, createdAt: -1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ isActive: 1, status: 1 });
subscriptionSchema.index({ source: 1, status: 1 });
subscriptionSchema.index({ grantedByAdminId: 1 });
subscriptionSchema.index({ couponCodeUsed: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;