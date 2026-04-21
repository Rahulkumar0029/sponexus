import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
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
        "-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires -emailVerificationExpires"
      )
      .lean();

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    let sponsorProfile = null;

    if (user.role === "SPONSOR") {
      sponsorProfile = await Sponsor.findOne({
        userId: user._id,
      })
        .select(
          "-officialEmail -phone"
        )
        .lean();
    }

    return buildNoStoreResponse(
      {
        success: true,
        user,
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