import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { getCurrentUser } from "@/lib/current-user";
import { ACTIONS } from "@/lib/subscription/constants";
import { checkUsageLimit } from "@/lib/subscription/checkUsageLimit";
import { incrementUsage } from "@/lib/subscription/enforceLimits";
import {
  EventDeliverable,
  EVENT_CATEGORY_OPTIONS,
  EVENT_DELIVERABLE_OPTIONS,
} from "@/types/event";

type UploadedMedia = {
  url: string;
  publicId: string;
  type: "image" | "video";
  title?: string;
  uploadedAt?: string | Date;
};

const ALLOWED_EVENT_CATEGORIES = new Set<string>(EVENT_CATEGORY_OPTIONS);
const ALLOWED_DELIVERABLES = new Set<string>(EVENT_DELIVERABLE_OPTIONS);
const REQUIRED_DELIVERABLE_COUNT = 3;

const ALLOWED_EVENT_ACTIONS = new Set([
  "edit",
  "pause",
  "resume",
  "cancel",
  "complete",
  "repost",
]);

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 80;
const MAX_TARGET_AUDIENCE_ITEM_LENGTH = 60;
const MAX_DELIVERABLE_LENGTH = 80;
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
    MAX_DELIVERABLE_LENGTH,
    REQUIRED_DELIVERABLE_COUNT
  );

  return items.filter((item): item is EventDeliverable =>
    ALLOWED_DELIVERABLES.has(item)
  );
}

function normalizeEventCategories(value: unknown, customCategory: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const safeCustomCategory = normalizeString(customCategory);

  return [
    ...new Set(
      value
        .map((item) => {
          const selected = normalizeString(item);

          if (!selected) return "";

          if (selected === "Other") {
            return safeCustomCategory;
          }

          if (ALLOWED_EVENT_CATEGORIES.has(selected)) {
            return selected;
          }

          if (safeCustomCategory && selected === safeCustomCategory) {
            return selected;
          }

          return "";
        })
        .filter((item) => Boolean(item) && item.length <= MAX_CATEGORY_LENGTH)
    ),
  ].slice(0, MAX_ARRAY_ITEMS);
}

function normalizeEventType(
  value: unknown,
  customCategory: unknown,
  categories: string[],
  fallback: string
) {
  const selected = normalizeString(value);
  const safeCustomCategory = normalizeString(customCategory);

  const finalValue =
    selected === "Other"
      ? safeCustomCategory
      : selected || fallback;

  if (
    finalValue &&
    isSafeLength(finalValue, MAX_CATEGORY_LENGTH) &&
    (ALLOWED_EVENT_CATEGORIES.has(finalValue) || categories.includes(finalValue))
  ) {
    return finalValue;
  }

  return "";
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

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isEventExpired(event: any) {
  if (!event?.endDate) return false;

  const endDate = new Date(event.endDate);
  endDate.setHours(0, 0, 0, 0);

  return !Number.isNaN(endDate.getTime()) && endDate < getTodayStart();
}

async function markExpiredIfNeeded(event: any) {
  if (
    event &&
    (event.status === "PUBLISHED" || event.status === "ONGOING") &&
    isEventExpired(event)
  ) {
    const updatedEvent = await EventModel.findByIdAndUpdate(
      event._id,
      {
        $set: {
          status: "EXPIRED",
        },
      },
      { new: true }
    );

    return updatedEvent || event;
  }

  return event;
}

function validateFutureEventDates(startDate: Date, endDate: Date) {
  if (
    !(startDate instanceof Date) ||
    Number.isNaN(startDate.getTime()) ||
    !(endDate instanceof Date) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Invalid event dates";
  }

  const startDateOnly = new Date(startDate);
  startDateOnly.setHours(0, 0, 0, 0);

  if (startDateOnly < getTodayStart()) {
    return "Event start date cannot be in the past";
  }

  if (endDate < startDate) {
    return "End date cannot be before start date";
  }

  return "";
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

const today = getTodayStart();

let event: any = await EventModel.findById(eventId).populate(
  "organizerId",
  "firstName lastName companyName"
);

   if (!event || event.isDeleted === true) {
  return buildNoStoreResponse(
    { success: false, message: "Event not found" },
    404
  );
}

event = await markExpiredIfNeeded(event);

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
    event.status === "PAUSED" ||
    event.status === "CANCELLED" ||
    event.status === "EXPIRED" ||
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


    let existingEvent = await EventModel.findById(eventId);

    if (!existingEvent || existingEvent.isDeleted === true) {
      return buildNoStoreResponse(
        { success: false, message: "Event not found" },
        404
      );
    }

existingEvent = await markExpiredIfNeeded(existingEvent);

    if (String(existingEvent.organizerId) !== String(currentUser._id)) {
      return buildNoStoreResponse(
        { success: false, message: "You can only update your own events" },
        403
      );
    }

    const body = await request.json();

    const action = normalizeString(body.action || "edit") as
  | "edit"
  | "pause"
  | "resume"
  | "cancel"
  | "complete"
  | "repost";

  if (!ALLOWED_EVENT_ACTIONS.has(action)) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "Invalid action. Use edit, pause, resume, cancel, complete, or repost.",
    },
    400
  );
}

  if (action === "pause") {
  if (existingEvent.status !== "PUBLISHED" && existingEvent.status !== "ONGOING") {
    return buildNoStoreResponse(
      { success: false, message: "Only published or ongoing events can be paused" },
      400
    );
  }

  const updatedEvent = await EventModel.findByIdAndUpdate(
  existingEvent._id,
  {
    $set: {
      status: "PAUSED",
      pausedAt: new Date(),
      resumedAt: null,
    },
  },
  { new: true }
);

return buildNoStoreResponse(
  {
    success: true,
    message: "Event paused successfully",
    event: sanitizeEventForResponse(updatedEvent),
  },
  200
);
}

