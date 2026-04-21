import mongoose, { Document, Model, Schema } from "mongoose";

export type PlanRole = "ORGANIZER" | "SPONSOR";
export type PlanInterval = "MONTHLY" | "YEARLY";

export interface IPlan extends Document {
  code: string;
  role: PlanRole;
  name: string;
  description?: string;

  price: number;
  currency: "INR";
  interval: PlanInterval;
  durationInDays: number;

  postingLimit: number | null;

  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;

  isActive: boolean;
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_CODE_LENGTH = 50;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_PRICE = 100000000;
const MAX_DURATION_DAYS = 3650;

const planSchema = new Schema<IPlan>(
  {
    code: {
      type: String,
      required: [true, "Plan code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: MAX_CODE_LENGTH,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: [true, "Plan role is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      maxlength: MAX_NAME_LENGTH,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_DESCRIPTION_LENGTH,
    },

    price: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Plan price cannot be negative"],
      max: [MAX_PRICE, `Plan price cannot exceed ${MAX_PRICE}`],
      validate: {
        validator: Number.isFinite,
        message: "Plan price must be a valid number",
      },
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },

    interval: {
      type: String,
      enum: ["MONTHLY", "YEARLY"],
      required: [true, "Plan interval is required"],
      index: true,
    },

    durationInDays: {
      type: Number,
      required: [true, "Plan duration is required"],
      min: [1, "Plan duration must be at least 1 day"],
      max: [MAX_DURATION_DAYS, `Plan duration cannot exceed ${MAX_DURATION_DAYS} days`],
    },

    postingLimit: {
      type: Number,
      default: null,
      min: [1, "Posting limit must be at least 1 when provided"],
    },

    canPublish: {
      type: Boolean,
      default: true,
    },

    canContact: {
      type: Boolean,
      default: true,
    },

    canUseMatch: {
      type: Boolean,
      default: true,
    },

    canRevealContact: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

planSchema.pre("validate", function (next) {
  if (typeof this.code === "string") {
    this.code = this.code.trim().toUpperCase();
  }

  if (typeof this.name === "string") {
    this.name = this.name.trim();
  }

  if (typeof this.description === "string") {
    this.description = this.description.trim();
  }

  if (
    this.interval === "MONTHLY" &&
    this.durationInDays > 31
  ) {
    return next(new Error("MONTHLY plans cannot exceed 31 days"));
  }

  if (
    this.interval === "YEARLY" &&
    this.durationInDays < 300
  ) {
    return next(new Error("YEARLY plans must be at least 300 days"));
  }

  next();
});

planSchema.index({ role: 1, interval: 1, isActive: 1 });
planSchema.index({ code: 1, isActive: 1 });
planSchema.index({ isActive: 1, sortOrder: 1, price: 1 });
planSchema.index({ role: 1, isActive: 1, sortOrder: 1 });

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", planSchema);

export default Plan;