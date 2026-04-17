import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/models/Sponsorship";
import Sponsor from "@/models/Sponsor";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const status = searchParams.get("status") || "active";
    const q = searchParams.get("q");
    const sponsorOwnerId = searchParams.get("sponsorOwnerId");

    const page = Number(searchParams.get("page") || 1);
    const limit = Math.min(Number(searchParams.get("limit") || 12), 50);
    const skip = (page - 1) * limit;

    // 🔍 Build query
    const query: Record<string, any> = {
      status,
    };

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (location) {
      query.locationPreference = { $regex: location, $options: "i" };
    }

    if (q) {
      query.$or = [
        { sponsorshipTitle: { $regex: q, $options: "i" } },
        { campaignGoal: { $regex: q, $options: "i" } },
        { targetAudience: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ];
    }

    if (sponsorOwnerId) {
      query.sponsorOwnerId = sponsorOwnerId;
    }

    // 📦 Fetch sponsorships
    const [items, total] = await Promise.all([
      Sponsorship.find(query)
        .populate({
          path: "sponsorOwnerId",
          select: "name email",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sponsorship.countDocuments(query),
    ]);

    // 🔗 Fetch sponsor profiles
    const sponsorIds = items
      .map((item: any) => item.sponsorOwnerId?._id)
      .filter(Boolean);

    const sponsorProfiles = await Sponsor.find({
      userId: { $in: sponsorIds },
    })
      .select(
        "userId brandName companyName logoUrl website industry about"
      )
      .lean();

    const sponsorProfileMap = new Map(
      sponsorProfiles.map((profile: any) => [
        String(profile.userId),
        profile,
      ])
    );

    // 🔗 Attach sponsor profile to each sponsorship
    const sponsorships = items.map((item: any) => {
      const sponsorProfile = sponsorProfileMap.get(
        String(item.sponsorOwnerId?._id)
      );

      return {
        ...item,
        sponsorProfile: sponsorProfile || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: sponsorships,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get sponsorships error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sponsorships",
      },
      { status: 500 }
    );
  }
}
