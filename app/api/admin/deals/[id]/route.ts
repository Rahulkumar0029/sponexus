import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
import { EventModel } from "@/lib/models/Event";
import User from "@/lib/models/User";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireAdminPermission("admin:deals:read");
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid deal id",
        },
        { status: 400 }
      );
    }

    const deal = await DealModel.findOne({
      _id: id,
      isDeleted: false,
    })
      .select(
        [
          "title",
          "description",
          "message",
          "notes",
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
          "disputeReason",
          "createdAt",
          "updatedAt",
        ].join(" ")
      )
      .lean();

    if (!deal) {
      return NextResponse.json(
        {
          success: false,
          message: "Deal not found",
        },
        { status: 404 }
      );
    }

    const [organizer, sponsor, event] = await Promise.all([
      User.findOne({ _id: deal.organizerId, isDeleted: false })
        .select("name email role companyName organizationName accountStatus")
        .lean(),
      User.findOne({ _id: deal.sponsorId, isDeleted: false })
        .select("name email role companyName organizationName accountStatus")
        .lean(),
      EventModel.findOne({ _id: deal.eventId, isDeleted: false })
        .select(
          "title status visibilityStatus moderationStatus location startDate endDate"
        )
        .lean(),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_DEAL_VIEWED",
      targetType: "DEAL",
      targetId: id,
      reason: "Viewed deal detail in admin panel",
    });

    return NextResponse.json(
      {
        success: true,
        deal,
        related: {
          organizer,
          sponsor,
          event,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin deal detail error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to load deal detail",
      },
      { status }
    );
  }
}