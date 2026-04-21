import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type SponsorshipStatus = "active" | "paused" | "closed";
export type SponsorshipVisibilityStatus = "VISIBLE" | "HIDDEN" | "UNDER_REVIEW";
export type SponsorshipModerationStatus = "APPROVED" | "FLAGGED" | "PENDING_REVIEW";

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
  deliverablesExpected: string;
  customMessage: string;

  bannerRequirement: boolean;
  stallRequirement: boolean;
  mikeAnnouncement: boolean;
  socialMediaMention: boolean;
  productDisplay: boolean;

  contactPersonName: string;
  contactPhone: string;

  status: SponsorshipStatus;
  visibilityStatus: SponsorshipVisibilityStatus;
  moderationStatus: SponsorshipModerationStatus;

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
      min: 0,
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

    deliverablesExpected: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1500,
    },

    customMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1500,
    },

    bannerRequirement: {
      type: Boolean,
      default: false,
    },

    stallRequirement: {
      type: Boolean,
      default: false,
    },

    mikeAnnouncement: {
      type: Boolean,
      default: false,
    },

    socialMediaMention: {
      type: Boolean,
      default: false,
    },

    productDisplay: {
      type: Boolean,
      default: false,
    },

    contactPersonName: {
      type: String,
      default: "",
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
      enum: ["active", "paused", "closed"],
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

  if (typeof this.deliverablesExpected === "string") {
    this.deliverablesExpected = this.deliverablesExpected.trim();
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

  next();
});

SponsorshipSchema.index({ sponsorOwnerId: 1, createdAt: -1 });
SponsorshipSchema.index({ sponsorProfileId: 1, createdAt: -1 });
SponsorshipSchema.index({ status: 1, createdAt: -1 });
SponsorshipSchema.index({ category: 1, locationPreference: 1, status: 1 });
SponsorshipSchema.index({ status: 1, expiresAt: 1 });
SponsorshipSchema.index({ visibilityStatus: 1, moderationStatus: 1, isDeleted: 1 });
SponsorshipSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

const Sponsorship: Model<ISponsorship> =
  mongoose.models.Sponsorship ||
  mongoose.model<ISponsorship>("Sponsorship", SponsorshipSchema);

export default Sponsorship;