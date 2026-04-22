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
    }).select("isEmailVerified accountStatus");

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

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isEmailVerified: true,
          lastActiveAt: new Date(),
        },
        $unset: {
          emailVerificationToken: 1,
          emailVerificationExpires: 1,
        },
      }
    );

    return buildNoStoreResponse(
      {
        success: true,
        message: "Email verified successfully",
      },
      200
    );
  } catch (error) {
    console.error("===== VERIFY EMAIL ERROR =====");

    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }

    return buildNoStoreResponse(
      {
        success: false,
        message: "Email verification failed",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      500
    );
  }
}