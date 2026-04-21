import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import {
  requireAdminPermission,
  requireStepUpVerification,
  revokeAllAdminSessionsForUser,
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
    const actor = await requireAdminPermission("admin:users:suspend");
    await requireStepUpVerification();
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user id" },
        { status: 400 }
      );
    }

    if (String(actor.user._id) === id) {
      return NextResponse.json(
        { success: false, message: "You cannot suspend your own account" },
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

    if (!reason) {
      return NextResponse.json(
        { success: false, message: "Suspension reason is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ _id: id, isDeleted: false });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.adminRole === "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "SUPER_ADMIN account cannot be suspended from this route",
        },
        { status: 403 }
      );
    }

    user.accountStatus = "SUSPENDED";
    user.suspendedAt = new Date();
    user.suspendedBy = actor.user._id;
    user.suspensionReason = reason;
    user.lastActiveAt = new Date();

    await user.save();

    await revokeAllAdminSessionsForUser(user._id, "User suspended by admin");

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_USER_SUSPENDED",
      targetType: "USER",
      targetId: user._id,
      reason,
      metadata: {
        targetEmail: user.email,
        targetRole: user.role,
        targetAdminRole: user.adminRole,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User suspended successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin suspend user error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to suspend user",
      },
      { status }
    );
  }
}