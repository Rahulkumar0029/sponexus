import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_DEAL_STATUSES = new Set([
  "pending",
  "negotiating",
  "accepted",
  "rejected",
  "completed",
  "cancelled",
  "disputed",
]);

const ALLOWED_PAYMENT_STATUSES = new Set(["unpaid", "pending", "paid"]);

const ALLOWED_ADMIN_REVIEW_STATUSES = new Set([
  "NONE",
  "UNDER_REVIEW",
  "RESOLVED",
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
    const actor = await requireAdminPermission("admin:deals:read");
    await connectDB();

    const page = parsePositiveInt(request.nextUrl.searchParams.get("page"), 1);
    const limit = Math.min(
      50,
      parsePositiveInt(request.nextUrl.searchParams.get("limit"), 20)
    );

    const q = (request.nextUrl.searchParams.get("q")?.trim() || "").slice(0, 100);
    const status = (request.nextUrl.searchParams.get("status")?.trim() || "").toLowerCase();
    const paymentStatus = (
      request.nextUrl.searchParams.get("paymentStatus")?.trim() || ""
    ).toLowerCase();
    const adminReviewStatus = (
      request.nextUrl.searchParams.get("adminReviewStatus")?.trim() || ""
    ).toUpperCase();
    const frozen = (request.nextUrl.searchParams.get("frozen")?.trim() || "").toLowerCase();

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { message: regex },
        { notes: regex },
        { disputeReason: regex },
      ];
    }

    if (ALLOWED_DEAL_STATUSES.has(status)) {
      query.status = status;
    }

    if (ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    if (ALLOWED_ADMIN_REVIEW_STATUSES.has(adminReviewStatus)) {
      query.adminReviewStatus = adminReviewStatus;
    }

    if (frozen === "true") {
      query.isFrozen = true;
    } else if (frozen === "false") {
      query.isFrozen = false;
    }

    const skip = (page - 1) * limit;

    const [deals, total] = await Promise.all([
      DealModel.find(query)
        .select(
          [
            "title",
            "organizerId",
            "sponsorId",
            "eventId",
            "status",
            "paymentStatus",
            "isFrozen",
            "adminReviewStatus",
            "proposedAmount",
            "finalAmount",
            "acceptedAt",
            "completedAt",
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DealModel.countDocuments(query),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_DEALS_LIST_VIEWED",
      targetType: "SYSTEM",
      reason: "Viewed admin deals list",
      metadata: {
        page,
        limit,
        q,
        status,
        paymentStatus,
        adminReviewStatus,
        frozen,
        total,
      },
    });

    return NextResponse.json(
      {
        success: true,
        deals,
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
    console.error("Admin deals list error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to load deals",
      },
      { status }
    );
  }
}