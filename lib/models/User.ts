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
  emailVerifiedAt?: Date | null;
  emailVerificationValidUntil?: Date | null;

  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;

  pendingEmail?: string | null;
  emailChangeToken?: string | null;
  emailChangeExpires?: Date | null;

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
      maxlength: 150,
    },

  email: {
  type: String,
  required: [true, "Email is required"],
  unique: true,
  lowercase: true,
  trim: true,
  maxlength: 320,
  match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"],
},

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      maxlength: 200,
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
      maxlength: 60,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 60,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    avatar: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    phone: {
      type: String,
      default: "",
      maxlength: 20,
    },

    organizationName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    eventFocus: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    organizerTargetAudience: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    organizerLocation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    emailVerificationValidUntil: {
      type: Date,
      default: null,
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

    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      maxlength: 320,
      select: false,
    },

    emailChangeToken: {
      type: String,
      default: null,
      select: false,
    },

    emailChangeExpires: {
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
      select: false,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
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
      select: false,
    },

    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    suspensionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
      select: false,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      default: null,
      select: false,
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
      select: false,
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.emailChangeToken;
        delete ret.emailChangeExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.deletedAt;
        delete ret.deletedBy;
        delete ret.suspendedAt;
        delete ret.suspendedBy;
        delete ret.suspensionReason;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.emailChangeToken;
        delete ret.emailChangeExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.deletedAt;
        delete ret.deletedBy;
        delete ret.suspendedAt;
        delete ret.suspendedBy;
        delete ret.suspensionReason;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
  }
);

userSchema.pre("validate", function (next) {
  if (typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }

  if (typeof this.pendingEmail === "string") {
    this.pendingEmail = this.pendingEmail.trim().toLowerCase();
  }

  if (this.firstName || this.lastName) {
    this.firstName = (this.firstName || "").trim();
    this.lastName = (this.lastName || "").trim();
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }

  if (typeof this.companyName === "string") this.companyName = this.companyName.trim();
  if (typeof this.phone === "string") this.phone = this.phone.trim();
  if (typeof this.bio === "string") this.bio = this.bio.trim();
  if (typeof this.organizationName === "string") this.organizationName = this.organizationName.trim();
  if (typeof this.eventFocus === "string") this.eventFocus = this.eventFocus.trim();
  if (typeof this.organizerTargetAudience === "string") this.organizerTargetAudience = this.organizerTargetAudience.trim();
  if (typeof this.organizerLocation === "string") this.organizerLocation = this.organizerLocation.trim();

  next();
});

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ adminRole: 1, accountStatus: 1 });
userSchema.index({ isDeleted: 1, accountStatus: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;