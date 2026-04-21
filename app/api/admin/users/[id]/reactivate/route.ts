import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import {
  requireAdminPermission,
  requireStepUpVerification,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

function getSafeReason(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 500);
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return 500;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireAdminPermission("admin:users:reactivate");
    await requireStepUpVerification();
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user id" },
        { status: 400 }
      );
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const reason =
      typeof body === "object" && body !== null
        ? getSafeReason((body as { reason?: unknown }).reason)
        : "";

    const user = await User.findOne({ _id: id, isDeleted: false });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    user.accountStatus = "ACTIVE";
    user.suspendedAt = null;
    user.suspendedBy = null;
    user.suspensionReason = "";
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    user.lastActiveAt = new Date();

    await user.save();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_USER_REACTIVATED",
      targetType: "USER",
      targetId: user._id,
      reason: reason || "User account reactivated",
      metadata: {
        targetEmail: user.email,
        targetRole: user.role,
        targetAdminRole: user.adminRole,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User reactivated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin reactivate user error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to reactivate user",
      },
      { status }
    );
  }
}