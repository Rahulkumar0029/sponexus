import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";

export const dynamic = "force-dynamic";

function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function sanitizePaymentDetail(payment: any) {
  return {
    _id: String(payment._id),

    user: payment.userId
      ? {
          _id: String(payment.userId._id),
          name: payment.userId.name || "",
          email: payment.userId.email || "",
          companyName: payment.userId.companyName || "",
          role: payment.userId.role ?? null,
        }
      : null,

    plan: payment.planId
      ? {
          _id: String(payment.planId._id),
          code: payment.planId.code ?? null,
          name: payment.planId.name ?? null,
          price: payment.planId.price ?? null,
        }
      : null,

    planSnapshot: payment.planSnapshot || null,

    subscription: payment.subscriptionId
      ? {
          _id: String(payment.subscriptionId._id),
          status: payment.subscriptionId.status ?? null,
          startDate: payment.subscriptionId.startDate ?? null,
          endDate: payment.subscriptionId.endDate ?? null,
          renewalCount: payment.subscriptionId.renewalCount ?? 0,
        }
      : null,

    renewalOfSubscriptionId: payment.renewalOfSubscriptionId
      ? String(payment.renewalOfSubscriptionId)
      : null,

    transactionType: payment.transactionType,
    amountBeforeDiscount: payment.amountBeforeDiscount,
    couponCode: payment.couponCode,
    couponDiscountAmount: payment.couponDiscountAmount,
    amount: payment.amount,
    currency: payment.currency,

    status: payment.status,
    gateway: payment.gateway,
    gatewayStatus: payment.gatewayStatus,
    verificationSource: payment.verificationSource,

    checkoutAttemptId: payment.checkoutAttemptId,
    receipt: payment.receipt,
    gatewayOrderId: payment.gatewayOrderId,
    gatewayPaymentId: payment.gatewayPaymentId,

    isWebhookConfirmed: payment.isWebhookConfirmed,
    fraudFlagged: payment.fraudFlagged,

    failureCode: payment.failureCode,
    failureReason: payment.failureReason,
    refundReason: payment.refundReason,

    paidAt: payment.paidAt,
    verifiedAt: payment.verifiedAt,
    processedAt: payment.processedAt,
    webhookReceivedAt: payment.webhookReceivedAt,
    webhookConfirmedAt: payment.webhookConfirmedAt,

    invoiceNumber: payment.invoiceNumber,
    notes: payment.notes,

    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,

    gatewayResponse: payment.gatewayResponse || null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid payment id." },
        400
      );
    }

    const payment = await PaymentTransaction.findById(id)
      .select(
        "+failureReason +refundReason +notes +gatewayResponse +gatewaySignature"
      )
      .populate("userId", "name email companyName role")
      .populate("planId", "code name price")
      .populate("subscriptionId", "status startDate endDate renewalCount")
      .lean();

    if (!payment) {
      return buildNoStoreResponse(
        { success: false, message: "Payment not found." },
        404
      );
    }

    return buildNoStoreResponse(
      {
        success: true,
        data: sanitizePaymentDetail(payment),
        paymentAccessSession: {
          id: String(access.paymentAccessSession._id),
          verifiedAt: access.paymentAccessSession.verifiedAt ?? null,
          sessionExpiresAt: access.paymentAccessSession.sessionExpiresAt ?? null,
          lastUsedAt: access.paymentAccessSession.lastUsedAt ?? null,
        },
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/payments/[id] error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch payment details." },
      500
    );
  }
}