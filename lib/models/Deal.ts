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
export type DealAdminReviewStatus = "NONE" | "UNDER_REVIEW" | "RESOLVED";

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

  isFrozen: boolean;
  frozenAt: Date | null;
  frozenBy: Types.ObjectId | null;
  freezeReason: string;

  adminReviewStatus: DealAdminReviewStatus;
  internalNotes: string;
  resolvedByAdminId: Types.ObjectId | null;
  resolvedAt: Date | null;

  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_AMOUNT = 100000000;
const MAX_DELIVERABLES = 30;
const MAX_DELIVERABLE_LENGTH = 200;

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
      max: [MAX_AMOUNT, `Amount cannot exceed ${MAX_AMOUNT}`],
    },
    finalAmount: {
      type: Number,
      default: null,
      min: [0, "Final amount must be >= 0"],
      max: [MAX_AMOUNT, `Final amount cannot exceed ${MAX_AMOUNT}`],
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
      validate: [
        {
          validator: function (value: string[]) {
            return Array.isArray(value);
          },
          message: "Deliverables must be an array of strings",
        },
        {
          validator: function (value: string[]) {
            return value.length <= MAX_DELIVERABLES;
          },
          message: `Deliverables cannot exceed ${MAX_DELIVERABLES} items`,
        },
        {
          validator: function (value: string[]) {
            return value.every(
              (item) =>
                typeof item === "string" &&
                item.trim().length > 0 &&
                item.trim().length <= MAX_DELIVERABLE_LENGTH
            );
          },
          message: `Each deliverable must be 1 to ${MAX_DELIVERABLE_LENGTH} characters`,
        },
      ],
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

    isFrozen: {
      type: Boolean,
      default: false,
      index: true,
    },

    frozenAt: {
      type: Date,
      default: null,
      select: false,
    },

    frozenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    freezeReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Freeze reason cannot exceed 1000 characters"],
      select: false,
    },

    adminReviewStatus: {
      type: String,
      enum: ["NONE", "UNDER_REVIEW", "RESOLVED"],
      default: "NONE",
      index: true,
    },

    internalNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Internal notes cannot exceed 5000 characters"],
      select: false,
    },

    resolvedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
      select: false,
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
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.internalNotes;
        delete ret.resolvedByAdminId;
        delete ret.resolvedAt;
        delete ret.freezeReason;
        delete ret.frozenAt;
        delete ret.frozenBy;
        delete ret.deletedAt;
        delete ret.deletedBy;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.internalNotes;
        delete ret.resolvedByAdminId;
        delete ret.resolvedAt;
        delete ret.freezeReason;
        delete ret.frozenAt;
        delete ret.frozenBy;
        delete ret.deletedAt;
        delete ret.deletedBy;
        return ret;
      },
    },
  }
);

dealSchema.index({ organizerId: 1, status: 1, updatedAt: -1 });
dealSchema.index({ sponsorId: 1, status: 1, updatedAt: -1 });
dealSchema.index({ eventId: 1, status: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ updatedAt: -1 });
dealSchema.index({ isFrozen: 1, adminReviewStatus: 1, isDeleted: 1 });
dealSchema.index({ organizerId: 1, sponsorId: 1, eventId: 1, status: 1 });
dealSchema.index({ isDeleted: 1, status: 1, updatedAt: -1 });

dealSchema.pre("validate", function (next) {
  if (this.organizerId && this.sponsorId && String(this.organizerId) === String(this.sponsorId)) {
    return next(new Error("Organizer and sponsor cannot be the same user"));
  }

  if (typeof this.title === "string") {
    this.title = this.title.trim();
  }

  if (typeof this.description === "string") {
    this.description = this.description.trim();
  }

  if (typeof this.message === "string") {
    this.message = this.message.trim();
  }

  if (typeof this.notes === "string") {
    this.notes = this.notes.trim();
  }

  if (typeof this.disputeReason === "string") {
    this.disputeReason = this.disputeReason.trim();
  }

  if (typeof this.freezeReason === "string") {
    this.freezeReason = this.freezeReason.trim();
  }

  if (typeof this.internalNotes === "string") {
    this.internalNotes = this.internalNotes.trim();
  }

  if (Array.isArray(this.deliverables)) {
    this.deliverables = [
      ...new Set(
        this.deliverables
          .map((item) => String(item).trim())
          .filter(Boolean)
      ),
    ].slice(0, MAX_DELIVERABLES);
  }

  next();
});

dealSchema.pre("save", function (next) {
  if (this.finalAmount !== null && this.finalAmount < 0) {
    return next(new Error("Final amount must be >= 0"));
  }

  if (
    typeof this.proposedAmount === "number" &&
    !Number.isFinite(this.proposedAmount)
  ) {
    return next(new Error("Proposed amount must be a valid number"));
  }

  if (
    this.finalAmount !== null &&
    typeof this.finalAmount === "number" &&
    !Number.isFinite(this.finalAmount)
  ) {
    return next(new Error("Final amount must be a valid number"));
  }

  if (this.status !== "disputed" && this.disputeReason) {
    this.disputeReason = "";
  }

  if (
    this.contactReveal?.organizerRevealed &&
    this.contactReveal?.sponsorRevealed
  ) {
    this.contactReveal.fullyRevealed = true;
  } else {
    this.contactReveal.fullyRevealed = false;
  }

  if (!this.isFrozen) {
    this.freezeReason = "";
    this.frozenAt = null;
    this.frozenBy = null;
  }

  if (!this.isDeleted) {
    this.deletedAt = null;
    this.deletedBy = null;
  }

  next();
});

export const DealModel =
  (models.Deal as mongoose.Model<IDeal>) || model<IDeal>("Deal", dealSchema);