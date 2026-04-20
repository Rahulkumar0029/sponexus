import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { DealModel } from "@/lib/models/Deal";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:events:read");

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
    }).lean();

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

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load event detail",
      },
      { status: 500 }
    );
  }
}