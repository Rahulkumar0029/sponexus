import mongoose from "mongoose";
import { Event } from "@/types/event";

const mediaItemSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"],
    },

    categories: {
      type: [String],
      required: true,
      set: normalizeStringArray,
      validate: {
        validator: (arr: unknown) => Array.isArray(arr) && arr.length > 0,
        message: "At least one category is required",
      },
    },

    targetAudience: {
      type: [String],
      default: [],
      set: normalizeStringArray,
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget must be at least 0"],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (this: any, value: Date) {
          return value >= this.startDate;
        },
        message: "End date must be after start date",
      },
    },

    attendeeCount: {
      type: Number,
      required: [true, "Expected audience is required"],
      min: [1, "Expected audience must be at least 1"],
    },

    eventType: {
      type: String,
      enum: ["CONFERENCE", "WORKSHOP", "WEBINAR", "FESTIVAL", "MEETUP", "OTHER"],
      required: [true, "Event type is required"],
    },

    providedDeliverables: {
      type: [String],
      default: [],
      set: normalizeStringArray,
    },

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    venueImages: {
      type: [mediaItemSchema],
      default: [],
    },

    pastEventMedia: {
      type: [mediaItemSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ organizerId: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ categories: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ providedDeliverables: 1 });

eventSchema.virtual("category").get(function () {
  return this.eventType;
});

eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

export const EventModel =
  mongoose.models.Event || mongoose.model<Event>("Event", eventSchema);