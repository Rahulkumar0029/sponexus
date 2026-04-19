import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import Sponsor from "@/lib/models/Sponsor";
import { matchSponsorToEvents, matchEventToSponsors } from "@/lib/matcher";
import { Event } from "@/types/event";
import { MatchWeights } from "@/types/match";
import { Sponsor as SponsorType } from "@/types/sponsor";

const DEFAULT_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

function normalizeWeights(input?: Partial<MatchWeights>): MatchWeights {
  const weights: MatchWeights = {
    category: Number(input?.category ?? DEFAULT_WEIGHTS.category),
    audience: Number(input?.audience ?? DEFAULT_WEIGHTS.audience),
    location: Number(input?.location ?? DEFAULT_WEIGHTS.location),
    budget: Number(input?.budget ?? DEFAULT_WEIGHTS.budget),
    deliverables: Number(input?.deliverables ?? DEFAULT_WEIGHTS.deliverables),
  };

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
  return {
    ...sponsorDoc.toObject(),
    _id: String(sponsorDoc._id),
    userId: sponsorDoc.userId ? String(sponsorDoc.userId) : "",
    brandName: sponsorDoc.brandName || "",
    companyName: sponsorDoc.companyName || "",
    website: sponsorDoc.website || "",
    officialEmail: sponsorDoc.officialEmail || "",
    phone: sponsorDoc.phone || "",
    industry: sponsorDoc.industry || "",
    companySize: sponsorDoc.companySize || "",
    about: sponsorDoc.about || "",
    logoUrl: sponsorDoc.logoUrl || "",
    targetAudience: sponsorDoc.targetAudience || "",
    preferredCategories: Array.isArray(sponsorDoc.preferredCategories)
      ? sponsorDoc.preferredCategories
      : [],
    preferredLocations: Array.isArray(sponsorDoc.preferredLocations)
      ? sponsorDoc.preferredLocations
      : [],
    sponsorshipInterests: Array.isArray(sponsorDoc.sponsorshipInterests)
      ? sponsorDoc.sponsorshipInterests
      : [],
    instagramUrl: sponsorDoc.instagramUrl || "",
    linkedinUrl: sponsorDoc.linkedinUrl || "",
    isProfileComplete: Boolean(sponsorDoc.isProfileComplete),
    isPublic: Boolean(sponsorDoc.isPublic),
    createdAt: sponsorDoc.createdAt
      ? new Date(sponsorDoc.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: sponsorDoc.updatedAt
      ? new Date(sponsorDoc.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

function buildEventData(eventDoc: any): Event {
  return {
    ...eventDoc,
    _id: String(eventDoc._id),
    organizerId: eventDoc.organizerId ? String(eventDoc.organizerId) : "",
    title: eventDoc.title || "",
    description: eventDoc.description || "",
    categories: Array.isArray(eventDoc.categories) ? eventDoc.categories : [],
    targetAudience: Array.isArray(eventDoc.targetAudience)
      ? eventDoc.targetAudience
      : [],
    location: eventDoc.location || "",
    budget: typeof eventDoc.budget === "number" ? eventDoc.budget : 0,
    startDate: eventDoc.startDate || "",
    endDate: eventDoc.endDate || "",
    attendeeCount:
      typeof eventDoc.attendeeCount === "number" ? eventDoc.attendeeCount : 0,
    eventType: eventDoc.eventType || "OTHER",
    image: eventDoc.coverImage || eventDoc.image || "",
    status: eventDoc.status || "DRAFT",
    providedDeliverables: Array.isArray(eventDoc.providedDeliverables)
      ? eventDoc.providedDeliverables
      : [],
    createdAt: eventDoc.createdAt || "",
    updatedAt: eventDoc.updatedAt || "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sponsorId = body?.sponsorId;
    const sponsorOwnerId = body?.sponsorOwnerId;
    const eventId = body?.eventId;
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

    if (sponsorId || sponsorOwnerId) {
      if (sponsorId && !mongoose.Types.ObjectId.isValid(sponsorId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid sponsor ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      if (sponsorOwnerId && !mongoose.Types.ObjectId.isValid(sponsorOwnerId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid sponsor owner ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      const sponsorDoc = sponsorId
        ? await Sponsor.findById(sponsorId)
        : await Sponsor.findOne({ userId: sponsorOwnerId });

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
      }).lean();

      const sponsorData = buildSponsorData(sponsorDoc);
      const events = (eventDocs || []).map(buildEventData);

      const matches = matchSponsorToEvents(sponsorData, events, weights);

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
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid event ID",
            matches: [],
          },
          { status: 400 }
        );
      }

      const eventDoc = await EventModel.findById(eventId).lean();

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

      const sponsorDocs = await Sponsor.find({
        isPublic: true,
        isProfileComplete: true,
      });

      const event = buildEventData(eventDoc);
      const sponsors = sponsorDocs.map(buildSponsorData);

      const matches = matchEventToSponsors(event, sponsors, weights);

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