import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PaymentAdminSessionStatus =
  | "OTP_PENDING"
  | "VERIFIED"
  | "EXPIRED"
  | "REVOKED"
  | "LOCKED";

export interface IPaymentAdminSession extends Document {
  adminId: Types.ObjectId;
  email: string;

  status: PaymentAdminSessionStatus;
  isActive: boolean;

  otpHash?: string | null;
  otpRequestedAt?: Date | null;
  otpExpiresAt?: Date | null;
  otpRequestCount: number;
  otpAttemptCount: number;
  maxOtpAttempts: number;

  verifiedAt?: Date | null;
  sessionExpiresAt?: Date | null;
  lastUsedAt?: Date | null;

  ipAddress?: string | null;
  userAgent?: string | null;

  revokedAt?: Date | null;
  revokeReason?: string | null;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_EMAIL_LENGTH = 320;
const MAX_HASH_LENGTH = 255;
const MAX_IP_LENGTH = 100;
const MAX_USER_AGENT_LENGTH = 1000;
const MAX_REASON_LENGTH = 1000;

const paymentAdminSessionSchema = new Schema<IPaymentAdminSession>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin user is required"],
      index: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: MAX_EMAIL_LENGTH,
      index: true,
    },

    status: {
      type: String,
      enum: ["OTP_PENDING", "VERIFIED", "EXPIRED", "REVOKED", "LOCKED"],
      default: "OTP_PENDING",
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },

    otpHash: {
      type: String,
      default: null,
      maxlength: MAX_HASH_LENGTH,
      select: false,
    },

    otpRequestedAt: {
      type: Date,
      default: null,
      index: true,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    otpRequestCount: {
      type: Number,
      default: 0,
      min: [0, "OTP request count cannot be negative"],
    },

    otpAttemptCount: {
      type: Number,
      default: 0,
      min: [0, "OTP attempt count cannot be negative"],
    },

    maxOtpAttempts: {
      type: Number,
      default: 5,
      min: [1, "maxOtpAttempts must be at least 1"],
    },

    verifiedAt: {
      type: Date,
      default: null,
      index: true,
    },

    sessionExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_IP_LENGTH,
    },

    userAgent: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_USER_AGENT_LENGTH,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokeReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_REASON_LENGTH,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.otpHash;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.otpHash;
        return ret;
      },
    },
  }
);

paymentAdminSessionSchema.pre("validate", function (next) {
  if (typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }

  if (typeof this.ipAddress === "string") {
    this.ipAddress = this.ipAddress.trim();
  }

  if (typeof this.userAgent === "string") {
    this.userAgent = this.userAgent.trim();
  }

  if (typeof this.revokeReason === "string") {
    this.revokeReason = this.revokeReason.trim();
  }

  if (this.status === "OTP_PENDING") {
    if (!this.otpExpiresAt) {
      return next(new Error("OTP pending sessions must have otpExpiresAt"));
    }
    this.verifiedAt = null;
    this.sessionExpiresAt = null;
    this.revokedAt = null;
    this.revokeReason = null;
    this.isActive = true;
  }

  if (this.status === "VERIFIED") {
    if (!this.sessionExpiresAt) {
      return next(new Error("Verified sessions must have sessionExpiresAt"));
    }
    this.otpHash = this.otpHash ?? null;
    this.otpExpiresAt = null;
    this.revokedAt = null;
    this.revokeReason = null;
    this.isActive = true;
    this.verifiedAt = this.verifiedAt || new Date();
  }

  if (this.status === "LOCKED") {
    if (this.otpAttemptCount < this.maxOtpAttempts) {
      return next(
        new Error("Locked sessions must have otpAttemptCount >= maxOtpAttempts")
      );
    }
    this.isActive = false;
    this.sessionExpiresAt = null;
  }

  if (this.status === "EXPIRED") {
    this.isActive = false;
    this.otpHash = this.otpHash ?? null;
    this.revokedAt = null;
    this.revokeReason = null;
  }

  if (this.status === "REVOKED") {
    this.isActive = false;
    this.revokedAt = this.revokedAt || new Date();
  }

  next();
});

paymentAdminSessionSchema.index({ adminId: 1, status: 1, createdAt: -1 });
paymentAdminSessionSchema.index({ adminId: 1, isActive: 1, createdAt: -1 });
paymentAdminSessionSchema.index({ email: 1, status: 1, createdAt: -1 });
paymentAdminSessionSchema.index({ sessionExpiresAt: 1, status: 1 });
paymentAdminSessionSchema.index({ otpExpiresAt: 1, status: 1 });
paymentAdminSessionSchema.index({ verifiedAt: 1, status: 1 });
paymentAdminSessionSchema.index({ lastUsedAt: 1 });

const PaymentAdminSession: Model<IPaymentAdminSession> =
  mongoose.models.PaymentAdminSession ||
  mongoose.model<IPaymentAdminSession>(
    "PaymentAdminSession",
    paymentAdminSessionSchema
  );

export default PaymentAdminSession;