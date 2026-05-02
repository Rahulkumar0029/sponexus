import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type SponsorshipStatus = "active" | "paused" | "closed" | "expired";
export type SponsorshipVisibilityStatus = "VISIBLE" | "HIDDEN" | "UNDER_REVIEW";
export type SponsorshipModerationStatus =
  | "APPROVED"
  | "FLAGGED"
  | "PENDING_REVIEW";

export interface ISponsorship extends Document {
  sponsorOwnerId: Types.ObjectId;
  sponsorProfileId: Types.ObjectId;

  sponsorshipTitle: string;
  sponsorshipType: string;
  budget: number;
  category: string;
  targetAudience: string;
  city: string;
  locationPreference: string;
  campaignGoal: string;
  coverImage: string;
  deliverablesExpected: string[];
  customMessage: string;

  contactPersonName: string;
  contactPhone: string;

  status: SponsorshipStatus;
  visibilityStatus: SponsorshipVisibilityStatus;
  moderationStatus: SponsorshipModerationStatus;

  pausedAt: Date | null;
  resumedAt: Date | null;
  closedAt: Date | null;

  duplicatedFrom: Types.ObjectId | null;
  repostCount: number;

  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;

  flagReason: string;
  adminNotes: string;

  expiresAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
const MAX_BUDGET = 100000000;

const SponsorshipSchema = new Schema<ISponsorship>(
  {
    sponsorOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sponsorProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Sponsor",
      required: true,
      index: true,
    },

    sponsorshipTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    sponsorshipType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

   budget: {
  type: Number,
  required: true,
  min: 2000,
  max: MAX_BUDGET,
  validate: {
    validator: Number.isFinite,
    message: "Budget must be a valid number",
  },
},

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },

    targetAudience: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    locationPreference: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },

    campaignGoal: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    coverImage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    deliverablesExpected: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) &&
          value.length === 3 &&
          value.every(
            (item) => typeof item === "string" && item.trim().length > 0
          ),
        message: "Exactly 3 deliverables are required",
      },
    },

    customMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1500,
    },

   contactPersonName: {
  type: String,
  required: true,
  trim: true,
  maxlength: 120,
},
    contactPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
      validate: {
        validator: (value: string) => phoneRegex.test(value),
        message: "Invalid contact phone number",
      },
    },

    status: {
      type: String,
      enum: ["active", "paused", "closed", "expired"],
      default: "active",
      index: true,
    },

    visibilityStatus: {
      type: String,
      enum: ["VISIBLE", "HIDDEN", "UNDER_REVIEW"],
      default: "VISIBLE",
      index: true,
    },

    moderationStatus: {
      type: String,
      enum: ["APPROVED", "FLAGGED", "PENDING_REVIEW"],
      default: "APPROVED",
      index: true,
    },

    pausedAt: {
      type: Date,
      default: null,
      index: true,
    },

    resumedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
      index: true,
    },

    duplicatedFrom: {
      type: Schema.Types.ObjectId,
      ref: "Sponsorship",
      default: null,
      index: true,
    },

    repostCount: {
      type: Number,
      default: 0,
      min: 0,
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
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    flagReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
      select: false,
    },

    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
      select: false,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.deletedAt;
        delete ret.deletedBy;
        delete ret.flagReason;
        delete ret.adminNotes;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.deletedAt;
        delete ret.deletedBy;
        delete ret.flagReason;
        delete ret.adminNotes;
        return ret;
      },
    },
  }
);

SponsorshipSchema.pre("validate", function (next) {
  if (typeof this.sponsorshipTitle === "string") {
    this.sponsorshipTitle = this.sponsorshipTitle.trim();
  }

  if (typeof this.sponsorshipType === "string") {
    this.sponsorshipType = this.sponsorshipType.trim();
  }

  if (typeof this.category === "string") {
    this.category = this.category.trim();
  }

  if (typeof this.targetAudience === "string") {
    this.targetAudience = this.targetAudience.trim();
  }

  if (typeof this.city === "string") {
    this.city = this.city.trim();
  }

  if (typeof this.locationPreference === "string") {
    this.locationPreference = this.locationPreference.trim();
  }

  if (typeof this.campaignGoal === "string") {
    this.campaignGoal = this.campaignGoal.trim();
  }

  if (typeof this.coverImage === "string") {
    this.coverImage = this.coverImage.trim();
  }

  if (Array.isArray(this.deliverablesExpected)) {
    this.deliverablesExpected = this.deliverablesExpected
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof this.customMessage === "string") {
    this.customMessage = this.customMessage.trim();
  }

  if (typeof this.contactPersonName === "string") {
    this.contactPersonName = this.contactPersonName.trim();
  }

  if (typeof this.contactPhone === "string") {
    this.contactPhone = this.contactPhone.trim();
  }

  if (!this.isDeleted) {
    this.deletedAt = null;
    this.deletedBy = null;
  }

  if (this.moderationStatus !== "FLAGGED") {
    this.flagReason = "";
  }

  if (typeof this.repostCount !== "number" || this.repostCount < 0) {
    this.repostCount = 0;
  }

  next();
});

SponsorshipSchema.index({ sponsorOwnerId: 1, createdAt: -1 });
SponsorshipSchema.index({ sponsorProfileId: 1, createdAt: -1 });
SponsorshipSchema.index({ status: 1, createdAt: -1 });
SponsorshipSchema.index({ category: 1, locationPreference: 1, status: 1 });
SponsorshipSchema.index({ status: 1, expiresAt: 1 });
SponsorshipSchema.index({ sponsorOwnerId: 1, status: 1, createdAt: -1 });
SponsorshipSchema.index({ sponsorOwnerId: 1, status: 1, expiresAt: 1 });
SponsorshipSchema.index({ duplicatedFrom: 1, createdAt: -1 });
SponsorshipSchema.index({
  visibilityStatus: 1,
  moderationStatus: 1,
  isDeleted: 1,
});
SponsorshipSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

const Sponsorship: Model<ISponsorship> =
  mongoose.models.Sponsorship ||
  mongoose.model<ISponsorship>("Sponsorship", SponsorshipSchema);

export default Sponsorship;