import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";
import {
  PAYMENT_GATEWAY,
  PAYMENT_STATUS,
  PAYMENT_TRANSACTION_TYPE,
} from "@/lib/subscription/constants";

export const dynamic = "force-dynamic";

type PaymentStatusValue =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

type PaymentGatewayValue =
  (typeof PAYMENT_GATEWAY)[keyof typeof PAYMENT_GATEWAY];

type PaymentTransactionTypeValue =
  (typeof PAYMENT_TRANSACTION_TYPE)[keyof typeof PAYMENT_TRANSACTION_TYPE];

/* ===============================
   RESPONSE HELPER
=================================*/
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

/* ===============================
   CONSTANTS
=================================*/
const ALLOWED_PAYMENT_STATUSES = new Set<PaymentStatusValue>(
  Object.values(PAYMENT_STATUS)
);

const ALLOWED_PAYMENT_GATEWAYS = new Set<PaymentGatewayValue>(
  Object.values(PAYMENT_GATEWAY)
);

const ALLOWED_TRANSACTION_TYPES = new Set<PaymentTransactionTypeValue>(
  Object.values(PAYMENT_TRANSACTION_TYPE)
);

function isPaymentStatusValue(value: string): value is PaymentStatusValue {
  return ALLOWED_PAYMENT_STATUSES.has(value as PaymentStatusValue);
}

function isPaymentGatewayValue(value: string): value is PaymentGatewayValue {
  return ALLOWED_PAYMENT_GATEWAYS.has(value as PaymentGatewayValue);
}

function isPaymentTransactionTypeValue(
  value: string
): value is PaymentTransactionTypeValue {
  return ALLOWED_TRANSACTION_TYPES.has(value as PaymentTransactionTypeValue);
}

/* ===============================
   SANITIZER
=================================*/
function sanitizePaymentForAdmin(payment: any) {
  return {
    _id: String(payment._id),

    userId: payment.userId?._id
      ? String(payment.userId._id)
      : String(payment.userId),

    user: payment.userId?._id
      ? {
          _id: String(payment.userId._id),
          firstName: payment.userId.firstName ?? "",
          lastName: payment.userId.lastName ?? "",
          name: payment.userId.name ?? "",
          email: payment.userId.email ?? "",
          companyName: payment.userId.companyName ?? "",
          role: payment.userId.role ?? null,
          adminRole: payment.userId.adminRole ?? null,
        }
      : null,

    subscriptionId: payment.subscriptionId?._id
      ? String(payment.subscriptionId._id)
      : payment.subscriptionId
      ? String(payment.subscriptionId)
      : null,

    subscription: payment.subscriptionId?._id
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

    planId: payment.planId?._id
      ? String(payment.planId._id)
      : payment.planId
      ? String(payment.planId)
      : null,

    plan: payment.planId?._id
      ? {
          _id: String(payment.planId._id),
          code: payment.planId.code ?? null,
          name: payment.planId.name ?? null,
          role: payment.planId.role ?? null,
          interval: payment.planId.interval ?? null,
          price: payment.planId.price ?? null,
          currency: payment.planId.currency ?? null,
        }
      : null,

    role: payment.role,
    transactionType: payment.transactionType,

    checkoutAttemptId: payment.checkoutAttemptId ?? null,
    receipt: payment.receipt ?? null,

    amountBeforeDiscount: payment.amountBeforeDiscount ?? 0,
    couponCode: payment.couponCode ?? null,
    couponDiscountAmount: payment.couponDiscountAmount ?? null,
    amount: payment.amount ?? 0,
    currency: payment.currency ?? "INR",

    status: payment.status,
    gateway: payment.gateway,
    method: payment.method ?? "",

    gatewayStatus: payment.gatewayStatus ?? null,
    gatewayOrderId: payment.gatewayOrderId ?? null,
    gatewayPaymentId: payment.gatewayPaymentId ?? null,
    verificationSource: payment.verificationSource ?? null,

    isWebhookConfirmed: Boolean(payment.isWebhookConfirmed),
    fraudFlagged: Boolean(payment.fraudFlagged),

    failureCode: payment.failureCode ?? null,
    failureReason: payment.failureReason ?? null,
    refundReason: payment.refundReason ?? null,
    invoiceNumber: payment.invoiceNumber ?? null,
    notes: payment.notes ?? "",

    paidAt: payment.paidAt ?? null,
    verifiedAt: payment.verifiedAt ?? null,
    processedAt: payment.processedAt ?? null,
    webhookReceivedAt: payment.webhookReceivedAt ?? null,
    webhookConfirmedAt: payment.webhookConfirmedAt ?? null,

    createdAt: payment.createdAt ?? null,
    updatedAt: payment.updatedAt ?? null,

    planSnapshot: payment.planSnapshot ?? null,
  };
}

