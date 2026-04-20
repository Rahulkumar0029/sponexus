import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Access unavailable",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email,
      isDeleted: false,
    }).select("email adminRole accountStatus");

    const isAllowedAdmin =
      !!user &&
      user.adminRole &&
      user.adminRole !== "NONE" &&
      user.accountStatus === "ACTIVE";

    if (!isAllowedAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Access unavailable",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Access check passed",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin email check error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Access unavailable",
      },
      { status: 500 }
    );
  }
}