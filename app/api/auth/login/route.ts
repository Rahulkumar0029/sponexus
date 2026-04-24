import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { comparePasswords, generateAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 200;

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

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return buildNoStoreResponse(
        { success: false, message: "Email and password are required" },
        400
      );
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Email is too long" },
        400
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Password is too long" },
        400
      );
    }

    const user = await User.findOne({ email, isDeleted: false }).select(
      "+password failedLoginAttempts lockUntil accountStatus adminRole role email name firstName lastName companyName avatar bio phone organizationName eventFocus organizerTargetAudience organizerLocation isEmailVerified isProfileComplete createdAt updatedAt lastLoginAt lastActiveAt emailVerificationValidUntil emailVerifiedAt"
    );

    if (!user || !user.password) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid credentials" },
        401
      );
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Account temporarily locked. Please try again later.",
        },
        423
      );
    }

    if (user.accountStatus === "DISABLED") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "This account has been disabled. Please contact support.",
        },
        403
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "This account has been suspended. Please contact support.",
        },
        403
      );
    }

    if (user.accountStatus === "PENDING_REVIEW") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Your account is under review. Please try again later.",
        },
        403
      );
    }

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.failedLoginAttempts = 0;
      }

      await user.save();

      return buildNoStoreResponse(
        { success: false, message: "Invalid credentials" },
        401
      );
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

    let isVerificationExpired = false;

    if (
      user.isEmailVerified &&
      user.emailVerificationValidUntil &&
      new Date(user.emailVerificationValidUntil).getTime() < Date.now()
    ) {
      isVerificationExpired = true;
    }

    const token = generateAccessToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
    });

    const safeUser = {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
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
      isProfileComplete: user.isProfileComplete,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response = buildNoStoreResponse(
      {
        success: true,
        message: "Login successful",
        user: safeUser,
      },
      200
    );

    response.cookies.set("auth-token", token, {
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
    console.error("Login error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Login failed",
      },
      500
    );
  }
}