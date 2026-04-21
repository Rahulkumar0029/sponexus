import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

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

function sanitizeOwnerSponsor(profile: any) {
  if (!profile) return profile;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.userId = undefined;

  return plain;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid sponsor ID" },
        400
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    const publicSelect =
      "userId brandName companyName website industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt";

    const organizerSelect =
      "userId brandName companyName website officialEmail phone industry companySize about logoUrl targetAudience preferredCategories preferredLocations sponsorshipInterests instagramUrl linkedinUrl isProfileComplete isPublic createdAt updatedAt";

    const ownerSelect = organizerSelect;

    if (!currentUser?._id) {
      const sponsor = await Sponsor.findOne({
        _id: id,
        isPublic: true,
        isProfileComplete: true,
      })
        .select(publicSelect)
        .lean();

      if (!sponsor) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsor not found" },
          404
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "public_view",
          data: sanitizePublicSponsor(sponsor),
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
      const sponsor = await Sponsor.findOne({
        _id: id,
        userId: user._id,
      })
        .select(ownerSelect)
        .lean();

      if (!sponsor) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "You are not allowed to view this sponsor profile",
          },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "owner_view",
          data: sanitizeOwnerSponsor(sponsor),
        },
        200
      );
    }

    if (user.role === "ORGANIZER") {
      const sponsor = await Sponsor.findOne({
        _id: id,
        isPublic: true,
        isProfileComplete: true,
      })
        .select(organizerSelect)
        .lean();

      if (!sponsor) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsor not found" },
          404
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "organizer_view",
          data: sanitizePublicSponsor(sponsor),
        },
        200
      );
    }

    return buildNoStoreResponse(
      { success: false, message: "Unauthorized role" },
      403
    );
  } catch (error) {
    console.error("Error fetching sponsor:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch sponsor" },
      500
    );
  }
}