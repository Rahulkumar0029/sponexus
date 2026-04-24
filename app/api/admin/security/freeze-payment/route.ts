import { NextRequest } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";
import { safeLogAudit } from "@/lib/audit/log";

function buildNoStoreResponse(body: any, status: number) {
  const { NextResponse } = require("next/server");
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const body = await request.json();
    const { paymentId, reason } = body;

    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid paymentId" },
        400
      );
    }

    const payment = await PaymentTransaction.findById(paymentId);

    if (!payment) {
      return buildNoStoreResponse(
        { success: false, message: "Payment not found" },
        404
      );
    }

    payment.status = "FLAGGED";
    payment.fraudFlagged = true;
    payment.notes = reason || "Payment frozen by admin";

    await payment.save();

    await safeLogAudit({
      actorId: access.adminUser._id,
      action: "PAYMENT_FROZEN",
      entityType: "PAYMENT",
      entityId: payment._id,
      severity: "CRITICAL",
      request,
      metadata: {
        reason,
      },
    });

    return buildNoStoreResponse(
      { success: true, message: "Payment frozen successfully" },
      200
    );
  } catch (err) {
    console.error("freeze payment error", err);

    return buildNoStoreResponse(
      { success: false, message: "Failed to freeze payment" },
      500
    );
  }
}