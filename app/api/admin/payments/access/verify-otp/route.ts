import crypto from "crypto";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import PaymentAdminSession from "@/lib/models/PaymentAdminSession";
import { PAYMENT_ADMIN_ACCESS } from "@/lib/subscription/constants";

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

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function safeCompareHash(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid or expired session." },
        401
      );
    }

    const adminUser = await User.findById(decoded.userId).select(
      "_id email adminRole accountStatus isDeleted"
    );

    if (!adminUser || adminUser.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "User not found." },
        404
      );
    }

    if (
      adminUser.accountStatus === "SUSPENDED" ||
      adminUser.accountStatus === "DISABLED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account access restricted." },
        403
      );
    }

    if (adminUser.adminRole !== "SUPER_ADMIN") {
      return buildNoStoreResponse(
        { success: false, message: "Super admin access required." },
        403
      );
    }

    const body = await request.json();

    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return buildNoStoreResponse(
        { success: false, message: "Valid sessionId is required." },
        400
      );
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      return buildNoStoreResponse(
        { success: false, message: "Valid 6-digit OTP is required." },
        400
      );
    }

    const session = await PaymentAdminSession.findOne({
      _id: sessionId,
      adminId: adminUser._id,
    }).select("+otpHash");

    if (!session) {
      return buildNoStoreResponse(
        { success: false, message: "Payment access session not found." },
        404
      );
    }

    const now = new Date();
    const ipAddress = getIpAddress(request);
    const userAgent = request.headers.get("user-agent")?.trim() || null;

    if (session.status === "VERIFIED") {
      if (session.sessionExpiresAt && new Date(session.sessionExpiresAt) > now) {
        session.lastUsedAt = now;
        session.ipAddress = ipAddress;
        session.userAgent = userAgent;
        session.isActive = true;
        await session.save();

        return buildNoStoreResponse(
          {
            success: true,
            message: "Payment section access is already active.",
            session: {
              id: String(session._id),
              status: session.status,
              verifiedAt: session.verifiedAt,
              sessionExpiresAt: session.sessionExpiresAt,
              lastUsedAt: session.lastUsedAt,
            },
            alreadyVerified: true,
          },
          200
        );
      }

      session.status = "EXPIRED";
      session.isActive = false;
      await session.save();

      return buildNoStoreResponse(
        {
          success: false,
          message: "Payment access session has expired. Request a new OTP.",
        },
        410
      );
    }

    if (session.status === "LOCKED") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Too many invalid OTP attempts. Request a new OTP.",
        },
        423
      );
    }

    if (session.status === "REVOKED" || session.status === "EXPIRED") {
      session.isActive = false;
      await session.save();

      return buildNoStoreResponse(
        {
          success: false,
          message: "This payment access session is no longer valid. Request a new OTP.",
        },
        400
      );
    }

    if (session.status !== "OTP_PENDING") {
      return buildNoStoreResponse(
        {
          success: false,
          message:
            "This payment access session is no longer pending verification.",
        },
        400
      );
    }

    if (!session.otpHash || !session.otpExpiresAt) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "OTP challenge is missing. Request a new OTP.",
        },
        400
      );
    }

    if (new Date(session.otpExpiresAt) < now) {
      session.status = "EXPIRED";
      session.isActive = false;
      session.otpHash = null;
      session.otpExpiresAt = null;
      await session.save();

      return buildNoStoreResponse(
        {
          success: false,
          message: "OTP has expired. Request a new OTP.",
        },
        410
      );
    }

    const providedOtpHash = hashOtp(otp);
    const isValidOtp = safeCompareHash(session.otpHash, providedOtpHash);

    if (!isValidOtp) {
      session.otpAttemptCount = (session.otpAttemptCount || 0) + 1;

      const maxOtpAttempts =
        session.maxOtpAttempts || PAYMENT_ADMIN_ACCESS.MAX_OTP_ATTEMPTS;

      if (session.otpAttemptCount >= maxOtpAttempts) {
        session.status = "LOCKED";
        session.isActive = false;
      }

      await session.save();

      return buildNoStoreResponse(
        {
          success: false,
          message:
            session.status === "LOCKED"
              ? "Too many invalid OTP attempts. Request a new OTP."
              : "Invalid OTP.",
          attemptsRemaining:
            session.status === "LOCKED"
              ? 0
              : Math.max(0, maxOtpAttempts - session.otpAttemptCount),
        },
        session.status === "LOCKED" ? 423 : 400
      );
    }

    const sessionExpiresAt = new Date(
      now.getTime() + PAYMENT_ADMIN_ACCESS.SESSION_EXPIRY_MINUTES * 60 * 1000
    );

    session.status = "VERIFIED";
    session.isActive = true;
    session.otpHash = null;
    session.otpExpiresAt = null;
    session.verifiedAt = now;
    session.sessionExpiresAt = sessionExpiresAt;
    session.lastUsedAt = now;
    session.ipAddress = ipAddress;
    session.userAgent = userAgent;
    session.otpAttemptCount = 0;

    await session.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Payment section access verified successfully.",
        session: {
          id: String(session._id),
          status: session.status,
          verifiedAt: session.verifiedAt,
          sessionExpiresAt: session.sessionExpiresAt,
          lastUsedAt: session.lastUsedAt,
        },
        alreadyVerified: false,
      },
      200
    );
  } catch (error) {
    console.error("POST /api/admin/payments/access/verify-otp error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to verify payment access OTP.",
      },
      500
    );
  }
}