/* ===============================
   GET PAYMENTS
=================================*/
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const gateway = searchParams.get("gateway");
    const transactionType = searchParams.get("transactionType");
    const couponCode = searchParams.get("couponCode");
    const fraudFlagged = searchParams.get("fraudFlagged");
    const q = searchParams.get("q");

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );

    const query: Record<string, any> = {};

    if (role === "ORGANIZER" || role === "SPONSOR") {
      query.role = role;
    }

    if (status && isPaymentStatusValue(status)) {
      query.status = status;
    }

    if (gateway && isPaymentGatewayValue(gateway)) {
      query.gateway = gateway;
    }

    if (transactionType && isPaymentTransactionTypeValue(transactionType)) {
      query.transactionType = transactionType;
    }

    if (couponCode?.trim()) {
      query.couponCode = couponCode.trim().toUpperCase();
    }

    if (fraudFlagged === "true") query.fraudFlagged = true;
    if (fraudFlagged === "false") query.fraudFlagged = false;

    const payments = await PaymentTransaction.find(query)
      .select("+failureReason +refundReason +notes")
      .populate(
        "userId",
        "firstName lastName name email companyName role adminRole"
      )
      .populate("planId", "code name role interval price currency")
      .populate("subscriptionId", "status startDate endDate renewalCount")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    let filtered = payments;

    if (q?.trim()) {
      const search = q.trim().toLowerCase();

      filtered = payments.filter((item: any) => {
        const user = item.userId || {};
        const plan = item.planId || {};
        const planSnapshot = item.planSnapshot || {};

        return (
          String(user.firstName || "").toLowerCase().includes(search) ||
          String(user.lastName || "").toLowerCase().includes(search) ||
          String(user.name || "").toLowerCase().includes(search) ||
          String(user.email || "").toLowerCase().includes(search) ||
          String(user.companyName || "").toLowerCase().includes(search) ||
          String(plan.name || "").toLowerCase().includes(search) ||
          String(plan.code || "").toLowerCase().includes(search) ||
          String(planSnapshot.name || "").toLowerCase().includes(search) ||
          String(planSnapshot.code || "").toLowerCase().includes(search) ||
          String(item.couponCode || "").toLowerCase().includes(search) ||
          String(item.gatewayOrderId || "").toLowerCase().includes(search) ||
          String(item.gatewayPaymentId || "").toLowerCase().includes(search) ||
          String(item.invoiceNumber || "").toLowerCase().includes(search) ||
          String(item.checkoutAttemptId || "").toLowerCase().includes(search) ||
          String(item.receipt || "").toLowerCase().includes(search)
        );
      });
    }

    const total =
      q && q.trim()
        ? filtered.length
        : await PaymentTransaction.countDocuments(query);

    return buildNoStoreResponse(
      {
        success: true,
        data: filtered.map(sanitizePaymentForAdmin),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
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
    console.error("GET /api/admin/payments error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch payments." },
      500
    );
  }
}

/* ===============================
   UPDATE PAYMENT (ADMIN)
=================================*/
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const body = await request.json();

    const paymentId =
      typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const status =
      typeof body.status === "string" ? body.status.trim() : "";

    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      return buildNoStoreResponse(
        { success: false, message: "Valid paymentId required." },
        400
      );
    }

    const payment = await PaymentTransaction.findById(paymentId);

    if (!payment) {
      return buildNoStoreResponse(
        { success: false, message: "Payment not found." },
        404
      );
    }

    if (
      payment.status === PAYMENT_STATUS.SUCCESS &&
      status &&
      status !== PAYMENT_STATUS.SUCCESS
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Cannot downgrade successful payment." },
        400
      );
    }

    if (status) {
      if (!isPaymentStatusValue(status)) {
        return buildNoStoreResponse(
          { success: false, message: "Invalid payment status." },
          400
        );
      }

      payment.status = status;
    }

    await payment.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Payment updated successfully.",
      },
      200
    );
  } catch (error) {
    console.error("PATCH /api/admin/payments error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to update payment." },
      500
    );
  }
}