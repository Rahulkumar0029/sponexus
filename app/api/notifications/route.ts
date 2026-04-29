import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import Notification from "@/lib/models/Notification";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
function noStore(body: Record<string, unknown>, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") || 20);
    const pageParam = Number(searchParams.get("page") || 1);

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 20;

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const query = {
  userId: new mongoose.Types.ObjectId(decoded.userId),
};

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Notification.countDocuments(query),

      Notification.countDocuments({
       userId: new mongoose.Types.ObjectId(decoded.userId),
        isRead: false,
      }),
    ]);

    return noStore({
      success: true,
      notifications: notifications.map((item) => ({
        _id: String(item._id),
        type: item.type,
        title: item.title,
        message: item.message,
        link: item.link || null,
        isRead: Boolean(item.isRead),
        readAt: item.readAt || null,
        metadata: item.metadata || {},
        createdAt: item.createdAt,
      })),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return noStore({ success: false, message: "Failed to fetch notifications." }, 500);
  }
}