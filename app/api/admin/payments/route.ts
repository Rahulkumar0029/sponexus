import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import User from "@/lib/models/User";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { isAdminBypass } from "@/lib/subscription/isAdminBypass";
import {
  PAYMENT_GATEWAY,
  PAYMENT_STATUS,
} from "@/lib/subscription/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const adminUser = await User.findById(currentUser._id);

    if (!adminUser || !isAdminBypass(adminUser)) {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const gateway = searchParams.get("gateway");
    const q = searchParams.get("q");

    const rawPage = Number(searchParams.get("page") || 1);
    const rawLimit = Number(searchParams.get("limit") || 20);

    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit =
      Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);

    const query: Record<string, any> = {};

    if (role === "ORGANIZER" || role === "SPONSOR") {
      query.role = role;
    }

    if (
      status &&
      [
        PAYMENT_STATUS.PENDING,
        PAYMENT_STATUS.SUCCESS,
        PAYMENT_STATUS.FAILED,
        PAYMENT_STATUS.REFUNDED,
        PAYMENT_STATUS.MANUAL_REVIEW,
      ].includes(status as any)
    ) {
      query.status = status;
    }

    if (
      gateway &&
      [PAYMENT_GATEWAY.MANUAL, PAYMENT_GATEWAY.RAZORPAY, PAYMENT_GATEWAY.CASHFREE].includes(
        gateway as any
      )
    ) {
      query.gateway = gateway;
    }

    const payments = await PaymentTransaction.find(query)
      .populate("userId", "firstName lastName name email companyName role adminRole")
      .populate("planId", "code name role interval price currency")
      .populate("subscriptionId", "status startDate endDate renewalCount")
      .sort({ createdAt: -1, paidAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    let filtered = payments;

    if (q && q.trim()) {
      const search = q.trim().toLowerCase();

      filtered = payments.filter((item: any) => {
        const user = item.userId || {};
        const plan = item.planId || {};

        return (
          String(user.firstName || "").toLowerCase().includes(search) ||
          String(user.lastName || "").toLowerCase().includes(search) ||
          String(user.name || "").toLowerCase().includes(search) ||
          String(user.email || "").toLowerCase().includes(search) ||
          String(user.companyName || "").toLowerCase().includes(search) ||
          String(plan.name || "").toLowerCase().includes(search) ||
          String(plan.code || "").toLowerCase().includes(search) ||
          String(item.gatewayOrderId || "").toLowerCase().includes(search) ||
          String(item.gatewayPaymentId || "").toLowerCase().includes(search) ||
          String(item.invoiceNumber || "").toLowerCase().includes(search)
        );
      });
    }

    const total = q && q.trim()
      ? filtered.length
      : await PaymentTransaction.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: filtered,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/admin/payments error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch payments." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const adminUser = await User.findById(currentUser._id);

    if (!adminUser || !isAdminBypass(adminUser)) {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      paymentId,
      status,
      notes,
      failureReason,
      refundReason,
      invoiceNumber,
    }: {
      paymentId?: string;
      status?: string;
      notes?: string;
      failureReason?: string;
      refundReason?: string;
      invoiceNumber?: string;
    } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: "Payment ID is required." },
        { status: 400 }
      );
    }

    const payment = await PaymentTransaction.findById(paymentId);

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found." },
        { status: 404 }
      );
    }

    if (
      status &&
      [
        PAYMENT_STATUS.PENDING,
        PAYMENT_STATUS.SUCCESS,
        PAYMENT_STATUS.FAILED,
        PAYMENT_STATUS.REFUNDED,
        PAYMENT_STATUS.MANUAL_REVIEW,
      ].includes(status as any)
    ) {
      payment.status = status as any;
    }

    if (typeof notes === "string") {
      payment.notes = notes.trim();
    }

    if (typeof failureReason === "string") {
      payment.failureReason = failureReason.trim();
    }

    if (typeof refundReason === "string") {
      payment.refundReason = refundReason.trim();
    }

    if (typeof invoiceNumber === "string") {
      payment.invoiceNumber = invoiceNumber.trim();
    }

    await payment.save();

    const updated = await PaymentTransaction.findById(payment._id)
      .populate("userId", "firstName lastName name email companyName role adminRole")
      .populate("planId", "code name role interval price currency")
      .populate("subscriptionId", "status startDate endDate renewalCount")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Payment updated successfully.",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/admin/payments error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update payment." },
      { status: 500 }
    );
  }
}