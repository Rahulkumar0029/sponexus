import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { DealModel } from "@/lib/models/Deal";
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
    const actor = await requireAdminPermission("admin:events:read");
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid event id",
        },
        { status: 400 }
      );
    }

    const event = await EventModel.findOne({
      _id: id,
      isDeleted: false,
    })
      .select(
        [
          "title",
          "description",
          "organizerId",
          "status",
          "visibilityStatus",
          "moderationStatus",
          "location",
          "city",
          "venue",
          "startDate",
          "endDate",
          "budget",
          "attendeeCount",
          "expectedAudience",
          "eventType",
          "category",
          "bannerImage",
          "coverImage",
          "tags",
          "createdAt",
          "updatedAt",
        ].join(" ")
      )
      .lean();

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "Event not found",
        },
        { status: 404 }
      );
    }

    const relatedDeals = await DealModel.find({
      eventId: id,
      isDeleted: false,
    })
      .select(
        "title organizerId sponsorId status paymentStatus isFrozen adminReviewStatus proposedAmount finalAmount createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_EVENT_VIEWED",
      targetType: "EVENT",
      targetId: id,
      reason: "Viewed event detail in admin panel",
    });

    return NextResponse.json(
      {
        success: true,
        event,
        relatedDeals,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin event detail error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to load event detail",
      },
      { status }
    );
  }
}