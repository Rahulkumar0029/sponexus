export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { EventModel } from "@/lib/models/Event";

export async function GET() {
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

    const events = await EventModel.find({
      organizerId: currentUser._id,
      status: { $in: ["PUBLISHED", "ONGOING"] },
    })
      .select("_id title location startDate")
      .sort({ startDate: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        events,
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