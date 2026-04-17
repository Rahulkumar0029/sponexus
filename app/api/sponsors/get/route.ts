import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Sponsor from "@/models/Sponsor";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const industry = searchParams.get("industry");
    const location = searchParams.get("location");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit =
      Number.isNaN(limit) || limit < 1 ? 12 : Math.min(limit, 50);

    const query: Record<string, any> = {
      isPublic: true,
      isProfileComplete: true,
    };

    if (industry) {
      query.industry = { $regex: industry, $options: "i" };
    }

    if (location) {
      query.preferredLocations = { $elemMatch: { $regex: location, $options: "i" } };
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
      .select(
        "userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests isProfileComplete isPublic createdAt updatedAt"
      );

    const total = await Sponsor.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
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