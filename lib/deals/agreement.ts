import crypto from "crypto";
import { Types } from "mongoose";

import { DealAgreementModel } from "@/lib/models/DealAgreement";

function toSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toId(value: any) {
  return String(value?._id || value || "");
}

function toIsoString(value: unknown) {
  if (!value) return null;

  const date = new Date(value as any);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function buildAgreementNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `SPX-AGR-${year}-${random}`;
}

function getUserName(user: any) {
  return (
    toSafeString(user?.name) ||
    [toSafeString(user?.firstName), toSafeString(user?.lastName)]
      .filter(Boolean)
      .join(" ") ||
    toSafeString(user?.companyName)
  );
}

function getPaymentStatus(value: unknown): "unpaid" | "pending" | "paid" {
  if (value === "pending" || value === "paid") return value;
  return "unpaid";
}

function validateDealAgreementRequirements(deal: any) {
  const errors: string[] = [];

  const status = String(deal?.status || "");

  if (status !== "accepted" && status !== "completed") {
    errors.push("Agreement can be created only after deal acceptance");
  }

  if (typeof deal?.finalAmount !== "number" || !Number.isFinite(deal.finalAmount)) {
    errors.push("Final amount is required before agreement");
  }

  if (typeof deal?.finalAmount === "number" && deal.finalAmount <= 0) {
    errors.push("Final amount must be greater than 0");
  }

  if (!Array.isArray(deal?.deliverables) || deal.deliverables.length === 0) {
    errors.push("At least one final deliverable is required before agreement");
  }

  const organizer = deal?.organizerId || deal?.organizer || {};
  const sponsor = deal?.sponsorId || deal?.sponsor || {};
  const event = deal?.eventId || deal?.event || {};

  const organizerId = toId(organizer);
  const sponsorId = toId(sponsor);
  const eventId = toId(event);

  if (!Types.ObjectId.isValid(organizerId)) {
    errors.push("Agreement requires valid organizer");
  }

  if (!Types.ObjectId.isValid(sponsorId)) {
    errors.push("Agreement requires valid sponsor");
  }

  if (organizerId && sponsorId && organizerId === sponsorId) {
    errors.push("Organizer and sponsor cannot be the same user");
  }

  if (!Types.ObjectId.isValid(eventId)) {
    errors.push("Agreement requires valid event");
  }

  if (!toSafeString(organizer?.email)) {
    errors.push("Organizer email is required before agreement");
  }

  if (!toSafeString(sponsor?.email)) {
    errors.push("Sponsor email is required before agreement");
  }

  if (!toSafeString(event?.title)) {
    errors.push("Linked event title is required before agreement");
  }

  return errors;
}

export function canCreateDealAgreement(deal: any) {
  return validateDealAgreementRequirements(deal).length === 0;
}

export function buildDealAgreementSnapshot(deal: any) {
  const organizer = deal?.organizerId || deal?.organizer || {};
  const sponsor = deal?.sponsorId || deal?.sponsor || {};
  const event = deal?.eventId || deal?.event || {};

  const deliverables = Array.isArray(deal?.deliverables)
    ? deal.deliverables
        .map((item: unknown) => toSafeString(item))
        .filter(Boolean)
    : [];

  return {
    dealId: toId(deal),
    createdBy: toId(deal?.createdBy),

    title: toSafeString(deal?.title),
    description: toSafeString(deal?.description),

    proposedAmount:
      typeof deal?.proposedAmount === "number" && Number.isFinite(deal.proposedAmount)
        ? deal.proposedAmount
        : 0,

    finalAmount:
      typeof deal?.finalAmount === "number" && Number.isFinite(deal.finalAmount)
        ? deal.finalAmount
        : null,

    paymentStatus: getPaymentStatus(deal?.paymentStatus),

    message: toSafeString(deal?.message),
    notes: toSafeString(deal?.notes),
    deliverables,

    organizer: {
      userId: toId(organizer),
      name: getUserName(organizer),
      companyName: toSafeString(organizer?.companyName),
      email: toSafeString(organizer?.email).toLowerCase(),
      phone: toSafeString(organizer?.phone),
    },

    sponsor: {
      userId: toId(sponsor),
      name: getUserName(sponsor),
      companyName: toSafeString(sponsor?.companyName),
      email: toSafeString(sponsor?.email).toLowerCase(),
      phone: toSafeString(sponsor?.phone),
    },

    event: {
      eventId: toId(event),
      title: toSafeString(event?.title),
      location: toSafeString(event?.location),
      startDate: toIsoString(event?.startDate),
    },

    acceptedAt: toIsoString(deal?.acceptedAt),
    completedAt: toIsoString(deal?.completedAt),
    createdAt: toIsoString(deal?.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(deal?.updatedAt) || new Date().toISOString(),
  };
}

export async function createOrGetDealAgreement({
  deal,
  createdBy,
}: {
  deal: any;
  createdBy: string;
}) {
  const existingAgreement = await DealAgreementModel.findOne({
    dealId: deal._id,
    isDeleted: { $ne: true },
  });

  if (existingAgreement) {
    return existingAgreement;
  }

  if (!Types.ObjectId.isValid(createdBy)) {
    throw new Error("Agreement requires valid creator");
  }

  const validationErrors = validateDealAgreementRequirements(deal);

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(", "));
  }

  const organizer = deal.organizerId || deal.organizer;
  const sponsor = deal.sponsorId || deal.sponsor;

  const organizerId = toId(organizer);
  const sponsorId = toId(sponsor);

  const snapshot = buildDealAgreementSnapshot(deal);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return DealAgreementModel.create({
    dealId: deal._id,
    agreementNumber: buildAgreementNumber(),
    status: "DRAFT",

    createdBy,
    organizerId,
    sponsorId,

    snapshot,

    organizerVerification: {
      role: "ORGANIZER",
      userId: organizerId,
      email: snapshot.organizer.email,
      name: snapshot.organizer.name,
      companyName: snapshot.organizer.companyName,
      otpHash: "",
      otpStatus: "NOT_SENT",
      otpSentAt: null,
      otpExpiresAt: null,
      otpVerifiedAt: null,
      ipAddress: "",
      userAgent: "",
    },

    sponsorVerification: {
      role: "SPONSOR",
      userId: sponsorId,
      email: snapshot.sponsor.email,
      name: snapshot.sponsor.name,
      companyName: snapshot.sponsor.companyName,
      otpHash: "",
      otpStatus: "NOT_SENT",
      otpSentAt: null,
      otpExpiresAt: null,
      otpVerifiedAt: null,
      ipAddress: "",
      userAgent: "",
    },

    proofFiles: [],

    // PDF lock fields
    // pdfGeneratedAt remains null until the final signed PDF is generated first time.
    // After generation, PDF route should store this timestamp and never change it again.
    pdfUrl: "",
    pdfGeneratedAt: null,

    signedAt: null,
    expiresAt,
  });
}

export function canAccessAgreement(userId: string, agreement: any) {
  return (
    String(agreement?.organizerId?._id || agreement?.organizerId) === userId ||
    String(agreement?.sponsorId?._id || agreement?.sponsorId) === userId
  );
}

export function getAgreementRole(
  userId: string,
  agreement: any
): "ORGANIZER" | "SPONSOR" | null {
  if (String(agreement?.organizerId?._id || agreement?.organizerId) === userId) {
    return "ORGANIZER";
  }

  if (String(agreement?.sponsorId?._id || agreement?.sponsorId) === userId) {
    return "SPONSOR";
  }

  return null;
}