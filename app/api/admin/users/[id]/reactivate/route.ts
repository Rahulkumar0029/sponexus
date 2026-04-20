import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import {
  requireAdminPermission,
  requireStepUpVerification,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const actor = await requireAdminPermission("admin:users:reactivate");
    await requireStepUpVerification();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";

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

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to reactivate user",
      },
      { status: 500 }
    );
  }
}