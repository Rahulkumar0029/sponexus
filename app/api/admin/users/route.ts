import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:users:read");

    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") || "1")
    );
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") || "20"))
    );

    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    const role = request.nextUrl.searchParams.get("role")?.trim() || "";
    const adminRole =
      request.nextUrl.searchParams.get("adminRole")?.trim() || "";
    const accountStatus =
      request.nextUrl.searchParams.get("accountStatus")?.trim() || "";

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { email: regex },
        { name: regex },
        { firstName: regex },
        { lastName: regex },
        { companyName: regex },
        { phone: regex },
        { organizationName: regex },
      ];
    }

    if (role && ["ORGANIZER", "SPONSOR"].includes(role)) {
      query.role = role;
    }

    if (
      adminRole &&
      ["NONE", "SUPPORT_ADMIN", "VERIFICATION_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(
        adminRole
      )
    ) {
      query.adminRole = adminRole;
    }

    if (
      accountStatus &&
      ["ACTIVE", "SUSPENDED", "DISABLED", "PENDING_REVIEW"].includes(
        accountStatus
      )
    ) {
      query.accountStatus = accountStatus;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select(
          [
            "name",
            "email",
            "role",
            "adminRole",
            "accountStatus",
            "firstName",
            "lastName",
            "companyName",
            "phone",
            "organizationName",
            "isEmailVerified",
            "isProfileComplete",
            "lastLoginAt",
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_USERS_LIST_VIEWED",
      targetType: "SYSTEM",
      reason: "Viewed admin users list",
      metadata: {
        page,
        limit,
        q,
        role,
        adminRole,
        accountStatus,
        total,
      },
    });

    return NextResponse.json(
      {
        success: true,
        users,
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
    console.error("Admin users list error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load users",
      },
      { status: 500 }
    );
  }
}