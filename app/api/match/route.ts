import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/models/Event";
import Sponsor from "@/models/Sponsor";
import { matchSponsorToEvents, matchEventToSponsors } from "@/lib/matcher";
import { Event } from "@/types/event";
import { Sponsor as SponsorType } from "@/types/sponsor";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const sponsorId = url.searchParams.get("sponsorId");
    const sponsorOwnerId = url.searchParams.get("sponsorOwnerId");
    const eventId = url.searchParams.get("eventId");

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
          message: "Missing matching query parameter",
          matches: [],
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Sponsor profile -> matching events
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

      const sponsorData: SponsorType = {
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

      const events: Event[] = (eventDocs || []).map((event: any) => ({
        ...event,
        _id: String(event._id),
        organizerId: event.organizerId ? String(event.organizerId) : "",
        title: event.title || "",
        description: event.description || "",
        categories: Array.isArray(event.categories) ? event.categories : [],
        targetAudience: Array.isArray(event.targetAudience) ? event.targetAudience : [],
        location: event.location || "",
        budget: typeof event.budget === "number" ? event.budget : 0,
        startDate: event.startDate || "",
        endDate: event.endDate || "",
        attendeeCount:
          typeof event.attendeeCount === "number" ? event.attendeeCount : 0,
        eventType: event.eventType || "OTHER",
        image: event.image || "",
        status: event.status || "DRAFT",
        createdAt: event.createdAt || "",
        updatedAt: event.updatedAt || "",
      }));

      const matches = matchSponsorToEvents(sponsorData, events);

      return NextResponse.json(
        {
          success: true,
          matchType: "sponsor-to-events",
          count: matches.length,
          matches,
        },
        { status: 200 }
      );
    }

    // Event -> matching sponsor profiles
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

      const event: Event = {
        ...eventDoc,
        _id: String((eventDoc as any)._id),
        organizerId: (eventDoc as any).organizerId
          ? String((eventDoc as any).organizerId)
          : "",
        title: (eventDoc as any).title || "",
        description: (eventDoc as any).description || "",
        categories: Array.isArray((eventDoc as any).categories)
          ? (eventDoc as any).categories
          : [],
        targetAudience: Array.isArray((eventDoc as any).targetAudience)
          ? (eventDoc as any).targetAudience
          : [],
        location: (eventDoc as any).location || "",
        budget:
          typeof (eventDoc as any).budget === "number" ? (eventDoc as any).budget : 0,
        startDate: (eventDoc as any).startDate || "",
        endDate: (eventDoc as any).endDate || "",
        attendeeCount:
          typeof (eventDoc as any).attendeeCount === "number"
            ? (eventDoc as any).attendeeCount
            : 0,
        eventType: (eventDoc as any).eventType || "OTHER",
        image: (eventDoc as any).image || "",
        status: (eventDoc as any).status || "DRAFT",
        createdAt: (eventDoc as any).createdAt || "",
        updatedAt: (eventDoc as any).updatedAt || "",
      };

      const sponsorDocs = await Sponsor.find({
        isPublic: true,
        isProfileComplete: true,
      });

      const sponsors: SponsorType[] = sponsorDocs.map((sponsorDoc) => ({
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
      }));

      const matches = matchEventToSponsors(event, sponsors);

      return NextResponse.json(
        {
          success: true,
          matchType: "event-to-sponsors",
          count: matches.length,
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