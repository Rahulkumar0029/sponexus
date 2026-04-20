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
  const roleTransitions: Record<
    "ORGANIZER" | "SPONSOR",
    Record<string, string[]>
  > = {
    ORGANIZER: {
      pending: ["cancelled", "disputed"],
      negotiating: ["cancelled", "disputed"],
      accepted: ["completed", "disputed"],
      rejected: [],
      completed: [],
      cancelled: [],
      disputed: ["cancelled"],
    },
    SPONSOR: {
      pending: ["negotiating", "accepted", "rejected", "cancelled", "disputed"],
      negotiating: ["accepted", "rejected", "cancelled", "disputed"],
      accepted: ["disputed"],
      rejected: [],
      completed: [],
      cancelled: [],
      disputed: ["negotiating", "cancelled"],
    },
  };

  const allowedNextStatuses = roleTransitions[role]?.[currentStatus] || [];
  return allowedNextStatuses.includes(nextStatus);
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

function isFinalDealState(status: string) {
  return ["rejected", "completed", "cancelled"].includes(status);
}

function canEditCommercialFields(
  currentStatus: string,
  role: "ORGANIZER" | "SPONSOR"
) {
  if (isFinalDealState(currentStatus)) return false;

  if (currentStatus === "accepted") {
    return role === "ORGANIZER";
  }

  return role === "ORGANIZER";
}

function canEditPaymentStatus(
  currentStatus: string,
  role: "ORGANIZER" | "SPONSOR"
) {
  if (isFinalDealState(currentStatus)) {
    return role === "ORGANIZER";
  }

  return role === "ORGANIZER";
}

function sanitizeDealContactsForResponse(deal: any) {
  const plainDeal =
    typeof deal.toObject === "function" ? deal.toObject() : { ...deal };

  const fullyRevealed = Boolean(plainDeal?.contactReveal?.fullyRevealed);

  if (!fullyRevealed) {
    if (plainDeal?.organizerId) {
      plainDeal.organizerId.email = undefined;
      plainDeal.organizerId.phone = undefined;
    }

    if (plainDeal?.sponsorId) {
      plainDeal.sponsorId.email = undefined;
      plainDeal.sponsorId.phone = undefined;
    }
  }

  return plainDeal;
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
      .populate("organizerId", "_id name email phone companyName")
      .populate("sponsorId", "_id name email phone companyName")
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

    const safeDeal = sanitizeDealContactsForResponse(deal);

    return NextResponse.json(
      {
        success: true,
        deal: safeDeal,
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

    const revealContact = body.revealContact === true;
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

    const currentStatus = String(deal.status);
    const wantsCommercialEdit =
      body.finalAmount !== undefined ||
      body.message !== undefined ||
      body.notes !== undefined ||
      deliverables !== undefined;

    const wantsPaymentStatusEdit = body.paymentStatus !== undefined;

    if (revealContact) {
      if (deal.status !== "accepted") {
        return NextResponse.json(
          {
            success: false,
            message: "Contact reveal allowed only after deal acceptance",
          },
          { status: 400 }
        );
      }

      const now = new Date();

      if (roleInDeal === "ORGANIZER") {
        deal.contactReveal.organizerRevealed = true;
        deal.contactReveal.organizerRevealedAt = now;
      }

      if (roleInDeal === "SPONSOR") {
        deal.contactReveal.sponsorRevealed = true;
        deal.contactReveal.sponsorRevealedAt = now;
      }

      if (
        deal.contactReveal.organizerRevealed &&
        deal.contactReveal.sponsorRevealed
      ) {
        deal.contactReveal.fullyRevealed = true;
      }

      deal.lastActionBy = currentUser._id;

      await deal.save();

      const updatedDeal = await DealModel.findById(deal._id)
        .populate("organizerId", "_id name email phone companyName")
        .populate("sponsorId", "_id name email phone companyName")
        .populate("eventId", "_id title location startDate");

      const safeDeal = sanitizeDealContactsForResponse(updatedDeal);

      return NextResponse.json(
        {
          success: true,
          message: deal.contactReveal.fullyRevealed
            ? "Contact details unlocked"
            : "Your contact details revealed. Waiting for other party.",
          deal: safeDeal,
        },
        { status: 200 }
      );
    }

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

    if (
      wantsCommercialEdit &&
      !canEditCommercialFields(currentStatus, roleInDeal)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to edit commercial deal details in this state",
        },
        { status: 403 }
      );
    }

    if (
      wantsPaymentStatusEdit &&
      !canEditPaymentStatus(currentStatus, roleInDeal)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to update payment status for this deal",
        },
        { status: 403 }
      );
    }

    if (nextStatus) {
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
      .populate("organizerId", "_id name email phone companyName")
      .populate("sponsorId", "_id name email phone companyName")
      .populate("eventId", "_id title location startDate");

    const safeDeal = sanitizeDealContactsForResponse(updatedDeal);

    return NextResponse.json(
      {
        success: true,
        message: "Deal updated successfully",
        deal: safeDeal,
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