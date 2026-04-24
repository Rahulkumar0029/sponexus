import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import PaymentAdminSession from "@/lib/models/PaymentAdminSession";

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

export async function GET(request: NextRequest) {
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

    const session = await PaymentAdminSession.findOne({
      adminId: adminUser._id,
    }).sort({ createdAt: -1 });

    if (!session) {
      return buildNoStoreResponse(
        {
          success: true,
          access: {
            active: false,
            requiresVerification: true,
            reason: "NO_SESSION",
            session: null,
          },
        },
        200
      );
    }

    const now = new Date();
    const ipAddress = getIpAddress(request);
    const userAgent = request.headers.get("user-agent")?.trim() || null;

    if (session.status === "VERIFIED") {
      if (
        session.isActive &&
        session.sessionExpiresAt &&
        new Date(session.sessionExpiresAt) > now
      ) {
        session.lastUsedAt = now;
        session.ipAddress = ipAddress;
        session.userAgent = userAgent;
        await session.save();

        return buildNoStoreResponse(
          {
            success: true,
            access: {
              active: true,
              requiresVerification: false,
              reason: null,
              session: {
                id: String(session._id),
                status: session.status,
                verifiedAt: session.verifiedAt,
                sessionExpiresAt: session.sessionExpiresAt,
                lastUsedAt: session.lastUsedAt,
              },
            },
          },
          200
        );
      }

      session.status = "EXPIRED";
      session.isActive = false;
      await session.save();

      return buildNoStoreResponse(
        {
          success: true,
          access: {
            active: false,
            requiresVerification: true,
            reason: "SESSION_EXPIRED",
            session: {
              id: String(session._id),
              status: session.status,
              verifiedAt: session.verifiedAt,
              sessionExpiresAt: session.sessionExpiresAt,
              lastUsedAt: session.lastUsedAt,
            },
          },
        },
        200
      );
    }

    if (session.status === "OTP_PENDING") {
      const otpStillValid =
        session.isActive &&
        session.otpExpiresAt &&
        new Date(session.otpExpiresAt) > now;

      if (!otpStillValid) {
        session.status = "EXPIRED";
        session.isActive = false;
        await session.save();

        return buildNoStoreResponse(
          {
            success: true,
            access: {
              active: false,
              requiresVerification: true,
              reason: "OTP_EXPIRED",
              session: {
                id: String(session._id),
                status: session.status,
                otpExpiresAt: session.otpExpiresAt,
              },
            },
          },
          200
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          access: {
            active: false,
            requiresVerification: true,
            reason: "OTP_PENDING",
            session: {
              id: String(session._id),
              status: session.status,
              otpExpiresAt: session.otpExpiresAt,
              otpAttemptCount: session.otpAttemptCount,
              maxOtpAttempts: session.maxOtpAttempts,
            },
          },
        },
        200
      );
    }

    if (session.status === "LOCKED") {
      if (session.isActive) {
        session.isActive = false;
        await session.save();
      }

      return buildNoStoreResponse(
        {
          success: true,
          access: {
            active: false,
            requiresVerification: true,
            reason: "LOCKED",
            session: {
              id: String(session._id),
              status: session.status,
              otpAttemptCount: session.otpAttemptCount,
              maxOtpAttempts: session.maxOtpAttempts,
            },
          },
        },
        200
      );
    }

    if (session.status === "REVOKED") {
      if (session.isActive) {
        session.isActive = false;
        await session.save();
      }

      return buildNoStoreResponse(
        {
          success: true,
          access: {
            active: false,
            requiresVerification: true,
            reason: "REVOKED",
            session: {
              id: String(session._id),
              status: session.status,
              revokedAt: session.revokedAt,
              revokeReason: session.revokeReason,
            },
          },
        },
        200
      );
    }

    if (session.status === "EXPIRED") {
      if (session.isActive) {
        session.isActive = false;
        await session.save();
      }

      return buildNoStoreResponse(
        {
          success: true,
          access: {
            active: false,
            requiresVerification: true,
            reason: "EXPIRED",
            session: {
              id: String(session._id),
              status: session.status,
              verifiedAt: session.verifiedAt,
              sessionExpiresAt: session.sessionExpiresAt,
              lastUsedAt: session.lastUsedAt,
            },
          },
        },
        200
      );
    }

    return buildNoStoreResponse(
      {
        success: true,
        access: {
          active: false,
          requiresVerification: true,
          reason: session.status || "UNKNOWN",
          session: {
            id: String(session._id),
            status: session.status,
          },
        },
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/payments/access/session error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to check payment access session.",
      },
      500
    );
  }
}