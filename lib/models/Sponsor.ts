import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISponsor extends Document {
  userId: Types.ObjectId;

  brandName: string;
  companyName: string;
  website: string;
  officialEmail: string;
  phone: string;

    industry: string;
  companySize: string;
  baseLocation: string;
  about: string;
  logoUrl: string;

  instagramUrl: string;
  linkedinUrl: string;

  isProfileComplete: boolean;
  isPublic: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_BRAND_NAME_LENGTH = 120;
const MAX_COMPANY_NAME_LENGTH = 120;
const MAX_WEBSITE_LENGTH = 500;
const MAX_EMAIL_LENGTH = 320;
const MAX_PHONE_LENGTH = 20;
const MAX_INDUSTRY_LENGTH = 80;
const MAX_COMPANY_SIZE_LENGTH = 50;
const MAX_BASE_LOCATION_LENGTH = 120;
const MAX_ABOUT_LENGTH = 3000;
const MAX_LOGO_URL_LENGTH = 2000;
const MAX_SOCIAL_URL_LENGTH = 500;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneRegex = /^\d{7,15}$/;

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const SponsorSchema = new Schema<ISponsor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    brandName: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_BRAND_NAME_LENGTH,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_COMPANY_NAME_LENGTH,
    },

    website: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_WEBSITE_LENGTH,
      validate: {
        validator: (value: string) => !value || isValidHttpUrl(value),
        message: "Invalid website URL",
      },
    },

    officialEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: MAX_EMAIL_LENGTH,
      validate: {
        validator: (value: string) => emailRegex.test(value),
        message: "Invalid official email address",
      },
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_PHONE_LENGTH,
      validate: {
        validator: (value: string) => phoneRegex.test(value),
        message: "Invalid phone number",
      },
    },

    industry: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_INDUSTRY_LENGTH,
      index: true,
    },

       companySize: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_COMPANY_SIZE_LENGTH,
    },

    baseLocation: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_BASE_LOCATION_LENGTH,
      index: true,
    },

    about: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_ABOUT_LENGTH,
    },

    logoUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_LOGO_URL_LENGTH,
      validate: {
        validator: (value: string) => !value || isValidHttpUrl(value),
        message: "Invalid logo URL",
      },
    },

    instagramUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_SOCIAL_URL_LENGTH,
      validate: {
        validator: (value: string) => !value || isValidHttpUrl(value),
        message: "Invalid Instagram URL",
      },
    },

    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: MAX_SOCIAL_URL_LENGTH,
      validate: {
        validator: (value: string) => !value || isValidHttpUrl(value),
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
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.userId;
        delete ret.officialEmail;
        delete ret.phone;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.userId;
        delete ret.officialEmail;
        delete ret.phone;
        return ret;
      },
    },
  }
);

SponsorSchema.pre("validate", function (next) {
  if (typeof this.brandName === "string") {
    this.brandName = this.brandName.trim();
  }

  if (typeof this.companyName === "string") {
    this.companyName = this.companyName.trim();
  }

  if (typeof this.website === "string") {
    this.website = this.website.trim();
  }

  if (typeof this.officialEmail === "string") {
    this.officialEmail = this.officialEmail.trim().toLowerCase();
  }

  if (typeof this.phone === "string") {
    this.phone = this.phone.replace(/\D/g, "").slice(0, 15);
  }

  if (typeof this.industry === "string") {
    this.industry = this.industry.trim();
  }

    if (typeof this.companySize === "string") {
    this.companySize = this.companySize.trim();
  }

  if (typeof this.baseLocation === "string") {
    this.baseLocation = this.baseLocation.trim();
  }

  if (typeof this.about === "string") {
    this.about = this.about.trim();
  }

  if (typeof this.logoUrl === "string") {
    this.logoUrl = this.logoUrl.trim();
  }

  if (typeof this.instagramUrl === "string") {
    this.instagramUrl = this.instagramUrl.trim();
  }

  if (typeof this.linkedinUrl === "string") {
    this.linkedinUrl = this.linkedinUrl.trim();
  }

    this.isProfileComplete = Boolean(
    this.brandName?.trim() &&
      this.companyName?.trim() &&
      this.officialEmail?.trim() &&
      this.phone?.trim() &&
      this.baseLocation?.trim() &&
      this.logoUrl?.trim() &&
      this.about?.trim()
  );

  next();
});

SponsorSchema.index({ userId: 1 }, { unique: true });
SponsorSchema.index({ industry: 1, isPublic: 1 });
SponsorSchema.index({ isPublic: 1, isProfileComplete: 1, createdAt: -1 });
SponsorSchema.index({ companyName: 1, isPublic: 1 });
SponsorSchema.index({ brandName: 1, isPublic: 1 });
SponsorSchema.index({ baseLocation: 1, isPublic: 1 });

const Sponsor: Model<ISponsor> =
  mongoose.models.Sponsor || mongoose.model<ISponsor>("Sponsor", SponsorSchema);

export default Sponsor;