import mongoose from "mongoose";
import { Event } from "@/types/event";

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 60;
const MAX_AUDIENCE_ITEM_LENGTH = 60;
const MAX_DELIVERABLE_LENGTH = 80;
const MAX_ARRAY_ITEMS = 20;
const MAX_MEDIA_ITEMS = 20;
const MAX_MEDIA_TITLE_LENGTH = 120;
const MAX_URL_LENGTH = 2000;
const MAX_PUBLIC_ID_LENGTH = 300;
const MAX_BUDGET = 100000000;
const MAX_ATTENDEE_COUNT = 1000000;

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const mediaItemSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_URL_LENGTH,
      validate: {
        validator: (value: string) => isValidHttpUrl(value),
        message: "Media URL must be a valid http/https URL",
      },
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_PUBLIC_ID_LENGTH,
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
      maxlength: MAX_MEDIA_TITLE_LENGTH,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

function normalizeStringArray(
  value: unknown,
  maxItemLength = 100,
  maxItems = MAX_ARRAY_ITEMS
): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => Boolean(item) && item.length <= maxItemLength)
    ),
  ].slice(0, maxItems);
}

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: MAX_TITLE_LENGTH,
    },

    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: MAX_DESCRIPTION_LENGTH,
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"],
      index: true,
    },

    categories: {
      type: [String],
      required: true,
      set: (value: unknown) =>
        normalizeStringArray(value, MAX_CATEGORY_LENGTH, MAX_ARRAY_ITEMS),
      validate: [
        {
          validator: (arr: unknown) => Array.isArray(arr) && arr.length > 0,
          message: "At least one category is required",
        },
        {
          validator: (arr: unknown) =>
            Array.isArray(arr) && arr.length <= MAX_ARRAY_ITEMS,
          message: `Categories cannot exceed ${MAX_ARRAY_ITEMS} items`,
        },
      ],
    },

    targetAudience: {
      type: [String],
      default: [],
      set: (value: unknown) =>
        normalizeStringArray(value, MAX_AUDIENCE_ITEM_LENGTH, MAX_ARRAY_ITEMS),
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && arr.length <= MAX_ARRAY_ITEMS,
        message: `Target audience cannot exceed ${MAX_ARRAY_ITEMS} items`,
      },
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: MAX_LOCATION_LENGTH,
    },

    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget must be at least 0"],
      max: [MAX_BUDGET, `Budget cannot exceed ${MAX_BUDGET}`],
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
      max: [MAX_ATTENDEE_COUNT, `Expected audience cannot exceed ${MAX_ATTENDEE_COUNT}`],
    },

    eventType: {
      type: String,
      enum: ["CONFERENCE", "WORKSHOP", "WEBINAR", "FESTIVAL", "MEETUP", "OTHER"],
      required: [true, "Event type is required"],
      index: true,
    },

    providedDeliverables: {
      type: [String],
      default: [],
      set: (value: unknown) =>
        normalizeStringArray(value, MAX_DELIVERABLE_LENGTH, MAX_ARRAY_ITEMS),
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && arr.length <= MAX_ARRAY_ITEMS,
        message: `Provided deliverables cannot exceed ${MAX_ARRAY_ITEMS} items`,
      },
    },

    coverImage: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_URL_LENGTH,
      validate: {
        validator: function (value: string) {
          return !value || isValidHttpUrl(value);
        },
        message: "Cover image must be a valid http/https URL",
      },
    },

    venueImages: {
      type: [mediaItemSchema],
      default: [],
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && arr.length <= MAX_MEDIA_ITEMS,
        message: `Venue images cannot exceed ${MAX_MEDIA_ITEMS} items`,
      },
    },

    pastEventMedia: {
      type: [mediaItemSchema],
      default: [],
      validate: {
        validator: (arr: unknown) =>
          Array.isArray(arr) && arr.length <= MAX_MEDIA_ITEMS,
        message: `Past event media cannot exceed ${MAX_MEDIA_ITEMS} items`,
      },
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },

    visibilityStatus: {
      type: String,
      enum: ["VISIBLE", "HIDDEN", "UNDER_REVIEW"],
      default: "VISIBLE",
      index: true,
    },

    moderationStatus: {
      type: String,
      enum: ["APPROVED", "FLAGGED", "PENDING_REVIEW"],
      default: "APPROVED",
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    hiddenReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
      select: false,
    },

    flagReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
      select: false,
    },

    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
      select: false,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.adminNotes;
        delete ret.hiddenReason;
        delete ret.flagReason;
        delete ret.deletedAt;
        delete ret.deletedBy;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.adminNotes;
        delete ret.hiddenReason;
        delete ret.flagReason;
        delete ret.deletedAt;
        delete ret.deletedBy;
        return ret;
      },
    },
  }
);

eventSchema.index({ organizerId: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ categories: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ providedDeliverables: 1 });
eventSchema.index({ visibilityStatus: 1, moderationStatus: 1, isDeleted: 1 });
eventSchema.index({ status: 1, isDeleted: 1, startDate: 1 });
eventSchema.index({ organizerId: 1, isDeleted: 1, updatedAt: -1 });

eventSchema.pre("validate", function (next) {
  if (typeof this.title === "string") {
    this.title = this.title.trim();
  }

  if (typeof this.description === "string") {
    this.description = this.description.trim();
  }

  if (typeof this.location === "string") {
    this.location = this.location.trim();
  }

  if (typeof this.coverImage === "string") {
    this.coverImage = this.coverImage.trim();
  }

  if (typeof this.hiddenReason === "string") {
    this.hiddenReason = this.hiddenReason.trim();
  }

  if (typeof this.flagReason === "string") {
    this.flagReason = this.flagReason.trim();
  }

  if (typeof this.adminNotes === "string") {
    this.adminNotes = this.adminNotes.trim();
  }

  if (!this.isDeleted) {
    this.deletedAt = null;
    this.deletedBy = null;
  }

  if (this.visibilityStatus !== "HIDDEN") {
    this.hiddenReason = "";
  }

  if (this.moderationStatus !== "FLAGGED") {
    this.flagReason = "";
  }

  next();
});

eventSchema.virtual("category").get(function () {
  return this.eventType;
});

export const EventModel =
  mongoose.models.Event || mongoose.model<Event>("Event", eventSchema);