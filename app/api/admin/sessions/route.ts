import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import AdminSession from "@/lib/models/AdminSession";
import {
  requireAdminPermission,
  requireStepUpVerification,
  revokeAdminSession,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:access");

    const sessions = await AdminSession.find({
      userId: actor.user._id,
    })
      .select(
        [
          "_id",
          "ipAddress",
          "userAgent",
          "isStepUpVerified",
          "lastStepUpAt",
          "lastActiveAt",
          "expiresAt",
          "revokedAt",
          "revokeReason",
          "createdAt",
        ].join(" ")
      )
      .sort({ createdAt: -1 })
      .lean();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_SESSIONS_VIEWED",
      targetType: "SYSTEM",
      reason: "Viewed own admin sessions",
      metadata: {
        sessionCount: sessions.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        sessions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin sessions GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load admin sessions",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:access");
    await requireStepUpVerification();

    const body = await request.json();
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Admin session revoked";

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "sessionId is required",
        },
        { status: 400 }
      );
    }

    const targetSession = await AdminSession.findOne({
      _id: sessionId,
      userId: actor.user._id,
      revokedAt: null,
    });

    if (!targetSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin session not found",
        },
        { status: 404 }
      );
    }

    await revokeAdminSession(sessionId, reason);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_SESSION_REVOKED",
      targetType: "ADMIN_SESSION",
      targetId: sessionId,
      reason,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admin session revoked successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin sessions PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to revoke admin session",
      },
      { status: 500 }
    );
  }
}