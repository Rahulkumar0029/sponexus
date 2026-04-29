import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { DealModel } from "@/lib/models/Deal";
import User from "@/lib/models/User";
import { EventModel } from "@/lib/models/Event";

import { checkUsageLimit } from "@/lib/subscription/checkUsageLimit";
import { incrementUsage } from "@/lib/subscription/enforceLimits";

import { ACTIONS } from "@/lib/subscription/constants";
import { createNotification } from "@/lib/notifications/createNotification";

const ALLOWED_DEAL_STATUSES = new Set([
  "pending",
  "negotiating",
  "accepted",
  "rejected",
  "completed",
  "cancelled",
  "disputed",
]);

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NOTES_LENGTH = 5000;
const MAX_DELIVERABLES = 30;
const MAX_DELIVERABLE_ITEM_LENGTH = 200;
const MAX_PROPOSED_AMOUNT = 100000000;

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
  if (value <= 0) return false;
  if (value > MAX_PROPOSED_AMOUNT) return false;
  return Number(value.toFixed(2)) === value;
}

function sanitizeDealContactsForResponse(deal: any) {
  const plainDeal =
    typeof deal?.toObject === "function" ? deal.toObject() : { ...deal };

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
    "_id email role name companyName firstName lastName adminRole"
  );

  if (!user) {
    return { user: null, error: "User not found", status: 404 };
  }

  return { user, error: null, status: 200 };
}

