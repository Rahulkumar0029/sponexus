import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { getCurrentUser } from "@/lib/current-user";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET() {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const user = await User.findById(currentUser._id)
      .select(
        "_id name email role adminRole accountStatus firstName lastName companyName avatar bio phone organizationName organizerLocation isEmailVerified isProfileComplete emailVerifiedAt emailVerificationValidUntil createdAt updatedAt isDeleted"
      )
      .lean();

    if (!user || user.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    const isVerificationExpired = Boolean(
      user.isEmailVerified &&
        user.emailVerificationValidUntil &&
        new Date(user.emailVerificationValidUntil).getTime() < Date.now()
    );

    let sponsorProfile = null;

    if (user.role === "SPONSOR") {
      sponsorProfile = await Sponsor.findOne({
        userId: user._id,
      }).lean();
    }

    return buildNoStoreResponse(
      {
        success: true,
        user: {
          ...user,
          isVerificationExpired,
        },
        sponsorProfile,
      },
      200
    );
  } catch (error) {
    console.error("Settings me error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to load settings" },
      500
    );
  }
}