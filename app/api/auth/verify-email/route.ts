import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import User from "@/lib/models/User";

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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Verification token is required",
        },
        400
      );
    }

    if (token.length > MAX_TOKEN_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid or expired verification token",
        },
        400
      );
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
      isDeleted: false,
    }).select(
      "+emailVerificationToken +emailVerificationExpires isEmailVerified accountStatus"
    );

    if (!user) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid or expired verification token",
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
          message: "This account is not allowed to verify email",
        },
        403
      );
    }

    if (user.isEmailVerified) {
      return buildNoStoreResponse(
        {
          success: true,
          message: "Email already verified",
        },
        200
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.lastActiveAt = new Date();

    await user.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Email verified successfully",
      },
      200
    );
  } catch (error) {
    console.error("Verify email error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Email verification failed",
      },
      500
    );
  }
}