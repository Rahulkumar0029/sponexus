import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EventModel } from "@/lib/models/Event";
import { getCurrentUser } from "@/lib/current-user";

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
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query: Record<string, any> = {};

    // -------------------------
    // PUBLIC USER
    // -------------------------
    if (!currentUser) {
      query.status = { $in: ["PUBLISHED", "ONGOING"] };
      query.endDate = { $gte: today };

      const events = await EventModel.find(query)
        .sort({ startDate: 1 })
        .limit(4)
        .populate("organizerId", "firstName lastName companyName");

      return NextResponse.json(
        {
          success: true,
          preview: true,
          events,
          pagination: {
            total: events.length,
            page: 1,
            limit: 4,
            pages: 1,
          },
        },
        { status: 200 }
      );
    }

    // -------------------------
    // ORGANIZER USER
    // -------------------------
    if (currentUser.role === "ORGANIZER") {
      query.organizerId = currentUser._id;

      if (status && status !== "ALL" && !activeOnly && !pastOnly) {
        query.status = status;
      }

      if (activeOnly) {
        query.status = { $in: ["PUBLISHED", "ONGOING"] };
        query.endDate = { $gte: today };
      }

      if (pastOnly) {
        query.$or = [{ status: "COMPLETED" }, { endDate: { $lt: today } }];
      }

      const events = await EventModel.find(query)
        .sort({ startDate: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .populate("organizerId", "firstName lastName companyName");

      const total = await EventModel.countDocuments(query);

      return NextResponse.json(
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
        { status: 200 }
      );
    }

    // -------------------------
    // SPONSOR USER
    // -------------------------
    query.status = { $ne: "DRAFT" };

    if (status && status !== "ALL" && !activeOnly && !pastOnly) {
      query.status = status;
    }

    if (activeOnly) {
      query.status = { $in: ["PUBLISHED", "ONGOING"] };
      query.endDate = { $gte: today };
    }

    if (pastOnly) {
      query.$or = [{ status: "COMPLETED" }, { endDate: { $lt: today } }];
    }

    const sortOption: Record<string, 1 | -1> =
      activeOnly ? { startDate: 1 } : { startDate: -1 };

    const events = await EventModel.find(query)
      .sort(sortOption)
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .populate("organizerId", "firstName lastName companyName");

    const total = await EventModel.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        sponsorView: true,
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
    console.error("Error fetching events:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch events" },
      { status: 500 }
    );
  }
}