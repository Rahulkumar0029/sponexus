import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

const PUBLIC_VISIBLE_STATUSES = ["PUBLISHED", "ONGOING"] as const;
const PAST_VISIBLE_STATUSES = ["COMPLETED"] as const;
const OWNER_ALLOWED_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ONGOING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

const MAX_LIMIT = 50;
const PREVIEW_LIMIT = 4;

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

function sanitizeEventForPublicResponse(event: any) {
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

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function expireOldActiveEvents(ownerId?: unknown) {
  const todayStart = getTodayStart();

  const query: Record<string, any> = {
    status: { $in: ["PUBLISHED", "ONGOING"] },
    endDate: { $lt: todayStart },
    isDeleted: { $ne: true },
  };

  if (ownerId) {
    query.organizerId = ownerId;
  }

  await EventModel.updateMany(query, {
    $set: {
      status: "EXPIRED",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const pastOnly = searchParams.get("pastOnly") === "true";

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit =
      Number.isNaN(limit) || limit < 1 ? 10 : Math.min(limit, MAX_LIMIT);

const today = getTodayStart();

    const query: Record<string, any> = {};

   if (!currentUser) {
  await expireOldActiveEvents();

  query.status = { $in: PUBLIC_VISIBLE_STATUSES };
      query.endDate = { $gte: today };
      query.isDeleted = { $ne: true };
      query.visibilityStatus = { $ne: "HIDDEN" };
      query.moderationStatus = { $ne: "FLAGGED" };

      const events = await EventModel.find(query)
        .sort({ startDate: 1, createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .populate("organizerId", "firstName lastName companyName");

      const safeEvents = events.map((event) =>
        sanitizeEventForPublicResponse(event)
      );

      return buildNoStoreResponse(
        {
          success: true,
          preview: true,
          events: safeEvents,
          pagination: {
            total: safeEvents.length,
            page: 1,
            limit: PREVIEW_LIMIT,
            pages: 1,
          },
        },
        200
      );
    }

   if (currentUser.role === "ORGANIZER") {
  await expireOldActiveEvents(currentUser._id);

  query.organizerId = currentUser._id;
      query.isDeleted = { $ne: true };

      if (
        status &&
        status !== "ALL" &&
        !activeOnly &&
        !pastOnly &&
        OWNER_ALLOWED_STATUSES.includes(
          status as (typeof OWNER_ALLOWED_STATUSES)[number]
        )
      ) {
        query.status = status;
      }

      if (activeOnly) {
        query.status = { $in: PUBLIC_VISIBLE_STATUSES };
        query.endDate = { $gte: today };
      }

      if (pastOnly) {
  query.status = { $in: ["COMPLETED", "CANCELLED", "EXPIRED"] };
}

      const events = await EventModel.find(query)
        .sort({ startDate: -1, createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .populate("organizerId", "firstName lastName companyName");

      const total = await EventModel.countDocuments(query);

      return buildNoStoreResponse(
        {
          success: true,
          ownerView: true,
          events,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
          },
        },
        200
      );
    }

    await expireOldActiveEvents();

    query.isDeleted = { $ne: true };
    query.visibilityStatus = { $ne: "HIDDEN" };
    query.moderationStatus = { $ne: "FLAGGED" };

    if (activeOnly) {
      query.status = { $in: PUBLIC_VISIBLE_STATUSES };
      query.endDate = { $gte: today };
  } else if (pastOnly) {
  query.status = { $in: ["COMPLETED"] };
} else if (status && status !== "ALL") {
      if (
        PUBLIC_VISIBLE_STATUSES.includes(
          status as (typeof PUBLIC_VISIBLE_STATUSES)[number]
        )
      ) {
        query.status = status;
      } else if (
        PAST_VISIBLE_STATUSES.includes(
          status as (typeof PAST_VISIBLE_STATUSES)[number]
        )
      ) {
        query.status = status;
      } else {
        query.status = { $in: PUBLIC_VISIBLE_STATUSES };
      }
    } else {
      query.status = { $in: PUBLIC_VISIBLE_STATUSES };
    }

    const sortOption: Record<string, 1 | -1> =
      activeOnly || !pastOnly ? { startDate: 1 } : { startDate: -1 };

    const events = await EventModel.find(query)
      .sort(sortOption)
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .populate("organizerId", "firstName lastName companyName");

    const total = await EventModel.countDocuments(query);
    const safeEvents = events.map((event) => sanitizeEventForPublicResponse(event));

    return buildNoStoreResponse(
      {
        success: true,
        sponsorView: true,
        events: safeEvents,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          pages: Math.ceil(total / safeLimit),
        },
      },
      200
    );
  } catch (error) {
    console.error("Error fetching events:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch events" },
      500
    );
  }
}