import mongoose, { Schema, Types, model, models } from "mongoose";

export type DealStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled"
  | "disputed";

export type DealPaymentStatus = "unpaid" | "pending" | "paid";

export interface IDealContactReveal {
  organizerRevealed: boolean;
  sponsorRevealed: boolean;
  organizerRevealedAt: Date | null;
  sponsorRevealedAt: Date | null;
  fullyRevealed: boolean;
}

export interface IDeal extends mongoose.Document {
  organizerId: Types.ObjectId;
  sponsorId: Types.ObjectId;
  eventId: Types.ObjectId;

  title: string;
  description: string;

  proposedAmount: number;
  finalAmount: number | null;

  status: DealStatus;
  paymentStatus: DealPaymentStatus;

  message: string;
  deliverables: string[];
  notes: string;

  createdBy: Types.ObjectId | null;
  lastActionBy: Types.ObjectId | null;

  disputeReason: string;
  expiresAt: Date | null;

  acceptedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;

  contactReveal: IDealContactReveal;

  createdAt: Date;
  updatedAt: Date;
}

const contactRevealSchema = new Schema<IDealContactReveal>(
  {
    organizerRevealed: {
      type: Boolean,
      default: false,
    },
    sponsorRevealed: {
      type: Boolean,
      default: false,
    },
    organizerRevealedAt: {
      type: Date,
      default: null,
    },
    sponsorRevealedAt: {
      type: Date,
      default: null,
    },
    fullyRevealed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { _id: false }
);

const dealSchema = new Schema<IDeal>(
  {
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"],
      index: true,
    },
    sponsorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sponsor is required"],
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event is required"],
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    proposedAmount: {
      type: Number,
      required: [true, "Proposed amount is required"],
      min: [0, "Amount must be >= 0"],
    },
    finalAmount: {
      type: Number,
      default: null,
      min: [0, "Final amount must be >= 0"],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "negotiating",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid"],
      default: "unpaid",
      index: true,
    },

    message: {
      type: String,
      trim: true,
      default: "",
      maxlength: [3000, "Message cannot exceed 3000 characters"],
    },

    deliverables: {
      type: [String],
      default: [],
      validate: {
        validator: function (value: string[]) {
          return Array.isArray(value);
        },
        message: "Deliverables must be an array of strings",
      },
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Notes cannot exceed 5000 characters"],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastActionBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    disputeReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: [3000, "Dispute reason cannot exceed 3000 characters"],
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    contactReveal: {
      type: contactRevealSchema,
      default: () => ({
        organizerRevealed: false,
        sponsorRevealed: false,
        organizerRevealedAt: null,
        sponsorRevealedAt: null,
        fullyRevealed: false,
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
dealSchema.index({ organizerId: 1, status: 1, updatedAt: -1 });
dealSchema.index({ sponsorId: 1, status: 1, updatedAt: -1 });
dealSchema.index({ eventId: 1, status: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ updatedAt: -1 });

// Prevent impossible final amount
dealSchema.pre("save", function (next) {
  if (this.finalAmount !== null && this.finalAmount < 0) {
    return next(new Error("Final amount must be >= 0"));
  }

  if (this.status !== "disputed" && this.disputeReason) {
    this.disputeReason = "";
  }

  if (
    this.contactReveal?.organizerRevealed &&
    this.contactReveal?.sponsorRevealed
  ) {
    this.contactReveal.fullyRevealed = true;
  }

  next();
});

export const DealModel =
  (models.Deal as mongoose.Model<IDeal>) || model<IDeal>("Deal", dealSchema);