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

    const actor = await requireAdminPermission("admin:users:revoke-sessions");
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
      typeof body.reason === "string" ? body.reason.trim() : "Sessions revoked by admin";

    const user = await User.findOne({ _id: id, isDeleted: false });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    await revokeAllAdminSessionsForUser(user._id, reason);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_USER_SESSIONS_REVOKED",
      targetType: "USER",
      targetId: user._id,
      reason,
      metadata: {
        targetEmail: user.email,
        targetRole: user.role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User admin sessions revoked successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin revoke user sessions error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to revoke user sessions",
      },
      { status: 500 }
    );
  }
}