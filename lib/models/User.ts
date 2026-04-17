import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "ORGANIZER" | "SPONSOR";

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

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;