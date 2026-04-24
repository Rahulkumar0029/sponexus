import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditSeverity = "INFO" | "WARN" | "CRITICAL";

export type AuditEntityType =
  | "USER"
  | "PLAN"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "COUPON"
  | "ADMIN_SESSION"
  | "SYSTEM";

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId | null;

  action: string; // e.g. PLAN_UPDATED, PAYMENT_FAILED, COUPON_CREATED

  entityType: AuditEntityType;
  entityId: mongoose.Types.ObjectId | null;

  metadata?: Record<string, any>;

  ipAddress?: string | null;
  userAgent?: string | null;

  severity: AuditSeverity;

  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    entityType: {
      type: String,
      required: true,
      enum: [
        "USER",
        "PLAN",
        "SUBSCRIPTION",
        "PAYMENT",
        "COUPON",
        "ADMIN_SESSION",
        "SYSTEM",
      ],
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    severity: {
      type: String,
      enum: ["INFO", "WARN", "CRITICAL"],
      default: "INFO",
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

// 🔥 Indexes for fast admin queries
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;