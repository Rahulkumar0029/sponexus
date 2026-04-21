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

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ORGANIZER") {
      return NextResponse.json(
        { success: false, message: "Only organizers can access their events" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

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

    const events = await EventModel.find(query)
      .select(
        "_id title description location startDate endDate status budget attendeeCount createdAt updatedAt coverImage"
      )
      .sort({ updatedAt: -1, startDate: 1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean();

    const total = await EventModel.countDocuments(query);

    return NextResponse.json(
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
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/events/my error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch organizer events" },
      { status: 500 }
    );
  }
}