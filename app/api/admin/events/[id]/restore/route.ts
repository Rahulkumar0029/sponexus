import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import {
  requireAdminPermission,
  requireStepUpVerification,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const actor = await requireAdminPermission("admin:events:moderate");
    await requireStepUpVerification();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid event id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Event restored by admin";

    const event = await EventModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    event.visibilityStatus = "VISIBLE";
    event.moderationStatus = "APPROVED";
    event.hiddenReason = "";
    event.flagReason = "";

    await event.save();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_EVENT_RESTORED",
      targetType: "EVENT",
      targetId: event._id,
      reason,
      metadata: {
        title: event.title,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event restored successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin restore event error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to restore event",
      },
      { status: 500 }
    );
  }
}