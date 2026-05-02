import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

const PUBLIC_VISIBLE_STATUS = "active";
const OWNER_ALLOWED_STATUSES = ["active", "paused", "closed", "expired"] as const;
const MAX_LIMIT = 50;
const PREVIEW_LIMIT = 4;
const MAX_FILTER_LENGTH = 100;
const MAX_QUERY_LENGTH = 120;

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

function sanitizePublicSponsorProfile(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.officialEmail = undefined;
  plain.phone = undefined;
  plain.userId = undefined;

  return plain;
}

function sanitizeOwnSponsorProfile(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.userId = undefined;

  return plain;
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function expireOldActiveSponsorships(ownerId?: unknown) {
  const todayStart = getTodayStart();

  const query: Record<string, any> = {
    status: "active",
    expiresAt: { $lt: todayStart },
  };

  if (ownerId) {
    query.sponsorOwnerId = ownerId;
  }

  await Sponsorship.updateMany(query, {
    $set: {
      status: "expired",
    },
  });
}
export async function GET(req: NextRequest) {
  try {
   await connectDB();

const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const category = clean(searchParams.get("category"));
    const location = clean(searchParams.get("location"));
    const status = clean(searchParams.get("status"));
    const q = clean(searchParams.get("q"));

    const rawPage = Number(searchParams.get("page") || 1);
    const rawLimit = Number(searchParams.get("limit") || 12);

    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit =
      Number.isNaN(rawLimit) || rawLimit < 1
        ? 12
        : Math.min(rawLimit, MAX_LIMIT);

    if (category.length > MAX_FILTER_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Category filter is too long" },
        400
      );
    }

    if (location.length > MAX_FILTER_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Location filter is too long" },
        400
      );
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Search query is too long" },
        400
      );
    }

    const safeCategory = escapeRegex(category);
    const safeLocation = escapeRegex(location);
    const safeQ = escapeRegex(q);

const buildBaseQuery = (allowedStatus?: string) => {
  const query: Record<string, any> = {};
  const andConditions: Record<string, any>[] = [];

  const todayStart = getTodayStart();

  if (allowedStatus === "active") {
    query.status = "active";
    andConditions.push({
      $or: [
        { expiresAt: null },
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: todayStart } },
      ],
    });
  } else if (allowedStatus) {
    query.status = allowedStatus;
  }

  if (safeCategory) {
    query.category = { $regex: safeCategory, $options: "i" };
  }

  if (safeLocation) {
    query.locationPreference = { $regex: safeLocation, $options: "i" };
  }

  if (safeQ) {
    andConditions.push({
      $or: [
        { sponsorshipTitle: { $regex: safeQ, $options: "i" } },
        { campaignGoal: { $regex: safeQ, $options: "i" } },
        { targetAudience: { $regex: safeQ, $options: "i" } },
        { category: { $regex: safeQ, $options: "i" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
};

    const sponsorProfileSelect =
      "brandName companyName logoUrl website industry about";

    if (!currentUser?._id) {
  await expireOldActiveSponsorships();

  const limit = Math.min(requestedLimit, PREVIEW_LIMIT);
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
        ...buildBaseQuery(PUBLIC_VISIBLE_STATUS),
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
        visibleSponsorProfiles.map((profile: any) => [
          String(profile._id),
          sanitizePublicSponsorProfile(profile),
        ])
      );

      const sponsorships = items.map((item: any) => ({
        ...item,
        sponsorProfile:
          sponsorProfileMap.get(String(item.sponsorProfileId)) || null,
      }));

      return buildNoStoreResponse(
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
  await expireOldActiveSponsorships(user._id);

  const limit = requestedLimit;
  const skip = (page - 1) * limit;

      const query: Record<string, any> = {
        sponsorOwnerId: user._id,
      };

      if (
  status &&
  status !== "ALL" &&
  OWNER_ALLOWED_STATUSES.includes(
    status as (typeof OWNER_ALLOWED_STATUSES)[number]
  )
) {
  query.status = status;
}

      if (safeCategory) {
        query.category = { $regex: safeCategory, $options: "i" };
      }

      if (safeLocation) {
        query.locationPreference = { $regex: safeLocation, $options: "i" };
      }

      if (safeQ) {
        query.$or = [
          { sponsorshipTitle: { $regex: safeQ, $options: "i" } },
          { campaignGoal: { $regex: safeQ, $options: "i" } },
          { targetAudience: { $regex: safeQ, $options: "i" } },
          { category: { $regex: safeQ, $options: "i" } },
        ];
      }

      const [items, total, sponsorProfile] = await Promise.all([
        Sponsorship.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Sponsorship.countDocuments(query),
        Sponsor.findOne({ userId: user._id })
          .select(
            "brandName companyName logoUrl website industry about officialEmail phone isPublic isProfileComplete"
          )
          .lean(),
      ]);

      const safeSponsorProfile = sanitizeOwnSponsorProfile(sponsorProfile);

      const sponsorships = items.map((item: any) => ({
        ...item,
        sponsorProfile: safeSponsorProfile || null,
      }));

      return buildNoStoreResponse(
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
        200
      );
    }

    if (user.role === "ORGANIZER") {
  await expireOldActiveSponsorships();

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
        ...buildBaseQuery(PUBLIC_VISIBLE_STATUS),
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
        visibleSponsorProfiles.map((profile: any) => [
          String(profile._id),
          sanitizePublicSponsorProfile(profile),
        ])
      );

      const sponsorships = items.map((item: any) => ({
        ...item,
        sponsorProfile:
          sponsorProfileMap.get(String(item.sponsorProfileId)) || null,
      }));

      return buildNoStoreResponse(
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
        200
      );
    }

    return buildNoStoreResponse(
      {
        success: false,
        message: "Unauthorized role",
      },
      403
    );
  } catch (error) {
    console.error("Get sponsorships error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch sponsorships",
      },
      500
    );
  }
}