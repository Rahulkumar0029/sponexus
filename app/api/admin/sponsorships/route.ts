import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:sponsorships:read");

    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") || "1")
    );
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") || "20"))
    );

    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const visibilityStatus =
      request.nextUrl.searchParams.get("visibilityStatus")?.trim() || "";
    const moderationStatus =
      request.nextUrl.searchParams.get("moderationStatus")?.trim() || "";

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
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

    if (status && ["active", "paused", "closed"].includes(status)) {
      query.status = status;
    }

    if (
      visibilityStatus &&
      ["VISIBLE", "HIDDEN", "UNDER_REVIEW"].includes(visibilityStatus)
    ) {
      query.visibilityStatus = visibilityStatus;
    }

    if (
      moderationStatus &&
      ["APPROVED", "FLAGGED", "PENDING_REVIEW"].includes(moderationStatus)
    ) {
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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load sponsorships",
      },
      { status: 500 }
    );
  }
}