if (action === "resume") {
  if (existingEvent.status !== "PAUSED") {
    return buildNoStoreResponse(
      { success: false, message: "Only paused events can be resumed" },
      400
    );
  }

  if (isEventExpired(existingEvent)) {
   await EventModel.findByIdAndUpdate(existingEvent._id, {
  $set: {
    status: "EXPIRED",
  },
});

    return buildNoStoreResponse(
      {
        success: false,
        message: "Expired event cannot be resumed. Create again instead.",
      },
      400
    );
  }

  const updatedEvent = await EventModel.findByIdAndUpdate(
  existingEvent._id,
  {
    $set: {
      status: "PUBLISHED",
      resumedAt: new Date(),
      pausedAt: null,
    },
  },
  { new: true }
);

  return buildNoStoreResponse(
    {
      success: true,
      message: "Event resumed successfully",
      event: sanitizeEventForResponse(updatedEvent),
    },
    200
  );
}

if (action === "cancel") {
  if (existingEvent.status === "CANCELLED") {
    return buildNoStoreResponse(
      { success: false, message: "Event is already cancelled" },
      400
    );
  }

  const updatedEvent = await EventModel.findByIdAndUpdate(
  existingEvent._id,
  {
    $set: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  },
  { new: true }
);

return buildNoStoreResponse(
  {
    success: true,
    message: "Event cancelled successfully",
    event: sanitizeEventForResponse(updatedEvent),
  },
  200
);
}

if (action === "complete") {
  if (existingEvent.status !== "PUBLISHED" && existingEvent.status !== "ONGOING") {
    return buildNoStoreResponse(
      { success: false, message: "Only published or ongoing events can be completed" },
      400
    );
  }

 const updatedEvent = await EventModel.findByIdAndUpdate(
  existingEvent._id,
  {
    $set: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  },
  { new: true }
);

return buildNoStoreResponse(
  {
    success: true,
    message: "Event completed successfully",
    event: sanitizeEventForResponse(updatedEvent),
  },
  200
);
}

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
    ? normalizeEventCategories(body.categories, body.customCategory)
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

   const eventType = normalizeEventType(
  body.eventType,
  body.customCategory,
  categories,
  existingEvent.eventType
);

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
  action === "edit" &&
  typeof body.status === "string" &&
  ["DRAFT", "PUBLISHED", "ONGOING"].includes(body.status)
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

    if (body.categories !== undefined && categories.length === 0) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "Please select a valid category or enter a custom category.",
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

  if (providedDeliverables.length !== REQUIRED_DELIVERABLE_COUNT) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "Please select exactly 3 event deliverables.",
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
  !eventType ||
  !isSafeLength(eventType, MAX_CATEGORY_LENGTH) ||
  !(
    ALLOWED_EVENT_CATEGORIES.has(eventType) ||
    categories.includes(eventType)
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

    if (action === "repost") {
  if (
    existingEvent.status !== "CANCELLED" &&
    existingEvent.status !== "COMPLETED" &&
    existingEvent.status !== "EXPIRED"
  ) {
    return buildNoStoreResponse(
      {
        success: false,
        message: "Only cancelled, completed, or expired events can be created again.",
      },
      400
    );
  }

  if (!body.startDate || !body.endDate) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "New start date and end date are required to create this event again.",
    },
    400
  );
}

