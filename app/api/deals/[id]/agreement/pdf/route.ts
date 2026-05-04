import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { DealModel } from "@/lib/models/Deal";
import { DealAgreementModel } from "@/lib/models/DealAgreement";
import { canAccessAgreement } from "@/lib/deals/agreement";
import { generateDealAgreementPdf } from "@/lib/deals/agreement-pdf";

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

function safePdfFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function GET(
  _request: NextRequest,
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
      "_id organizerId sponsorId status isDeleted"
    );

    if (!deal || deal.isDeleted === true) {
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
          message: "You do not have access to this deal agreement PDF",
        },
        { status: 403 }
      );
    }

    const agreement = await DealAgreementModel.findOne({
      dealId,
      isDeleted: { $ne: true },
    });

    if (!agreement) {
      return NextResponse.json(
        { success: false, message: "Agreement not found" },
        { status: 404 }
      );
    }

    if (!canAccessAgreement(currentUserId, agreement)) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this agreement" },
        { status: 403 }
      );
    }

       if (agreement.status !== "SIGNED") {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement PDF is available only after both parties sign",
        },
        { status: 400 }
      );
    }

    // Lock PDF generation timestamp only once.
    // First download after SIGNED will set pdfGeneratedAt.
    // Later downloads will reuse the same timestamp, so PDF date stays stable.
    let lockedAgreement = agreement;

    if (!agreement.pdfGeneratedAt) {
      const now = new Date();

      const updatedAgreement = await DealAgreementModel.findOneAndUpdate(
        {
          _id: agreement._id,
          status: "SIGNED",
          isDeleted: { $ne: true },
          $or: [
            { pdfGeneratedAt: { $exists: false } },
            { pdfGeneratedAt: null },
          ],
        },
        {
          $set: {
            pdfGeneratedAt: now,
          },
        },
        {
          new: true,
        }
      );

      if (updatedAgreement) {
        lockedAgreement = updatedAgreement;
      } else {
        const latestAgreement = await DealAgreementModel.findById(
          agreement._id
        );

        if (!latestAgreement) {
          return NextResponse.json(
            { success: false, message: "Agreement not found" },
            { status: 404 }
          );
        }

        lockedAgreement = latestAgreement;
      }
    }

    const pdfBuffer = await generateDealAgreementPdf(
      lockedAgreement.toObject()
    );

    const fileName = safePdfFileName(
      lockedAgreement.agreementNumber || `sponexus-agreement-${dealId}`
    );

       return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/deals/[id]/agreement/pdf error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate agreement PDF",
      },
      { status: 500 }
    );
  }
}