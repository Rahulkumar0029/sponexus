import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type SecurityEventSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type SecurityEventType =
  | "LOGIN_FAILED"
  | "LOGIN_RATE_LIMITED"
  | "OTP_REQUESTED"
  | "OTP_VERIFICATION_FAILED"
  | "OTP_SESSION_LOCKED"
  | "PAYMENT_CREATE_ORDER_ABUSE"
  | "PAYMENT_VERIFY_FAILED"
  | "PAYMENT_INVALID_SIGNATURE"
  | "PAYMENT_DUPLICATE_DETECTED"
  | "PAYMENT_ORDER_MISMATCH"
  | "PAYMENT_INVALID_AMOUNT"
  | "PAYMENT_MANUAL_REVIEW"
  | "WEBHOOK_INVALID_SIGNATURE"
  | "WEBHOOK_NO_MATCH"
  | "COUPON_ABUSE"
  | "SUBSCRIPTION_ABUSE"
  | "ADMIN_PAYMENT_ACCESS_DENIED"
  | "SUSPICIOUS_ACTIVITY";

export interface ISecurityEvent extends Document {
  userId?: Types.ObjectId | null;
  actorId?: Types.ObjectId | null;

  type: SecurityEventType;
  severity: SecurityEventSeverity;

  ipAddress?: string | null;
  userAgent?: string | null;

  route?: string | null;
  method?: string | null;

  relatedPaymentId?: Types.ObjectId | null;
  relatedSubscriptionId?: Types.ObjectId | null;
  relatedCouponId?: Types.ObjectId | null;

  fingerprint?: string | null;
  notes?: string;

  metadata?: Record<string, any>;

  resolved: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: Types.ObjectId | null;
  resolutionNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_ROUTE_LENGTH = 300;
const MAX_METHOD_LENGTH = 20;
const MAX_IP_LENGTH = 100;
const MAX_UA_LENGTH = 1000;
const MAX_FINGERPRINT_LENGTH = 200;
const MAX_NOTES_LENGTH = 3000;
const MAX_RESOLUTION_NOTES_LENGTH = 3000;

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "LOGIN_FAILED",
        "LOGIN_RATE_LIMITED",
        "OTP_REQUESTED",
        "OTP_VERIFICATION_FAILED",
        "OTP_SESSION_LOCKED",
        "PAYMENT_CREATE_ORDER_ABUSE",
        "PAYMENT_VERIFY_FAILED",
        "PAYMENT_INVALID_SIGNATURE",
        "PAYMENT_DUPLICATE_DETECTED",
        "PAYMENT_ORDER_MISMATCH",
        "PAYMENT_INVALID_AMOUNT",
        "PAYMENT_MANUAL_REVIEW",
        "WEBHOOK_INVALID_SIGNATURE",
        "WEBHOOK_NO_MATCH",
        "COUPON_ABUSE",
        "SUBSCRIPTION_ABUSE",
        "ADMIN_PAYMENT_ACCESS_DENIED",
        "SUSPICIOUS_ACTIVITY",
      ],
      index: true,
    },

    severity: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_IP_LENGTH,
      index: true,
    },

    userAgent: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_UA_LENGTH,
    },

    route: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_ROUTE_LENGTH,
      index: true,
    },

    method: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      maxlength: MAX_METHOD_LENGTH,
    },

    relatedPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
      index: true,
    },

    relatedSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
    },

    relatedCouponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      index: true,
    },

    fingerprint: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_FINGERPRINT_LENGTH,
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_NOTES_LENGTH,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    resolvedAt: {
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

securityEventSchema.pre("validate", function (next) {
  if (typeof this.ipAddress === "string") {
    this.ipAddress = this.ipAddress.trim();
  }

  if (typeof this.userAgent === "string") {
    this.userAgent = this.userAgent.trim();
  }

  if (typeof this.route === "string") {
    this.route = this.route.trim();
  }

  if (typeof this.method === "string") {
    this.method = this.method.trim().toUpperCase();
  }

  if (typeof this.fingerprint === "string") {
    this.fingerprint = this.fingerprint.trim();
  }

  if (typeof this.notes === "string") {
    this.notes = this.notes.trim();
  }

  if (typeof this.resolutionNotes === "string") {
    this.resolutionNotes = this.resolutionNotes.trim();
  }

  if (!this.resolved) {
    this.resolvedAt = null;
    this.resolvedBy = null;
    this.resolutionNotes = "";
  } else if (!this.resolvedAt) {
    this.resolvedAt = new Date();
  }

  next();
});

securityEventSchema.index({ type: 1, severity: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ actorId: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });
securityEventSchema.index({ fingerprint: 1, createdAt: -1 });
securityEventSchema.index({ resolved: 1, severity: 1, createdAt: -1 });
securityEventSchema.index({ relatedPaymentId: 1, createdAt: -1 });
securityEventSchema.index({ relatedSubscriptionId: 1, createdAt: -1 });
securityEventSchema.index({ relatedCouponId: 1, createdAt: -1 });

const SecurityEvent: Model<ISecurityEvent> =
  mongoose.models.SecurityEvent ||
  mongoose.model<ISecurityEvent>("SecurityEvent", securityEventSchema);

export default SecurityEvent;