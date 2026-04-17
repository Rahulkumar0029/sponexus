import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { getCurrentUser } from "@/lib/current-user";
import { CreateEventInput } from "@/types/event";

type UploadedMedia = {
  url: string;
  publicId: string;
  type: "image" | "video";
  title?: string;
  uploadedAt?: string | Date;
};

const ALLOWED_EVENT_TYPES = [
  "CONFERENCE",
  "WORKSHOP",
  "WEBINAR",
  "FESTIVAL",
  "MEETUP",
  "OTHER",
] as const;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
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

export async function POST(request: NextRequest) {
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
        { success: false, message: "Only organizers can create events" },
        { status: 403 }
      );
    }

    const body: CreateEventInput & {
      coverImage?: string;
      venueImages?: UploadedMedia[];
      pastEventMedia?: UploadedMedia[];
      status?: "DRAFT" | "PUBLISHED";
    } = await request.json();

    const {
      title,
      description,
      categories,
      targetAudience,
      location,
      budget,
      startDate,
      endDate,
      attendeeCount,
      eventType,
      coverImage,
      venueImages,
      pastEventMedia,
      status,
    } = body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !location?.trim() ||
      budget === undefined ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const safeCategories = normalizeStringArray(categories);
    const safeTargetAudience = normalizeStringArray(targetAudience);
    const safeVenueImages = normalizeMediaArray(venueImages);
    const safePastEventMedia = normalizeMediaArray(pastEventMedia);

    if (safeCategories.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one category is required" },
        { status: 400 }
      );
    }

    const parsedBudget = Number(budget);
    const parsedAttendeeCount = Number(attendeeCount || 100);

    if (Number.isNaN(parsedBudget) || parsedBudget < 0) {
      return NextResponse.json(
        { success: false, message: "Budget must be a valid non-negative number" },
        { status: 400 }
      );
    }

    if (Number.isNaN(parsedAttendeeCount) || parsedAttendeeCount < 1) {
      return NextResponse.json(
        { success: false, message: "Attendee count must be at least 1" },
        { status: 400 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event dates" },
        { status: 400 }
      );
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json(
        { success: false, message: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    const safeEventType = ALLOWED_EVENT_TYPES.includes(
      eventType as (typeof ALLOWED_EVENT_TYPES)[number]
    )
      ? eventType
      : "CONFERENCE";

    const finalStatus = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    const event = await EventModel.create({
      title: title.trim(),
      description: description.trim(),
      organizerId: currentUser._id,
      categories: safeCategories,
      targetAudience: safeTargetAudience,
      location: location.trim(),
      budget: parsedBudget,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      attendeeCount: parsedAttendeeCount,
      eventType: safeEventType,
      coverImage:
        typeof coverImage === "string" && coverImage.trim()
          ? coverImage.trim()
          : safeVenueImages[0]?.url || "",
      venueImages: safeVenueImages,
      pastEventMedia: safePastEventMedia,
      status: finalStatus,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          finalStatus === "DRAFT"
            ? "Event saved as draft"
            : "Event created successfully",
        event,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Event creation error:", error);

    return NextResponse.json(
      { success: false, message: "Event creation failed" },
      { status: 500 }
    );
  }
}