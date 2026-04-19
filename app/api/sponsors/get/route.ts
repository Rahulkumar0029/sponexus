import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const industry = searchParams.get("industry");
    const location = searchParams.get("location");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const requestedLimit =
      Number.isNaN(limit) || limit < 1 ? 12 : Math.min(limit, 50);

    // Public-safe listing fields only
    const sponsorListSelect =
      "userId brandName companyName website industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests isProfileComplete isPublic createdAt updatedAt";

    // ------------------------------------------------------------
    // PUBLIC: preview only
    // ------------------------------------------------------------
    if (!currentUser?._id) {
      const safeLimit = Math.min(requestedLimit, 4);

      const query: Record<string, any> = {
        isPublic: true,
        isProfileComplete: true,
      };

      if (industry) {
        query.industry = { $regex: industry, $options: "i" };
      }

      if (location) {
        query.preferredLocations = {
          $elemMatch: { $regex: location, $options: "i" },
        };
      }

      if (category) {
        query.preferredCategories = {
          $elemMatch: { $regex: category, $options: "i" },
        };
      }

      if (search) {
        query.$or = [
          { brandName: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { industry: { $regex: search, $options: "i" } },
          { about: { $regex: search, $options: "i" } },
        ];
      }

      const sponsors = await Sponsor.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .select(sponsorListSelect)
        .lean();

      const total = await Sponsor.countDocuments(query);

      return NextResponse.json(
        {
          success: true,
          mode: "public_preview",
          sponsors,
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

    const user = await User.findById(currentUser._id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // SPONSOR: own profile only
    // ------------------------------------------------------------
    if (user.role === "SPONSOR") {
      const sponsor = await Sponsor.findOne({ userId: user._id })
        .select(
          "userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt"
        )
        .lean();

      return NextResponse.json(
        {
          success: true,
          mode: "own_profile",
          sponsors: sponsor ? [sponsor] : [],
          pagination: {
            total: sponsor ? 1 : 0,
            page: 1,
            limit: 1,
            pages: sponsor ? 1 : 0,
          },
        },
        { status: 200 }
      );
    }

    // ------------------------------------------------------------
    // ORGANIZER: browse sponsor profiles
    // ------------------------------------------------------------
    if (user.role === "ORGANIZER") {
      const safeLimit = requestedLimit;

      const query: Record<string, any> = {
        isPublic: true,
        isProfileComplete: true,
      };

      if (industry) {
        query.industry = { $regex: industry, $options: "i" };
      }

      if (location) {
        query.preferredLocations = {
          $elemMatch: { $regex: location, $options: "i" },
        };
      }

      if (category) {
        query.preferredCategories = {
          $elemMatch: { $regex: category, $options: "i" },
        };
      }

      if (search) {
        query.$or = [
          { brandName: { $regex: search, $options: "i" } },
          { companyName: { $regex: search, $options: "i" } },
          { industry: { $regex: search, $options: "i" } },
          { about: { $regex: search, $options: "i" } },
        ];
      }

      const sponsors = await Sponsor.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .select(sponsorListSelect)
        .lean();

      const total = await Sponsor.countDocuments(query);

      return NextResponse.json(
        {
          success: true,
          mode: "organizer_browse",
          sponsors,
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

    return NextResponse.json(
      { success: false, message: "Unauthorized role" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error fetching sponsors:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sponsors",
      },
      { status: 500 }
    );
  }
}