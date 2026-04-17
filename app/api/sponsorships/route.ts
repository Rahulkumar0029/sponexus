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
    const status = searchParams.get("status") || "ACTIVE";
    const q = searchParams.get("q");
    const page = Number(searchParams.get("page") || 1);
    const limit = Math.min(Number(searchParams.get("limit") || 12), 50);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      isPublic: true,
      status,
    };

    if (category) {
      query.categories = { $in: [category] };
    }

    if (location) {
      query.preferredLocations = { $in: [location] };
    }

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { categories: { $elemMatch: { $regex: q, $options: "i" } } },
      ];
    }

    const [items, total] = await Promise.all([
      Sponsorship.find(query)
        .populate({
          path: "sponsorId",
          select: "name email",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Sponsorship.countDocuments(query),
    ]);

    // 🔥 Get sponsor profiles
    const sponsorIds = items
      .map((item: any) => item.sponsorId?._id)
      .filter(Boolean);

    const sponsorProfiles = await Sponsor.find({
      userId: { $in: sponsorIds },
    })
      .select("userId companyName logoUrl website industry")
      .lean();

    const sponsorMap = new Map(
      sponsorProfiles.map((s: any) => [String(s.userId), s])
    );

    const sponsorships = items.map((item: any) => {
      const sponsorProfile = sponsorMap.get(
        String(item.sponsorId?._id)
      );

      return {
        ...item,
        sponsorProfile: sponsorProfile || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        sponsorships,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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