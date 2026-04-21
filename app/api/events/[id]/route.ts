import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import Plan from "@/lib/models/Plan";
import Subscription from "@/lib/models/Subscription";
import { getCurrentUser } from "@/lib/current-user";
import { canUserAccessSubscriptionFeature } from "@/lib/subscription/access";
import { ACTIONS, SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";
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

const ALLOWED_EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

const ALLOWED_EVENT_TYPES = [
  "CONFERENCE",
  "WORKSHOP",
  "WEBINAR",
  "FESTIVAL",
  "MEETUP",
  "OTHER",
] as const;

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 60;
const MAX_TARGET_AUDIENCE_ITEM_LENGTH = 60;
const MAX_DELIVERABLES = 20;
const MAX_ARRAY_ITEMS = 20;
const MAX_MEDIA_ITEMS = 20;
const MAX_MEDIA_TITLE_LENGTH = 120;
const MAX_URL_LENGTH = 2000;
const MAX_PUBLIC_ID_LENGTH = 300;
const MAX_BUDGET = 100000000;
const MAX_ATTENDEE_COUNT = 1000000;

function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
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

function normalizeStringArray(
  value: unknown,
  maxItemLength = 100,
  maxItems = MAX_ARRAY_ITEMS
): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => normalizeString(item))
        .filter((item) => Boolean(item) && item.length <= maxItemLength)
    ),
  ].slice(0, maxItems);
}

function normalizeDeliverables(value: unknown): EventDeliverable[] {
  const items = normalizeStringArray(
    value,
    MAX_TARGET_AUDIENCE_ITEM_LENGTH,
    MAX_DELIVERABLES
  );
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
      if (!isValidHttpUrl(url) || !isSafeLength(url, MAX_URL_LENGTH)) return null;
      if (!isSafeLength(publicId, MAX_PUBLIC_ID_LENGTH)) return null;
      if (title && !isSafeLength(title, MAX_MEDIA_TITLE_LENGTH)) return null;

      return {
        url,
        publicId,
        type: media.type,
        title,
        uploadedAt:
          media.uploadedAt && !Number.isNaN(new Date(media.uploadedAt).getTime())
            ? new Date(media.uploadedAt)
            : new Date(),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_MEDIA_ITEMS) as UploadedMedia[];
}

