import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FraudFlagSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type FraudFlagStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "CONFIRMED"
  | "FALSE_POSITIVE"
  | "RESOLVED";

export type FraudFlagEntityType =
  | "USER"
  | "PAYMENT"
  | "SUBSCRIPTION"
  | "COUPON"
  | "WEBHOOK"
  | "ADMIN_SESSION"
  | "SYSTEM";

export interface IFraudFlag extends Document {
  entityType: FraudFlagEntityType;
  entityId?: Types.ObjectId | null;

  userId?: Types.ObjectId | null;
  paymentId?: Types.ObjectId | null;
  subscriptionId?: Types.ObjectId | null;
  couponId?: Types.ObjectId | null;
  securityEventId?: Types.ObjectId | null;

  title: string;
  reason: string;
  signals: string[];
  severity: FraudFlagSeverity;
  score: number;

  status: FraudFlagStatus;

  ipAddress?: string | null;
  fingerprint?: string | null;

  metadata?: Record<string, unknown>;

  assignedTo?: Types.ObjectId | null;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;

  resolvedBy?: Types.ObjectId | null;
  resolutionNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_TITLE_LENGTH = 200;
const MAX_REASON_LENGTH = 2000;
const MAX_SIGNAL_LENGTH = 200;
const MAX_IP_LENGTH = 100;
const MAX_FINGERPRINT_LENGTH = 200;
const MAX_RESOLUTION_NOTES_LENGTH = 3000;

const fraudFlagSchema = new Schema<IFraudFlag>(
  {
    entityType: {
      type: String,
      required: true,
      enum: [
        "USER",
        "PAYMENT",
        "SUBSCRIPTION",
        "COUPON",
        "WEBHOOK",
        "ADMIN_SESSION",
        "SYSTEM",
      ],
    },

    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },

    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    securityEventId: {
      type: Schema.Types.ObjectId,
      ref: "SecurityEvent",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_TITLE_LENGTH,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_REASON_LENGTH,
    },

    signals: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) =>
          Array.isArray(arr) &&
          arr.every(
            (item) =>
              typeof item === "string" &&
              item.trim().length <= MAX_SIGNAL_LENGTH
          ),
        message: "Invalid fraud signals.",
      },
    },

    severity: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      required: true,
      enum: ["OPEN", "UNDER_REVIEW", "CONFIRMED", "FALSE_POSITIVE", "RESOLVED"],
      default: "OPEN",
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_IP_LENGTH,
    },

    fingerprint: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_FINGERPRINT_LENGTH,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolutionNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_RESOLUTION_NOTES_LENGTH,
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

/* INDEXES (ONLY HERE, NOT IN FIELDS) */
fraudFlagSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
fraudFlagSchema.index({ status: 1, severity: 1, createdAt: -1 });
fraudFlagSchema.index({ userId: 1, status: 1, createdAt: -1 });
fraudFlagSchema.index({ paymentId: 1, status: 1, createdAt: -1 });
fraudFlagSchema.index({ subscriptionId: 1, status: 1, createdAt: -1 });
fraudFlagSchema.index({ couponId: 1, status: 1, createdAt: -1 });
fraudFlagSchema.index({ securityEventId: 1 });
fraudFlagSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
fraudFlagSchema.index({ resolvedBy: 1, status: 1, createdAt: -1 });
fraudFlagSchema.index({ ipAddress: 1, createdAt: -1 });
fraudFlagSchema.index({ fingerprint: 1, createdAt: -1 });

const FraudFlag: Model<IFraudFlag> =
  mongoose.models.FraudFlag ||
  mongoose.model<IFraudFlag>("FraudFlag", fraudFlagSchema);

export default FraudFlag;