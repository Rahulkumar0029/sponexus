import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { generateRandomToken, hashToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();
    console.log("✅ DB connected");

    const body = await req.json();
    console.log("📦 Request body:", body);

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    console.log("📧 Normalized email:", email);

    if (!email) {
      console.log("❌ Email missing");
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("❌ Invalid email format");
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    console.log("👤 User found:", !!user);

    if (!user) {
      console.log("⚠️ No user found for this email");
      return NextResponse.json(
        {
          success: true,
          message: "If this email exists, a password reset link has been sent.",
        },
        { status: 200 }
      );
    }

    console.log("✅ User email in DB:", user.email);

    const rawResetToken = generateRandomToken(32);
    const hashedResetToken = hashToken(rawResetToken);
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    console.log("🔑 Raw token generated:", rawResetToken);
    console.log("🔒 Hashed token generated:", hashedResetToken);
    console.log("⏰ Reset expires:", resetExpires.toISOString());

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = resetExpires;

    await user.save();
    console.log("✅ Reset token saved in DB");

    const appUrl = process.env.APP_URL;
    const emailFrom = process.env.EMAIL_FROM;
    const hasResendKey = !!process.env.RESEND_API_KEY;

    console.log("🌐 APP_URL:", appUrl);
    console.log("📨 EMAIL_FROM:", emailFrom);
    console.log("🔐 RESEND_API_KEY exists:", hasResendKey);

    if (!appUrl) {
      console.log("❌ APP_URL missing");
      return NextResponse.json(
        {
          success: false,
          message: "Missing APP_URL environment variable",
        },
        { status: 500 }
      );
    }

    const resetLink = `${appUrl}/reset-password?token=${rawResetToken}`;
    console.log("🔗 Reset link:", resetLink);

    await sendPasswordResetEmail({
      to: user.email,
      name: user.firstName || user.name || "User",
      resetLink,
    });

    console.log("✅ Password reset email function finished");

    return NextResponse.json(
      {
        success: true,
        message: "If this email exists, a password reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Forgot password error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}