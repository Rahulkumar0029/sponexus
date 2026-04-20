import { NextResponse } from "next/server";

import { requireAdmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { getAdminPermissions } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdmin();
    const permissions = getAdminPermissions(actor.adminRole);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_ME_VIEWED",
      targetType: "SYSTEM",
      reason: "Admin fetched own session context",
    });

    return NextResponse.json(
      {
        success: true,
        admin: {
          _id: String(actor.user._id),
          name: actor.user.name,
          email: actor.user.email,
          role: actor.user.role,
          adminRole: actor.user.adminRole,
          accountStatus: actor.user.accountStatus,
          permissions,
          lastLoginAt: actor.user.lastLoginAt,
          lastActiveAt: actor.user.lastActiveAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin me error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Admin authentication required",
      },
      { status: 401 }
    );
  }
}