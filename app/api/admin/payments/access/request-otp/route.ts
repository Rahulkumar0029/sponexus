import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import PaymentAdminSession from "@/lib/models/PaymentAdminSession";
import { PAYMENT_ADMIN_ACCESS } from "@/lib/subscription/constants";

/* ===============================
   RESPONSE
=================================*/
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

/* ===============================
   HELPERS
=================================*/
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

/* ===============================
   EMAIL (RESEND)
=================================*/
async function sendPaymentAccessOtpEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}) {
  const from = "Sponexus Billing <billing@sponexus.app>";

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;">
      <h2>Payment Access Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;">${otp}</div>
      <p>Expires in ${PAYMENT_ADMIN_ACCESS.OTP_EXPIRY_MINUTES} minutes.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Sponexus Payment Admin OTP",
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

/* ===============================
   ROUTE
=================================*/
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
        { success: false, message: "Invalid session." },
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
        { success: false, message: "Account restricted." },
        403
      );
    }

    if (adminUser.adminRole !== "SUPER_ADMIN") {
      return buildNoStoreResponse(
        { success: false, message: "Super admin required." },
        403
      );
    }

    if (!adminUser.email) {
      return buildNoStoreResponse(
        { success: false, message: "Email required." },
        400
      );
    }

    const now = new Date();
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const otpExpiresAt = new Date(
      now.getTime() +
        PAYMENT_ADMIN_ACCESS.OTP_EXPIRY_MINUTES * 60 * 1000
    );

    const ipAddress = getIpAddress(request);
    const userAgent = request.headers.get("user-agent") || null;

    /* ===============================
       FIND SESSION (FIXED FIELD)
    =================================*/
    let session = await PaymentAdminSession.findOne({
      adminId: adminUser._id, // ✅ FIXED
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .select("+otpHash");

    /* ===============================
       ALREADY VERIFIED
    =================================*/
    if (
      session &&
      session.status === "VERIFIED" &&
      session.sessionExpiresAt &&
      session.sessionExpiresAt > now
    ) {
      return buildNoStoreResponse(
        {
          success: true,
          message: "Already verified.",
          access: {
            alreadyVerified: true,
            sessionExpiresAt: session.sessionExpiresAt,
          },
        },
        200
      );
    }

    /* ===============================
       LOCKED
    =================================*/
    if (session && session.status === "LOCKED") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Too many attempts. Session locked.",
        },
        423
      );
    }

    /* ===============================
       CREATE / UPDATE SESSION
    =================================*/
    if (!session) {
      session = await PaymentAdminSession.create({
        adminId: adminUser._id, // ✅ FIXED
        email: adminUser.email,
        status: "OTP_PENDING",
        isActive: true,
        otpHash,
        otpRequestedAt: now,
        otpExpiresAt,
        otpRequestCount: 1,
        otpAttemptCount: 0,
        maxOtpAttempts: PAYMENT_ADMIN_ACCESS.MAX_OTP_ATTEMPTS,
        ipAddress,
        userAgent,
        metadata: { purpose: "PAYMENT_ADMIN_ACCESS" },
      });
    } else {
      session.status = "OTP_PENDING";
      session.isActive = true;
      session.otpHash = otpHash;
      session.otpRequestedAt = now;
      session.otpExpiresAt = otpExpiresAt;
      session.otpRequestCount += 1;
      session.otpAttemptCount = 0;
      session.verifiedAt = null;
      session.sessionExpiresAt = null;
      session.lastUsedAt = null;
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;

      await session.save();
    }

    /* ===============================
       SEND OTP
    =================================*/
    await sendPaymentAccessOtpEmail({
      to: adminUser.email,
      otp,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "OTP sent.",
        session: {
          id: String(session._id),
          otpExpiresAt: session.otpExpiresAt,
          maxOtpAttempts: session.maxOtpAttempts,
        },
      },
      200
    );
  } catch (error) {
    console.error("OTP REQUEST ERROR:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to send OTP.",
      },
      500
    );
  }
}