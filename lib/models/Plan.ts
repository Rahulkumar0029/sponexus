import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PlanRole = "ORGANIZER" | "SPONSOR" | "BOTH";
export type PlanInterval = "CUSTOM" | "MONTHLY" | "YEARLY";

export interface IPlan extends Document {
  code: string;
  role: PlanRole;

  name: string;
  description?: string;

  price: number;
  currency: "INR";

  interval: PlanInterval;
  durationInDays: number;
  extraDays?: number;

  postingLimitPerDay: number | null;
  dealRequestLimitPerDay: number | null;

  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;

  budgetMin?: number | null;
  budgetMax?: number | null;

  isActive: boolean;
  isArchived: boolean;
  isVisible: boolean;

  visibleToRoles: PlanRole[];
  visibleToLoggedOut: boolean;

  sortOrder: number;

  metadata?: Record<string, unknown>;

  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR", "BOTH"],
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    interval: {
      type: String,
      enum: ["CUSTOM", "MONTHLY", "YEARLY"],
      default: "CUSTOM",
    },

    durationInDays: {
      type: Number,
      required: true,
      min: 1,
    },

    extraDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    postingLimitPerDay: {
      type: Number,
      default: null,
      min: 0,
    },

    dealRequestLimitPerDay: {
      type: Number,
      default: null,
      min: 0,
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

    budgetMin: {
      type: Number,
      default: null,
      min: 0,
    },

    budgetMax: {
      type: Number,
      default: null,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    isVisible: {
      type: Boolean,
      default: true,
    },

    visibleToRoles: {
      type: [String],
      enum: ["ORGANIZER", "SPONSOR", "BOTH"],
      default: ["BOTH"],
    },

    visibleToLoggedOut: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

planSchema.pre("validate", function (next) {
  if (typeof this.code === "string") this.code = this.code.trim().toUpperCase();
  if (typeof this.name === "string") this.name = this.name.trim();
  if (typeof this.description === "string") {
    this.description = this.description.trim();
  }

  if (
    this.budgetMin != null &&
    this.budgetMax != null &&
    this.budgetMin > this.budgetMax
  ) {
    return next(new Error("budgetMin cannot be greater than budgetMax"));
  }

  next();
});

planSchema.index({ code: 1 });
planSchema.index({ role: 1, isActive: 1 });
planSchema.index({ isActive: 1, isArchived: 1, sortOrder: 1 });
planSchema.index({ visibleToRoles: 1, isVisible: 1 });

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", planSchema);

export default Plan;