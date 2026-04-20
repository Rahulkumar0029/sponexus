import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
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

    const actor = await requireAdminPermission("admin:deals:moderate");
    await requireStepUpVerification();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Deal resolved by admin";
    const internalNotes =
      typeof body.internalNotes === "string" ? body.internalNotes.trim() : "";
    const keepFrozen = Boolean(body.keepFrozen);

    const deal = await DealModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    deal.adminReviewStatus = "RESOLVED";
    deal.internalNotes = internalNotes;
    deal.resolvedByAdminId = actor.user._id;
    deal.resolvedAt = new Date();

    if (!keepFrozen) {
      deal.isFrozen = false;
      deal.frozenAt = null;
      deal.frozenBy = null;
      deal.freezeReason = "";
    }

    await deal.save();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_DEAL_RESOLVED",
      targetType: "DEAL",
      targetId: deal._id,
      reason,
      metadata: {
        title: deal.title,
        keepFrozen,
        internalNotesLength: internalNotes.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Deal resolved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin resolve deal error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to resolve deal",
      },
      { status: 500 }
    );
  }
}