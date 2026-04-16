import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Sponsor from "@/models/Sponsor";
import { authOptions } from "@/lib/nextAuthOptions";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findOne({
      email: session.user.email,
    }).lean();

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