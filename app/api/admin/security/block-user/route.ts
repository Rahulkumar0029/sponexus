import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";
import { safeLogAudit } from "@/lib/audit/log";

function buildNoStoreResponse(body: any, status: number) {
  const { NextResponse } = require("next/server");
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid userId" },
        400
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    user.accountStatus = "SUSPENDED";

    await user.save();

    await safeLogAudit({
      actorId: access.adminUser._id,
      action: "USER_BLOCKED",
      entityType: "USER",
      entityId: user._id,
      severity: "CRITICAL",
      request,
      metadata: {
        reason: reason || "Blocked by admin",
      },
    });

    return buildNoStoreResponse(
      { success: true, message: "User blocked successfully" },
      200
    );
  } catch (err) {
    console.error("block user error", err);

    return buildNoStoreResponse(
      { success: false, message: "Failed to block user" },
      500
    );
  }
}
