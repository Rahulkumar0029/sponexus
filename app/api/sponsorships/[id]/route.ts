import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

// ------------------------------------------------------------
// GET: Fetch single sponsorship
// ------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsorship ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    const sponsorship = await Sponsorship.findById(id).lean();

    if (!sponsorship) {
      return NextResponse.json(
        { success: false, message: "Sponsorship not found" },
        { status: 404 }
      );
    }

    const sponsorProfile = await Sponsor.findById(
      sponsorship.sponsorProfileId
    ).lean();

    // ------------------------------------------------------------
    // PUBLIC
    // ------------------------------------------------------------
    if (!currentUser?._id) {
      if (
        sponsorship.status !== "active" ||
        !sponsorProfile?.isPublic ||
        !sponsorProfile?.isProfileComplete
      ) {
        return NextResponse.json(
          { success: false, message: "Sponsorship not available" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          mode: "public_view",
          data: {
            ...sponsorship,
            sponsorProfile,
          },
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
    // SPONSOR (owner only)
    // ------------------------------------------------------------
    if (user.role === "SPONSOR") {
      if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
        return NextResponse.json(
          { success: false, message: "Access denied" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          mode: "owner_view",
          data: {
            ...sponsorship,
            sponsorProfile,
          },
        },
        { status: 200 }
      );
    }

    // ------------------------------------------------------------
    // ORGANIZER
    // ------------------------------------------------------------
    if (user.role === "ORGANIZER") {
      if (
        sponsorship.status !== "active" ||
        !sponsorProfile?.isPublic ||
        !sponsorProfile?.isProfileComplete
      ) {
        return NextResponse.json(
          { success: false, message: "Sponsorship not available" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          mode: "organizer_view",
          data: {
            ...sponsorship,
            sponsorProfile,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unauthorized role" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error fetching sponsorship:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch sponsorship" },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// DELETE: Sponsor deletes own sponsorship
// ------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findById(currentUser._id);

    if (!user || user.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const sponsorship = await Sponsorship.findById(id);

    if (!sponsorship) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    await sponsorship.deleteOne();

    return NextResponse.json(
      {
        success: true,
        message: "Sponsorship deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete sponsorship error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete sponsorship" },
      { status: 500 }
    );
  }
}