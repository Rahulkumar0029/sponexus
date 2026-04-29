import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import Notification from "@/lib/models/Notification";
import mongoose from "mongoose";

function noStore(body: Record<string, unknown>, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(request: NextRequest) {
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

    const result = await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(decoded.userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return noStore({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("PATCH /api/notifications/read-all error:", error);
    return noStore({ success: false, message: "Failed to mark all read." }, 500);
  }
}