import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import {
  requireAdminPermission,
  requireStepUpVerification,
  writeAdminAuditLog,
} from "@/lib/admin-auth";

function getSafeReason(value: unknown, fallback = "Sponsorship restored by admin") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim().slice(0, 500);
  return trimmed || fallback;
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
    const actor = await requireAdminPermission("admin:sponsorships:moderate");
    await requireStepUpVerification();
    await connectDB();

    const id = String(params?.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsorship id" },
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

    const status = getErrorStatus(error);

    return NextResponse.json(
      {
        success: false,
        message:
          status === 401 || status === 403
            ? error instanceof Error
              ? error.message
              : "Unauthorized"
            : "Failed to restore sponsorship",
      },
      { status }
    );
  }
}