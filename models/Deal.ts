import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type DealStatus =
  | 'pending'
  | 'connected'
  | 'negotiating'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'disputed';

export interface IDeal extends Document {
  organizerId: Types.ObjectId;
  sponsorId: Types.ObjectId;
  eventId: Types.ObjectId;
  sponsorshipId: Types.ObjectId;

  initiatedBy: 'organizer' | 'sponsor';
  status: DealStatus;

  proposedAmount: number;
  finalAmount?: number | null;

  contactSharedAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;

  message?: string;
  expiresAt?: Date | null;

  disputeReason?: string;
  disputeReportedBy?: 'organizer' | 'sponsor' | null;
  disputeReportedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const dealSchema = new Schema<IDeal>(
  {
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sponsorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    sponsorshipId: {
      type: Schema.Types.ObjectId,
      ref: 'Sponsorship',
      required: true,
      index: true,
    },

    initiatedBy: {
      type: String,
      enum: ['organizer', 'sponsor'],
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'connected', 'negotiating', 'completed', 'cancelled', 'rejected', 'disputed'],
      default: 'pending',
      index: true,
    },

    proposedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    finalAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    contactSharedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },

    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1200,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    disputeReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 800,
    },
    disputeReportedBy: {
      type: String,
      enum: ['organizer', 'sponsor', null],
      default: null,
    },
    disputeReportedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

dealSchema.index({ organizerId: 1, sponsorId: 1, eventId: 1, sponsorshipId: 1 }, { unique: true });
dealSchema.index({ sponsorId: 1, status: 1, createdAt: -1 });
dealSchema.index({ organizerId: 1, status: 1, createdAt: -1 });

const DealModel: Model<IDeal> = mongoose.models.Deal || mongoose.model<IDeal>('Deal', dealSchema);

export { DealModel };
