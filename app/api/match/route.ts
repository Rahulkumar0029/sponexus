import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { EventModel } from "@/lib/models/Event";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import {
  matchSponsorshipToEvents,
  matchEventToSponsorships,
} from "@/lib/matcher";
import { Event } from "@/types/event";
import { MatchWeights, MatchedSponsorship } from "@/types/match";
import { checkUsageLimit } from "@/lib/subscription/checkUsageLimit";
import { incrementUsage } from "@/lib/subscription/enforceLimits";
import { ACTIONS } from "@/lib/subscription/constants";

const DEFAULT_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

const MAX_MATCH_RESULTS = 50;

const MATCHABLE_EVENT_STATUSES = ["PUBLISHED", "ONGOING"];

function getTodayStartDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isEventExpired(endDate: unknown) {
  if (!endDate) return false;

  const parsedEndDate = new Date(endDate as any);

  if (Number.isNaN(parsedEndDate.getTime())) {
    return false;
  }

  return parsedEndDate < getTodayStartDate();
}

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
    coverImage: plain.coverImage || plain.image || "",
image: plain.coverImage || plain.image || "",
status: plain.status || "DRAFT",
    providedDeliverables: Array.isArray(plain.providedDeliverables)
      ? plain.providedDeliverables
      : [],
    createdAt: plain.createdAt || "",
    updatedAt: plain.updatedAt || "",
  };
}

