import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { generateRandomToken, hashToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import User from "@/lib/models/User";

const MAX_EMAIL_LENGTH = 320;

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

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Email is required",
        },
        400
      );
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Email is too long",
        },
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Please enter a valid email address",
        },
        400
      );
    }

    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Missing APP_URL environment variable",
        },
        500
      );
    }

    let parsedAppUrl: URL;

    try {
      parsedAppUrl = new URL(appUrl);
    } catch {
      return buildNoStoreResponse(
        {
          success: false,
          message: "APP_URL is not a valid URL",
        },
        500
      );
    }

    if (!["http:", "https:"].includes(parsedAppUrl.protocol)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "APP_URL must use http or https",
        },
        500
      );
    }

    const user = await User.findOne({
      email,
      isDeleted: false,
    }).select(
      "+resetPasswordToken +resetPasswordExpires firstName name email accountStatus"
    );

    if (!user) {
      return buildNoStoreResponse(
        {
          success: true,
          message: "If this email exists, a password reset link has been sent.",
        },
        200
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        {
          success: true,
          message: "If this email exists, a password reset link has been sent.",
        },
        200
      );
    }

    const rawResetToken = generateRandomToken(32);
    const hashedResetToken = hashToken(rawResetToken);
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = resetExpires;

    await user.save();

    const resetLink = `${parsedAppUrl
      .toString()
      .replace(/\/$/, "")}/reset-password?token=${rawResetToken}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.firstName || user.name || "User",
      resetLink,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "If this email exists, a password reset link has been sent.",
      },
      200
    );
  } catch (error) {
    console.error("Forgot password error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Server error",
      },
      500
    );
  }
}