export async function POST(request: NextRequest) {
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

    if (currentUser.role !== "ORGANIZER" && currentUser.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Unsupported user role" },
        { status: 403 }
      );
    }

    const usage = await checkUsageLimit({
  userId: String(currentUser._id),
  role: currentUser.role,
  action: ACTIONS.SEND_INTEREST,
});

    if (!usage.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: usage.message,
          requiresUpgrade: true,
          usage: {
            dailyLimit: usage.dailyLimit,
            monthlyLimit: usage.monthlyLimit,
            dailyUsed: usage.dailyUsed,
            monthlyUsed: usage.monthlyUsed,
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const organizerId = normalizeString(body.organizerId);
    const sponsorId = normalizeString(body.sponsorId);
    const eventId = normalizeString(body.eventId);

    const title = normalizeString(body.title);
    const description = normalizeString(body.description);
    const message = normalizeString(body.message);
    const notes = normalizeString(body.notes);
    const deliverables = normalizeArray(body.deliverables);

    const proposedAmount =
      typeof body.proposedAmount === "number"
        ? body.proposedAmount
        : Number(body.proposedAmount);

    const expiresAt =
      typeof body.expiresAt === "string" && body.expiresAt.trim()
        ? new Date(body.expiresAt)
        : null;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "title is required" },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, message: "description is required" },
        { status: 400 }
      );
    }

    if (!isSafeLength(title, MAX_TITLE_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `title cannot exceed ${MAX_TITLE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!isSafeLength(description, MAX_DESCRIPTION_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

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

    const deliverablesValidation = validateDeliverables(body.deliverables ?? []);

    if (!deliverablesValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: deliverablesValidation.message,
        },
        { status: 400 }
      );
    }

    if (!isValidObjectId(organizerId)) {
      return NextResponse.json(
        { success: false, message: "Valid organizerId is required" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(sponsorId)) {
      return NextResponse.json(
        { success: false, message: "Valid sponsorId is required" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(eventId)) {
      return NextResponse.json(
        { success: false, message: "Valid eventId is required" },
        { status: 400 }
      );
    }

    if (organizerId === sponsorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Organizer and sponsor must be different users",
        },
        { status: 400 }
      );
    }

    if (!isValidCurrencyAmount(proposedAmount)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Proposed amount must be a valid currency amount with max 2 decimals and within allowed range",
        },
        { status: 400 }
      );
    }

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid expiresAt value" },
        { status: 400 }
      );
    }

    if (expiresAt && expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, message: "expiresAt must be a future date" },
        { status: 400 }
      );
    }

    const currentUserId = String(currentUser._id);
    const isOrganizerCreator =
      currentUser.role === "ORGANIZER" && currentUserId === organizerId;
    const isSponsorCreator =
      currentUser.role === "SPONSOR" && currentUserId === sponsorId;

    if (!isOrganizerCreator && !isSponsorCreator) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You can only create deals for yourself in your own role context",
        },
        { status: 403 }
      );
    }

    const [organizer, sponsor, event] = await Promise.all([
      User.findById(organizerId).select("_id name email role companyName"),
      User.findById(sponsorId).select("_id name email role companyName"),
      EventModel.findById(eventId).select(
        "_id title location startDate endDate organizerId status visibilityStatus moderationStatus isDeleted"
      ),
    ]);

    if (!organizer || organizer.role !== "ORGANIZER") {
      return NextResponse.json(
        { success: false, message: "Organizer not found" },
        { status: 404 }
      );
    }

    if (!sponsor || sponsor.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Sponsor not found" },
        { status: 404 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    if (String(event.organizerId) !== organizerId) {
      return NextResponse.json(
        {
          success: false,
          message: "This event does not belong to the provided organizer",
        },
        { status: 400 }
      );
    }

    if (
      ["DRAFT", "COMPLETED", "CANCELLED"].includes(String((event as any).status))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Deals cannot be created for this event in its current status",
        },
        { status: 400 }
      );
    }

    if (
      (event as any).isDeleted === true ||
      (event as any).visibilityStatus === "HIDDEN" ||
      (event as any).moderationStatus === "FLAGGED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Deals cannot be created for this event right now",
        },
        { status: 400 }
      );
    }

    if ((event as any).endDate) {
      const endDate = new Date((event as any).endDate);
      if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) {
        return NextResponse.json(
          {
            success: false,
            message: "Deals cannot be created for past events",
          },
          { status: 400 }
        );
      }
    }

    const duplicateDeal = await DealModel.findOne({
      organizerId,
      sponsorId,
      eventId,
      status: { $in: ["pending", "negotiating", "accepted"] },
    }).select("_id status");

    if (duplicateDeal) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An active deal already exists between this organizer, sponsor, and event",
        },
        { status: 409 }
      );
    }

    const deal = await DealModel.create({
      organizerId,
      sponsorId,
      eventId,
      title,
      description,
      proposedAmount,
      message,
      deliverables,
      notes,
      disputeReason: "",
      expiresAt,
      createdBy: currentUser._id,
      lastActionBy: currentUser._id,
      status: "pending",
      paymentStatus: "unpaid",
    });

   await incrementUsage({
  userId: String(currentUser._id),
  role: currentUser.role,
  action: ACTIONS.SEND_INTEREST,
  subscriptionId: usage.subscriptionId || null,
  planId: usage.planId || null,
});

try {
  const receiverId =
    currentUser.role === "ORGANIZER" ? sponsorId : organizerId;

  await createNotification({
    userId: receiverId,
    type: "DEAL_CREATED",
    title: "New deal request",
    message: "You received a new sponsorship deal request.",
    link: `/deals/${deal._id}`,
    metadata: {
      dealId: String(deal._id),
      eventId,
      organizerId,
      sponsorId,
      createdBy: String(currentUser._id),
    },
  });
} catch (notificationError) {
  console.error("Deal created notification error:", notificationError);
}

    const populatedDeal = await DealModel.findById(deal._id)
      .populate("organizerId", "_id name email phone companyName")
      .populate("sponsorId", "_id name email phone companyName")
      .populate("eventId", "_id title location startDate");

    const safeDeal = sanitizeDealContactsForResponse(populatedDeal);

    return NextResponse.json(
      {
        success: true,
        message: "Deal created successfully",
        deal: safeDeal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/deals error:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A duplicate deal already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create deal" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);

    const status = normalizeString(searchParams.get("status"));
    const eventId = normalizeString(searchParams.get("eventId"));
    const pageParam = Number(searchParams.get("page") || 1);
    const limitParam = Number(searchParams.get("limit") || 10);

    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit =
      Number.isNaN(limitParam) || limitParam < 1
        ? 10
        : Math.min(limitParam, 50);

    const query: Record<string, unknown> = {};

    if (currentUser.role === "ORGANIZER") {
      query.organizerId = currentUser._id;
    } else if (currentUser.role === "SPONSOR") {
      query.sponsorId = currentUser._id;
    } else {
      return NextResponse.json(
        { success: false, message: "Unsupported user role" },
        { status: 403 }
      );
    }

    if (status && !ALLOWED_DEAL_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 }
      );
    }

    if (status) {
      query.status = status;
    }

    if (eventId) {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return NextResponse.json(
          { success: false, message: "Invalid eventId filter" },
          { status: 400 }
        );
      }

      query.eventId = eventId;
    }

    const [deals, total] = await Promise.all([
      DealModel.find(query)
        .populate("organizerId", "_id name email phone companyName")
        .populate("sponsorId", "_id name email phone companyName")
        .populate("eventId", "_id title location startDate")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DealModel.countDocuments(query),
    ]);

    const safeDeals = deals.map((deal) => sanitizeDealContactsForResponse(deal));

    return NextResponse.json(
      {
        success: true,
        deals: safeDeals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/deals error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}