function buildSponsorshipData(sponsorshipDoc: any): MatchedSponsorship {
  const plain =
    typeof sponsorshipDoc?.toObject === "function"
      ? sponsorshipDoc.toObject()
      : sponsorshipDoc;

  const sponsorProfile = plain.sponsorProfile || {};

  return {
    ...plain,
    _id: plain._id ? String(plain._id) : "",
    sponsorOwnerId: plain.sponsorOwnerId ? String(plain.sponsorOwnerId) : "",
    sponsorProfileId: plain.sponsorProfileId ? String(plain.sponsorProfileId) : "",
    sponsorshipTitle: plain.sponsorshipTitle || "",
    sponsorshipType: plain.sponsorshipType || "",
    budget: typeof plain.budget === "number" ? plain.budget : 0,
    category: plain.category || "",
    targetAudience: plain.targetAudience || "",
    city: plain.city || "",
    locationPreference: plain.locationPreference || "",
    campaignGoal: plain.campaignGoal || "",
    coverImage: plain.coverImage || "",
    deliverablesExpected: Array.isArray(plain.deliverablesExpected)
      ? plain.deliverablesExpected
      : [],
    status: plain.status || "active",
    expiresAt: plain.expiresAt || null,
    createdAt: plain.createdAt || "",
   updatedAt: plain.updatedAt || "",
brandName: sponsorProfile.brandName || plain.brandName || "",
companyName: sponsorProfile.companyName || plain.companyName || "",
logoUrl: sponsorProfile.logoUrl || plain.logoUrl || "",
sponsorProfile: {
  _id: sponsorProfile._id ? String(sponsorProfile._id) : "",
  brandName: sponsorProfile.brandName || "",
  companyName: sponsorProfile.companyName || "",
  logoUrl: sponsorProfile.logoUrl || "",
},
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sponsorshipId = normalizeString(body?.sponsorshipId);
    const eventId = normalizeString(body?.eventId);
    const weights = normalizeWeights(body?.weights);

    if (sponsorshipId && eventId) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide only sponsorshipId or eventId, not both",
          matches: [],
        },
        { status: 400 }
      );
    }

    if (!sponsorshipId && !eventId) {
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

    if (sponsorshipId) {
      if (user.role !== "SPONSOR") {
        return NextResponse.json(
          {
            success: false,
            message: "Only sponsorship owners can request sponsorship-to-events matches",
            matches: [],
          },
          { status: 403 }
        );
      }

      if (!isValidObjectId(sponsorshipId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid sponsorship ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      const sponsorshipDoc = await Sponsorship.findById(sponsorshipId)
        .select(
          "_id sponsorOwnerId sponsorProfileId sponsorshipTitle sponsorshipType budget category targetAudience city locationPreference campaignGoal coverImage deliverablesExpected status visibilityStatus moderationStatus isDeleted expiresAt createdAt updatedAt"
        )
        .lean();

      if (!sponsorshipDoc) {
        return NextResponse.json(
          {
            success: false,
            message: "Sponsorship not found",
            matches: [],
          },
          { status: 404 }
        );
      }

      if (String((sponsorshipDoc as any).sponsorOwnerId) !== String(user._id)) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only request matches for your own sponsorship post",
            matches: [],
          },
          { status: 403 }
        );
      }

      if (
        (sponsorshipDoc as any).isDeleted === true ||
        (sponsorshipDoc as any).status !== "active" ||
        (sponsorshipDoc as any).visibilityStatus === "HIDDEN" ||
        (sponsorshipDoc as any).moderationStatus === "FLAGGED" ||
        isEventExpired((sponsorshipDoc as any).expiresAt)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only active non-expired sponsorship posts are eligible for matching.",
            matches: [],
          },
          { status: 400 }
        );
      }

      const eventDocs = await EventModel.find({
        status: { $in: MATCHABLE_EVENT_STATUSES },
        endDate: { $gte: getTodayStartDate() },
        isDeleted: { $ne: true },
        visibilityStatus: { $ne: "HIDDEN" },
        moderationStatus: { $ne: "FLAGGED" },
      })
        .select(
          "_id organizerId title description categories targetAudience location budget startDate endDate attendeeCount eventType coverImage image status providedDeliverables createdAt updatedAt"
        )
        .lean();

      const sponsorship = buildSponsorshipData(sponsorshipDoc);
      const events = (eventDocs || []).map(buildEventData);

      const matches = matchSponsorshipToEvents(
        sponsorship,
        events,
        weights
      ).slice(0, MAX_MATCH_RESULTS);

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
          matchType: "sponsorship-to-events",
          mode: "sponsorship_to_events",
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
            message: "Only organizers can request event-to-sponsorships matches",
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
        (eventDoc as any).moderationStatus === "FLAGGED" ||
        !MATCHABLE_EVENT_STATUSES.includes(String((eventDoc as any).status || "").toUpperCase()) ||
        isEventExpired((eventDoc as any).endDate)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only published or ongoing non-expired events are eligible for matching.",
            matches: [],
          },
          { status: 400 }
        );
      }

         const sponsorshipDocs = await Sponsorship.find({
        status: "active",
        expiresAt: { $gte: getTodayStartDate() },
        isDeleted: { $ne: true },
        visibilityStatus: { $ne: "HIDDEN" },
        moderationStatus: { $ne: "FLAGGED" },
      })
        .select(
          "_id sponsorOwnerId sponsorProfileId sponsorshipTitle sponsorshipType budget category targetAudience city locationPreference campaignGoal coverImage deliverablesExpected status expiresAt createdAt updatedAt"
        )
        .lean();

      const sponsorProfileIds = sponsorshipDocs
  .map((doc: any) => doc.sponsorProfileId)
  .filter(Boolean)
  .map(String);

const sponsorProfiles = sponsorProfileIds.length
  ? await Sponsor.find({ _id: { $in: sponsorProfileIds } })
      .select("_id brandName companyName logoUrl")
      .lean()
  : [];

const sponsorProfileMap = new Map(
  sponsorProfiles.map((profile: any) => [String(profile._id), profile])
);

const event = buildEventData(eventDoc);

const sponsorships = sponsorshipDocs.map((doc: any) =>
  buildSponsorshipData({
    ...doc,
    sponsorProfile:
      sponsorProfileMap.get(String(doc.sponsorProfileId)) || null,
  })
);

const matches = matchEventToSponsorships(
  event,
  sponsorships,
  weights
).slice(0, MAX_MATCH_RESULTS);

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
          matchType: "event-to-sponsorships",
          mode: "event_to_sponsorships",
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