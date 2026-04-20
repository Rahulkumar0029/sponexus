import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { generateRandomToken, hashPassword, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role =
      body.role === "ORGANIZER" || body.role === "SPONSOR" ? body.role : null;
    const companyName =
      typeof body.companyName === "string" ? body.companyName.trim() : "";

    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        {
          success: false,
          message:
            "First name, last name, email, password, and role are required",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const rawVerificationToken = generateRandomToken(32);
    const hashedVerificationToken = hashToken(rawVerificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      companyName,
      isEmailVerified: false,
      isProfileComplete: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: verificationExpires,
      accountStatus: "ACTIVE",
      adminRole: "NONE",
      isDeleted: false,
      failedLoginAttempts: 0,
      lockUntil: null,
      lastLoginAt: null,
      lastActiveAt: null,
      passwordChangedAt: new Date(),
    });

    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing APP_URL environment variable",
        },
        { status: 500 }
      );
    }

    const verificationLink = `${appUrl}/verify-email?token=${rawVerificationToken}`;

    await sendVerificationEmail({
      to: user.email,
      name: user.firstName || user.name || "User",
      verificationLink,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. Please verify your email.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Registration failed",
      },
      { status: 500 }
    );
  }
}