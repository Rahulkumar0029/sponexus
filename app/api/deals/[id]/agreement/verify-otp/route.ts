import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { DealAgreementModel } from "@/lib/models/DealAgreement";
import { canAccessAgreement } from "@/lib/deals/agreement";
import {
  isAgreementOtpExpired,
  verifyAgreementOtpHash,
} from "@/lib/deals/agreement-otp";
import { createNotification } from "@/lib/notifications/createNotification";

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return { user: null, error: "Authentication required", status: 401 };
  }

  const payload = verifyAccessToken(token);

  if (!payload?.userId || !payload?.email) {
    return { user: null, error: "Invalid or expired token", status: 401 };
  }

  const user = await User.findById(payload.userId).select(
    "_id email role firstName lastName name companyName adminRole"
  );

  if (!user) {
    return { user: null, error: "User not found", status: 404 };
  }

  return { user, error: null, status: 200 };
}

function getVerificationByRole(agreement: any, role: "ORGANIZER" | "SPONSOR") {
  return role === "ORGANIZER"
    ? agreement.organizerVerification
    : agreement.sponsorVerification;
}

function getOtherPartyId(agreement: any, role: "ORGANIZER" | "SPONSOR") {
  return role === "ORGANIZER"
    ? String(agreement.sponsorId)
    : String(agreement.organizerId);
}

function getRoleByUserId(
  userId: string,
  agreement: any
): "ORGANIZER" | "SPONSOR" | null {
  if (String(agreement.organizerId?._id || agreement.organizerId) === userId) {
    return "ORGANIZER";
  }

  if (String(agreement.sponsorId?._id || agreement.sponsorId) === userId) {
    return "SPONSOR";
  }

  return null;
}

function getOtherRole(role: "ORGANIZER" | "SPONSOR") {
  return role === "ORGANIZER" ? "SPONSOR" : "ORGANIZER";
}

