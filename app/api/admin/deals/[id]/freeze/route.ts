import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
import {
  requireAdminPermission,
  requireStepUpVerification,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

function getSafeReason(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, 500);
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireAdminPermission("admin:deals:freeze");
    await requireStepUpVerification();
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const reason =
      typeof body === "object" && body !== null
        ? getSafeReason((body as { reason?: unknown }).reason)
        : "";

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

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to freeze deal",
      },
      { status }
    );
  }
}