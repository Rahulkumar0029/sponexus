import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { safeLogAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

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

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay credentials.");
  }

  return { keyId, keySecret };
}

async function createRazorpayOrder(args: {
  amountInRupees: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const { keyId, keySecret } = getRazorpayConfig();

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(args.amountInRupees * 100),
      currency: args.currency,
      receipt: args.receipt,
      payment_capture: 1,
      notes: args.notes ?? {},
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay order creation failed: ${errorText}`);
  }

  return response.json();
}

function isCreatablePaymentStatus(status: string) {
  return status === "CREATED" || status === "PENDING" || status === "MANUAL_REVIEW";
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId || !decoded?.email) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid or expired session." },
        401
      );
    }

    const body = await request.json();
    const checkoutAttemptId =
      typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";

    if (!checkoutAttemptId) {
      return buildNoStoreResponse(
        { success: false, message: "checkoutAttemptId is required." },
        400
      );
    }

    const payment = await PaymentTransaction.findOne({
      checkoutAttemptId,
      userId: decoded.userId,
    }).select("+notes +gatewayResponse +failureReason +refundReason");

    if (!payment) {
      return buildNoStoreResponse(
        { success: false, message: "Checkout attempt not found." },
        404
      );
    }

    if (payment.gateway !== "RAZORPAY") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "This checkout is not configured for Razorpay.",
        },
        400
      );
    }

    if (!isCreatablePaymentStatus(payment.status)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Cannot create order for payment in ${payment.status} state.`,
        },
        400
      );
    }

    if (payment.gatewayOrderId && payment.status === "PENDING") {
      return buildNoStoreResponse(
        {
          success: true,
          message: "Razorpay order already exists for this checkout.",
          order: {
            id: payment.gatewayOrderId,
            amount: Math.round(Number(payment.amount || 0) * 100),
            currency: payment.currency,
            receipt: payment.receipt,
          },
          payment: {
            _id: String(payment._id),
            checkoutAttemptId: payment.checkoutAttemptId,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            gateway: payment.gateway,
            gatewayOrderId: payment.gatewayOrderId,
          },
          razorpay: {
            key: process.env.RAZORPAY_KEY_ID || null,
          },
        },
        200
      );
    }

    const payableAmount = Number(payment.amount || 0);

    if (!Number.isFinite(payableAmount) || payableAmount < 0) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid payable amount on payment record." },
        400
      );
    }

    const order = await createRazorpayOrder({
      amountInRupees: payableAmount,
      currency: payment.currency || "INR",
      receipt: payment.receipt || payment.checkoutAttemptId,
      notes: {
        paymentTransactionId: String(payment._id),
        checkoutAttemptId: payment.checkoutAttemptId || "",
        transactionType: payment.transactionType || "",
        role: payment.role || "",
        couponCode: payment.couponCode || "",
      },
    });

    payment.gatewayOrderId = order.id;
    payment.gatewayStatus = order.status || "created";
    payment.status = "PENDING";
    payment.gatewayResponse = {
      ...(payment.gatewayResponse || {}),
      createOrderResponse: order,
    };
    payment.notes =
      "Razorpay order created successfully for checkout attempt.";

    await payment.save();

    await safeLogAudit({
      actorId: payment.userId,
      action: "PAYMENT_ORDER_CREATED",
      entityType: "PAYMENT",
      entityId: payment._id,
      severity: "INFO",
      request,
      metadata: {
        checkoutAttemptId: payment.checkoutAttemptId,
        gateway: payment.gateway,
        gatewayOrderId: payment.gatewayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        transactionType: payment.transactionType,
      },
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Razorpay order created successfully.",
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
        },
        payment: {
          _id: String(payment._id),
          checkoutAttemptId: payment.checkoutAttemptId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          gateway: payment.gateway,
          gatewayOrderId: payment.gatewayOrderId,
        },
        razorpay: {
          key: process.env.RAZORPAY_KEY_ID || null,
        },
      },
      200
    );
  } catch (error) {
    console.error("POST /api/payments/create-order error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to create Razorpay order.",
      },
      500
    );
  }
}