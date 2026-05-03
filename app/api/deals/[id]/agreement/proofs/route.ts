import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import { DealModel } from "@/lib/models/Deal";
import { DealAgreementModel } from "@/lib/models/DealAgreement";
import { canAccessAgreement } from "@/lib/deals/agreement";
import { getCloudinary } from "@/lib/cloudinary";
import { createNotification } from "@/lib/notifications/createNotification";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PROOF_FILES = 10;
const MAX_TRANSACTION_ID_LENGTH = 150;
const MAX_PAYMENT_MODE_LENGTH = 100;
const MAX_NOTE_LENGTH = 1000;
const MAX_LABEL_LENGTH = 100;
const MAX_PAID_AMOUNT = 100000000;

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function isValidAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return false;

  const raw = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return false;

  const amount = Number(raw);

  if (!Number.isFinite(amount)) return false;
  if (amount <= 0) return false;
  if (amount > MAX_PAID_AMOUNT) return false;

  return true;
}

function parseAmount(value: unknown) {
  return Math.round(Number(value) * 100) / 100;
}

function parsePaymentDate(value: unknown) {
  const raw = normalizeString(value);

  if (!raw) return null;

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function canAccessDeal(userId: string, deal: any) {
  return (
    String(deal.organizerId?._id || deal.organizerId) === userId ||
    String(deal.sponsorId?._id || deal.sponsorId) === userId
  );
}

function getOtherPartyId(userId: string, deal: any) {
  const organizerId = String(deal.organizerId?._id || deal.organizerId);
  const sponsorId = String(deal.sponsorId?._id || deal.sponsorId);

  return organizerId === userId ? sponsorId : organizerId;
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

async function uploadBufferToCloudinary({
  buffer,
  folder,
  publicId,
  fileType,
}: {
  buffer: Buffer;
  folder: string;
  publicId: string;
  fileType: string;
}) {
  const cloudinary = getCloudinary();

  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "auto",
        overwrite: false,
        use_filename: false,
        unique_filename: true,
        tags: ["sponexus", "deal-agreement", "payment-proof"],
        context: {
          source: "sponexus_deal_agreement_payment_proof",
          file_type: fileType,
        },
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
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
      "_id organizerId sponsorId status paymentStatus isDeleted"
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
        { success: false, message: "You do not have access to this deal" },
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

    return NextResponse.json(
      {
        success: true,
        proofFiles: agreement.proofFiles || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/deals/[id]/agreement/proofs error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch payment proofs",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let uploadedPublicId = "";
  let uploadedResourceType: "image" | "raw" | "video" = "image";

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
      "_id organizerId sponsorId status paymentStatus isDeleted"
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
          message: "You do not have access to upload proof for this deal",
        },
        { status: 403 }
      );
    }

    if (deal.status !== "accepted" && deal.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          message: "Payment proof can be uploaded only after deal acceptance",
        },
        { status: 400 }
      );
    }

    const agreement = await DealAgreementModel.findOne({
      dealId,
      isDeleted: { $ne: true },
    });

    if (!agreement) {
      return NextResponse.json(
        {
          success: false,
          message: "Agreement must be created before uploading payment proof",
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

    if (agreement.status === "CANCELLED" || agreement.status === "EXPIRED") {
      return NextResponse.json(
        {
          success: false,
          message: "Payment proof cannot be uploaded for inactive agreement",
        },
        { status: 400 }
      );
    }

    if ((agreement.proofFiles || []).length >= MAX_PROOF_FILES) {
      return NextResponse.json(
        {
          success: false,
          message: `Proof files cannot exceed ${MAX_PROOF_FILES}`,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const label = normalizeString(formData.get("label")) || "Payment Proof";
    const transactionId = normalizeString(formData.get("transactionId"));
    const paidAmountRaw = formData.get("paidAmount");
    const paymentDateRaw = formData.get("paymentDate");
    const paymentMode = normalizeString(formData.get("paymentMode"));
    const note = normalizeString(formData.get("note"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Payment proof file is required" },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, message: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size cannot exceed 10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only JPG, PNG, WEBP, or PDF payment proof is allowed",
        },
        { status: 400 }
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        { success: false, message: "Transaction ID / UTR is required" },
        { status: 400 }
      );
    }

    if (transactionId.length > MAX_TRANSACTION_ID_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Transaction ID cannot exceed ${MAX_TRANSACTION_ID_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    const duplicateTransaction = (agreement.proofFiles || []).some((proof: any) => {
  return (
    String(proof.transactionId || "").trim().toLowerCase() ===
    transactionId.toLowerCase()
  );
});

if (duplicateTransaction) {
  return NextResponse.json(
    {
      success: false,
      message: "This transaction ID / UTR has already been submitted",
    },
    { status: 409 }
  );
}

    if (!isValidAmount(paidAmountRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "Paid amount must be greater than 0 and valid",
        },
        { status: 400 }
      );
    }

    if (label.length > MAX_LABEL_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Label cannot exceed ${MAX_LABEL_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (paymentMode.length > MAX_PAYMENT_MODE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment mode cannot exceed ${MAX_PAYMENT_MODE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Note cannot exceed ${MAX_NOTE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    const paymentDate = parsePaymentDate(paymentDateRaw);

    if (normalizeString(paymentDateRaw) && !paymentDate) {
      return NextResponse.json(
        { success: false, message: "Invalid payment date" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const folder = `sponexus/deals/${dealId}/payment-proofs`;
    const safeAgreementNumber = String(
      agreement.agreementNumber || "agreement"
    ).replace(/[^a-zA-Z0-9-_]/g, "-");

    const publicId = `${safeAgreementNumber}-${Date.now()}`;

    const uploadResult = await uploadBufferToCloudinary({
      buffer,
      folder,
      publicId,
      fileType: file.type,
    });

    uploadedPublicId = uploadResult.public_id || "";
    uploadedResourceType = uploadResult.resource_type || "image";

    const proof = {
      label,
      fileUrl: uploadResult.secure_url,
      fileType: file.type,
      cloudinaryPublicId: uploadedPublicId,

      transactionId,
      paidAmount: parseAmount(paidAmountRaw),
      paymentDate,
      paymentMode,
      note,

      status: "SUBMITTED",

      uploadedBy: auth.user._id,
      uploadedAt: new Date(),

      reviewedBy: null,
      reviewedAt: null,
      reviewNote: "",
    };

    agreement.proofFiles.push(proof as any);

    await agreement.save();

    if (deal.paymentStatus !== "paid") {
      await DealModel.updateOne(
        { _id: deal._id },
        {
          $set: {
            paymentStatus: "pending",
            lastActionBy: auth.user._id,
          },
        }
      );
    }

    const otherPartyId = getOtherPartyId(currentUserId, deal);

    try {
      await createNotification({
        userId: otherPartyId,
        type: "DEAL_UPDATED",
        title: "Payment proof submitted",
        message:
          "The other party uploaded a payment proof for this deal agreement.",
        link: `/deals/${dealId}/agreement`,
        metadata: {
          dealId,
          agreementId: String(agreement._id),
          uploadedBy: currentUserId,
          transactionId,
          paidAmount: parseAmount(paidAmountRaw),
        },
      });
    } catch (notificationError) {
      console.error("Payment proof notification error:", notificationError);
    }

    const freshAgreement = await DealAgreementModel.findById(agreement._id);

    return NextResponse.json(
      {
        success: true,
        message: "Payment proof uploaded successfully",
        proof,
        agreement: freshAgreement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/deals/[id]/agreement/proofs error:", error);

    if (uploadedPublicId) {
      try {
        const cloudinary = getCloudinary();
await cloudinary.uploader.destroy(uploadedPublicId, {
  resource_type: uploadedResourceType,
});
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload payment proof",
      },
      { status: 500 }
    );
  }
}