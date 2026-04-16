import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email: String(email).toLowerCase(),
    }).select("+password");

    // Security-safe response
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: "If this email exists, a reset link has been generated.",
        },
        { status: 200 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;

    await user.save();

    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    return NextResponse.json(
      {
        success: true,
        message: "Reset link generated",
        resetLink,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}