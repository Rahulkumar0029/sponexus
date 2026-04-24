import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { generateRandomToken, hashToken, verifyAccessToken } from "@/lib/auth";
import { sendEmailChangeVerificationEmail } from "@/lib/email";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const MAX_EMAIL_LENGTH = 320;
const EMAIL_CHANGE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        401
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload?.userId) {
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        401
      );
    }

    const body = await request.json();

    const newEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!newEmail) {
      return buildNoStoreResponse(
        { success: false, message: "New email is required" },
        400
      );
    }

    if (newEmail.length > MAX_EMAIL_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Email is too long" },
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return buildNoStoreResponse(
        { success: false, message: "Please enter a valid email address" },
        400
      );
    }

    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      return buildNoStoreResponse(
        { success: false, message: "Missing APP_URL environment variable" },
        500
      );
    }

    const parsedAppUrl = new URL(appUrl);

    if (!["http:", "https:"].includes(parsedAppUrl.protocol)) {
      return buildNoStoreResponse(
        { success: false, message: "APP_URL must use http or https" },
        500
      );
    }

    const user = await User.findById(payload.userId).select(
      "_id email firstName name accountStatus isDeleted"
    );

    if (!user || user.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account access restricted" },
        403
      );
    }

    if (user.email === newEmail) {
      return buildNoStoreResponse(
        { success: false, message: "New email is same as current email" },
        400
      );
    }

    const existingUser = await User.findOne({
      email: newEmail,
      isDeleted: false,
    }).select("_id");

    if (existingUser) {
      return buildNoStoreResponse(
        { success: false, message: "This email is already in use" },
        409
      );
    }

    const rawEmailChangeToken = generateRandomToken(32);
    const hashedEmailChangeToken = hashToken(rawEmailChangeToken);
    const emailChangeExpires = new Date(
      Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS
    );

    user.pendingEmail = newEmail;
    user.emailChangeToken = hashedEmailChangeToken;
    user.emailChangeExpires = emailChangeExpires;
    user.lastActiveAt = new Date();

    await user.save();

    const verificationLink = `${parsedAppUrl
      .toString()
      .replace(/\/$/, "")}/change-email/verify?token=${encodeURIComponent(
      rawEmailChangeToken
    )}`;

    await sendEmailChangeVerificationEmail({
      to: newEmail,
      name: user.firstName || user.name || "User",
      verificationLink,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Email change verification link sent",
      },
      200
    );
  } catch (error) {
    console.error("Change email request error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to request email change",
      },
      500
    );
  }
}