import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/Deal";
import {
  requireAdminPermission,
  requireStepUpVerification,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

function getSafeReason(value: unknown, fallback = "Deal resolved by admin") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim().slice(0, 500);
  return trimmed || fallback;
}

function getSafeInternalNotes(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 5000);
}

function getSafeBoolean(value: unknown) {
  return value === true;
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
    const actor = await requireAdminPermission("admin:deals:moderate");
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
        : "Deal resolved by admin";

    const internalNotes =
      typeof body === "object" && body !== null
        ? getSafeInternalNotes((body as { internalNotes?: unknown }).internalNotes)
        : "";

    const keepFrozen =
      typeof body === "object" && body !== null
        ? getSafeBoolean((body as { keepFrozen?: unknown }).keepFrozen)
        : false;

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

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to resolve deal",
      },
      { status }
    );
  }
}