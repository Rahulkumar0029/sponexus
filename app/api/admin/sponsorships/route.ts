import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_SPONSORSHIP_STATUSES = new Set(["active", "paused", "closed"]);
const ALLOWED_VISIBILITY_STATUSES = new Set([
  "VISIBLE",
  "HIDDEN",
  "UNDER_REVIEW",
]);
const ALLOWED_MODERATION_STATUSES = new Set([
  "APPROVED",
  "FLAGGED",
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

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("admin:sponsorships:read");
    await connectDB();

    const page = parsePositiveInt(request.nextUrl.searchParams.get("page"), 1);
    const limit = Math.min(
      50,
      parsePositiveInt(request.nextUrl.searchParams.get("limit"), 20)
    );

    const q = (request.nextUrl.searchParams.get("q")?.trim() || "").slice(0, 100);
    const status = (request.nextUrl.searchParams.get("status")?.trim() || "").toLowerCase();
    const visibilityStatus = (
      request.nextUrl.searchParams.get("visibilityStatus")?.trim() || ""
    ).toUpperCase();
    const moderationStatus = (
      request.nextUrl.searchParams.get("moderationStatus")?.trim() || ""
    ).toUpperCase();

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [
        { sponsorshipTitle: regex },
        { sponsorshipType: regex },
        { category: regex },
        { city: regex },
        { locationPreference: regex },
        { contactPersonName: regex },
        { contactPhone: regex },
      ];
    }

    if (ALLOWED_SPONSORSHIP_STATUSES.has(status)) {
      query.status = status;
    }

    if (ALLOWED_VISIBILITY_STATUSES.has(visibilityStatus)) {
      query.visibilityStatus = visibilityStatus;
    }

    if (ALLOWED_MODERATION_STATUSES.has(moderationStatus)) {
      query.moderationStatus = moderationStatus;
    }

    const skip = (page - 1) * limit;

    const [sponsorships, total] = await Promise.all([
      Sponsorship.find(query)
        .select(
          [
            "sponsorshipTitle",
            "sponsorOwnerId",
            "status",
            "visibilityStatus",
            "moderationStatus",
            "category",
            "city",
            "locationPreference",
            "budget",
            "contactPersonName",
            "contactPhone",
            "expiresAt",
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sponsorship.countDocuments(query),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_SPONSORSHIPS_LIST_VIEWED",
      targetType: "SYSTEM",
      reason: "Viewed admin sponsorships list",
      metadata: {
        page,
        limit,
        q,
        status,
        visibilityStatus,
        moderationStatus,
        total,
      },
    });

    return NextResponse.json(
      {
        success: true,
        sponsorships,
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
    console.error("Admin sponsorships list error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to load sponsorships",
      },
      { status }
    );
  }
}