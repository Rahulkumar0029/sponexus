import mongoose from 'mongoose';

const sponsorshipSchema = new mongoose.Schema(
  {
    sponsorOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    sponsorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsor',
      required: true,
      index: true,
    },

    // 🔥 Public Sponsorship Post
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
        message: 'Budget must be a valid number',
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
      default: '',
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
      trim: true,
      default: '',
    },

    customMessage: {
      type: String,
      trim: true,
      default: '',
    },

    // 🔥 Requirements
    bannerRequirement: { type: Boolean, default: false },
    stallRequirement: { type: Boolean, default: false },
    mikeAnnouncement: { type: Boolean, default: false },
    socialMediaMention: { type: Boolean, default: false },
    productDisplay: { type: Boolean, default: false },

    // 📞 Contact
    contactPersonName: {
      type: String,
      trim: true,
      default: '',
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔄 Lifecycle
    status: {
      type: String,
      enum: ['active', 'paused', 'closed'],
      default: 'active',
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

// 🔥 PERFORMANCE INDEXES (FINAL)
sponsorshipSchema.index({ sponsorOwnerId: 1, createdAt: -1 });
sponsorshipSchema.index({ status: 1, createdAt: -1 });

// marketplace filters
sponsorshipSchema.index({ category: 1, locationPreference: 1, status: 1 });
sponsorshipSchema.index({ status: 1, expiresAt: 1 });

export const SponsorshipModel =
  mongoose.models.Sponsorship ||
  mongoose.model('Sponsorship', sponsorshipSchema);