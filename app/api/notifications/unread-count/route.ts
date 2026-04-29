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
      return noStore({ success: false, unreadCount: 0 }, 401);
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return noStore({ success: false, unreadCount: 0 }, 401);
    }

    const unreadCount = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(decoded.userId),
      isRead: false,
    });

    return noStore({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications/unread-count error:", error);
    return noStore({ success: false, unreadCount: 0 }, 500);
  }
}