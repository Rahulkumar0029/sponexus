import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
import { EventModel } from "@/lib/models/Event";
import User from "@/lib/models/User";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:deals:read");

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
    }).lean();

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
      User.findById(deal.organizerId)
        .select("name email role companyName organizationName accountStatus")
        .lean(),
      User.findById(deal.sponsorId)
        .select("name email role companyName organizationName accountStatus")
        .lean(),
      EventModel.findById(deal.eventId)
        .select("title status visibilityStatus moderationStatus location startDate endDate")
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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load deal detail",
      },
      { status: 500 }
    );
  }
}