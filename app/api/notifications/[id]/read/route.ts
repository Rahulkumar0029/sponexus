import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import Notification from "@/lib/models/Notification";

function noStore(body: Record<string, unknown>, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return noStore({ success: false, message: "Authentication required." }, 401);
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return noStore({ success: false, message: "Invalid session." }, 401);
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return noStore({ success: false, message: "Invalid notification id." }, 400);
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.id),
userId: new mongoose.Types.ObjectId(decoded.userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!notification) {
      return noStore({ success: false, message: "Notification not found." }, 404);
    }

    return noStore({
      success: true,
      notification: {
        _id: String(notification._id),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link || null,
        isRead: Boolean(notification.isRead),
        readAt: notification.readAt || null,
        createdAt: notification.createdAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/notifications/[id]/read error:", error);
    return noStore({ success: false, message: "Failed to mark notification read." }, 500);
  }
}