import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const status = searchParams.get("status") || "active";
    const q = searchParams.get("q");

    const rawPage = Number(searchParams.get("page") || 1);
    const rawLimit = Number(searchParams.get("limit") || 12);

    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit =
      Number.isNaN(rawLimit) || rawLimit < 1 ? 12 : Math.min(rawLimit, 50);

    const buildBaseQuery = () => {
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

      return query;
    };

    const sponsorProfileSelect =
      "userId brandName companyName logoUrl website industry about";

    // ------------------------------------------------------------
    // PUBLIC: preview only
    // ------------------------------------------------------------
    if (!currentUser?._id) {
      const limit = Math.min(requestedLimit, 4);
      const skip = (page - 1) * limit;

      const visibleSponsorProfiles = await Sponsor.find({
        isPublic: true,
        isProfileComplete: true,
      })
        .select("_id userId brandName companyName logoUrl website industry about")
        .lean();

      const visibleSponsorProfileIds = visibleSponsorProfiles.map(
        (profile: any) => profile._id
      );

      const query: Record<string, any> = {
        ...buildBaseQuery(),
        sponsorProfileId: { $in: visibleSponsorProfileIds },
      };

      const [items, total] = await Promise.all([
        Sponsorship.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Sponsorship.countDocuments(query),
      ]);

      const sponsorProfileMap = new Map(
        visibleSponsorProfiles.map((profile: any) => [String(profile._id), profile])
      );

      const sponsorships = items.map((item: any) => ({
        ...item,
        sponsorProfile:
          sponsorProfileMap.get(String(item.sponsorProfileId)) || null,
      }));

      return NextResponse.json(
        {
          success: true,
          mode: "public_preview",
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
    }

    const user = await User.findById(currentUser._id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // SPONSOR: own sponsorship posts only
    // ------------------------------------------------------------
    if (user.role === "SPONSOR") {
      const limit = requestedLimit;
      const skip = (page - 1) * limit;

      const query: Record<string, any> = {
        ...buildBaseQuery(),
        sponsorOwnerId: user._id,
      };

      const [items, total, sponsorProfile] = await Promise.all([
        Sponsorship.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Sponsorship.countDocuments(query),
        Sponsor.findOne({ userId: user._id })
          .select(
            "userId brandName companyName logoUrl website industry about officialEmail phone isPublic isProfileComplete"
          )
          .lean(),
      ]);

      const sponsorships = items.map((item: any) => ({
        ...item,
        sponsorProfile: sponsorProfile || null,
      }));

      return NextResponse.json(
        {
          success: true,
          mode: "own_sponsorships",
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
    }

    // ------------------------------------------------------------
    // ORGANIZER: browse sponsorship opportunities
    // ------------------------------------------------------------
    if (user.role === "ORGANIZER") {
      const limit = requestedLimit;
      const skip = (page - 1) * limit;

      const visibleSponsorProfiles = await Sponsor.find({
        isPublic: true,
        isProfileComplete: true,
      })
        .select(`_id ${sponsorProfileSelect}`)
        .lean();

      const visibleSponsorProfileIds = visibleSponsorProfiles.map(
        (profile: any) => profile._id
      );

      const query: Record<string, any> = {
        ...buildBaseQuery(),
        sponsorProfileId: { $in: visibleSponsorProfileIds },
      };

      const [items, total] = await Promise.all([
        Sponsorship.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Sponsorship.countDocuments(query),
      ]);

      const sponsorProfileMap = new Map(
        visibleSponsorProfiles.map((profile: any) => [String(profile._id), profile])
      );

      const sponsorships = items.map((item: any) => ({
        ...item,
        sponsorProfile:
          sponsorProfileMap.get(String(item.sponsorProfileId)) || null,
      }));

      return NextResponse.json(
        {
          success: true,
          mode: "organizer_browse",
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
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized role",
      },
      { status: 403 }
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