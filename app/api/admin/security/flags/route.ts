import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import FraudFlag from "@/lib/models/FraudFlag";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function sanitizeFraudFlag(flag: any) {
  return {
    _id: String(flag._id),

    // 🔥 CRITICAL FOR ACTIONS
    userId: flag.userId ? String(flag.userId) : null,
    paymentId: flag.paymentId ? String(flag.paymentId) : null,
    subscriptionId: flag.subscriptionId
      ? String(flag.subscriptionId)
      : null,
    couponId: flag.couponId ? String(flag.couponId) : null,

    entityType: flag.entityType ?? null,
    entityId: flag.entityId ? String(flag.entityId) : null,

    title: flag.title ?? "",
    reason: flag.reason ?? "",
    severity: flag.severity ?? "LOW",
    status: flag.status ?? "OPEN",

    score: flag.score ?? null,
    signals: flag.signals ?? [],

    ipAddress: flag.ipAddress ?? null,
    fingerprint: flag.fingerprint ?? null,

    resolutionNote: flag.resolutionNote ?? null,
    resolvedAt: flag.resolvedAt ?? null,

    createdAt: flag.createdAt ?? null,
    updatedAt: flag.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const rawLimit = Number(searchParams.get("limit") || 20);

    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 20;

    const query: Record<string, any> = {};

    if (status === "OPEN" || status === "RESOLVED") {
      query.status = status;
    }

    const flags = await FraudFlag.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return buildNoStoreResponse(
      {
        success: true,
        data: flags.map((flag: any) => sanitizeFraudFlag(flag)),

        // 🔐 SESSION INFO (CONSISTENT WITH OTHER APIs)
        paymentAccessSession: {
          id: String(access.paymentAccessSession._id),
          verifiedAt: access.paymentAccessSession.verifiedAt ?? null,
          sessionExpiresAt:
            access.paymentAccessSession.sessionExpiresAt ?? null,
          lastUsedAt: access.paymentAccessSession.lastUsedAt ?? null,
        },
      },
      200
    );
  } catch (err) {
    console.error("GET /api/admin/security/flags error:", err);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch fraud flags.",
      },
      500
    );
  }
}