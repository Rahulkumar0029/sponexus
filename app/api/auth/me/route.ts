import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    priority: "high",
  });

  response.cookies.set("user-role", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    priority: "medium",
  });

  return response;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Unauthorized",
        },
        401
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload?.userId || !payload?.email) {
      const response = buildNoStoreResponse(
        {
          success: false,
          message: "Unauthorized",
        },
        401
      );

      return clearAuthCookies(response);
    }

    const user = await User.findById(payload.userId).select(
      "_id name email role adminRole accountStatus firstName lastName companyName avatar bio phone organizationName eventFocus organizerTargetAudience organizerLocation isEmailVerified isProfileComplete emailVerifiedAt emailVerificationValidUntil createdAt updatedAt isDeleted"
    );

    if (!user || user.isDeleted) {
      const response = buildNoStoreResponse(
        {
          success: false,
          message: "User not found",
        },
        404
      );

      return clearAuthCookies(response);
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      const response = buildNoStoreResponse(
        {
          success: false,
          message: "Account access restricted",
        },
        403
      );

      return clearAuthCookies(response);
    }

    let isVerificationExpired = false;

    if (
      user.isEmailVerified &&
      user.emailVerificationValidUntil &&
      new Date(user.emailVerificationValidUntil).getTime() < Date.now()
    ) {
      isVerificationExpired = true;
    }

    const response = buildNoStoreResponse(
      {
        success: true,
        user: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          adminRole: user.adminRole || "NONE",
          accountStatus: user.accountStatus || "ACTIVE",
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
          isVerificationExpired,
          emailVerifiedAt: user.emailVerifiedAt || null,
          emailVerificationValidUntil:
            user.emailVerificationValidUntil || null,
          isProfileComplete: user.isProfileComplete,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      200
    );

    response.cookies.set("user-role", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "medium",
    });

    return response;
  } catch (error) {
    console.error("Me route error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch user",
      },
      500
    );
  }
}