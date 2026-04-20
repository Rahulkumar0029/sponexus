import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import AdminAuditLog from "@/lib/models/AdminAuditLog";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:audit:read");

    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") || "1")
    );
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") || "20"))
    );

    const action = request.nextUrl.searchParams.get("action")?.trim() || "";
    const targetType =
      request.nextUrl.searchParams.get("targetType")?.trim() || "";
    const actorUserId =
      request.nextUrl.searchParams.get("actorUserId")?.trim() || "";

    const query: Record<string, unknown> = {};

    if (action) {
      query.action = action;
    }

    if (
      targetType &&
      [
        "USER",
        "EVENT",
        "SPONSOR_PROFILE",
        "SPONSORSHIP",
        "DEAL",
        "ADMIN_SESSION",
        "SYSTEM",
      ].includes(targetType)
    ) {
      query.targetType = targetType;
    }

    if (actorUserId) {
      query.actorUserId = actorUserId;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(query),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_AUDIT_LOGS_VIEWED",
      targetType: "SYSTEM",
      reason: "Viewed admin audit logs",
      metadata: {
        page,
        limit,
        filterAction: action,
        filterTargetType: targetType,
        filterActorUserId: actorUserId,
        total,
      },
    });

    return NextResponse.json(
      {
        success: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin audit logs error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load audit logs",
      },
      { status: 500 }
    );
  }
}