import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsor ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    const publicSelect =
      "userId brandName companyName website industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt";

    const organizerSelect =
      "userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt";

    const ownerSelect = organizerSelect;

    // ------------------------------------------------------------
    // PUBLIC ACCESS
    // ------------------------------------------------------------
    if (!currentUser?._id) {
      const sponsor = await Sponsor.findOne({
        _id: id,
        isPublic: true,
        isProfileComplete: true,
      })
        .select(publicSelect)
        .lean();

      if (!sponsor) {
        return NextResponse.json(
          { success: false, message: "Sponsor not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          mode: "public_view",
          data: sponsor,
        },
        { status: 200 }
      );
    }

    const user = await User.findById(currentUser._id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // SPONSOR ACCESS: only own profile
    // ------------------------------------------------------------
    if (user.role === "SPONSOR") {
      const sponsor = await Sponsor.findOne({
        _id: id,
        userId: user._id,
      })
        .select(ownerSelect)
        .lean();

      if (!sponsor) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not allowed to view this sponsor profile",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          mode: "owner_view",
          data: sponsor,
        },
        { status: 200 }
      );
    }

    // ------------------------------------------------------------
    // ORGANIZER ACCESS
    // ------------------------------------------------------------
    if (user.role === "ORGANIZER") {
      const sponsor = await Sponsor.findOne({
        _id: id,
        isPublic: true,
        isProfileComplete: true,
      })
        .select(organizerSelect)
        .lean();

      if (!sponsor) {
        return NextResponse.json(
          { success: false, message: "Sponsor not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          mode: "organizer_view",
          data: sponsor,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unauthorized role" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error fetching sponsor:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch sponsor" },
      { status: 500 }
    );
  }
}