import {
  handleIdempotency,
  generateRequestHash,
  storeIdempotencyResponse,
} from "@/lib/payments/idempotency";

import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";

import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { detectAndRecordSuspiciousPattern } from "@/lib/security/suspicious-patterns";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { sanitizePayment } from "@/lib/payments/helpers";

import {
  PAYMENT_GATEWAY,
  PAYMENT_STATUS,
} from "@/lib/subscription/constants";

import { safeLogAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

/* ===============================
   RESPONSE BUILDER
=================================*/
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

function isFinalizedPaymentStatus(status: string) {
  return (
    status === PAYMENT_STATUS.SUCCESS ||
    status === PAYMENT_STATUS.VERIFIED ||
    status === PAYMENT_STATUS.REFUNDED ||
    status === PAYMENT_STATUS.CANCELLED ||
    status === PAYMENT_STATUS.EXPIRED ||
    status === PAYMENT_STATUS.MANUAL_REVIEW ||
    status === PAYMENT_STATUS.FLAGGED
  );
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    /* ===============================
       AUTH
    =================================*/
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid session." },
        401
      );
    }

    /* ===============================
       INPUT
    =================================*/
    const body = await request.json();

    const checkoutAttemptId =
      typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";

    if (!checkoutAttemptId) {
      return buildNoStoreResponse(
        { success: false, message: "checkoutAttemptId required." },
        400
      );
    }

    /* ===============================
       IDEMPOTENCY (STRICT)
    =================================*/
    const idempotencyKey = request.headers.get("x-idempotency-key") || "";

    if (!idempotencyKey) {
      return buildNoStoreResponse(
        { success: false, message: "Missing idempotency key." },
        400
      );
    }

    const requestHash = generateRequestHash(body);

    const idem = await handleIdempotency({
      key: idempotencyKey,
      userId: decoded.userId,
      endpoint: "create-order",
      requestHash,
    });

    if (idem.isReplay) {
      return buildNoStoreResponse(idem.response, idem.statusCode);
    }

    /* ===============================
       FETCH PAYMENT (STRICT MATCH)
    =================================*/
    const payment = await PaymentTransaction.findOne({
      checkoutAttemptId,
      userId: decoded.userId,
    }).select("+gatewayResponse +notes");

    if (!payment) {
      return buildNoStoreResponse(
        { success: false, message: "Payment not found." },
        404
      );
    }

    /* ===============================
       SECURITY CHECK
    =================================*/
    if (payment.gateway !== PAYMENT_GATEWAY.RAZORPAY) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid gateway." },
        400
      );
    }

    /* ===============================
       FINALIZED CHECK (CRITICAL)
    =================================*/
    if (isFinalizedPaymentStatus(payment.status)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Payment already finalized.",
          payment: sanitizePayment(payment),
        },
        409
      );
    }

    /* ===============================
       AMOUNT VALIDATION (CRITICAL)
    =================================*/
    if (
      typeof payment.amount !== "number" ||
      !Number.isFinite(payment.amount) ||
      payment.amount <= 0
    ) {
      await safeLogAudit({
        actorId: payment.userId,
        action: "PAYMENT_INVALID_AMOUNT",
        entityType: "PAYMENT",
        entityId: payment._id,
        severity: "CRITICAL",
        request,
        metadata: { amount: payment.amount },
      });

      await detectAndRecordSuspiciousPattern({
        request,
        userId: payment.userId,
        paymentId: payment._id,
        title: "Invalid payment amount",
        reason: "Invalid or zero amount during order creation",
        securityEventType: "PAYMENT_INVALID_AMOUNT",
        entityType: "PAYMENT",
      });

      return buildNoStoreResponse(
        { success: false, message: "Invalid payment amount." },
        400
      );
    }

    /* ===============================
       DOUBLE ORDER PROTECTION
    =================================*/
    if (payment.gatewayOrderId) {
      const responseBody = {
        success: true,
        message: "Order already exists.",
        payment: sanitizePayment(payment),
        order: {
          id: payment.gatewayOrderId,
          amount: Math.round(payment.amount * 100),
          currency: payment.currency,
          receipt: payment.receipt,
        },
        gateway: {
          provider: PAYMENT_GATEWAY.RAZORPAY,
          keyId: process.env.RAZORPAY_KEY_ID || "",
        },
      };

      if (idem.record) {
        await storeIdempotencyResponse({
          record: idem.record,
          response: responseBody,
          statusCode: 200,
        });
      }

      return buildNoStoreResponse(responseBody, 200);
    }

    /* ===============================
       CREATE ORDER
    =================================*/
    const order = await createRazorpayOrder({
      amountInRupees: payment.amount,
      receipt: payment.receipt,
      notes: {
        checkoutAttemptId: payment.checkoutAttemptId,
        paymentId: String(payment._id),
        userId: String(payment.userId),
        role: payment.role,
        transactionType: payment.transactionType,
      },
    });

    /* ===============================
       UPDATE PAYMENT
    =================================*/
    payment.gatewayOrderId = order.id;
    payment.gatewayStatus = order.status;
    payment.status = PAYMENT_STATUS.PENDING;
    payment.gatewayResponse = order;
    payment.notes = "Razorpay order created.";

    await payment.save();

    /* ===============================
       AUDIT LOG
    =================================*/
    await safeLogAudit({
      actorId: payment.userId,
      action: "PAYMENT_ORDER_CREATED",
      entityType: "PAYMENT",
      entityId: payment._id,
      severity: "INFO",
      request,
      metadata: {
        orderId: order.id,
        amount: payment.amount,
        currency: payment.currency,
      },
    });

    /* ===============================
       FINAL RESPONSE
    =================================*/
    const responseBody = {
      success: true,
      message: "Order created successfully.",
      payment: sanitizePayment(payment),
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
      },
      gateway: {
        provider: PAYMENT_GATEWAY.RAZORPAY,
        keyId: process.env.RAZORPAY_KEY_ID || "",
      },
    };

    if (idem.record) {
      await storeIdempotencyResponse({
        record: idem.record,
        response: responseBody,
        statusCode: 201,
      });
    }

    return buildNoStoreResponse(responseBody, 201);
  } catch (error) {
    console.error("create-order error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to create order.",
      },
      500
    );
  }
}