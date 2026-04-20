import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
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

    const actor = await requireAdminPermission("admin:sponsorships:moderate");
    await requireStepUpVerification();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsorship id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Sponsorship restored by admin";

    const sponsorship = await Sponsorship.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!sponsorship) {
      return NextResponse.json(
        { success: false, message: "Sponsorship not found" },
        { status: 404 }
      );
    }

    sponsorship.visibilityStatus = "VISIBLE";
    sponsorship.moderationStatus = "APPROVED";
    sponsorship.flagReason = "";

    await sponsorship.save();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_SPONSORSHIP_RESTORED",
      targetType: "SPONSORSHIP",
      targetId: sponsorship._id,
      reason,
      metadata: {
        title: sponsorship.sponsorshipTitle,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Sponsorship restored successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin restore sponsorship error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to restore sponsorship",
      },
      { status: 500 }
    );
  }
}