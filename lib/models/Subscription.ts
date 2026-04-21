import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type SubscriptionStatus =
  | "ACTIVE"
  | "GRACE"
  | "EXPIRED"
  | "CANCELLED"
  | "SUSPENDED";

export type SubscriptionSource = "MANUAL" | "GATEWAY" | "ADMIN_GRANTED";

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  role: "ORGANIZER" | "SPONSOR";
  planId: Types.ObjectId;

  status: SubscriptionStatus;

  startDate: Date;
  endDate: Date;
  graceEndDate?: Date | null;

  autoRenew: boolean;
  renewalCount: number;

  source: SubscriptionSource;

  lastPaymentId?: Types.ObjectId | null;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_NOTES_LENGTH = 2000;

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Subscription role is required"],
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan is required"],
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "GRACE", "EXPIRED", "CANCELLED", "SUSPENDED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      index: true,
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
      index: true,
    },

    graceEndDate: {
      type: Date,
      default: null,
    },

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
      index: true,
    },

    lastPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
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
  if (typeof this.notes === "string") {
    this.notes = this.notes.trim();
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

  if (this.status !== "GRACE") {
    this.graceEndDate = null;
  }

  next();
});

subscriptionSchema.index({ userId: 1, role: 1, status: 1 });
subscriptionSchema.index({ userId: 1, endDate: -1 });
subscriptionSchema.index({ role: 1, status: 1, endDate: 1 });
subscriptionSchema.index({ userId: 1, role: 1, endDate: -1, createdAt: -1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ lastPaymentId: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;