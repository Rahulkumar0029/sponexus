import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { DealModel } from "@/lib/models/Deal";
import { DealAgreementModel } from "@/lib/models/DealAgreement";
import { canAccessAgreement } from "@/lib/deals/agreement";
import {
  generateAgreementOtp,
  getAgreementOtpExpiryDate,
  hashAgreementOtp,
} from "@/lib/deals/agreement-otp";
import { sendAgreementOtpEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications/createNotification";

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
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

function canAccessDeal(userId: string, deal: any) {
  return (
    String(deal.organizerId?._id || deal.organizerId) === userId ||
    String(deal.sponsorId?._id || deal.sponsorId) === userId
  );
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

function getDisplayName(user: any) {
  return (
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.companyName ||
    "User"
  );
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

function getVerificationByRole(agreement: any, role: "ORGANIZER" | "SPONSOR") {
  return role === "ORGANIZER"
    ? agreement.organizerVerification
    : agreement.sponsorVerification;
}

function getAgreementStatusAfterOtpSend(targetRole: "ORGANIZER" | "SPONSOR") {
  return targetRole === "ORGANIZER"
    ? "PENDING_ORGANIZER_OTP"
    : "PENDING_SPONSOR_OTP";
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

    const deal = await DealModel.findById(dealId).select(
      "_id organizerId sponsorId status"
    );

    if (!deal) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    const currentUserId = String(auth.user._id);

    if (!canAccessDeal(currentUserId, deal)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have access to this deal agreement",
        },
        { status: 403 }
      );
    }

    const agreement = await DealAgreementModel.findOne({
      dealId: deal._id,
      isDeleted: { $ne: true },
    }).select(
      "+organizerVerification.otpHash +organizerVerification.otpExpiresAt +organizerVerification.ipAddress +organizerVerification.userAgent +sponsorVerification.otpHash +sponsorVerification.otpExpiresAt +sponsorVerification.ipAddress +sponsorVerification.userAgent"
    );

    if (!agreement) {
      return NextResponse.json(
        {
          success: false,
          message: "Create agreement draft before requesting OTP",
        },
        { status: 404 }
      );
    }

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
        {
          success: false,
          message: "Agreement is not active for OTP verification",
        },
        { status: 400 }
      );
    }

    const currentUserRole = getRoleByUserId(currentUserId, agreement);

    if (!currentUserRole) {
      return NextResponse.json(
        { success: false, message: "Unable to determine your role in agreement" },
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

    let targetRole: "ORGANIZER" | "SPONSOR";

    if (counterpartyVerification?.otpStatus !== "VERIFIED") {
      targetRole = counterpartyRole;
    } else if (creatorVerification?.otpStatus !== "VERIFIED") {
      targetRole = creatorRole;
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement is already verified by both parties",
        },
        { status: 400 }
      );
    }

    if (currentUserRole !== targetRole) {
      return NextResponse.json(
        {
          success: false,
          message:
            targetRole === counterpartyRole
              ? "Counterparty must verify the agreement first"
              : "Agreement creator can verify only after counterparty verification",
        },
        { status: 403 }
      );
    }

    const targetVerification = getVerificationByRole(agreement, targetRole);

    if (targetVerification?.otpStatus === "VERIFIED") {
      return NextResponse.json(
        {
          success: false,
          message: "This party has already verified this agreement",
        },
        { status: 400 }
      );
    }

    if (!targetVerification?.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification email is missing for this party",
        },
        { status: 400 }
      );
    }

    const otp = generateAgreementOtp();
    const otpHash = hashAgreementOtp(otp);
    const otpExpiresAt = getAgreementOtpExpiryDate();
    const now = new Date();
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";

    targetVerification.otpHash = otpHash;
    targetVerification.otpStatus = "SENT";
    targetVerification.otpSentAt = now;
    targetVerification.otpExpiresAt = otpExpiresAt;
    targetVerification.ipAddress = ipAddress;
    targetVerification.userAgent = userAgent;

    agreement.status = getAgreementStatusAfterOtpSend(targetRole);

    await agreement.save();

    await sendAgreementOtpEmail({
      to: targetVerification.email,
      name: targetVerification.name || getDisplayName(auth.user),
      dealTitle: agreement.snapshot?.title || "Deal Agreement",
      otp,
      role: targetRole,
    });

    const otherPartyId =
      targetRole === "ORGANIZER"
        ? String(agreement.sponsorId)
        : String(agreement.organizerId);

    try {
      await createNotification({
        userId: otherPartyId,
        type: "DEAL_UPDATED",
        title: "Agreement OTP requested",
        message: "The other party requested an OTP to verify the deal agreement.",
        link: `/deals/${deal._id}/agreement`,
        metadata: {
          dealId: String(deal._id),
          agreementId: String(agreement._id),
          requestedBy: currentUserId,
          role: targetRole,
        },
      });
    } catch (notificationError) {
      console.error("Agreement OTP notification error:", notificationError);
    }

    const freshAgreement = await DealAgreementModel.findById(agreement._id);

    return NextResponse.json(
      {
        success: true,
        message: "Agreement OTP sent successfully",
        agreement: freshAgreement,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/deals/[id]/agreement/send-otp error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to send agreement OTP",
      },
      { status: 500 }
    );
  }
}