const repostStartDate = new Date(body.startDate);
const repostEndDate = new Date(body.endDate);


  const dateError = validateFutureEventDates(repostStartDate, repostEndDate);

  if (dateError) {
    return buildNoStoreResponse({ success: false, message: dateError }, 400);
  }

  const usage = await checkUsageLimit({
  userId: String(currentUser._id),
  role: "ORGANIZER",
  action: ACTIONS.PUBLISH_EVENT,
  amount: Number(budget),
});

if (!usage.allowed) {
  return buildNoStoreResponse(
    {
      success: false,
      message:
        usage.message ||
        "Upgrade your subscription to create this event again.",
      requiresUpgrade: true,
    },
    403
  );
}

  const newEvent = await EventModel.create({
    title,
    description,
    organizerId: existingEvent.organizerId,
    categories,
    targetAudience,
    location,
    budget: Number(budget),
    startDate: repostStartDate,
    endDate: repostEndDate,
    attendeeCount: Number(attendeeCount),
    eventType,
    providedDeliverables,
   coverImage: coverImage || existingEvent.coverImage || venueImages[0]?.url || "",
    venueImages,
    pastEventMedia,
    status: "PUBLISHED",
    duplicatedFrom: existingEvent._id,
    repostCount: 0,
  });

  await incrementUsage({
  userId: currentUser._id,
  role: "ORGANIZER",
  action: ACTIONS.PUBLISH_EVENT,
  subscriptionId: usage.subscriptionId || null,
  planId: usage.planId || null,
});

 await EventModel.findByIdAndUpdate(existingEvent._id, {
  $inc: {
    repostCount: 1,
  },
});

  return buildNoStoreResponse(
    {
      success: true,
      message: "Event created again successfully",
      event: sanitizeEventForResponse(newEvent),
    },
    201
  );
}

    let finalStatus = requestedStatus;
    let publishBlockedMessage = "";

    const wantsPublicStatus =
      requestedStatus === "PUBLISHED" || requestedStatus === "ONGOING";

   const wasAlreadyPublic =
  existingEvent.status === "PUBLISHED" ||
  existingEvent.status === "ONGOING" ||
  existingEvent.status === "PAUSED";

 let accessSubscriptionId: string | null = null;
let accessPlanId: string | null = null;

if (wantsPublicStatus && !wasAlreadyPublic) {
  const usage = await checkUsageLimit({
    userId: String(currentUser._id),
    role: "ORGANIZER",
    action: ACTIONS.PUBLISH_EVENT,
    amount: Number(budget),
  });

  if (!usage.allowed) {
    finalStatus = "DRAFT";
    publishBlockedMessage =
      usage.message ||
      "Upgrade your subscription to publish events on Sponexus.";
  } else {
    accessSubscriptionId = usage.subscriptionId || null;
    accessPlanId = usage.planId || null;
  }
}

if (
  action === "edit" &&
  (existingEvent.status === "CANCELLED" ||
    existingEvent.status === "COMPLETED" ||
    existingEvent.status === "EXPIRED")
) {
  return buildNoStoreResponse(
    {
      success: false,
      message:
        "Cancelled, completed, or expired events cannot be edited. Create again instead.",
    },
    400
  );
}

    const editDateError = validateFutureEventDates(startDate, endDate);

if (editDateError) {
  return buildNoStoreResponse(
    { success: false, message: editDateError },
    400
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
    existingEvent.coverImage =
  coverImage || existingEvent.coverImage || venueImages[0]?.url || "";
    existingEvent.venueImages = venueImages;
    existingEvent.pastEventMedia = pastEventMedia;
    existingEvent.status = finalStatus;

    await existingEvent.save();

    if (wantsPublicStatus && !wasAlreadyPublic && finalStatus === requestedStatus) {
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

   if (event.status === "CANCELLED") {
  return buildNoStoreResponse(
    { success: false, message: "Event is already cancelled" },
    400
  );
}

await EventModel.findByIdAndUpdate(event._id, {
  $set: {
    status: "CANCELLED",
    cancelledAt: new Date(),
  },
});

return buildNoStoreResponse(
  {
    success: true,
    message: "Event cancelled successfully",
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