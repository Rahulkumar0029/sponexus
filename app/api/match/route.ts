import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { EventModel } from "@/lib/models/Event";
import Sponsor from "@/lib/models/Sponsor";
import { matchSponsorToEvents, matchEventToSponsors } from "@/lib/matcher";
import { Event } from "@/types/event";
import { MatchWeights } from "@/types/match";
import { Sponsor as SponsorType } from "@/types/sponsor";
import { checkUsageLimit } from "@/lib/subscription/checkUsageLimit";
import { incrementUsage } from "@/lib/subscription/incrementUsage";
import { ACTIONS } from "@/lib/subscription/constants";

const DEFAULT_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

const MAX_MATCH_RESULTS = 50;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function normalizeWeights(input?: Partial<MatchWeights>): MatchWeights {
  const weights: MatchWeights = {
    category: Number(input?.category ?? DEFAULT_WEIGHTS.category),
    audience: Number(input?.audience ?? DEFAULT_WEIGHTS.audience),
    location: Number(input?.location ?? DEFAULT_WEIGHTS.location),
    budget: Number(input?.budget ?? DEFAULT_WEIGHTS.budget),
    deliverables: Number(input?.deliverables ?? DEFAULT_WEIGHTS.deliverables),
  };

  const values = Object.values(weights);

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return DEFAULT_WEIGHTS;
  }

  const total =
    weights.category +
    weights.audience +
    weights.location +
    weights.budget +
    weights.deliverables;

  if (total !== 100) {
    return DEFAULT_WEIGHTS;
  }

  return weights;
}

function buildSponsorData(sponsorDoc: any): SponsorType {
  const plain =
    typeof sponsorDoc?.toObject === "function" ? sponsorDoc.toObject() : sponsorDoc;

  return {
    ...plain,
    _id: String(plain._id),
    userId: plain.userId ? String(plain.userId) : "",
    brandName: plain.brandName || "",
    companyName: plain.companyName || "",
    website: plain.website || "",
    officialEmail: "",
    phone: "",
    industry: plain.industry || "",
    companySize: plain.companySize || "",
    about: plain.about || "",
    logoUrl: plain.logoUrl || "",
    targetAudience: plain.targetAudience || "",
    preferredCategories: Array.isArray(plain.preferredCategories)
      ? plain.preferredCategories
      : [],
    preferredLocations: Array.isArray(plain.preferredLocations)
      ? plain.preferredLocations
      : [],
    sponsorshipInterests: Array.isArray(plain.sponsorshipInterests)
      ? plain.sponsorshipInterests
      : [],
    instagramUrl: plain.instagramUrl || "",
    linkedinUrl: plain.linkedinUrl || "",
    isProfileComplete: Boolean(plain.isProfileComplete),
    isPublic: Boolean(plain.isPublic),
    createdAt: plain.createdAt
      ? new Date(plain.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: plain.updatedAt
      ? new Date(plain.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

function buildEventData(eventDoc: any): Event {
  const plain =
    typeof eventDoc?.toObject === "function" ? eventDoc.toObject() : eventDoc;

  return {
    ...plain,
    _id: String(plain._id),
    organizerId: plain.organizerId ? String(plain.organizerId) : "",
    title: plain.title || "",
    description: plain.description || "",
    categories: Array.isArray(plain.categories) ? plain.categories : [],
    targetAudience: Array.isArray(plain.targetAudience)
      ? plain.targetAudience
      : [],
    location: plain.location || "",
    budget: typeof plain.budget === "number" ? plain.budget : 0,
    startDate: plain.startDate || "",
    endDate: plain.endDate || "",
    attendeeCount:
      typeof plain.attendeeCount === "number" ? plain.attendeeCount : 0,
    eventType: plain.eventType || "OTHER",
    image: plain.coverImage || plain.image || "",
    status: plain.status || "DRAFT",
    providedDeliverables: Array.isArray(plain.providedDeliverables)
      ? plain.providedDeliverables
      : [],
    createdAt: plain.createdAt || "",
    updatedAt: plain.updatedAt || "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sponsorId = normalizeString(body?.sponsorId);
    const sponsorOwnerId = normalizeString(body?.sponsorOwnerId);
    const eventId = normalizeString(body?.eventId);
    const weights = normalizeWeights(body?.weights);

    if ((sponsorId || sponsorOwnerId) && eventId) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide only sponsorId or eventId, not both",
          matches: [],
        },
        { status: 400 }
      );
    }

    if (!sponsorId && !sponsorOwnerId && !eventId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing matching target",
          matches: [],
        },
        { status: 400 }
      );
    }

    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
          matches: [],
        },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session",
          matches: [],
        },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.userId).select(
      "_id email role adminRole"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
          matches: [],
        },
        { status: 404 }
      );
    }

    if (user.role !== "ORGANIZER" && user.role !== "SPONSOR") {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported user role",
          matches: [],
        },
        { status: 403 }
      );
    }

   const usage = await checkUsageLimit({
  userId: String(user._id),
  role: user.role,
  action: ACTIONS.USE_MATCH,
});

