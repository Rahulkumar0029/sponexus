import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["ORGANIZER", "SPONSOR"]);
const ALLOWED_ADMIN_ROLES = new Set([
  "NONE",
  "SUPPORT_ADMIN",
  "VERIFICATION_ADMIN",
  "ADMIN",
  "SUPER_ADMIN",
]);
const ALLOWED_ACCOUNT_STATUSES = new Set([
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
  "PENDING_REVIEW",
]);

function parsePositiveInt(value: string | null, fallback: number) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return fallback;
  }

  const int = Math.floor(num);
  return int >= 1 ? int : fallback;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("admin:users:read");
    await connectDB();

    const page = parsePositiveInt(request.nextUrl.searchParams.get("page"), 1);
    const limit = Math.min(
      50,
      parsePositiveInt(request.nextUrl.searchParams.get("limit"), 20)
    );

    const q = (request.nextUrl.searchParams.get("q")?.trim() || "").slice(0, 100);
    const role = (request.nextUrl.searchParams.get("role")?.trim() || "").toUpperCase();
    const adminRole = (
      request.nextUrl.searchParams.get("adminRole")?.trim() || ""
    ).toUpperCase();
    const accountStatus = (
      request.nextUrl.searchParams.get("accountStatus")?.trim() || ""
    ).toUpperCase();

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
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

    if (ALLOWED_ROLES.has(role)) {
      query.role = role;
    }

    if (ALLOWED_ADMIN_ROLES.has(adminRole)) {
      query.adminRole = adminRole;
    }

    if (ALLOWED_ACCOUNT_STATUSES.has(accountStatus)) {
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
  } catch (error: any) {
    console.error("Admin users list error:", error);

    const status =
      typeof error?.status === "number"
        ? error.status
        : typeof error?.statusCode === "number"
        ? error.statusCode
        : 500;

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error?.message || "Unauthorized"
            : "Failed to load users",
      },
      { status }
    );
  }
}