import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import SecurityEvent from "@/lib/models/SecurityEvent";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

const ALLOWED_SEVERITIES = new Set([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

function sanitizeSecurityEvent(event: any) {
  return {
    _id: String(event._id),
    userId: event.userId ? String(event.userId) : null,
    actorId: event.actorId ? String(event.actorId) : null,

    paymentId: event.relatedPaymentId ? String(event.relatedPaymentId) : null,
    subscriptionId: event.relatedSubscriptionId
      ? String(event.relatedSubscriptionId)
      : null,
    couponId: event.relatedCouponId ? String(event.relatedCouponId) : null,

    type: event.type ?? null,
    severity: event.severity ?? "LOW",
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
    route: event.route ?? null,
    method: event.method ?? null,
    fingerprint: event.fingerprint ?? null,
    notes: event.notes ?? "",
    metadata: event.metadata ?? {},
    resolved: Boolean(event.resolved),
    createdAt: event.createdAt ?? null,
    updatedAt: event.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const { searchParams } = new URL(request.url);

    const rawLimit = Number(searchParams.get("limit") || 20);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 20;

    const severity = searchParams.get("severity")?.trim().toUpperCase() || "";

    const query: Record<string, any> = {};

    if (severity && ALLOWED_SEVERITIES.has(severity)) {
      query.severity = severity;
    }

    const events = await SecurityEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return buildNoStoreResponse(
      {
        success: true,
        data: events.map((event: any) => sanitizeSecurityEvent(event)),
        paymentAccessSession: {
          id: String(access.paymentAccessSession._id),
          verifiedAt: access.paymentAccessSession.verifiedAt ?? null,
          sessionExpiresAt: access.paymentAccessSession.sessionExpiresAt ?? null,
          lastUsedAt: access.paymentAccessSession.lastUsedAt ?? null,
        },
      },
      200
    );
  } catch (err) {
    console.error("GET /api/admin/security/events error:", err);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch security events.",
      },
      500
    );
  }
}