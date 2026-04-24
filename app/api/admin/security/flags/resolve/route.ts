import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import FraudFlag from "@/lib/models/FraudFlag";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";

function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const body = await request.json();

    const flagId =
      typeof body.flagId === "string" ? body.flagId.trim() : "";

    const resolutionNote =
      typeof body.resolutionNote === "string"
        ? body.resolutionNote.trim()
        : "";

    if (!flagId || !mongoose.Types.ObjectId.isValid(flagId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid flagId." },
        400
      );
    }

    const flag = await FraudFlag.findById(flagId);

    if (!flag) {
      return buildNoStoreResponse(
        { success: false, message: "Flag not found." },
        404
      );
    }

    if (flag.status === "RESOLVED") {
      return buildNoStoreResponse(
        {
          success: true,
          message: "Fraud flag already resolved.",
          data: flag,
        },
        200
      );
    }

    flag.status = "RESOLVED";
    flag.resolutionNotes = resolutionNote || "Resolved by admin";
    flag.resolvedBy = access.adminUser._id;

    await flag.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Fraud flag resolved successfully.",
        data: flag,
      },
      200
    );
  } catch (err) {
    console.error("PATCH /api/admin/security/flags/resolve error:", err);

    return buildNoStoreResponse(
      { success: false, message: "Failed to resolve flag." },
      500
    );
  }
}