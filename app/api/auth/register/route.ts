import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { generateRandomToken, hashPassword, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const MAX_NAME_LENGTH = 60;
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 200;
const MAX_COMPANY_NAME_LENGTH = 120;

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
      return buildNoStoreResponse(
        {
          success: false,
          message:
            "First name, last name, email, password, and role are required",
        },
        400
      );
    }

    if (firstName.length > MAX_NAME_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `First name cannot exceed ${MAX_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (lastName.length > MAX_NAME_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Last name cannot exceed ${MAX_NAME_LENGTH} characters`,
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

    if (password.length < 8) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Password must be at least 8 characters",
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

    if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Company name cannot exceed ${MAX_COMPANY_NAME_LENGTH} characters`,
        },
        400
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
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

    const existingUser = await User.findOne({ email }).select("_id");

    if (existingUser) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "An account with this email already exists",
        },
        409
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

    const verificationLink = `${parsedAppUrl.toString().replace(/\/$/, "")}/verify-email?token=${rawVerificationToken}`;

    await sendVerificationEmail({
      to: user.email,
      name: user.firstName || user.name || "User",
      verificationLink,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Registration successful. Please verify your email.",
      },
      201
    );
  } catch (error: any) {
    console.error("Register error:", error);

    if (error?.code === 11000) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "An account with this email already exists",
        },
        409
      );
    }

    return buildNoStoreResponse(
      {
        success: false,
        message: "Registration failed",
      },
      500
    );
  }
}