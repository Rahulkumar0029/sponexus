import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:deals:read");

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
    const paymentStatus =
      request.nextUrl.searchParams.get("paymentStatus")?.trim() || "";
    const adminReviewStatus =
      request.nextUrl.searchParams.get("adminReviewStatus")?.trim() || "";
    const frozen = request.nextUrl.searchParams.get("frozen")?.trim() || "";

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { message: regex },
        { notes: regex },
        { disputeReason: regex },
      ];
    }

    if (
      status &&
      [
        "pending",
        "negotiating",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
        "disputed",
      ].includes(status)
    ) {
      query.status = status;
    }

    if (paymentStatus && ["unpaid", "pending", "paid"].includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    if (
      adminReviewStatus &&
      ["NONE", "UNDER_REVIEW", "RESOLVED"].includes(adminReviewStatus)
    ) {
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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load deals",
      },
      { status: 500 }
    );
  }
}