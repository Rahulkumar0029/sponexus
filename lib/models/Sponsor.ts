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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

const SponsorSchema = new Schema<ISponsor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      validate: {
        validator: (value: string) =>
          !value || /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(value),
        message: "Invalid website URL",
      },
    },

    officialEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
      validate: {
        validator: (value: string) => emailRegex.test(value),
        message: "Invalid official email address",
      },
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
      set: normalizeStringArray,
      index: true,
    },

    preferredLocations: {
      type: [String],
      default: [],
      set: normalizeStringArray,
      index: true,
    },

    sponsorshipInterests: {
      type: [String],
      default: [],
      set: normalizeStringArray,
    },

    instagramUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
      validate: {
        validator: (value: string) =>
          !value || /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i.test(value),
        message: "Invalid Instagram URL",
      },
    },

    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
      validate: {
        validator: (value: string) =>
          !value || /^(https?:\/\/)?(www\.)?linkedin\.com\/.+/i.test(value),
        message: "Invalid LinkedIn URL",
      },
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

// Auto-calculate profile completeness
SponsorSchema.pre("validate", function (next) {
  this.isProfileComplete = Boolean(
    this.brandName?.trim() &&
      this.companyName?.trim() &&
      this.officialEmail?.trim() &&
      this.phone?.trim() &&
      this.industry?.trim()
  );

  next();
});

// One sponsor profile per user (ONLY ONE INDEX HERE)
SponsorSchema.index({ userId: 1 }, { unique: true });

// Useful for discovery / matching
SponsorSchema.index({ industry: 1, isPublic: 1 });
SponsorSchema.index({ preferredCategories: 1, preferredLocations: 1 });

// Prevent model overwrite in dev / hot reload
const Sponsor: Model<ISponsor> =
  mongoose.models.Sponsor ||
  mongoose.model<ISponsor>("Sponsor", SponsorSchema);

export default Sponsor;