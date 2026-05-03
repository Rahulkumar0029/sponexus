import mongoose, { Schema, Types, model, models } from "mongoose";

export type DealAgreementStatus =
  | "DRAFT"
  | "PENDING_ORGANIZER_OTP"
  | "PENDING_SPONSOR_OTP"
  | "PENDING_BOTH_OTP"
  | "SIGNED"
  | "CANCELLED"
  | "EXPIRED";

export type DealAgreementOtpStatus =
  | "NOT_SENT"
  | "SENT"
  | "VERIFIED"
  | "EXPIRED";

export type DealAgreementPartyRole = "ORGANIZER" | "SPONSOR";

export type DealAgreementProofStatus =
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export interface IDealAgreementPartyVerification {
  role: DealAgreementPartyRole;
  userId: Types.ObjectId;
  email: string;
  name: string;
  companyName: string;
  otpHash: string;
  otpStatus: DealAgreementOtpStatus;
  otpSentAt: Date | null;
  otpExpiresAt: Date | null;
  otpVerifiedAt: Date | null;
  ipAddress: string;
  userAgent: string;
}

export interface IDealAgreementProof {
  label: string;
  fileUrl: string;
  fileType: string;
  cloudinaryPublicId: string;

  transactionId: string;
  paidAmount: number | null;
  paymentDate: Date | null;
  paymentMode: string;
  note: string;

  status: DealAgreementProofStatus;

  uploadedBy: Types.ObjectId;
  uploadedAt: Date;

  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  reviewNote: string;
}

export interface IDealAgreement extends mongoose.Document {
  dealId: Types.ObjectId;
  agreementNumber: string;
  status: DealAgreementStatus;

  createdBy: Types.ObjectId;
  organizerId: Types.ObjectId;
  sponsorId: Types.ObjectId;

  snapshot: {
    dealId: string;
    createdBy: string;

    title: string;
    description: string;

    proposedAmount: number;
    finalAmount: number | null;
    paymentStatus: "unpaid" | "pending" | "paid";

    message: string;
    notes: string;
    deliverables: string[];

    organizer: {
      userId: string;
      name: string;
      companyName: string;
      email: string;
      phone: string;
    };

    sponsor: {
      userId: string;
      name: string;
      companyName: string;
      email: string;
      phone: string;
    };

    event: {
      eventId: string;
      title: string;
      location: string;
      startDate: string | null;
    };

    acceptedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };

  organizerVerification: IDealAgreementPartyVerification;
  sponsorVerification: IDealAgreementPartyVerification;

  proofFiles: IDealAgreementProof[];

  pdfUrl: string;
  signedAt: Date | null;
  expiresAt: Date | null;

  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const MAX_TEXT = 5000;
const MAX_PROOF_FILES = 10;

const partyVerificationSchema = new Schema<IDealAgreementPartyVerification>(
  {
    role: {
      type: String,
      enum: ["ORGANIZER", "SPONSOR"],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    otpHash: {
      type: String,
      default: "",
      select: false,
    },
    otpStatus: {
      type: String,
      enum: ["NOT_SENT", "SENT", "VERIFIED", "EXPIRED"],
      default: "NOT_SENT",
    },
    otpSentAt: {
      type: Date,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
  },
  { _id: false }
);

const proofFileSchema = new Schema<IDealAgreementProof>(
  {
    label: {
      type: String,
      trim: true,
      default: "Payment Proof",
      maxlength: 100,
    },

    fileUrl: {
      type: String,
      trim: true,
      required: true,
      maxlength: 1000,
    },

    fileType: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    cloudinaryPublicId: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    transactionId: {
      type: String,
      trim: true,
      required: true,
      maxlength: 150,
    },

    paidAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    paymentMode: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["SUBMITTED", "VERIFIED", "REJECTED"],
      default: "SUBMITTED",
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },
  { _id: false }
);

const dealAgreementSchema = new Schema<IDealAgreement>(
  {
    dealId: {
      type: Schema.Types.ObjectId,
      ref: "Deal",
      required: true,
      unique: true,
    },

    agreementNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING_ORGANIZER_OTP",
        "PENDING_SPONSOR_OTP",
        "PENDING_BOTH_OTP",
        "SIGNED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "DRAFT",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sponsorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    snapshot: {
      dealId: { type: String, required: true },
      createdBy: { type: String, required: true },

      title: { type: String, trim: true, default: "", maxlength: 200 },
      description: { type: String, trim: true, default: "", maxlength: MAX_TEXT },

      proposedAmount: { type: Number, required: true, min: 0 },
      finalAmount: { type: Number, default: null, min: 0 },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "pending", "paid"],
        default: "unpaid",
      },

      message: { type: String, trim: true, default: "", maxlength: MAX_TEXT },
      notes: { type: String, trim: true, default: "", maxlength: MAX_TEXT },
      deliverables: { type: [String], default: [] },

      organizer: {
        userId: { type: String, required: true },
        name: { type: String, trim: true, default: "" },
        companyName: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, lowercase: true, default: "" },
        phone: { type: String, trim: true, default: "" },
      },

      sponsor: {
        userId: { type: String, required: true },
        name: { type: String, trim: true, default: "" },
        companyName: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, lowercase: true, default: "" },
        phone: { type: String, trim: true, default: "" },
      },

