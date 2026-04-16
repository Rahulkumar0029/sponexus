import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type SponsorshipStatus = "active" | "paused" | "closed";

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
  expiresAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

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
    },

    budget: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Budget must be a valid number",
      },
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    targetAudience: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    locationPreference: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    campaignGoal: {
      type: String,
      required: true,
      trim: true,
    },

    deliverablesExpected: {
      type: String,
      default: "",
      trim: true,
    },

    customMessage: {
      type: String,
      default: "",
      trim: true,
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
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "paused", "closed"],
      default: "active",
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
SponsorshipSchema.index({ sponsorOwnerId: 1, createdAt: -1 });
SponsorshipSchema.index({ status: 1, createdAt: -1 });
SponsorshipSchema.index({ category: 1, locationPreference: 1, status: 1 });
SponsorshipSchema.index({ status: 1, expiresAt: 1 });

const Sponsorship: Model<ISponsorship> =
  mongoose.models.Sponsorship ||
  mongoose.model<ISponsorship>("Sponsorship", SponsorshipSchema);

export default Sponsorship;