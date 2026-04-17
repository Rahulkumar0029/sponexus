import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { generateRandomToken, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select(
      "+emailVerificationToken +emailVerificationExpires"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: "If this email exists, a verification email has been sent.",
        },
        { status: 200 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is already verified",
        },
        { status: 400 }
      );
    }

    const rawVerificationToken = generateRandomToken(32);
    const hashedVerificationToken = hashToken(rawVerificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = hashedVerificationToken;
    user.emailVerificationExpires = verificationExpires;

    await user.save();

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
        message: "If this email exists, a verification email has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to resend verification email",
      },
      { status: 500 }
    );
  }
}