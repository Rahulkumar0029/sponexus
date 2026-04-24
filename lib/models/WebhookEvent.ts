import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type WebhookProvider = "RAZORPAY";
export type WebhookProcessingStatus =
  | "RECEIVED"
  | "PROCESSED"
  | "IGNORED"
  | "FAILED"
  | "DUPLICATE";

export interface IWebhookEvent extends Document {
  provider: WebhookProvider;

  eventId?: string | null;
  eventType: string;

  externalPaymentId?: string | null;
  externalOrderId?: string | null;

  paymentTransactionId?: Types.ObjectId | null;

  signaturePresent: boolean;
  signatureVerified: boolean;

  processingStatus: WebhookProcessingStatus;
  processingError?: string | null;

  receivedAt: Date;
  processedAt?: Date | null;

  payload: Record<string, any>;
  headers?: Record<string, string>;

  sourceIp?: string | null;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_EVENT_ID_LENGTH = 200;
const MAX_EVENT_TYPE_LENGTH = 200;
const MAX_EXTERNAL_ID_LENGTH = 200;
const MAX_ERROR_LENGTH = 3000;
const MAX_IP_LENGTH = 100;
const MAX_NOTES_LENGTH = 3000;

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: {
      type: String,
      required: true,
      enum: ["RAZORPAY"],
      index: true,
    },

    eventId: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_EVENT_ID_LENGTH,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_EVENT_TYPE_LENGTH,
      index: true,
    },

    externalPaymentId: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_EXTERNAL_ID_LENGTH,
      index: true,
    },

    externalOrderId: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_EXTERNAL_ID_LENGTH,
      index: true,
    },

    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
      index: true,
    },

    signaturePresent: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },

    signatureVerified: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },

    processingStatus: {
      type: String,
      required: true,
      enum: ["RECEIVED", "PROCESSED", "IGNORED", "FAILED", "DUPLICATE"],
      default: "RECEIVED",
      index: true,
    },

    processingError: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_ERROR_LENGTH,
    },

    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
      index: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },

    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },

    sourceIp: {
      type: String,
      default: null,
      trim: true,
      maxlength: MAX_IP_LENGTH,
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: MAX_NOTES_LENGTH,
    },
  },
  {
    timestamps: true,
    minimize: true,
  }
);

webhookEventSchema.pre("validate", function (next) {
  if (typeof this.eventId === "string") {
    this.eventId = this.eventId.trim();
  }

  if (typeof this.eventType === "string") {
    this.eventType = this.eventType.trim();
  }

  if (typeof this.externalPaymentId === "string") {
    this.externalPaymentId = this.externalPaymentId.trim();
  }

  if (typeof this.externalOrderId === "string") {
    this.externalOrderId = this.externalOrderId.trim();
  }

  if (typeof this.processingError === "string") {
    this.processingError = this.processingError.trim();
  }

  if (typeof this.sourceIp === "string") {
    this.sourceIp = this.sourceIp.trim();
  }

  if (typeof this.notes === "string") {
    this.notes = this.notes.trim();
  }

  if (
    ["PROCESSED", "FAILED", "DUPLICATE", "IGNORED"].includes(
      this.processingStatus
    ) &&
    !this.processedAt
  ) {
    this.processedAt = new Date();
  }

  if (this.processingStatus === "RECEIVED") {
    this.processedAt = null;
  }

  next();
});

webhookEventSchema.index({ provider: 1, eventId: 1 }, {
  unique: true,
  partialFilterExpression: {
    eventId: { $type: "string", $ne: "" },
  },
});

webhookEventSchema.index({ provider: 1, eventType: 1, receivedAt: -1 });
webhookEventSchema.index({ externalPaymentId: 1, receivedAt: -1 });
webhookEventSchema.index({ externalOrderId: 1, receivedAt: -1 });
webhookEventSchema.index({ paymentTransactionId: 1, receivedAt: -1 });
webhookEventSchema.index({ processingStatus: 1, receivedAt: -1 });
webhookEventSchema.index({ signatureVerified: 1, receivedAt: -1 });
webhookEventSchema.index({ sourceIp: 1, receivedAt: -1 });

const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", webhookEventSchema);

export default WebhookEvent;