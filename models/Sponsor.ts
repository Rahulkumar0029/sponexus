import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISponsor extends Document {
  userId: Types.ObjectId;

  // Brand identity
  brandName: string;
  companyName: string;
  website: string;
  officialEmail: string;
  phone: string;

  // Business profile
  industry: string;
  companySize: string;
  about: string;
  logoUrl: string;

  // Preferences for matching
  targetAudience: string;
  preferredCategories: string[];
  preferredLocations: string[];
  sponsorshipInterests: string[];

  // Optional public contact / social presence
  instagramUrl: string;
  linkedinUrl: string;

  // Profile completeness / visibility
  isProfileComplete: boolean;
  isPublic: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SponsorSchema = new Schema<ISponsor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    brandName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    website: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    officialEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    industry: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },

    companySize: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },

    about: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    logoUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    targetAudience: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    preferredCategories: {
      type: [String],
      default: [],
      index: true,
    },

    preferredLocations: {
      type: [String],
      default: [],
      index: true,
    },

    sponsorshipInterests: {
      type: [String],
      default: [],
    },

    instagramUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One sponsor profile per user
SponsorSchema.index({ userId: 1 }, { unique: true });

// Useful for discovery / matching
SponsorSchema.index({ industry: 1, isPublic: 1 });
SponsorSchema.index({ preferredCategories: 1, preferredLocations: 1 });

// Prevent model overwrite in dev / hot reload
const Sponsor: Model<ISponsor> =
  mongoose.models.Sponsor || mongoose.model<ISponsor>("Sponsor", SponsorSchema);

export default Sponsor;