function getAgreementStatusFromVerification({
  organizerVerified,
  sponsorVerified,
}: {
  organizerVerified: boolean;
  sponsorVerified: boolean;
}) {
  if (organizerVerified && sponsorVerified) return "SIGNED";
  if (organizerVerified && !sponsorVerified) return "PENDING_SPONSOR_OTP";
  if (!organizerVerified && sponsorVerified) return "PENDING_ORGANIZER_OTP";

  return "PENDING_BOTH_OTP";
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const auth = await getAuthenticatedUser();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const dealId = params.id;

    if (!isValidObjectId(dealId)) {
      return NextResponse.json(
        { success: false, message: "Invalid deal id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const otp = normalizeString(body.otp);

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "Valid 6 digit OTP is required" },
        { status: 400 }
      );
    }

    const agreement = await DealAgreementModel.findOne({
      dealId,
      isDeleted: { $ne: true },
    }).select(
      "+organizerVerification.otpHash +organizerVerification.otpExpiresAt +organizerVerification.ipAddress +organizerVerification.userAgent +sponsorVerification.otpHash +sponsorVerification.otpExpiresAt +sponsorVerification.ipAddress +sponsorVerification.userAgent"
    );

    if (!agreement) {
      return NextResponse.json(
        { success: false, message: "Agreement not found" },
        { status: 404 }
      );
    }

    const currentUserId = String(auth.user._id);

    if (!canAccessAgreement(currentUserId, agreement)) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this agreement" },
        { status: 403 }
      );
    }

    if (agreement.status === "SIGNED") {
      return NextResponse.json(
        { success: false, message: "Agreement is already signed" },
        { status: 400 }
      );
    }

    if (agreement.status === "CANCELLED" || agreement.status === "EXPIRED") {
      return NextResponse.json(
        { success: false, message: "Agreement is not active for verification" },
        { status: 400 }
      );
    }

    const role = getRoleByUserId(currentUserId, agreement);

    if (!role) {
      return NextResponse.json(
        { success: false, message: "Unable to determine your agreement role" },
        { status: 403 }
      );
    }

    const creatorId = String(agreement.createdBy);
    const creatorRole = getRoleByUserId(creatorId, agreement);

    if (!creatorRole) {
      return NextResponse.json(
        { success: false, message: "Agreement creator role is invalid" },
        { status: 400 }
      );
    }

    const counterpartyRole = getOtherRole(creatorRole);

    const creatorVerification = getVerificationByRole(agreement, creatorRole);
    const counterpartyVerification = getVerificationByRole(
      agreement,
      counterpartyRole
    );

    if (
      role === creatorRole &&
      counterpartyVerification?.otpStatus !== "VERIFIED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Counterparty must verify the agreement before creator signing",
        },
        { status: 403 }
      );
    }

    if (
      role === counterpartyRole &&
      creatorVerification?.otpStatus === "VERIFIED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement creator has already verified this agreement",
        },
        { status: 400 }
      );
    }

    const verification = getVerificationByRole(agreement, role);

    if (verification.otpStatus === "VERIFIED") {
      return NextResponse.json(
        { success: false, message: "You have already verified this agreement" },
        { status: 400 }
      );
    }

    if (verification.otpStatus !== "SENT") {
      return NextResponse.json(
        { success: false, message: "Please request OTP first" },
        { status: 400 }
      );
    }

    if (isAgreementOtpExpired(verification.otpExpiresAt)) {
      verification.otpStatus = "EXPIRED";
      verification.otpHash = "";
      verification.otpExpiresAt = null;

      agreement.status =
        role === "ORGANIZER" ? "PENDING_ORGANIZER_OTP" : "PENDING_SPONSOR_OTP";

      await agreement.save();

      return NextResponse.json(
        { success: false, message: "OTP expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    const isOtpValid = verifyAgreementOtpHash(otp, verification.otpHash);

    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 400 }
      );
    }

    const now = new Date();

    verification.otpStatus = "VERIFIED";
    verification.otpVerifiedAt = now;
    verification.otpHash = "";
    verification.otpExpiresAt = null;
    verification.ipAddress = getClientIp(request);
    verification.userAgent = request.headers.get("user-agent") || "";

    const organizerVerified =
      role === "ORGANIZER"
        ? true
        : agreement.organizerVerification?.otpStatus === "VERIFIED";

    const sponsorVerified =
      role === "SPONSOR"
        ? true
        : agreement.sponsorVerification?.otpStatus === "VERIFIED";

    agreement.status = getAgreementStatusFromVerification({
      organizerVerified,
      sponsorVerified,
    });

    if (agreement.status === "SIGNED" && !agreement.signedAt) {
      agreement.signedAt = now;
    }

    await agreement.save();

    const freshAgreement = await DealAgreementModel.findById(agreement._id);

    const otherPartyId = getOtherPartyId(agreement, role);

    try {
      await createNotification({
        userId: otherPartyId,
        type: "DEAL_UPDATED",
               title:
          freshAgreement?.status === "SIGNED"
            ? "Agreement signed"
            : "Agreement verification updated",
        message:
          freshAgreement?.status === "SIGNED"
            ? "The deal agreement has been signed by both parties."
            : "The other party verified the deal agreement.",
        link: `/deals/${dealId}/agreement`,
        metadata: {
          dealId,
          agreementId: String(agreement._id),
          verifiedBy: currentUserId,
          role,
                    status: freshAgreement?.status || agreement.status,
        },
      });
    } catch (notificationError) {
      console.error("Agreement verify notification error:", notificationError);
    }

    if (freshAgreement?.status === "SIGNED") {
      try {
        await createNotification({
          userId: currentUserId,
          type: "DEAL_UPDATED",
          title: "Agreement signed",
          message: "The deal agreement has been signed successfully.",
          link: `/deals/${dealId}/agreement`,
          metadata: {
            dealId,
            agreementId: String(agreement._id),
            status: freshAgreement.status,
          },
        });
      } catch (notificationError) {
        console.error(
          "Agreement signed self notification error:",
          notificationError
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
                message:
          freshAgreement?.status === "SIGNED"
            ? "Agreement signed successfully"
            : "Agreement OTP verified successfully",
        agreement: freshAgreement,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/deals/[id]/agreement/verify-otp error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to verify agreement OTP",
      },
      { status: 500 }
    );
  }
}