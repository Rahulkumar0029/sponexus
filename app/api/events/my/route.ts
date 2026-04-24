export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { EventModel } from "@/lib/models/Event";

const ALLOWED_OWNER_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return buildNoStoreResponse(
        { success: false, message: "Only organizers can access their events" },
        403
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit =
      Number.isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 50);

    const query: Record<string, any> = {
      organizerId: currentUser._id,
    };

    if (
      status &&
      status !== "ALL" &&
      ALLOWED_OWNER_STATUSES.includes(
        status as (typeof ALLOWED_OWNER_STATUSES)[number]
      )
    ) {
      query.status = status;
    }

    const [events, total] = await Promise.all([
      EventModel.find(query)
        .select(
          "_id title description location startDate endDate status budget attendeeCount createdAt updatedAt coverImage"
        )
        .sort({ updatedAt: -1, startDate: 1, createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      EventModel.countDocuments(query),
    ]);

    return buildNoStoreResponse(
      {
        success: true,
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
  } catch (error) {
    console.error("GET /api/events/my error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch organizer events" },
      500
    );
  }
}