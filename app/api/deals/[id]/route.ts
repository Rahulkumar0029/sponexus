import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { DealModel } from "@/lib/models/Deal";
import User from "@/lib/models/User";
import { checkSubscriptionAccess } from "@/lib/subscription/checkAccess";
import { ACTIONS } from "@/lib/subscription/constants";

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

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NOTES_LENGTH = 5000;
const MAX_DISPUTE_REASON_LENGTH = 2000;
const MAX_DELIVERABLES = 30;
const MAX_DELIVERABLE_ITEM_LENGTH = 200;
const MAX_FINAL_AMOUNT = 100000000;

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

function isSafeLength(value: string, max: number) {
  return value.length <= max;
}

function validateDeliverables(value: unknown) {
  if (!Array.isArray(value)) {
    return { valid: false, message: "deliverables must be an array" };
  }

  if (value.length > MAX_DELIVERABLES) {
    return {
      valid: false,
      message: `deliverables cannot exceed ${MAX_DELIVERABLES} items`,
    };
  }

  for (const item of value) {
    if (typeof item !== "string") {
      return { valid: false, message: "Each deliverable must be a string" };
    }

    const trimmed = item.trim();

    if (!trimmed) {
      return { valid: false, message: "Deliverable items cannot be empty" };
    }

    if (trimmed.length > MAX_DELIVERABLE_ITEM_LENGTH) {
      return {
        valid: false,
        message: `Each deliverable must be at most ${MAX_DELIVERABLE_ITEM_LENGTH} characters`,
      };
    }
  }

  return { valid: true, message: "" };
}

function isValidCurrencyAmount(value: unknown) {
  if (typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  if (value > MAX_FINAL_AMOUNT) return false;
  return Number(value.toFixed(2)) === value;
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
  if (role !== "ORGANIZER") return false;
  if (isFinalDealState(currentStatus)) return false;
  if (currentStatus === "accepted") return false;

  return (
    currentStatus === "pending" ||
    currentStatus === "negotiating" ||
    currentStatus === "disputed"
  );
}

function canUpdatePaymentStatusTo(
  currentStatus: string,
  currentPaymentStatus: string,
  nextPaymentStatus: string,
  role: "ORGANIZER" | "SPONSOR"
) {
  if (role !== "ORGANIZER") return false;

  if (currentStatus !== "accepted" && currentStatus !== "completed") {
    return false;
  }

  if (nextPaymentStatus === "paid") {
    return false;
  }

  const allowedTransitions: Record<string, string[]> = {
    unpaid: ["pending"],
    pending: ["unpaid"],
    paid: [],
  };

  return (allowedTransitions[currentPaymentStatus] || []).includes(
    nextPaymentStatus
  );
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

  const user = await User.findById(payload.userId).select(
    "_id email role firstName lastName name companyName adminRole"
  );

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

    const statusAtReadTime = String(deal.status);

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

    if (message && !isSafeLength(message, MAX_MESSAGE_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (notes && !isSafeLength(notes, MAX_NOTES_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `notes cannot exceed ${MAX_NOTES_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (disputeReason && !isSafeLength(disputeReason, MAX_DISPUTE_REASON_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `disputeReason cannot exceed ${MAX_DISPUTE_REASON_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (body.deliverables !== undefined) {
      const deliverablesValidation = validateDeliverables(body.deliverables);

      if (!deliverablesValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            message: deliverablesValidation.message,
          },
          { status: 400 }
        );
      }
    }

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

      if (
        (roleInDeal === "ORGANIZER" && deal.contactReveal?.organizerRevealed) ||
        (roleInDeal === "SPONSOR" && deal.contactReveal?.sponsorRevealed)
      ) {
        const updatedDeal = await DealModel.findById(deal._id)
          .populate("organizerId", "_id name email phone companyName")
          .populate("sponsorId", "_id name email phone companyName")
          .populate("eventId", "_id title location startDate");

        const safeDeal = sanitizeDealContactsForResponse(updatedDeal);

        return NextResponse.json(
          {
            success: true,
            message: "Your contact details are already revealed for this deal",
            deal: safeDeal,
          },
          { status: 200 }
        );
      }

      const access = await checkSubscriptionAccess({
        userId: currentUserId,
        role: roleInDeal,
        action: ACTIONS.REVEAL_CONTACT,
      });

      if (!access.allowed) {
        return NextResponse.json(
          {
            success: false,
            message:
              access.message ||
              "Upgrade your subscription to unlock contact details on Sponexus.",
            requiresUpgrade: true,
          },
          { status: 403 }
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

      const revealResult = await DealModel.updateOne(
        {
          _id: deal._id,
          status: statusAtReadTime,
        },
        {
          $set: {
            lastActionBy: currentUser._id,
            "contactReveal.organizerRevealed":
              deal.contactReveal?.organizerRevealed ?? false,
            "contactReveal.organizerRevealedAt":
              deal.contactReveal?.organizerRevealedAt ?? null,
            "contactReveal.sponsorRevealed":
              deal.contactReveal?.sponsorRevealed ?? false,
            "contactReveal.sponsorRevealedAt":
              deal.contactReveal?.sponsorRevealedAt ?? null,
            "contactReveal.fullyRevealed":
              deal.contactReveal?.fullyRevealed ?? false,
          },
        }
      );

      if (revealResult.modifiedCount !== 1) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This deal was updated by another action. Please refresh and try again.",
          },
          { status: 409 }
        );
      }

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

    if (body.finalAmount !== undefined && body.finalAmount !== null) {
      if (!isValidCurrencyAmount(finalAmount)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "finalAmount must be a valid currency amount with max 2 decimals and within allowed range",
          },
          { status: 400 }
        );
      }
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

    if (wantsPaymentStatusEdit) {
      if (!paymentStatus) {
        return NextResponse.json(
          { success: false, message: "paymentStatus is required" },
          { status: 400 }
        );
      }

      if (
        !canUpdatePaymentStatusTo(
          currentStatus,
          String(deal.paymentStatus || "unpaid"),
          paymentStatus,
          roleInDeal
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are not allowed to update payment status to this value from this route",
          },
          { status: 403 }
        );
      }
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

    const saveResult = await DealModel.updateOne(
      {
        _id: deal._id,
        status: statusAtReadTime,
      },
      {
        $set: {
          status: deal.status,
          finalAmount: deal.finalAmount,
          message: deal.message,
          notes: deal.notes,
          deliverables: deal.deliverables,
          paymentStatus: deal.paymentStatus,
          disputeReason: deal.disputeReason,
          lastActionBy: currentUser._id,
          acceptedAt: deal.acceptedAt,
          rejectedAt: deal.rejectedAt,
          cancelledAt: deal.cancelledAt,
          completedAt: deal.completedAt,
          "contactReveal.organizerRevealed":
            deal.contactReveal?.organizerRevealed ?? false,
          "contactReveal.organizerRevealedAt":
            deal.contactReveal?.organizerRevealedAt ?? null,
          "contactReveal.sponsorRevealed":
            deal.contactReveal?.sponsorRevealed ?? false,
          "contactReveal.sponsorRevealedAt":
            deal.contactReveal?.sponsorRevealedAt ?? null,
          "contactReveal.fullyRevealed":
            deal.contactReveal?.fullyRevealed ?? false,
        },
      }
    );

    if (saveResult.modifiedCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This deal was updated by another action. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

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