import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import User from "@/lib/models/User";
import { EventModel } from "@/lib/models/Event";
import { DealModel } from "@/lib/models/Deal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findById(currentUser._id).select(
      "_id firstName lastName name email role organizationName companyName"
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "ORGANIZER") {
      return NextResponse.json(
        { success: false, message: "Only organizers can access this dashboard" },
        { status: 403 }
      );
    }

    const organizerId = user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEvents,
      draftEvents,
      activeEvents,
      pastEvents,
      totalDeals,
      pendingDeals,
      negotiatingDeals,
      acceptedDeals,
      completedDeals,
      recentEvents,
      recentDeals,
    ] = await Promise.all([
      EventModel.countDocuments({
        organizerId,
      }),

      EventModel.countDocuments({
        organizerId,
        status: "DRAFT",
      }),

      EventModel.countDocuments({
        organizerId,
        status: { $in: ["PUBLISHED", "ONGOING"] },
        endDate: { $gte: today },
      }),

      EventModel.countDocuments({
        organizerId,
        $or: [{ status: "COMPLETED" }, { status: "CANCELLED" }, { endDate: { $lt: today } }],
      }),

      DealModel.countDocuments({
        organizerId,
      }),

      DealModel.countDocuments({
        organizerId,
        status: "pending",
      }),

      DealModel.countDocuments({
        organizerId,
        status: "negotiating",
      }),

      DealModel.countDocuments({
        organizerId,
        status: "accepted",
      }),

      DealModel.countDocuments({
        organizerId,
        status: "completed",
      }),

      EventModel.find({
        organizerId,
      })
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate("organizerId", "firstName lastName companyName")
        .lean(),

      DealModel.find({
        organizerId,
      })
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate("organizerId", "_id name email phone companyName")
        .populate("sponsorId", "_id name email phone companyName")
        .populate("eventId", "_id title location startDate")
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalEvents,
          draftEvents,
          activeEvents,
          pastEvents,
          totalDeals,
          pendingDeals,
          negotiatingDeals,
          acceptedDeals,
          completedDeals,
        },
        recentEvents,
        recentDeals,
        user: {
          _id: String(user._id),
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          name: user.name || "",
          email: user.email || "",
          organizationName: user.organizationName || "",
          companyName: user.companyName || "",
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/dashboard/organizer error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load organizer dashboard" },
      { status: 500 }
    );
  }
}