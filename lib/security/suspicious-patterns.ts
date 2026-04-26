import crypto from "crypto";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

import SecurityEvent from "@/lib/models/SecurityEvent";
import FraudFlag from "@/lib/models/FraudFlag";
import {
  assessFraud,
  shouldFlagForManualReview,
  shouldHardBlockFraud,
} from "@/lib/security/fraud";

/* ===============================
   TYPES
=================================*/
type SuspiciousPatternInput = {
  request?: NextRequest | null;
  userId?: string | mongoose.Types.ObjectId | null;
  actorId?: string | mongoose.Types.ObjectId | null;

  paymentId?: string | mongoose.Types.ObjectId | null;
  subscriptionId?: string | mongoose.Types.ObjectId | null;
  couponId?: string | mongoose.Types.ObjectId | null;

  title: string;
  reason: string;

  securityEventType:
    | "LOGIN_FAILED"
    | "LOGIN_RATE_LIMITED"
    | "OTP_REQUESTED"
    | "OTP_VERIFICATION_FAILED"
    | "OTP_SESSION_LOCKED"
    | "PAYMENT_CREATE_ORDER_ABUSE"
    | "PAYMENT_VERIFY_FAILED"
    | "PAYMENT_INVALID_SIGNATURE"
    | "PAYMENT_DUPLICATE_DETECTED"
    | "PAYMENT_REPLAY_BLOCKED"
    | "PAYMENT_ORDER_MISMATCH"
    | "PAYMENT_INVALID_AMOUNT"
    | "PAYMENT_MANUAL_REVIEW"
    | "WEBHOOK_INVALID_SIGNATURE"
    | "WEBHOOK_NO_MATCH"
    | "WEBHOOK_DUPLICATE_PAYMENT_ID"
    | "WEBHOOK_ORDER_MISMATCH"
    | "COUPON_ABUSE"
    | "SUBSCRIPTION_ABUSE"
    | "ADMIN_PAYMENT_ACCESS_DENIED"
    | "SUSPICIOUS_ACTIVITY";

  entityType:
    | "USER"
    | "PAYMENT"
    | "SUBSCRIPTION"
    | "COUPON"
    | "WEBHOOK"
    | "ADMIN_SESSION"
    | "SYSTEM";

  entityId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, any>;

  recentCheckoutCount?: number;
  recentVerifyCount?: number;
  recentFailureCount?: number;
  recentCreateOrderCount?: number;
  duplicatePaymentDetected?: boolean;
  orderMismatch?: boolean;
  invalidSignature?: boolean;
  missingGatewayOrder?: boolean;
  rapidRepeatRenewal?: boolean;
  webhookNoMatch?: boolean;
  webhookInvalidSignature?: boolean;
  invalidAmount?: boolean;
  couponAbusePattern?: boolean;
};

type SuspiciousPatternResult = {
  suspicious: boolean;
  score: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  signals: string[];
  reasons: string[];
  recommendManualReview: boolean;
  hardBlock: boolean;
  securityEventId: string | null;
  fraudFlagId: string | null;
};

/* ===============================
   HELPERS
=================================*/
function toObjectIdOrNull(
  value?: string | mongoose.Types.ObjectId | null
) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

function getIpAddress(request?: NextRequest | null) {
  if (!request) return null;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  const real = request.headers.get("x-real-ip");
  return real?.trim() || null;
}

function getUserAgent(request?: NextRequest | null) {
  return request?.headers.get("user-agent")?.trim() || null;
}

/* ===============================
   STRONG FINGERPRINT
=================================*/
function buildFingerprint({
  ip,
  ua,
  userId,
  route,
}: {
  ip?: string | null;
  ua?: string | null;
  userId?: any;
  route?: string | null;
}) {
  const raw = [ip || "", ua || "", userId || "", route || ""].join("|");
  if (!raw) return null;

  return crypto.createHash("sha256").update(raw).digest("hex");
}

/* ===============================
   RATE LIMIT LOGGING
=================================*/
const RATE_LIMIT_MS = 5000;

async function shouldLogEvent({
  fingerprint,
  type,
}: {
  fingerprint: string | null;
  type: string;
}) {
  if (!fingerprint) return true;

  const recent = await SecurityEvent.findOne({
    fingerprint,
    type,
    createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_MS) },
  }).select("_id");

  return !recent;
}

