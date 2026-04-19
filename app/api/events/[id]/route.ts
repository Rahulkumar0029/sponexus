import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { getCurrentUser } from "@/lib/current-user";
import { EventDeliverable } from "@/types/event";

type UploadedMedia = {
  url: string;
  publicId: string;
  type: "image" | "video";
  title?: string;
  uploadedAt?: string | Date;
};

const ALLOWED_DELIVERABLES: EventDeliverable[] = [
  "STAGE_BRANDING",
  "STALL_SPACE",
  "SOCIAL_MEDIA_PROMOTION",
  "PRODUCT_DISPLAY",
  "ANNOUNCEMENTS",
  "EMAIL_PROMOTION",
  "TITLE_SPONSORSHIP",
  "CO_BRANDING",
];

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeDeliverables(value: unknown): EventDeliverable[] {
  const items = normalizeStringArray(value);
  return items.filter((item): item is EventDeliverable =>
    ALLOWED_DELIVERABLES.includes(item as EventDeliverable)
  );
}

function normalizeMediaArray(value: unknown): UploadedMedia[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const media = item as UploadedMedia;

      if (!media.url || !media.publicId || !media.type) return null;
      if (media.type !== "image" && media.type !== "video") return null;

      return {
        url: String(media.url).trim(),
        publicId: String(media.publicId).trim(),
        type: media.type,
        title: media.title ? String(media.title).trim() : "",
        uploadedAt: media.uploadedAt || new Date(),
      };
    })
    .filter(Boolean) as UploadedMedia[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const eventId = params.id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID" },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const event: any = await EventModel.findById(eventId)
      .populate("organizerId", "firstName lastName companyName")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    const organizerId =
      typeof event.organizerId === "string"
        ? event.organizerId
        : String(event.organizerId?._id || "");

    const isOwner =
      !!currentUser &&
      currentUser.role === "ORGANIZER" &&
      String(currentUser._id) === organizerId;

    if (event.status === "DRAFT" && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Event not available" },
        { status: 403 }
      );
    }

    const isPast = event.endDate ? new Date(event.endDate) < today : false;
    const isActive = event.status === "PUBLISHED" || event.status === "ONGOING";

    return NextResponse.json(
      {
        success: true,
        data: {
          ...event,
          isPast,
          isActive,
          isOwner,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching event:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch event" },
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

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return NextResponse.json(
        { success: false, message: "Only organizers can update events" },
        { status: 403 }
      );
    }

    const eventId = params.id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID" },
        { status: 400 }
      );
    }

    const existingEvent = await EventModel.findById(eventId);

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    if (String(existingEvent.organizerId) !== String(currentUser._id)) {
      return NextResponse.json(
        { success: false, message: "You can only update your own events" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : existingEvent.title;

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : existingEvent.description;

    const categories =
      body.categories !== undefined
        ? normalizeStringArray(body.categories)
        : existingEvent.categories;

    const targetAudience =
      body.targetAudience !== undefined
        ? normalizeStringArray(body.targetAudience)
        : existingEvent.targetAudience;

    const providedDeliverables =
      body.providedDeliverables !== undefined
        ? normalizeDeliverables(body.providedDeliverables)
        : existingEvent.providedDeliverables || [];

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : existingEvent.location;

    const budget =
      body.budget !== undefined ? Number(body.budget) : existingEvent.budget;

    const attendeeCount =
      body.attendeeCount !== undefined
        ? Number(body.attendeeCount)
        : existingEvent.attendeeCount;

    const eventType =
      typeof body.eventType === "string" && body.eventType.trim()
        ? body.eventType.trim()
        : existingEvent.eventType;

    const startDate =
      body.startDate !== undefined
        ? new Date(body.startDate)
        : existingEvent.startDate;

    const endDate =
      body.endDate !== undefined ? new Date(body.endDate) : existingEvent.endDate;

    const coverImage =
      typeof body.coverImage === "string"
        ? body.coverImage.trim()
        : existingEvent.coverImage;

    const venueImages =
      body.venueImages !== undefined
        ? normalizeMediaArray(body.venueImages)
        : existingEvent.venueImages;

    const pastEventMedia =
      body.pastEventMedia !== undefined
        ? normalizeMediaArray(body.pastEventMedia)
        : existingEvent.pastEventMedia;

    const status =
      body.status === "DRAFT" ||
      body.status === "PUBLISHED" ||
      body.status === "ONGOING" ||
      body.status === "COMPLETED" ||
      body.status === "CANCELLED"
        ? body.status
        : existingEvent.status;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Event title is required" },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, message: "Event description is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one category is required" },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { success: false, message: "Location is required" },
        { status: 400 }
      );
    }

    if (Number.isNaN(Number(budget)) || Number(budget) < 0) {
      return NextResponse.json(
        { success: false, message: "Budget must be a valid non-negative number" },
        { status: 400 }
      );
    }

    if (Number.isNaN(Number(attendeeCount)) || Number(attendeeCount) < 1) {
      return NextResponse.json(
        { success: false, message: "Attendee count must be at least 1" },
        { status: 400 }
      );
    }

    if (
      !(startDate instanceof Date) ||
      Number.isNaN(startDate.getTime()) ||
      !(endDate instanceof Date) ||
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event dates" },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { success: false, message: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    existingEvent.title = title;
    existingEvent.description = description;
    existingEvent.categories = categories;
    existingEvent.targetAudience = targetAudience;
    existingEvent.providedDeliverables = providedDeliverables;
    existingEvent.location = location;
    existingEvent.budget = Number(budget);
    existingEvent.attendeeCount = Number(attendeeCount);
    existingEvent.eventType = eventType;
    existingEvent.startDate = startDate;
    existingEvent.endDate = endDate;
    existingEvent.coverImage = coverImage || venueImages[0]?.url || "";
    existingEvent.venueImages = venueImages;
    existingEvent.pastEventMedia = pastEventMedia;
    existingEvent.status = status;

    await existingEvent.save();

    return NextResponse.json(
      {
        success: true,
        message: "Event updated successfully",
        event: existingEvent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating event:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return NextResponse.json(
        { success: false, message: "Only organizers can delete events" },
        { status: 403 }
      );
    }

    const eventId = params.id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID" },
        { status: 400 }
      );
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    if (String(event.organizerId) !== String(currentUser._id)) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own events" },
        { status: 403 }
      );
    }

    await EventModel.findByIdAndDelete(eventId);

    return NextResponse.json(
      {
        success: true,
        message: "Event deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting event:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete event" },
      { status: 500 }
    );
  }
}