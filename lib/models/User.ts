import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type UserRole = "ORGANIZER" | "SPONSOR";
export type AdminRole =
  | "NONE"
  | "SUPPORT_ADMIN"
  | "VERIFICATION_ADMIN"
  | "ADMIN"
  | "SUPER_ADMIN";
export type AccountStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED"
  | "PENDING_REVIEW";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;

  firstName: string;
  lastName: string;
  companyName?: string;

  avatar?: string;
  bio?: string;
  phone?: string;

  organizationName?: string;
  eventFocus?: string;
  organizerTargetAudience?: string;
  organizerLocation?: string;

  isEmailVerified: boolean;
  isProfileComplete: boolean;

  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;

  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;

  accountStatus: AccountStatus;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;

  adminRole: AdminRole;

  suspendedAt?: Date | null;
  suspendedBy?: Types.ObjectId | null;
  suspensionReason?: string;

  failedLoginAttempts: number;
  lockUntil?: Date | null;
  lastLoginAt?: Date | null;
  lastActiveAt?: Date | null;
  passwordChangedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Role is required"],
      index: true,
    },

    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    organizationName: {
      type: String,
      trim: true,
      default: "",
    },

    eventFocus: {
      type: String,
      trim: true,
      default: "",
    },

    organizerTargetAudience: {
      type: String,
      trim: true,
      default: "",
    },

    organizerLocation: {
      type: String,
      trim: true,
      default: "",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },

    accountStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DISABLED", "PENDING_REVIEW"],
      default: "ACTIVE",
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminRole: {
      type: String,
      enum: ["NONE", "SUPPORT_ADMIN", "VERIFICATION_ADMIN", "ADMIN", "SUPER_ADMIN"],
      default: "NONE",
      index: true,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    suspensionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("validate", function (next) {
  if (this.firstName || this.lastName) {
    this.name = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }
  next();
});

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ adminRole: 1, accountStatus: 1 });
userSchema.index({ isDeleted: 1, accountStatus: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;