/* ===============================
   MAIN FUNCTION
=================================*/
export async function detectAndRecordSuspiciousPattern(
  input: SuspiciousPatternInput
): Promise<SuspiciousPatternResult> {
  const assessment = assessFraud({
    recentCheckoutCount: input.recentCheckoutCount,
    recentVerifyCount: input.recentVerifyCount,
    recentFailureCount: input.recentFailureCount,
    recentCreateOrderCount: input.recentCreateOrderCount,
    duplicatePaymentDetected: input.duplicatePaymentDetected,
    orderMismatch: input.orderMismatch,
    invalidSignature: input.invalidSignature,
    missingGatewayOrder: input.missingGatewayOrder,
    rapidRepeatRenewal: input.rapidRepeatRenewal,
    webhookNoMatch: input.webhookNoMatch,
    webhookInvalidSignature: input.webhookInvalidSignature,
    invalidAmount: input.invalidAmount,
    couponAbusePattern: input.couponAbusePattern,
  });

  const ip = getIpAddress(input.request);
  const ua = getUserAgent(input.request);
  const route = input.request?.nextUrl?.pathname || null;
  const method = input.request?.method || null;

  const fingerprint = buildFingerprint({
    ip,
    ua,
    userId: input.userId,
    route,
  });

  /* ===============================
     REPEAT OFFENDER DETECTION
  =================================*/
  let repeatOffender = false;

  if (fingerprint) {
    const count = await SecurityEvent.countDocuments({
      fingerprint,
      createdAt: {
        $gte: new Date(Date.now() - 1000 * 60 * 10),
      },
    });

    if (count >= 5) repeatOffender = true;
  }

  /* ===============================
     HARD BLOCK ESCALATION
  =================================*/
  let hardBlock = shouldHardBlockFraud(assessment);

  if (!hardBlock && fingerprint) {
    const criticalEvents = await SecurityEvent.countDocuments({
      fingerprint,
      severity: "CRITICAL",
      createdAt: {
        $gte: new Date(Date.now() - 1000 * 60 * 30),
      },
    });

    if (criticalEvents >= 3) {
      hardBlock = true;
    }
  }

  const finalSeverity = repeatOffender
    ? "CRITICAL"
    : assessment.severity;

  /* ===============================
     SECURITY EVENT
  =================================*/
  let securityEvent = null;

  const canLog = await shouldLogEvent({
    fingerprint,
    type: input.securityEventType,
  });

  if (canLog) {
    securityEvent = await SecurityEvent.create({
      userId: toObjectIdOrNull(input.userId),
      actorId: toObjectIdOrNull(input.actorId),
      type: input.securityEventType,
      severity: finalSeverity,
      ipAddress: ip,
      userAgent: ua,
      route,
      method,
      relatedPaymentId: toObjectIdOrNull(input.paymentId),
      relatedSubscriptionId: toObjectIdOrNull(input.subscriptionId),
      relatedCouponId: toObjectIdOrNull(input.couponId),
      fingerprint,
      notes: input.reason,
      metadata: {
        ...(input.metadata || {}),
        fraudScore: assessment.score,
        fraudSignals: assessment.signals,
        fraudReasons: assessment.reasons,
      },
      resolved: false,
    });
  }

  /* ===============================
     FRAUD FLAG
  =================================*/
  let fraudFlagId: string | null = null;

  const existingFlag = await FraudFlag.findOne({
    fingerprint,
    status: "OPEN",
  });

  if (
    !existingFlag &&
    (shouldFlagForManualReview(assessment) || repeatOffender)
  ) {
    const flag = await FraudFlag.create({
      entityType: input.entityType,
      entityId: toObjectIdOrNull(input.entityId),
      userId: toObjectIdOrNull(input.userId),
      paymentId: toObjectIdOrNull(input.paymentId),
      subscriptionId: toObjectIdOrNull(input.subscriptionId),
      couponId: toObjectIdOrNull(input.couponId),
      securityEventId: securityEvent?._id || null,
      title: input.title,
      reason: input.reason,
      signals: assessment.signals,
      severity: finalSeverity,
      score: assessment.score,
      status: "OPEN",
      ipAddress: ip,
      fingerprint,
      metadata: {
        ...(input.metadata || {}),
        fraudReasons: assessment.reasons,
      },
    });

    fraudFlagId = String(flag._id);
  }

  return {
    suspicious: assessment.suspicious,
    score: assessment.score,
    severity: finalSeverity,
    signals: assessment.signals,
    reasons: assessment.reasons,
    recommendManualReview: assessment.recommendManualReview,
    hardBlock,
    securityEventId: securityEvent ? String(securityEvent._id) : null,
    fraudFlagId,
  };
}