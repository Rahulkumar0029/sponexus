import mongoose, { Schema, model, models } from "mongoose";

const MAX_KEY_LENGTH = 200;
const MAX_ENDPOINT_LENGTH = 100;
const MAX_REQUEST_HASH_LENGTH = 128;

const IdempotencyKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_KEY_LENGTH,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    endpoint: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_ENDPOINT_LENGTH,
    },

    requestHash: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_REQUEST_HASH_LENGTH,
    },

    response: {
      type: Schema.Types.Mixed,
      default: null,
    },

    statusCode: {
      type: Number,
      default: null,
      min: 100,
      max: 599,
    },

    locked: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

IdempotencyKeySchema.index(
  { key: 1, userId: 1, endpoint: 1 },
  { unique: true }
);

IdempotencyKeySchema.index({ userId: 1, endpoint: 1, createdAt: -1 });
IdempotencyKeySchema.index({ endpoint: 1, locked: 1, updatedAt: 1 });
IdempotencyKeySchema.index({ requestHash: 1, createdAt: -1 });

export default models.IdempotencyKey ||
  model("IdempotencyKey", IdempotencyKeySchema);