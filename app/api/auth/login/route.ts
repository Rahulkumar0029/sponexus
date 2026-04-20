import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { comparePasswords, generateAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email, isDeleted: false }).select("+password");

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 }
      );
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      return NextResponse.json(
        {
          success: false,
          message: "Account temporarily locked. Please try again later.",
        },
        { status: 423 }
      );
    }

    if (user.accountStatus === "DISABLED") {
      return NextResponse.json(
        {
          success: false,
          message: "This account has been disabled. Please contact support.",
        },
        { status: 403 }
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      return NextResponse.json(
        {
          success: false,
          message: "This account has been suspended. Please contact support.",
        },
        { status: 403 }
      );
    }

    if (user.accountStatus === "PENDING_REVIEW") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is under review. Please try again later.",
        },
        { status: 403 }
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

      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 }
      );
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

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
      isProfileComplete: user.isProfileComplete,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: safeUser,
      },
      { status: 200 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("user-role", user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Login failed",
      },
      { status: 500 }
    );
  }
}