// types/deal-agreement.ts

export type DealAgreementStatus =
  | "DRAFT"
  | "PENDING_ORGANIZER_OTP"
  | "PENDING_SPONSOR_OTP"
  | "PENDING_BOTH_OTP"
  | "SIGNED"
  | "CANCELLED"
  | "EXPIRED";

export type DealAgreementPartyRole = "ORGANIZER" | "SPONSOR";

export type DealAgreementOtpStatus =
  | "NOT_SENT"
  | "SENT"
  | "VERIFIED"
  | "EXPIRED";

export type DealAgreementProofStatus =
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export interface DealAgreementPartyVerification {
  role: DealAgreementPartyRole;
  userId: string;
  email: string;
  name?: string;
  companyName?: string;
  otpStatus: DealAgreementOtpStatus;
  otpSentAt: string | null;
  otpVerifiedAt: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface DealAgreementSnapshotParty {
  userId: string;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

export interface DealAgreementSnapshotEvent {
  eventId: string;
  title?: string;
  location?: string;
  startDate?: string | null;
}

export interface DealAgreementSnapshot {
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

  organizer: DealAgreementSnapshotParty;
  sponsor: DealAgreementSnapshotParty;
  event: DealAgreementSnapshotEvent;

  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealAgreementProof {
  label: string;
  fileUrl: string;
  fileType?: string;
  cloudinaryPublicId?: string;

  transactionId?: string;
  paidAmount?: number | null;
  paymentDate?: string | null;
  paymentMode?: string;
  note?: string;

  status?: DealAgreementProofStatus;

  uploadedBy: string;
  uploadedAt: string;

  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
}

export interface DealAgreement {
  _id: string;
  dealId: string;

  agreementNumber: string;
  status: DealAgreementStatus;

  createdBy: string;
  organizerId: string;
  sponsorId: string;

  snapshot: DealAgreementSnapshot;

  organizerVerification: DealAgreementPartyVerification;
  sponsorVerification: DealAgreementPartyVerification;

  proofFiles: DealAgreementProof[];

  pdfUrl?: string;
  signedAt: string | null;
  expiresAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface DealAgreementResponse {
  success: boolean;
  agreement?: DealAgreement | null;
  message?: string;
}

export interface CreateDealAgreementPayload {
  proofFiles?: DealAgreementProof[];
}

export interface VerifyDealAgreementOtpPayload {
  otp: string;
}