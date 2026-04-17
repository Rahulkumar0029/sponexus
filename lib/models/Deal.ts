import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required'],
    },
    sponsorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sponsor is required'],
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required'],
    },

    // 🔥 Deal Info
    title: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },

    // 💰 Financials
    proposedAmount: {
      type: Number,
      required: [true, 'Proposed amount is required'],
      min: [0, 'Amount must be >= 0'],
    },
    finalAmount: {
      type: Number,
      default: null,
    },

    // 🔄 Deal Status
    status: {
      type: String,
      enum: [
        'pending',
        'negotiating',
        'accepted',
        'rejected',
        'completed',
        'cancelled',
      ],
      default: 'pending',
    },

    // 💳 Payment Status
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid'],
      default: 'unpaid',
    },

    // 💬 Communication
    message: {
      type: String,
      trim: true,
      default: '',
    },

    // ⏳ Optional Expiry
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 🔥 Indexing for performance
dealSchema.index({ organizerId: 1 });
dealSchema.index({ sponsorId: 1 });
dealSchema.index({ eventId: 1 });
dealSchema.index({ status: 1 });

export const DealModel =
  mongoose.models.Deal || mongoose.model('Deal', dealSchema);