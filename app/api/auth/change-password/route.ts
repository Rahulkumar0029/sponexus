import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import {
  comparePasswords,
  hashPassword,
  verifyAccessToken,
} from "@/lib/auth";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

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

    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Current password, new password, and confirm password are required",
        },
        400
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        },
        400
      );
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Password is too long" },
        400
      );
    }

    if (newPassword !== confirmPassword) {
      return buildNoStoreResponse(
        { success: false, message: "Passwords do not match" },
        400
      );
    }

    const user = await User.findById(payload.userId).select(
      "+password accountStatus isDeleted failedLoginAttempts lockUntil"
    );

    if (!user || user.isDeleted || !user.password) {
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

    const isCurrentPasswordValid = await comparePasswords(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return buildNoStoreResponse(
        { success: false, message: "Current password is incorrect" },
        401
      );
    }

    user.password = await hashPassword(newPassword);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.passwordChangedAt = new Date();
    user.lastActiveAt = new Date();

    await user.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Password changed successfully",
      },
      200
    );
  } catch (error) {
    console.error("Change password error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to change password",
      },
      500
    );
  }
}