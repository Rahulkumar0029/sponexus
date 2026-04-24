import mongoose, { Schema, model, models } from "mongoose";

const MAX_KEY_LENGTH = 120;
const MAX_ENDPOINT_LENGTH = 100;

const IdempotencyKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_KEY_LENGTH,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    endpoint: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_ENDPOINT_LENGTH,
      index: true,
    },

    requestHash: {
      type: String,
      required: true,
      index: true,
    },

    response: {
      type: Schema.Types.Mixed,
      default: null,
    },

    statusCode: {
      type: Number,
      default: null,
    },

    locked: {
      type: Boolean,
      default: false,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true, // TTL index below
    },
  },
  {
    timestamps: true,
  }
);

/* ===============================
   TTL INDEX (AUTO CLEANUP)
=================================*/
IdempotencyKeySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

/* ===============================
   CRITICAL UNIQUE CONSTRAINT
=================================*/
// SAME key + user + endpoint = unique
IdempotencyKeySchema.index(
  { key: 1, userId: 1, endpoint: 1 },
  { unique: true }
);

/* ===============================
   PERFORMANCE INDEXES
=================================*/
IdempotencyKeySchema.index({ userId: 1, createdAt: -1 });
IdempotencyKeySchema.index({ endpoint: 1, createdAt: -1 });

export default models.IdempotencyKey ||
  model("IdempotencyKey", IdempotencyKeySchema);