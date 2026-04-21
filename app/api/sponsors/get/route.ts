import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;
const PREVIEW_LIMIT = 4;
const MAX_FILTER_LENGTH = 100;
const MAX_SEARCH_LENGTH = 120;

function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizePublicSponsor(profile: any) {
  if (!profile) return profile;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.userId = undefined;
  plain.officialEmail = undefined;
  plain.phone = undefined;
  plain.instagramUrl = undefined;
  plain.linkedinUrl = undefined;

  return plain;
}

function sanitizeOwnSponsor(profile: any) {
  if (!profile) return profile;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.userId = undefined;

  return plain;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const industry = clean(searchParams.get("industry"));
    const location = clean(searchParams.get("location"));
    const category = clean(searchParams.get("category"));
    const search = clean(searchParams.get("search"));

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const requestedLimit =
      Number.isNaN(limit) || limit < 1 ? 12 : Math.min(limit, MAX_LIMIT);

    if (industry.length > MAX_FILTER_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Industry filter is too long" },
        400
      );
    }

    if (location.length > MAX_FILTER_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Location filter is too long" },
        400
      );
    }

    if (category.length > MAX_FILTER_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Category filter is too long" },
        400
      );
    }

    if (search.length > MAX_SEARCH_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Search query is too long" },
        400
      );
    }

    const safeIndustry = escapeRegex(industry);
    const safeLocation = escapeRegex(location);
    const safeCategory = escapeRegex(category);
    const safeSearch = escapeRegex(search);

    const sponsorListSelect =
      "userId brandName companyName website industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests isProfileComplete isPublic createdAt updatedAt officialEmail phone instagramUrl linkedinUrl";

    if (!currentUser?._id) {
      const safeLimit = Math.min(requestedLimit, PREVIEW_LIMIT);

      const query: Record<string, any> = {
        isPublic: true,
        isProfileComplete: true,
      };

      if (safeIndustry) {
        query.industry = { $regex: safeIndustry, $options: "i" };
      }

      if (safeLocation) {
        query.preferredLocations = {
          $elemMatch: { $regex: safeLocation, $options: "i" },
        };
      }

      if (safeCategory) {
        query.preferredCategories = {
          $elemMatch: { $regex: safeCategory, $options: "i" },
        };
      }

      if (safeSearch) {
        query.$or = [
          { brandName: { $regex: safeSearch, $options: "i" } },
          { companyName: { $regex: safeSearch, $options: "i" } },
          { industry: { $regex: safeSearch, $options: "i" } },
          { about: { $regex: safeSearch, $options: "i" } },
        ];
      }

      const sponsors = await Sponsor.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .select(sponsorListSelect)
        .lean();

      const total = await Sponsor.countDocuments(query);

      const safeSponsors = sponsors.map((sponsor: any) =>
        sanitizePublicSponsor(sponsor)
      );

      return buildNoStoreResponse(
        {
          success: true,
          mode: "public_preview",
          sponsors: safeSponsors,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
          },
        },
        200
      );
    }

    const user = await User.findById(currentUser._id).select("_id role");

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    if (user.role === "SPONSOR") {
      const sponsor = await Sponsor.findOne({ userId: user._id })
        .select(
          "userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt"
        )
        .lean();

      return buildNoStoreResponse(
        {
          success: true,
          mode: "own_profile",
          sponsors: sponsor ? [sanitizeOwnSponsor(sponsor)] : [],
          pagination: {
            total: sponsor ? 1 : 0,
            page: 1,
            limit: 1,
            pages: sponsor ? 1 : 0,
          },
        },
        200
      );
    }

    if (user.role === "ORGANIZER") {
      const safeLimit = requestedLimit;

      const query: Record<string, any> = {
        isPublic: true,
        isProfileComplete: true,
      };

      if (safeIndustry) {
        query.industry = { $regex: safeIndustry, $options: "i" };
      }

      if (safeLocation) {
        query.preferredLocations = {
          $elemMatch: { $regex: safeLocation, $options: "i" },
        };
      }

      if (safeCategory) {
        query.preferredCategories = {
          $elemMatch: { $regex: safeCategory, $options: "i" },
        };
      }

      if (safeSearch) {
        query.$or = [
          { brandName: { $regex: safeSearch, $options: "i" } },
          { companyName: { $regex: safeSearch, $options: "i" } },
          { industry: { $regex: safeSearch, $options: "i" } },
          { about: { $regex: safeSearch, $options: "i" } },
        ];
      }

      const sponsors = await Sponsor.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .select(sponsorListSelect)
        .lean();

      const total = await Sponsor.countDocuments(query);

      const safeSponsors = sponsors.map((sponsor: any) =>
        sanitizePublicSponsor(sponsor)
      );

      return buildNoStoreResponse(
        {
          success: true,
          mode: "organizer_browse",
          sponsors: safeSponsors,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
          },
        },
        200
      );
    }

    return buildNoStoreResponse(
      { success: false, message: "Unauthorized role" },
      403
    );
  } catch (error) {
    console.error("Error fetching sponsors:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch sponsors",
      },
      500
    );
  }
}