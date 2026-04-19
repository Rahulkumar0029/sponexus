import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// rest of file...

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      const response = NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );

      response.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
      });

      response.cookies.set("user-role", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
      });

      return response;
    }

    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName || "",
          avatar: user.avatar || "",
          bio: user.bio || "",
          phone: user.phone || "",
          organizationName: user.organizationName || "",
          eventFocus: user.eventFocus || "",
          organizerTargetAudience: user.organizerTargetAudience || "",
          organizerLocation: user.organizerLocation || "",
          isEmailVerified: user.isEmailVerified,
          isProfileComplete: user.isProfileComplete,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Me route error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}