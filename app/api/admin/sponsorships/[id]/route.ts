import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
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
    const actor = await requireAdminPermission("admin:sponsorships:read");
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid sponsorship id",
        },
        { status: 400 }
      );
    }

    const sponsorship = await Sponsorship.findOne({
      _id: id,
      isDeleted: false,
    })
      .select(
        [
          "sponsorshipTitle",
          "sponsorOwnerId",
          "sponsorProfileId",
          "sponsorshipType",
          "status",
          "visibilityStatus",
          "moderationStatus",
          "category",
          "city",
          "locationPreference",
          "budget",
          "campaignGoal",
          "deliverablesExpected",
          "targetAudience",
          "contactPersonName",
          "contactPhone",
          "contactEmail",
          "notes",
          "expiresAt",
          "createdAt",
          "updatedAt",
        ].join(" ")
      )
      .lean();

    if (!sponsorship) {
      return NextResponse.json(
        {
          success: false,
          message: "Sponsorship not found",
        },
        { status: 404 }
      );
    }

    const relatedDeals = await DealModel.find({
      sponsorId: sponsorship.sponsorOwnerId,
      isDeleted: false,
    })
      .select(
        "title organizerId sponsorId eventId status paymentStatus isFrozen adminReviewStatus proposedAmount finalAmount createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_SPONSORSHIP_VIEWED",
      targetType: "SPONSORSHIP",
      targetId: id,
      reason: "Viewed sponsorship detail in admin panel",
    });

    return NextResponse.json(
      {
        success: true,
        sponsorship,
        relatedDeals,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin sponsorship detail error:", error);

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to load sponsorship detail",
      },
      { status }
    );
  }
}