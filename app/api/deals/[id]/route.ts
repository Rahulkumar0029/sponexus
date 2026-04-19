import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { DealModel } from "@/lib/models/Deal";
import User from "@/lib/models/User";

const ALLOWED_STATUSES = new Set([
  "pending",
  "negotiating",
  "accepted",
  "rejected",
  "completed",
  "cancelled",
  "disputed",
]);

const ALLOWED_PAYMENT_STATUSES = new Set(["unpaid", "pending", "paid"]);

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function canAccessDeal(userId: string, deal: any) {
  return (
    String(deal.organizerId?._id || deal.organizerId) === userId ||
    String(deal.sponsorId?._id || deal.sponsorId) === userId
  );
}

function getRoleInDeal(
  userId: string,
  deal: any
): "ORGANIZER" | "SPONSOR" | null {
  if (String(deal.organizerId?._id || deal.organizerId) === userId) {
    return "ORGANIZER";
  }

  if (String(deal.sponsorId?._id || deal.sponsorId) === userId) {
    return "SPONSOR";
  }

  return null;
}

function isAllowedStatusTransition(
  currentStatus: string,
  nextStatus: string,
  role: "ORGANIZER" | "SPONSOR"
) {
  const sharedTransitions: Record<string, string[]> = {
    pending: ["negotiating", "accepted", "rejected", "cancelled", "disputed"],
    negotiating: ["accepted", "rejected", "cancelled", "disputed"],
    accepted: ["completed", "cancelled", "disputed"],
    rejected: [],
    completed: [],
    cancelled: [],
    disputed: ["negotiating", "cancelled"],
  };

  const allowedNextStatuses = sharedTransitions[currentStatus] || [];

  if (!allowedNextStatuses.includes(nextStatus)) {
    return false;
  }

  if (role === "ORGANIZER") {
    return [
      "negotiating",
      "accepted",
      "rejected",
      "cancelled",
      "completed",
      "disputed",
    ].includes(nextStatus);
  }

  if (role === "SPONSOR") {
    return [
      "negotiating",
      "accepted",
      "rejected",
      "cancelled",
      "completed",
      "disputed",
    ].includes(nextStatus);
  }

  return false;
}

function applyLifecycleTimestamps(deal: any, nextStatus: string) {
  const now = new Date();

  if (nextStatus === "accepted" && !deal.acceptedAt) {
    deal.acceptedAt = now;
  }

  if (nextStatus === "rejected" && !deal.rejectedAt) {
    deal.rejectedAt = now;
  }

  if (nextStatus === "cancelled" && !deal.cancelledAt) {
    deal.cancelledAt = now;
  }

  if (nextStatus === "completed" && !deal.completedAt) {
    deal.completedAt = now;
  }

  if (nextStatus !== "disputed") {
    deal.disputeReason = "";
  }
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) {
    return { user: null, error: "Authentication required", status: 401 };
  }

  const payload = verifyAccessToken(token);

  if (!payload?.userId || !payload?.email) {
    return { user: null, error: "Invalid or expired token", status: 401 };
  }

  const user = await User.findById(payload.userId).select("_id email role");

  if (!user) {
    return { user: null, error: "User not found", status: 404 };
  }

  return { user, error: null, status: 200 };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const auth = await getAuthenticatedUser();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const currentUser = auth.user;
    const dealId = params.id;

    if (!isValidObjectId(dealId)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const deal = await DealModel.findById(dealId)
      .populate("organizerId", "_id name email companyName")
      .populate("sponsorId", "_id name email companyName")
      .populate("eventId", "_id title location startDate");

    if (!deal) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    if (!canAccessDeal(String(currentUser._id), deal)) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this deal" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        deal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/deals/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch deal" },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const auth = await getAuthenticatedUser();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const currentUser = auth.user;
    const dealId = params.id;

    if (!isValidObjectId(dealId)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const deal = await DealModel.findById(dealId);

    if (!deal) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    const currentUserId = String(currentUser._id);

    if (!canAccessDeal(currentUserId, deal)) {
      return NextResponse.json(
        { success: false, message: "You do not have access to update this deal" },
        { status: 403 }
      );
    }

    const roleInDeal = getRoleInDeal(currentUserId, deal);

    if (!roleInDeal) {
      return NextResponse.json(
        { success: false, message: "Unable to determine user role in this deal" },
        { status: 403 }
      );
    }

    const body = await request.json();
const paymentStatus = normalizeString(body.paymentStatus);
    const nextStatus = normalizeString(body.status);
    const message = normalizeString(body.message);
    const notes = normalizeString(body.notes);
    const disputeReason = normalizeString(body.disputeReason);
    const deliverables =
      body.deliverables !== undefined
        ? normalizeArray(body.deliverables)
        : undefined;

    const finalAmount =
      body.finalAmount !== undefined && body.finalAmount !== null
        ? Number(body.finalAmount)
        : body.finalAmount;

        if (paymentStatus && !ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) {
  return NextResponse.json(
    { success: false, message: "Invalid payment status" },
    { status: 400 }
  );
}

    if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal status" },
        { status: 400 }
      );
    }

    if (
      body.finalAmount !== undefined &&
      body.finalAmount !== null &&
      (Number.isNaN(finalAmount) || finalAmount < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "finalAmount must be a valid non-negative number",
        },
        { status: 400 }
      );
    }

    if (nextStatus) {
      const currentStatus = String(deal.status);

      if (currentStatus === nextStatus) {
        return NextResponse.json(
          { success: false, message: "Deal is already in this status" },
          { status: 400 }
        );
      }

      if (!isAllowedStatusTransition(currentStatus, nextStatus, roleInDeal)) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot change deal status from ${currentStatus} to ${nextStatus}`,
          },
          { status: 400 }
        );
      }

      if (nextStatus === "disputed" && !disputeReason) {
        return NextResponse.json(
          {
            success: false,
            message: "disputeReason is required for disputed status",
          },
          { status: 400 }
        );
      }

      deal.status = nextStatus as any;
      applyLifecycleTimestamps(deal, nextStatus);

      if (nextStatus === "disputed") {
        deal.disputeReason = disputeReason;
      }
    }

    if (body.finalAmount !== undefined) {
      deal.finalAmount = finalAmount === null ? null : finalAmount;
    }

    if (body.message !== undefined) {
      deal.message = message;
    }

    if (body.notes !== undefined) {
      deal.notes = notes;
    }

    if (deliverables !== undefined) {
      deal.deliverables = deliverables;
    }

    if (body.paymentStatus !== undefined) {
  deal.paymentStatus = paymentStatus as any;
}

    deal.lastActionBy = currentUser._id;

    await deal.save();

    const updatedDeal = await DealModel.findById(deal._id)
      .populate("organizerId", "_id name email companyName")
      .populate("sponsorId", "_id name email companyName")
      .populate("eventId", "_id title city startDate");

    return NextResponse.json(
      {
        success: true,
        message: "Deal updated successfully",
        deal: updatedDeal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/deals/[id] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update deal" },
      { status: 500 }
    );
  }
}