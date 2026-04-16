import mongoose, { Schema, Model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "ORGANIZER" | "SPONSOR";

  firstName: string;
  lastName: string;
  companyName: string;

  avatar?: string;
  bio?: string;
  phone?: string;

  // Organizer-specific fields
  organizationName?: string;
  eventFocus?: string;
  organizerTargetAudience?: string;
  organizerLocation?: string;

  // Password reset
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Invalid email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Role is required"],
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
      required: [true, "Company name is required"],
      trim: true,
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

    // Organizer-specific
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

    resetPasswordToken: {
      type: String,
      default: "",
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 🔥 Auto-generate full name
userSchema.pre("validate", function (next) {
  if (!this.name && this.firstName && this.lastName) {
    this.name = `${this.firstName.trim()} ${this.lastName.trim()}`;
  }
  next();
});

// ✅ FINAL EXPORT (IMPORTANT)
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;