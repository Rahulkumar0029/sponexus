import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { getCurrentUser } from "@/lib/current-user";
import { ACTIONS } from "@/lib/subscription/constants";
import { checkUsageLimit } from "@/lib/subscription/checkUsageLimit";
import { incrementUsage } from "@/lib/subscription/enforceLimits";
import { CreateEventInput, EventDeliverable } from "@/types/event";

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

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 60;
const MAX_AUDIENCE_LENGTH = 60;
const MAX_ARRAY_ITEMS = 20;
const MAX_MEDIA_ITEMS = 20;
const MAX_MEDIA_TITLE_LENGTH = 120;
const MAX_URL_LENGTH = 2000;
const MAX_PUBLIC_ID_LENGTH = 300;
const MAX_BUDGET = 100000000;
const MAX_ATTENDEE_COUNT = 1000000;

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isSafeLength(value: string, max: number) {
  return value.length <= max;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeStringArray(value: unknown, maxItemLength = 100): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => normalizeString(item))
        .filter((item) => Boolean(item) && item.length <= maxItemLength)
    ),
  ];
}

function normalizeDeliverables(value: unknown): EventDeliverable[] {
  const items = normalizeStringArray(value, 80);

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

      const url = normalizeString(media.url);
      const publicId = normalizeString(media.publicId);
      const title = normalizeString(media.title);

      if (!url || !publicId || !media.type) return null;
      if (media.type !== "image" && media.type !== "video") return null;
      if (!isValidHttpUrl(url) || !isSafeLength(url, MAX_URL_LENGTH)) {
        return null;
      }
      if (!isSafeLength(publicId, MAX_PUBLIC_ID_LENGTH)) return null;
      if (title && !isSafeLength(title, MAX_MEDIA_TITLE_LENGTH)) return null;

      const uploadedAt =
        media.uploadedAt && !Number.isNaN(new Date(media.uploadedAt).getTime())
          ? new Date(media.uploadedAt)
          : new Date();

      return {
        url,
        publicId,
        type: media.type,
        title,
        uploadedAt,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_MEDIA_ITEMS) as UploadedMedia[];
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        401
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return buildNoStoreResponse(
        { success: false, message: "Only organizers can create events" },
        403
      );
    }

    const body: CreateEventInput & {
      coverImage?: string;
      venueImages?: UploadedMedia[];
      pastEventMedia?: UploadedMedia[];
      status?: "DRAFT" | "PUBLISHED";
      providedDeliverables?: EventDeliverable[];
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
      providedDeliverables,
    } = body;

    const safeTitle = normalizeString(title);
    const safeDescription = normalizeString(description);
    const safeLocation = normalizeString(location);
    const safeRequestedStatus = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    if (
      !safeTitle ||
      !safeDescription ||
      !safeLocation ||
      budget === undefined ||
      !startDate ||
      !endDate
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Missing required fields" },
        400
      );
    }

    if (!isSafeLength(safeTitle, MAX_TITLE_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Title cannot exceed ${MAX_TITLE_LENGTH} characters`,
        },
        400
      );
    }

    if (!isSafeLength(safeDescription, MAX_DESCRIPTION_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
        },
        400
      );
    }

    if (!isSafeLength(safeLocation, MAX_LOCATION_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        },
        400
      );
    }

    const safeCategories = normalizeStringArray(categories, MAX_CATEGORY_LENGTH);
    const safeTargetAudience = normalizeStringArray(
      targetAudience,
      MAX_AUDIENCE_LENGTH
    );
    const safeProvidedDeliverables = normalizeDeliverables(providedDeliverables);
    const safeVenueImages = normalizeMediaArray(venueImages);
    const safePastEventMedia = normalizeMediaArray(pastEventMedia);

    if (
      Array.isArray(categories) &&
      safeCategories.length !==
        new Set(categories.map((item) => normalizeString(item)).filter(Boolean))
          .size
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more categories are invalid or too long",
        },
        400
      );
    }

    if (
      Array.isArray(targetAudience) &&
      safeTargetAudience.length !==
        new Set(
          targetAudience.map((item) => normalizeString(item)).filter(Boolean)
        ).size
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more targetAudience values are invalid or too long",
        },
        400
      );
    }

    if (
      Array.isArray(providedDeliverables) &&
      safeProvidedDeliverables.length !==
        new Set(
          providedDeliverables
            .map((item) => normalizeString(item))
            .filter(Boolean)
        ).size
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more providedDeliverables values are invalid",
        },
        400
      );
    }

    if (safeCategories.length === 0) {
      return buildNoStoreResponse(
        { success: false, message: "At least one category is required" },
        400
      );
    }

    if (safeCategories.length > MAX_ARRAY_ITEMS) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Categories cannot exceed ${MAX_ARRAY_ITEMS} items`,
        },
        400
      );
    }

    if (safeTargetAudience.length > MAX_ARRAY_ITEMS) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Target audience cannot exceed ${MAX_ARRAY_ITEMS} items`,
        },
        400
      );
    }

    if (safeProvidedDeliverables.length > MAX_ARRAY_ITEMS) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Provided deliverables cannot exceed ${MAX_ARRAY_ITEMS} items`,
        },
        400
      );
    }

    if (Array.isArray(venueImages) && safeVenueImages.length !== venueImages.length) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more venueImages items are invalid",
        },
        400
      );
    }

    if (
      Array.isArray(pastEventMedia) &&
      safePastEventMedia.length !== pastEventMedia.length
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more pastEventMedia items are invalid",
        },
        400
      );
    }

    const parsedBudget = Number(budget);
    const parsedAttendeeCount = Number(attendeeCount ?? 100);

    if (
      !Number.isFinite(parsedBudget) ||
      parsedBudget < 0 ||
      parsedBudget > MAX_BUDGET
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message:
            "Budget must be a valid non-negative number within allowed range",
        },
        400
      );
    }

    if (
      !Number.isInteger(parsedAttendeeCount) ||
      parsedAttendeeCount < 1 ||
      parsedAttendeeCount > MAX_ATTENDEE_COUNT
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message:
            "Attendee count must be a valid whole number within allowed range",
        },
        400
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid event dates" },
        400
      );
    }

    if (parsedEndDate < parsedStartDate) {
      return buildNoStoreResponse(
        { success: false, message: "End date cannot be before start date" },
        400
      );
    }

    const safeEventType = ALLOWED_EVENT_TYPES.includes(
      eventType as (typeof ALLOWED_EVENT_TYPES)[number]
    )
      ? eventType
      : "CONFERENCE";

    const normalizedCoverImage = normalizeString(coverImage);
    const safeCoverImage =
      normalizedCoverImage && isValidHttpUrl(normalizedCoverImage)
        ? normalizedCoverImage
        : safeVenueImages[0]?.url || "";

    let finalStatus: "DRAFT" | "PUBLISHED" = "DRAFT";
    let publishBlockedMessage = "";
    let accessSubscriptionId: string | null = null;
    let accessPlanId: string | null = null;

    if (safeRequestedStatus === "PUBLISHED") {
  const usage = await checkUsageLimit({
    userId: String(currentUser._id),
    role: "ORGANIZER",
    action: ACTIONS.PUBLISH_EVENT,
    amount: parsedBudget,
  });

  if (!usage.allowed) {
    finalStatus = "DRAFT";
    publishBlockedMessage =
      usage.message ||
      "Upgrade your subscription to publish events on Sponexus.";
  } else {
    finalStatus = "PUBLISHED";
    accessSubscriptionId = usage.subscriptionId || null;
    accessPlanId = usage.planId || null;
  }
}
    const event = await EventModel.create({
      title: safeTitle,
      description: safeDescription,
      organizerId: currentUser._id,
      categories: safeCategories,
      targetAudience: safeTargetAudience,
      location: safeLocation,
      budget: parsedBudget,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      attendeeCount: parsedAttendeeCount,
      eventType: safeEventType,
      providedDeliverables: safeProvidedDeliverables,
      coverImage: safeCoverImage,
      venueImages: safeVenueImages,
      pastEventMedia: safePastEventMedia,
      status: finalStatus,
    });

    if (finalStatus === "PUBLISHED") {
      await incrementUsage({
        userId: currentUser._id,
        role: "ORGANIZER",
        action: ACTIONS.PUBLISH_EVENT,
        subscriptionId: accessSubscriptionId,
        planId: accessPlanId,
      });
    }

    return buildNoStoreResponse(
      {
        success: true,
        message:
          finalStatus === "PUBLISHED"
            ? "Event created successfully"
            : safeRequestedStatus === "PUBLISHED"
            ? publishBlockedMessage || "Upgrade required to publish."
            : "Event saved as draft",
        event,
        requiresUpgrade:
          safeRequestedStatus === "PUBLISHED" && finalStatus !== "PUBLISHED",
      },
      201
    );
  } catch (error) {
    console.error("Event creation error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Event creation failed" },
      500
    );
  }
}