      event: {
        eventId: { type: String, required: true },
        title: { type: String, trim: true, default: "" },
        location: { type: String, trim: true, default: "" },
        startDate: { type: String, default: null },
      },

      acceptedAt: { type: String, default: null },
      completedAt: { type: String, default: null },
      createdAt: { type: String, required: true },
      updatedAt: { type: String, required: true },
    },

    organizerVerification: {
      type: partyVerificationSchema,
      required: true,
    },

    sponsorVerification: {
      type: partyVerificationSchema,
      required: true,
    },

    proofFiles: {
      type: [proofFileSchema],
      default: [],
      validate: {
        validator(value: IDealAgreementProof[]) {
          return Array.isArray(value) && value.length <= MAX_PROOF_FILES;
        },
        message: `Proof files cannot exceed ${MAX_PROOF_FILES}`,
      },
    },

    pdfUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    signedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    minimize: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.organizerVerification?.otpHash;
        delete ret.organizerVerification?.otpExpiresAt;
        delete ret.organizerVerification?.ipAddress;
        delete ret.organizerVerification?.userAgent;

        delete ret.sponsorVerification?.otpHash;
        delete ret.sponsorVerification?.otpExpiresAt;
        delete ret.sponsorVerification?.ipAddress;
        delete ret.sponsorVerification?.userAgent;

        delete ret.deletedAt;
        delete ret.deletedBy;

        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.organizerVerification?.otpHash;
        delete ret.organizerVerification?.otpExpiresAt;
        delete ret.organizerVerification?.ipAddress;
        delete ret.organizerVerification?.userAgent;

        delete ret.sponsorVerification?.otpHash;
        delete ret.sponsorVerification?.otpExpiresAt;
        delete ret.sponsorVerification?.ipAddress;
        delete ret.sponsorVerification?.userAgent;

        delete ret.deletedAt;
        delete ret.deletedBy;

        return ret;
      },
    },
  }
);

dealAgreementSchema.index({ dealId: 1 }, { unique: true });
dealAgreementSchema.index({ agreementNumber: 1 }, { unique: true });
dealAgreementSchema.index({ organizerId: 1, status: 1, updatedAt: -1 });
dealAgreementSchema.index({ sponsorId: 1, status: 1, updatedAt: -1 });
dealAgreementSchema.index({ createdBy: 1, createdAt: -1 });
dealAgreementSchema.index({ status: 1, updatedAt: -1 });
dealAgreementSchema.index({ expiresAt: 1 });
dealAgreementSchema.index({ isDeleted: 1, status: 1, updatedAt: -1 });
dealAgreementSchema.index({ "proofFiles.transactionId": 1 });
dealAgreementSchema.index({ "proofFiles.status": 1, updatedAt: -1 });

dealAgreementSchema.pre("validate", function (next) {
  if (
    this.organizerId &&
    this.sponsorId &&
    String(this.organizerId) === String(this.sponsorId)
  ) {
    return next(new Error("Organizer and sponsor cannot be the same user"));
  }

  if (
    this.organizerVerification?.otpStatus === "VERIFIED" &&
    this.sponsorVerification?.otpStatus === "VERIFIED"
  ) {
    this.status = "SIGNED";
    if (!this.signedAt) {
      this.signedAt = new Date();
    }
  }

  if (!this.isDeleted) {
    this.deletedAt = null;
    this.deletedBy = null;
  }

  next();
});

export const DealAgreementModel =
  (models.DealAgreement as mongoose.Model<IDealAgreement>) ||
  model<IDealAgreement>("DealAgreement", dealAgreementSchema);