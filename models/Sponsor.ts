import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: [true, 'Owner ID is required'],
      unique: true,
    },
    brandName: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    budget: {
      type: String,
      required: [true, 'Budget is required'],
      trim: true,
    },
    preferredCategories: {
      type: [String],
      required: [true, 'Preferred categories are required'],
      validate: {
        validator: (arr: unknown) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one preferred category is required',
      },
    },
    targetAudience: {
      type: String,
      required: [true, 'Target audience is required'],
      trim: true,
    },
    locationPreference: {
      type: String,
      required: [true, 'Location preference is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

sponsorSchema.index({ ownerId: 1 });
sponsorSchema.index({ preferredCategories: 1 });

export const Sponsor = mongoose.models.Sponsor || mongoose.model('Sponsor', sponsorSchema);
