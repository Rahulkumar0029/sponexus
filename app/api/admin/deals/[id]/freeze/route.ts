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

    const actor = await requireAdminPermission("admin:deals:freeze");
    await requireStepUpVerification();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return NextResponse.json(
        { success: false, message: "Freeze reason is required" },
        { status: 400 }
      );
    }

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

    deal.isFrozen = true;
    deal.frozenAt = new Date();
    deal.frozenBy = actor.user._id;
    deal.freezeReason = reason;
    deal.adminReviewStatus = "UNDER_REVIEW";

    await deal.save();

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_DEAL_FROZEN",
      targetType: "DEAL",
      targetId: deal._id,
      reason,
      metadata: {
        title: deal.title,
        status: deal.status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Deal frozen successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin freeze deal error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to freeze deal",
      },
      { status: 500 }
    );
  }
}