import { Schema, model, models, Types, Document } from "mongoose";

/* ===============================
   TYPES
=================================*/

export type UsageAction =
  | "PUBLISH_EVENT"
  | "PUBLISH_SPONSORSHIP"
  | "SEND_INTEREST"
  | "USE_MATCH"
  | "REVEAL_CONTACT";

export interface IUsageCounter extends Document {
  userId: Types.ObjectId;
  role: "ORGANIZER" | "SPONSOR";

  action: UsageAction;

  // Time windows
  dayKey: string;   // YYYY-MM-DD
  monthKey: string; // YYYY-MM

  // Counters
  dailyCount: number;
  monthlyCount: number;

  // Optional references
  subscriptionId?: Types.ObjectId | null;
  planId?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

/* ===============================
   SCHEMA
=================================*/

const UsageCounterSchema = new Schema<IUsageCounter>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: true,
    },

    action: {
      type: String,
      enum: [
        "PUBLISH_EVENT",
        "PUBLISH_SPONSORSHIP",
        "SEND_INTEREST",
        "USE_MATCH",
        "REVEAL_CONTACT",
      ],
      required: true,
    },

    dayKey: {
      type: String,
      required: true,
    },

    monthKey: {
      type: String,
      required: true,
    },

    dailyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    monthlyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ===============================
   UNIQUE INDEX (CRITICAL)
=================================*/
// One record per user + action + day

UsageCounterSchema.index(
  { userId: 1, role: 1, action: 1, dayKey: 1 },
  { unique: true }
);

/* ===============================
   PERFORMANCE INDEXES
=================================*/

UsageCounterSchema.index({ userId: 1, action: 1, createdAt: -1 });
UsageCounterSchema.index({ userId: 1, monthKey: 1 });
UsageCounterSchema.index({ subscriptionId: 1 });

/* ===============================
   EXPORT
=================================*/

const UsageCounter =
  models.UsageCounter ||
  model<IUsageCounter>("UsageCounter", UsageCounterSchema);

export default UsageCounter;