import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAdminSession extends Document {
  userId: Types.ObjectId;
  sessionTokenHash: string;
  ipAddress: string;
  userAgent: string;
  isStepUpVerified: boolean;
  lastStepUpAt: Date | null;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSessionSchema = new Schema<IAdminSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      index: true,
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

    isStepUpVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastStepUpAt: {
      type: Date,
      default: null,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    revokeReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

adminSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminSession: Model<IAdminSession> =
  mongoose.models.AdminSession ||
  mongoose.model<IAdminSession>("AdminSession", adminSessionSchema);

export default AdminSession;