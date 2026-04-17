import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findById(currentUser._id)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let sponsorProfile = null;

    if (user.role === "SPONSOR") {
      sponsorProfile = await Sponsor.findOne({
        userId: user._id,
      }).lean();
    }

    return NextResponse.json(
      {
        success: true,
        user,
        sponsorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings me error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load settings" },
      { status: 500 }
    );
  }
}