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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const actor = await requireAdminPermission("admin:users:suspend");
    await requireStepUpVerification();

    const { id } = params;

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

    const body = await request.json();
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";

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

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to suspend user",
      },
      { status: 500 }
    );
  }
}