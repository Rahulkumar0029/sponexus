import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import AdminOtp from "@/lib/models/AdminOtp";
import { comparePasswords, generateOtpCode, hashOtpCode } from "@/lib/auth";
import { sendAdminOtpEmail } from "@/lib/admin-email";
import { isAdminRole } from "@/lib/admin-permissions";
import { writeAdminAuditLog } from "@/lib/admin-auth";

const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
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

    const user = await User.findOne({
      email,
      isDeleted: false,
    }).select("+password");

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid admin credentials",
        },
        { status: 401 }
      );
    }

    if (!isAdminRole(user.adminRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access not allowed for this account",
        },
        { status: 403 }
      );
    }

    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "This account is not active",
        },
        { status: 403 }
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

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }

      await user.save();

      return NextResponse.json(
        {
          success: false,
          message: "Invalid admin credentials",
        },
        { status: 401 }
      );
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await AdminOtp.deleteMany({
      userId: user._id,
      purpose: "LOGIN",
      consumedAt: null,
    });

    const otp = generateOtpCode(6);
    const codeHash = hashOtpCode(otp);

    await AdminOtp.create({
      userId: user._id,
      email: user.email,
      codeHash,
      purpose: "LOGIN",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      maxAttempts: 5,
      consumedAt: null,
    });

    await sendAdminOtpEmail({
      to: user.email,
      name: user.firstName || user.name || "Admin",
      otp,
    });

    await writeAdminAuditLog({
      actorUserId: user._id,
      actorAdminRole: user.adminRole,
      action: "ADMIN_LOGIN_OTP_SENT",
      targetType: "SYSTEM",
      reason: "Admin login OTP issued",
      metadata: {
        email: user.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent to your email",
        requiresOtp: true,
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin login initiation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to start admin login",
      },
      { status: 500 }
    );
  }
}