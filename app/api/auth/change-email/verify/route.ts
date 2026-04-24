import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { generateAccessToken, hashToken } from "@/lib/auth";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const MAX_TOKEN_LENGTH = 512;

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Verification token is required" },
        400
      );
    }

    if (token.length > MAX_TOKEN_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid or expired verification token" },
        400
      );
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailChangeToken: hashedToken,
      emailChangeExpires: { $gt: new Date() },
      isDeleted: false,
    }).select(
      "_id email pendingEmail role adminRole firstName lastName name companyName avatar bio phone organizationName eventFocus organizerTargetAudience organizerLocation isEmailVerified isProfileComplete accountStatus createdAt updatedAt"
    );

    if (!user || !user.pendingEmail) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid or expired verification token" },
        400
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account access restricted" },
        403
      );
    }

    const existingUser = await User.findOne({
      email: user.pendingEmail,
      _id: { $ne: user._id },
      isDeleted: false,
    }).select("_id");

    if (existingUser) {
      return buildNoStoreResponse(
        { success: false, message: "This email is already in use" },
        409
      );
    }

    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setMonth(validUntil.getMonth() + 3);

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeExpires = null;
    user.isEmailVerified = true;
    user.emailVerifiedAt = now;
    user.emailVerificationValidUntil = validUntil;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.lastActiveAt = now;
    user.lastLoginAt = now;

    await user.save();

    const authToken = generateAccessToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
    });

    const response = buildNoStoreResponse(
      {
        success: true,
        message: "Email changed successfully",
        user: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          adminRole: user.adminRole || "NONE",
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
          isVerificationExpired: false,
          isProfileComplete: user.isProfileComplete,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      200
    );

    response.cookies.set("auth-token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });

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
    console.error("Change email verify error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to verify email change",
      },
      500
    );
  }
}