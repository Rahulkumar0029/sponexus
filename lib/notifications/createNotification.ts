import mongoose from "mongoose";

import Notification, {
  type NotificationType,
} from "@/lib/models/Notification";

type CreateNotificationInput = {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = {},
}: CreateNotificationInput) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return null;
  }

  if (!title.trim() || !message.trim()) {
    return null;
  }

  return Notification.create({
    userId: new mongoose.Types.ObjectId(String(userId)),
    type,
    title: title.trim(),
    message: message.trim(),
    link,
    metadata,
    isRead: false,
    readAt: null,
  });
}