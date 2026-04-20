import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import Sponsorship from "@/lib/models/Sponsorship";
import { DealModel } from "@/lib/models/Deal";

export const dynamic = "force-dynamic";

function sanitizeDealContactsForResponse(deal: any) {
  const plainDeal =
    typeof deal?.toObject === "function" ? deal.toObject() : { ...deal };

  const fullyRevealed = Boolean(plainDeal?.contactReveal?.fullyRevealed);

  if (!fullyRevealed) {
    if (plainDeal?.organizerId) {
      plainDeal.organizerId.email = undefined;
      plainDeal.organizerId.phone = undefined;
    }

    if (plainDeal?.sponsorId) {
      plainDeal.sponsorId.email = undefined;
      plainDeal.sponsorId.phone = undefined;
    }
  }

  return plainDeal;
}

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
      "_id firstName lastName name email role companyName"
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Only sponsors can access this dashboard" },
        { status: 403 }
      );
    }

    const sponsorProfile = await Sponsor.findOne({ userId: user._id })
      .select(
        "_id userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests isProfileComplete isPublic"
      )
      .lean();

    const [
      totalSponsorshipPosts,
      activeSponsorshipPosts,
      pausedSponsorshipPosts,
      closedSponsorshipPosts,
      totalDeals,
      pendingDeals,
      negotiatingDeals,
      acceptedDeals,
      completedDeals,
      recentSponsorships,
      recentDealsRaw,
    ] = await Promise.all([
      Sponsorship.countDocuments({ sponsorOwnerId: user._id }),
      Sponsorship.countDocuments({
        sponsorOwnerId: user._id,
        status: "active",
      }),
      Sponsorship.countDocuments({
        sponsorOwnerId: user._id,
        status: "paused",
      }),
      Sponsorship.countDocuments({
        sponsorOwnerId: user._id,
        status: "closed",
      }),
      DealModel.countDocuments({ sponsorId: user._id }),
      DealModel.countDocuments({
        sponsorId: user._id,
        status: "pending",
      }),
      DealModel.countDocuments({
        sponsorId: user._id,
        status: "negotiating",
      }),
      DealModel.countDocuments({
        sponsorId: user._id,
        status: "accepted",
      }),
      DealModel.countDocuments({
        sponsorId: user._id,
        status: "completed",
      }),
      Sponsorship.find({ sponsorOwnerId: user._id })
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),
      DealModel.find({ sponsorId: user._id })
        .populate("organizerId", "_id name email phone companyName")
        .populate("sponsorId", "_id name email phone companyName")
        .populate("eventId", "_id title location startDate")
        .sort({ updatedAt: -1 })
        .limit(6),
    ]);

    const recentDeals = Array.isArray(recentDealsRaw)
      ? recentDealsRaw.map((deal) => sanitizeDealContactsForResponse(deal))
      : [];

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalSponsorshipPosts,
          activeSponsorshipPosts,
          pausedSponsorshipPosts,
          closedSponsorshipPosts,
          totalDeals,
          pendingDeals,
          negotiatingDeals,
          acceptedDeals,
          completedDeals,
        },
        sponsorProfile: sponsorProfile || null,
        recentSponsorships,
        recentDeals,
        user: {
          _id: String(user._id),
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          name: user.name || "",
          email: user.email || "",
          companyName: user.companyName || "",
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/dashboard/sponsor error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load sponsor dashboard" },
      { status: 500 }
    );
  }
}