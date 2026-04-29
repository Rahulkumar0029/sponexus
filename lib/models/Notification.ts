import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type NotificationType =
  | "DEAL_CREATED"
  | "DEAL_ACCEPTED"
  | "DEAL_REJECTED"
  | "DEAL_UPDATED"
  | "CONTACT_REVEALED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_ACTIVE"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_EXPIRED"
  | "EVENT_PUBLISHED"
  | "SPONSORSHIP_CREATED"
  | "ADMIN_ALERT";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_TITLE_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_LINK_LENGTH = 500;

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "DEAL_CREATED",
        "DEAL_ACCEPTED",
        "DEAL_REJECTED",
        "DEAL_UPDATED",
        "CONTACT_REVEALED",
        "PAYMENT_SUCCESS",
        "PAYMENT_FAILED",
        "SUBSCRIPTION_ACTIVE",
        "SUBSCRIPTION_EXPIRING",
        "SUBSCRIPTION_EXPIRED",
        "EVENT_PUBLISHED",
        "SPONSORSHIP_CREATED",
        "ADMIN_ALERT",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_TITLE_LENGTH,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_MESSAGE_LENGTH,
    },

    link: {
      type: String,
      trim: true,
      default: null,
      maxlength: MAX_LINK_LENGTH,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.pre("validate", function (next) {
  if (typeof this.title === "string") this.title = this.title.trim();
  if (typeof this.message === "string") this.message = this.message.trim();
  if (typeof this.link === "string") this.link = this.link.trim();

  if (this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  if (!this.isRead) {
    this.readAt = null;
  }

  next();
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;