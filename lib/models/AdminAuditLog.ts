import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AdminAuditTargetType =
  | "USER"
  | "EVENT"
  | "SPONSOR_PROFILE"
  | "SPONSORSHIP"
  | "DEAL"
  | "ADMIN_SESSION"
  | "SYSTEM";

export interface IAdminAuditLog extends Document {
  actorUserId: Types.ObjectId;
  actorAdminRole: string;
  action: string;
  targetType: AdminAuditTargetType;
  targetId: Types.ObjectId | null;
  reason: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actorAdminRole: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 120,
    },

    targetType: {
      type: String,
      enum: ["USER", "EVENT", "SPONSOR_PROFILE", "SPONSORSHIP", "DEAL", "ADMIN_SESSION", "SYSTEM"],
      required: true,
      index: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

adminAuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

const AdminAuditLog: Model<IAdminAuditLog> =
  mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>("AdminAuditLog", adminAuditLogSchema);

export default AdminAuditLog;