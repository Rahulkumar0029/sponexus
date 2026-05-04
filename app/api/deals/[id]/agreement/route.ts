import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { DealModel } from "@/lib/models/Deal";
import { DealAgreementModel } from "@/lib/models/DealAgreement";
import {
  canAccessAgreement,
  createOrGetDealAgreement,
} from "@/lib/deals/agreement";
import { createNotification } from "@/lib/notifications/createNotification";

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
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

function canAccessDeal(userId: string, deal: any) {
  return (
    String(deal.organizerId?._id || deal.organizerId) === userId ||
    String(deal.sponsorId?._id || deal.sponsorId) === userId
  );
}

function validateAgreementCreateRequirements(deal: any) {
  const errors: string[] = [];

  const status = String(deal?.status || "");

  if (status !== "accepted" && status !== "completed") {
    errors.push("Deal must be accepted before creating an agreement");
  }

  if (typeof deal?.finalAmount !== "number" || !Number.isFinite(deal.finalAmount)) {
    errors.push("Final amount is required before creating an agreement");
  }

  if (typeof deal?.finalAmount === "number" && deal.finalAmount <= 0) {
    errors.push("Final amount must be greater than 0");
  }

  if (!Array.isArray(deal?.deliverables) || deal.deliverables.length === 0) {
    errors.push("At least one final deliverable is required");
  }

  const organizer = deal?.organizerId || {};
  const sponsor = deal?.sponsorId || {};
  const event = deal?.eventId || {};

  if (!organizer?.email) {
    errors.push("Organizer email is required before creating an agreement");
  }

  if (!sponsor?.email) {
    errors.push("Sponsor email is required before creating an agreement");
  }

  if (!event?.title) {
    errors.push("Linked event title is required before creating an agreement");
  }

  return errors;
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

    const dealId = params.id;

    if (!isValidObjectId(dealId)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const deal = await DealModel.findById(dealId)
      .select("_id organizerId sponsorId eventId status finalAmount deliverables paymentStatus proposedAmount title description message notes acceptedAt completedAt createdAt updatedAt isDeleted")
      .populate(
        "organizerId",
        "_id name firstName lastName email phone companyName"
      )
      .populate(
        "sponsorId",
        "_id name firstName lastName email phone companyName"
      )
      .populate("eventId", "_id title location startDate");

    if (!deal || deal.isDeleted === true) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    const currentUserId = String(auth.user._id);

    if (!canAccessDeal(currentUserId, deal)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have access to this deal agreement",
        },
        { status: 403 }
      );
    }

    const agreement = await DealAgreementModel.findOne({
      dealId: deal._id,
      isDeleted: { $ne: true },
    });

    if (!agreement) {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement not created yet",
          agreement: null,
        },
        { status: 404 }
      );
    }

    if (!canAccessAgreement(currentUserId, agreement)) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this agreement" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        agreement,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/deals/[id]/agreement error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load deal agreement",
      },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const dealId = params.id;

    if (!isValidObjectId(dealId)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const deal = await DealModel.findById(dealId)
      .populate(
        "organizerId",
        "_id name firstName lastName email phone companyName"
      )
      .populate(
        "sponsorId",
        "_id name firstName lastName email phone companyName"
      )
      .populate("eventId", "_id title location startDate");

    if (!deal || deal.isDeleted === true) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    const currentUserId = String(auth.user._id);

    if (!canAccessDeal(currentUserId, deal)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have access to create this agreement",
        },
        { status: 403 }
      );
    }

    const existingAgreementBeforeCreate = await DealAgreementModel.findOne({
      dealId: deal._id,
      isDeleted: { $ne: true },
    });

    if (existingAgreementBeforeCreate) {
      if (existingAgreementBeforeCreate.status === "SIGNED") {
        return NextResponse.json(
          {
            success: true,
            message: "Agreement is already signed",
            agreement: existingAgreementBeforeCreate,
          },
          { status: 200 }
        );
      }

      if (
        existingAgreementBeforeCreate.status === "CANCELLED" ||
        existingAgreementBeforeCreate.status === "EXPIRED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Agreement exists but is not active. Please contact support or create a new agreement flow later.",
            agreement: existingAgreementBeforeCreate,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Agreement already exists",
          agreement: existingAgreementBeforeCreate,
        },
        { status: 200 }
      );
    }

    const validationErrors = validateAgreementCreateRequirements(deal);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement cannot be created yet",
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    const agreement = await createOrGetDealAgreement({
      deal,
      createdBy: currentUserId,
    });

    const otherPartyId =
      String(deal.organizerId?._id || deal.organizerId) === currentUserId
        ? String(deal.sponsorId?._id || deal.sponsorId)
        : String(deal.organizerId?._id || deal.organizerId);

    try {
      await createNotification({
        userId: otherPartyId,
        type: "DEAL_UPDATED",
        title: "Deal agreement created",
        message: "A deal agreement draft has been prepared for review.",
        link: `/deals/${deal._id}/agreement`,
        metadata: {
          dealId: String(deal._id),
          agreementId: String(agreement._id),
          createdBy: currentUserId,
        },
      });
    } catch (notificationError) {
      console.error("Agreement create notification error:", notificationError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Agreement draft created successfully",
        agreement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/deals/[id]/agreement error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create deal agreement",
      },
      { status: 500 }
    );
  }
}