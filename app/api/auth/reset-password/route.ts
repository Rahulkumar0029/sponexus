import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";
import User from "@/lib/models/User";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_TOKEN_LENGTH = 512;

function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!token || !password || !confirmPassword) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Token, password, and confirm password are required",
        },
        400
      );
    }

    if (token.length > MAX_TOKEN_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid or expired reset token",
        },
        400
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        },
        400
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Password is too long",
        },
        400
      );
    }

    if (password !== confirmPassword) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Passwords do not match",
        },
        400
      );
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      isDeleted: false,
    }).select(
      "+password +resetPasswordToken +resetPasswordExpires accountStatus failedLoginAttempts lockUntil"
    );

    if (!user) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid or expired reset token",
        },
        400
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "This account is not allowed to reset password",
        },
        403
      );
    }

    user.password = await hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.passwordChangedAt = new Date();
    user.lastActiveAt = new Date();

    await user.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Password reset successful",
      },
      200
    );
  } catch (error) {
    console.error("Reset password error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Server error",
      },
      500
    );
  }
}