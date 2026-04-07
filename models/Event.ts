import mongoose from 'mongoose';
import { Event } from '@/types/event';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required'],
    },
    categories: {
      type: [String],
      required: [true, 'Categories are required'],
      validate: {
        validator: (arr: unknown) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one category is required',
      },
    },
    targetAudience: {
      type: [String],
      required: [true, 'Target audience is required'],
      validate: {
        validator: (arr: unknown) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one target audience item is required',
      },
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget must be at least 0'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    attendeeCount: {
      type: Number,
      required: [true, 'Expected audience is required'],
      min: [1, 'Expected audience must be at least 1'],
    },
    eventType: {
      type: String,
      enum: ['CONFERENCE', 'WORKSHOP', 'WEBINAR', 'FESTIVAL', 'MEETUP', 'OTHER'],
      required: [true, 'Event type is required'],
    },
    image: String,
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ organizerId: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ categories: 1 });

eventSchema.virtual('category').get(function () {
  return this.eventType;
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

export const EventModel = mongoose.models.Event || mongoose.model<Event>('Event', eventSchema);