if (!usage.allowed) {
  return NextResponse.json(
    {
      success: false,
      message: usage.message || "Upgrade required to use matching.",
      code: "SUBSCRIPTION_REQUIRED",
      requiresUpgrade: true,
      matches: [],
    },
    { status: 403 }
  );
}

    if (sponsorId || sponsorOwnerId) {
      if (user.role !== "SPONSOR") {
        return NextResponse.json(
          {
            success: false,
            message: "Only sponsors can request sponsor-to-events matches",
            matches: [],
          },
          { status: 403 }
        );
      }

      if (sponsorId && !isValidObjectId(sponsorId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid sponsor ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      if (sponsorOwnerId && !isValidObjectId(sponsorOwnerId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid sponsor owner ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      if (sponsorOwnerId && sponsorOwnerId !== String(user._id)) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only request matches for your own sponsor profile",
            matches: [],
          },
          { status: 403 }
        );
      }

      const sponsorDoc = sponsorId
        ? await Sponsor.findById(sponsorId).select(
            "_id userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt"
          )
        : await Sponsor.findOne({ userId: sponsorOwnerId || String(user._id) }).select(
            "_id userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt"
          );

      if (!sponsorDoc) {
        return NextResponse.json(
          {
            success: false,
            message: "Sponsor profile not found",
            matches: [],
          },
          { status: 404 }
        );
      }

      if (String(sponsorDoc.userId) !== String(user._id)) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only request matches for your own sponsor profile",
            matches: [],
          },
          { status: 403 }
        );
      }

      if (!sponsorDoc.isProfileComplete) {
        return NextResponse.json(
          {
            success: false,
            message: "Sponsor profile is incomplete",
            matches: [],
          },
          { status: 400 }
        );
      }

      const eventDocs = await EventModel.find({
        status: { $in: ["PUBLISHED", "ONGOING"] },
        isDeleted: { $ne: true },
        visibilityStatus: { $ne: "HIDDEN" },
        moderationStatus: { $ne: "FLAGGED" },
      })
        .select(
          "_id organizerId title description categories targetAudience location budget startDate endDate attendeeCount eventType coverImage image status providedDeliverables createdAt updatedAt"
        )
        .lean();

      const sponsorData = buildSponsorData(sponsorDoc);
      const events = (eventDocs || []).map(buildEventData);

      const matches = matchSponsorToEvents(sponsorData, events, weights).slice(
        0,
        MAX_MATCH_RESULTS
      );

      await incrementUsage({
  userId: String(user._id),
  role: user.role,
  action: ACTIONS.USE_MATCH,
  subscriptionId: usage.subscriptionId || null,
  planId: usage.planId || null,
});

      return NextResponse.json(
        {
          success: true,
          matchType: "sponsor-to-events",
          mode: "sponsor_to_events",
          count: matches.length,
          weights,
          matches,
        },
        { status: 200 }
      );
    }

    
    if (eventId) {
      if (user.role !== "ORGANIZER") {
        return NextResponse.json(
          {
            success: false,
            message: "Only organizers can request event-to-sponsors matches",
            matches: [],
          },
          { status: 403 }
        );
      }

      if (!isValidObjectId(eventId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid event ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      const eventDoc = await EventModel.findById(eventId)
        .select(
          "_id organizerId title description categories targetAudience location budget startDate endDate attendeeCount eventType coverImage image status providedDeliverables createdAt updatedAt isDeleted visibilityStatus moderationStatus"
        )
        .lean();

      if (!eventDoc) {
        return NextResponse.json(
          {
            success: false,
            message: "Event not found",
            matches: [],
          },
          { status: 404 }
        );
      }

      if (String((eventDoc as any).organizerId) !== String(user._id)) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only request matches for your own event",
            matches: [],
          },
          { status: 403 }
        );
      }

      if (
        (eventDoc as any).isDeleted === true ||
        (eventDoc as any).visibilityStatus === "HIDDEN" ||
        (eventDoc as any).moderationStatus === "FLAGGED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "This event is not eligible for matching right now",
            matches: [],
          },
          { status: 400 }
        );
      }

      const sponsorDocs = await Sponsor.find({
        isPublic: true,
        isProfileComplete: true,
      })
        .select(
          "_id userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt"
        )
        .lean();

      const event = buildEventData(eventDoc);
      const sponsors = sponsorDocs.map(buildSponsorData);

      const matches = matchEventToSponsors(event, sponsors, weights).slice(
        0,
        MAX_MATCH_RESULTS
      );

      await incrementUsage({
  userId: String(user._id),
  role: user.role,
  action: ACTIONS.USE_MATCH,
  subscriptionId: usage.subscriptionId || null,
  planId: usage.planId || null,
});

      return NextResponse.json(
        {
          success: true,
          matchType: "event-to-sponsors",
          mode: "event_to_sponsors",
          count: matches.length,
          weights,
          matches,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process match request",
        matches: [],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Match API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to compute matches",
        matches: [],
      },
      { status: 500 }
    );
  }
}