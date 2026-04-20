import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AdminOtpPurpose = "LOGIN" | "STEP_UP";

export interface IAdminOtp extends Document {
  userId: Types.ObjectId;
  email: string;
  codeHash: string;
  purpose: AdminOtpPurpose;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminOtpSchema = new Schema<IAdminOtp>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    codeHash: {
      type: String,
      required: true,
      select: false,
    },

    purpose: {
      type: String,
      enum: ["LOGIN", "STEP_UP"],
      default: "LOGIN",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },

    consumedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

adminOtpSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
adminOtpSchema.index({ email: 1, purpose: 1, createdAt: -1 });
adminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminOtp: Model<IAdminOtp> =
  mongoose.models.AdminOtp ||
  mongoose.model<IAdminOtp>("AdminOtp", adminOtpSchema);

export default AdminOtp;