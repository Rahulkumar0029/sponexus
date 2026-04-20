import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import { DealModel } from "@/lib/models/Deal";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:sponsorships:read");

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
    }).lean();

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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load sponsorship detail",
      },
      { status: 500 }
    );
  }
}