function sanitizeEventForResponse(event: any) {
  const plain =
    typeof event?.toObject === "function" ? event.toObject() : { ...event };

  if (plain?.organizerId) {
    plain.organizerId.email = undefined;
    plain.organizerId.phone = undefined;
    plain.organizerId.bio = undefined;
    plain.organizerId.avatar = undefined;
    plain.organizerId.adminRole = undefined;
    plain.organizerId.accountStatus = undefined;
  }

  return plain;
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
      return buildNoStoreResponse(
        { success: false, message: "Invalid event ID" },
        400
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const event: any = await EventModel.findById(eventId)
      .populate("organizerId", "firstName lastName companyName")
      .lean();

    if (!event || event.isDeleted === true) {
      return buildNoStoreResponse(
        { success: false, message: "Event not found" },
        404
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

    if (!isOwner) {
      if (
        event.status === "DRAFT" ||
        event.visibilityStatus === "HIDDEN" ||
        event.moderationStatus === "FLAGGED"
      ) {
        return buildNoStoreResponse(
          { success: false, message: "Event not available" },
          403
        );
      }
    }

    const isPast = event.endDate ? new Date(event.endDate) < today : false;
    const isActive = event.status === "PUBLISHED" || event.status === "ONGOING";
    const safeEvent = sanitizeEventForResponse(event);

    return buildNoStoreResponse(
      {
        success: true,
        data: {
          ...safeEvent,
          isPast,
          isActive,
          isOwner,
        },
      },
      200
    );
  } catch (error) {
    console.error("Error fetching event:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch event" },
      500
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
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        401
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return buildNoStoreResponse(
        { success: false, message: "Only organizers can update events" },
        403
      );
    }

    const eventId = params.id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid event ID" },
        400
      );
    }

    const existingEvent = await EventModel.findById(eventId);

    if (!existingEvent || existingEvent.isDeleted === true) {
      return buildNoStoreResponse(
        { success: false, message: "Event not found" },
        404
      );
    }

    if (String(existingEvent.organizerId) !== String(currentUser._id)) {
      return buildNoStoreResponse(
        { success: false, message: "You can only update your own events" },
        403
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : existingEvent.title;

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : existingEvent.description;

    const categories =
      body.categories !== undefined
        ? normalizeStringArray(body.categories, MAX_CATEGORY_LENGTH)
        : existingEvent.categories;

    const targetAudience =
      body.targetAudience !== undefined
        ? normalizeStringArray(
            body.targetAudience,
            MAX_TARGET_AUDIENCE_ITEM_LENGTH
          )
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

    const requestedStatus =
      body.status &&
      ALLOWED_EVENT_STATUSES.includes(body.status as (typeof ALLOWED_EVENT_STATUSES)[number])
        ? body.status
        : existingEvent.status;

    if (!title) {
      return buildNoStoreResponse(
        { success: false, message: "Event title is required" },
        400
      );
    }

    if (!isSafeLength(title, MAX_TITLE_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Event title cannot exceed ${MAX_TITLE_LENGTH} characters`,
        },
        400
      );
    }

    if (!description) {
      return buildNoStoreResponse(
        { success: false, message: "Event description is required" },
        400
      );
    }

    if (!isSafeLength(description, MAX_DESCRIPTION_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Event description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
        },
        400
      );
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return buildNoStoreResponse(
        { success: false, message: "At least one category is required" },
        400
      );
    }

    if (categories.length > MAX_ARRAY_ITEMS) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Categories cannot exceed ${MAX_ARRAY_ITEMS} items`,
        },
        400
      );
    }

    if (
      Array.isArray(body.categories) &&
      categories.length !==
        [
          ...new Set(
            body.categories
              .map((item: unknown) => normalizeString(item))
              .filter(Boolean)
          ),
        ].length
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more categories are invalid or too long",
        },
        400
      );
    }

    if (targetAudience.length > MAX_ARRAY_ITEMS) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Target audience cannot exceed ${MAX_ARRAY_ITEMS} items`,
        },
        400
      );
    }

    if (
      Array.isArray(body.targetAudience) &&
      targetAudience.length !==
        [
          ...new Set(
            body.targetAudience
              .map((item: unknown) => normalizeString(item))
              .filter(Boolean)
          ),
        ].length
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more targetAudience values are invalid or too long",
        },
        400
      );
    }

    if (providedDeliverables.length > MAX_DELIVERABLES) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Provided deliverables cannot exceed ${MAX_DELIVERABLES} items`,
        },
        400
      );
    }

    if (
      Array.isArray(body.providedDeliverables) &&
      providedDeliverables.length !==
        [
          ...new Set(
            body.providedDeliverables
              .map((item: unknown) => normalizeString(item))
              .filter(Boolean)
          ),
        ].length
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more providedDeliverables values are invalid",
        },
        400
      );
    }

    if (!location) {
      return buildNoStoreResponse(
        { success: false, message: "Location is required" },
        400
      );
    }

    if (!isSafeLength(location, MAX_LOCATION_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        },
        400
      );
    }

    if (!Number.isFinite(Number(budget)) || Number(budget) < 0 || Number(budget) > MAX_BUDGET) {
      return buildNoStoreResponse(
        { success: false, message: "Budget must be a valid non-negative number" },
        400
      );
    }

    if (
      !Number.isFinite(Number(attendeeCount)) ||
      !Number.isInteger(Number(attendeeCount)) ||
      Number(attendeeCount) < 1 ||
      Number(attendeeCount) > MAX_ATTENDEE_COUNT
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Attendee count must be at least 1" },
        400
      );
    }

    if (
      !(startDate instanceof Date) ||
      Number.isNaN(startDate.getTime()) ||
      !(endDate instanceof Date) ||
      Number.isNaN(endDate.getTime())
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid event dates" },
        400
      );
    }

    if (endDate < startDate) {
      return buildNoStoreResponse(
        { success: false, message: "End date cannot be before start date" },
        400
      );
    }

    if (
      !ALLOWED_EVENT_TYPES.includes(
        eventType as (typeof ALLOWED_EVENT_TYPES)[number]
      )
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid event type" },
        400
      );
    }

    if (coverImage && (!isValidHttpUrl(coverImage) || !isSafeLength(coverImage, MAX_URL_LENGTH))) {
      return buildNoStoreResponse(
        { success: false, message: "Cover image must be a valid URL" },
        400
      );
    }

    if (
      Array.isArray(body.venueImages) &&
      venueImages.length !== body.venueImages.length
    ) {
      return buildNoStoreResponse(
        { success: false, message: "One or more venueImages items are invalid" },
        400
      );
    }

    if (
      Array.isArray(body.pastEventMedia) &&
      pastEventMedia.length !== body.pastEventMedia.length
    ) {
      return buildNoStoreResponse(
        { success: false, message: "One or more pastEventMedia items are invalid" },
        400
      );
    }

    let finalStatus = requestedStatus;
    let publishBlockedMessage = "";

    const wantsPublicStatus =
      requestedStatus === "PUBLISHED" || requestedStatus === "ONGOING";

    const wasAlreadyPublic =
      existingEvent.status === "PUBLISHED" || existingEvent.status === "ONGOING";

    if (wantsPublicStatus && !wasAlreadyPublic) {
      const activeSubscription = await Subscription.findOne({
        userId: currentUser._id,
        role: "ORGANIZER",
        status: {
          $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.GRACE],
        },
      }).sort({ endDate: -1, createdAt: -1 });

      const activePlan = activeSubscription
        ? await Plan.findById(activeSubscription.planId)
        : null;

      const access = canUserAccessSubscriptionFeature({
        user: currentUser,
        subscription: activeSubscription,
        plan: activePlan,
        action: ACTIONS.PUBLISH_EVENT,
      });

      if (!access.allowed) {
        finalStatus = "DRAFT";
        publishBlockedMessage =
          access.message ||
          "Upgrade your subscription to publish events on Sponexus.";
      }
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
    existingEvent.status = finalStatus;

    await existingEvent.save();

    return buildNoStoreResponse(
      {
        success: true,
        message:
          finalStatus === requestedStatus
            ? "Event updated successfully"
            : publishBlockedMessage || "Event updated and saved as draft.",
        event: sanitizeEventForResponse(existingEvent),
        requiresUpgrade: wantsPublicStatus && finalStatus !== requestedStatus,
      },
      200
    );
  } catch (error) {
    console.error("Error updating event:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to update event" },
      500
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
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        401
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return buildNoStoreResponse(
        { success: false, message: "Only organizers can delete events" },
        403
      );
    }

    const eventId = params.id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid event ID" },
        400
      );
    }

    const event = await EventModel.findById(eventId);

    if (!event || event.isDeleted === true) {
      return buildNoStoreResponse(
        { success: false, message: "Event not found" },
        404
      );
    }

    if (String(event.organizerId) !== String(currentUser._id)) {
      return buildNoStoreResponse(
        { success: false, message: "You can only delete your own events" },
        403
      );
    }

    event.isDeleted = true;
    event.status = "CANCELLED";
    await event.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Event deleted successfully",
      },
      200
    );
  } catch (error) {
    console.error("Error deleting event:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to delete event" },
      500
    );
  }
}