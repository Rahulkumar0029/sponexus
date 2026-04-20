import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import AdminOtp from "@/lib/models/AdminOtp";
import AdminSession from "@/lib/models/AdminSession";
import {
  generateAccessToken,
  generateRandomToken,
  hashOtpCode,
  hashToken,
} from "@/lib/auth";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
  writeAdminAuditLog,
} from "@/lib/admin-auth";
import { getAdminPermissions, isAdminRole } from "@/lib/admin-permissions";

const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and OTP code are required",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email,
      isDeleted: false,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP verification request",
        },
        { status: 401 }
      );
    }

    if (!isAdminRole(user.adminRole) || user.accountStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access not allowed for this account",
        },
        { status: 403 }
      );
    }

    const otpRecord = await AdminOtp.findOne({
      userId: user._id,
      email,
      purpose: "LOGIN",
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("+codeHash");

    if (!otpRecord || !otpRecord.codeHash) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP expired or invalid. Please login again.",
        },
        { status: 401 }
      );
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum OTP attempts reached. Please login again.",
        },
        { status: 429 }
      );
    }

    const incomingHash = hashOtpCode(code);

    if (incomingHash !== otpRecord.codeHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP code",
        },
        { status: 401 }
      );
    }

    otpRecord.consumedAt = new Date();
    await otpRecord.save();

    const rawAdminSessionToken = generateRandomToken(48);
    const hashedAdminSessionToken = hashToken(rawAdminSessionToken);

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "";
    const userAgent = request.headers.get("user-agent") || "";

    const adminSession = await AdminSession.create({
      userId: user._id,
      sessionTokenHash: hashedAdminSessionToken,
      ipAddress,
      userAgent,
      isStepUpVerified: true,
      lastStepUpAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
      revokedAt: null,
      revokeReason: "",
    });

    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

    const accessToken = generateAccessToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
    });

    const permissions = getAdminPermissions(user.adminRole);

    await writeAdminAuditLog({
      actorUserId: user._id,
      actorAdminRole: user.adminRole,
      action: "ADMIN_LOGIN_SUCCESS",
      targetType: "ADMIN_SESSION",
      targetId: adminSession._id,
      reason: "Admin OTP verified and session created",
      metadata: {
        email: user.email,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Admin login successful",
        admin: {
          _id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          adminRole: user.adminRole,
          permissions,
        },
      },
      { status: 200 }
    );

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      rawAdminSessionToken,
      getAdminSessionCookieOptions()
    );

    response.cookies.set("auth-token", accessToken, {
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
    console.error("Admin OTP verify error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify OTP",
      },
      { status: 500 }
    );
  }
}