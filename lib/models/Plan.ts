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

  // Existing fields — do not remove yet
  postingLimitPerDay: number | null;
  dealRequestLimitPerDay: number | null;

  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;

  budgetMin?: number | null;
  budgetMax?: number | null;

  // New company-grade dynamic plan control
  features?: {
    canPublishEvent?: boolean;
    canPublishSponsorship?: boolean;
    canUseMatch?: boolean;
    canRevealContact?: boolean;
    canSendDealRequest?: boolean;
  };

  limits?: {
    eventPostsPerDay?: number | null;
    sponsorshipPostsPerDay?: number | null;
    dealRequestsPerDay?: number | null;
    contactRevealsPerDay?: number | null;
    matchUsesPerDay?: number | null;

    eventPostsPerMonth?: number | null;
    sponsorshipPostsPerMonth?: number | null;
    dealRequestsPerMonth?: number | null;
    contactRevealsPerMonth?: number | null;
matchUsesPerMonth?: number | null;

    maxPostBudgetAmount?: number | null;
    maxVisibleBudgetAmount?: number | null;
  };

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

const planFeaturesSchema = new Schema(
  {
    canPublishEvent: { type: Boolean, default: true },
    canPublishSponsorship: { type: Boolean, default: true },
    canUseMatch: { type: Boolean, default: true },
    canRevealContact: { type: Boolean, default: true },
    canSendDealRequest: { type: Boolean, default: true },
  },
  { _id: false }
);

const planLimitsSchema = new Schema(
  {
    eventPostsPerDay: { type: Number, default: null, min: 0 },
    sponsorshipPostsPerDay: { type: Number, default: null, min: 0 },
    dealRequestsPerDay: { type: Number, default: null, min: 0 },
    contactRevealsPerDay: { type: Number, default: null, min: 0 },
matchUsesPerDay: { type: Number, default: null, min: 0 },

    eventPostsPerMonth: { type: Number, default: null, min: 0 },
    sponsorshipPostsPerMonth: { type: Number, default: null, min: 0 },
    dealRequestsPerMonth: { type: Number, default: null, min: 0 },
    contactRevealsPerMonth: { type: Number, default: null, min: 0 },
matchUsesPerMonth: { type: Number, default: null, min: 0 },

    maxPostBudgetAmount: { type: Number, default: null, min: 0 },
    maxVisibleBudgetAmount: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const MAX_CODE_LENGTH = 80;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_PRICE = 100000000;
const MAX_DURATION_DAYS = 3650;

const planSchema = new Schema<IPlan>(
  {
   
code: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  uppercase: true,
  maxlength: MAX_CODE_LENGTH,
},

name: {
  type: String,
  required: true,
  trim: true,
  maxlength: MAX_NAME_LENGTH,
},

description: {
  type: String,
  default: "",
  trim: true,
  maxlength: MAX_DESCRIPTION_LENGTH,
},

price: {
  type: Number,
  required: true,
  min: 0,
  max: MAX_PRICE,
},

durationInDays: {
  type: Number,
  required: true,
  min: 1,
  max: MAX_DURATION_DAYS,
},

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR", "BOTH"],
      required: true,
      index: true,
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

    features: {
      type: planFeaturesSchema,
      default: () => ({}),
    },

    limits: {
      type: planLimitsSchema,
      default: () => ({}),
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

  const maxPostBudgetAmount = this.limits?.maxPostBudgetAmount;
  const maxVisibleBudgetAmount = this.limits?.maxVisibleBudgetAmount;

  if (
    maxPostBudgetAmount != null &&
    maxVisibleBudgetAmount != null &&
    maxPostBudgetAmount > maxVisibleBudgetAmount
  ) {
    return next(
      new Error("maxPostBudgetAmount cannot be greater than maxVisibleBudgetAmount")
    );
  }

  if (Array.isArray(this.visibleToRoles) && this.visibleToRoles.length === 0) {
  this.visibleToRoles = ["BOTH"];
}

  next();
});

planSchema.index({ role: 1, isActive: 1 });
planSchema.index({ isActive: 1, isArchived: 1, sortOrder: 1 });
planSchema.index({ visibleToRoles: 1, isVisible: 1 });

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", planSchema);

export default Plan;