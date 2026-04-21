import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

const PUBLIC_VISIBLE_STATUS = "active";

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

function sanitizePublicSponsorProfile(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.officialEmail = undefined;
  plain.phone = undefined;
  plain.userId = undefined;

  return plain;
}

function sanitizeOwnerSponsorProfile(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.userId = undefined;

  return plain;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid sponsorship ID" },
        400
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    const sponsorship = await Sponsorship.findById(id).lean();

    if (!sponsorship) {
      return buildNoStoreResponse(
        { success: false, message: "Sponsorship not found" },
        404
      );
    }

    const sponsorProfile = await Sponsor.findById(
      sponsorship.sponsorProfileId
    ).lean();

    const isPubliclyVisible =
      sponsorship.status === PUBLIC_VISIBLE_STATUS &&
      !!sponsorProfile?.isPublic &&
      !!sponsorProfile?.isProfileComplete;

    if (!currentUser?._id) {
      if (!isPubliclyVisible) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsorship not available" },
          404
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "public_view",
          data: {
            ...sponsorship,
            sponsorProfile: sanitizePublicSponsorProfile(sponsorProfile),
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
      if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
        return buildNoStoreResponse(
          { success: false, message: "Access denied" },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "owner_view",
          data: {
            ...sponsorship,
            sponsorProfile: sanitizeOwnerSponsorProfile(sponsorProfile),
          },
        },
        200
      );
    }

    if (user.role === "ORGANIZER") {
      if (!isPubliclyVisible) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsorship not available" },
          404
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "organizer_view",
          data: {
            ...sponsorship,
            sponsorProfile: sanitizePublicSponsorProfile(sponsorProfile),
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
    console.error("Error fetching sponsorship:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch sponsorship" },
      500
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid ID" },
        400
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const user = await User.findById(currentUser._id).select("_id role");

    if (!user || user.role !== "SPONSOR") {
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        403
      );
    }

    const sponsorship = await Sponsorship.findById(id);

    if (!sponsorship) {
      return buildNoStoreResponse(
        { success: false, message: "Not found" },
        404
      );
    }

    if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
      return buildNoStoreResponse(
        { success: false, message: "Access denied" },
        403
      );
    }

    sponsorship.status = "closed";
    sponsorship.expiresAt = new Date();
    await sponsorship.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Sponsorship deleted successfully",
      },
      200
    );
  } catch (error) {
    console.error("Delete sponsorship error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to delete sponsorship" },
      500
    );
  }
}