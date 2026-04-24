import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";

type PlanSnapshotLike = {
  code?: string | null;
  name?: string | null;
  role?: string | null;
};

/* ===============================
   RESPONSE BUILDER
=================================*/
function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

/* ===============================
   DATE PARSER
=================================*/
function parseDateParam(value: string | null, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

/* ===============================
   MAIN HANDLER
=================================*/
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const searchParams = request.nextUrl.searchParams;
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"), true);

    const match: Record<string, any> = {
      status: "SUCCESS",
    };

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lte = to;
    }

    const payments = await PaymentTransaction.find(match)
      .select(
        "_id planId role transactionType amountBeforeDiscount couponCode couponDiscountAmount amount createdAt planSnapshot"
      )
      .lean();

    let totalGrossRevenue = 0;
    let totalDiscountGiven = 0;
    let totalNetRevenue = 0;
    let totalSuccessfulPayments = 0;
    let totalNewSubscriptionRevenue = 0;
    let totalRenewalRevenue = 0;

    const planMap = new Map<
      string,
      {
        planId: string;
        code: string | null;
        name: string | null;
        role: string | null;
        totalGrossRevenue: number;
        totalDiscountGiven: number;
        totalNetRevenue: number;
        successfulPayments: number;
      }
    >();

    const couponMap = new Map<
      string,
      {
        code: string;
        successfulPayments: number;
        totalDiscountGiven: number;
        totalNetRevenue: number;
      }
    >();

    for (const payment of payments) {
      const gross = Number(payment.amountBeforeDiscount ?? 0);
      const discount = Number(payment.couponDiscountAmount ?? 0);
      const net = Number(payment.amount ?? 0);

      totalGrossRevenue += gross;
      totalDiscountGiven += discount;
      totalNetRevenue += net;
      totalSuccessfulPayments++;

      if (payment.transactionType === "RENEWAL") {
        totalRenewalRevenue += net;
      } else {
        totalNewSubscriptionRevenue += net;
      }

      const planId = payment.planId ? String(payment.planId) : "UNKNOWN_PLAN";

      const snapshot: PlanSnapshotLike =
        payment.planSnapshot &&
        typeof payment.planSnapshot === "object" &&
        !Array.isArray(payment.planSnapshot)
          ? (payment.planSnapshot as PlanSnapshotLike)
          : {};

      const existingPlan = planMap.get(planId);

      if (existingPlan) {
        existingPlan.totalGrossRevenue += gross;
        existingPlan.totalDiscountGiven += discount;
        existingPlan.totalNetRevenue += net;
        existingPlan.successfulPayments++;
      } else {
        planMap.set(planId, {
          planId,
          code: snapshot.code ?? null,
          name: snapshot.name ?? null,
          role: snapshot.role ?? payment.role ?? null,
          totalGrossRevenue: gross,
          totalDiscountGiven: discount,
          totalNetRevenue: net,
          successfulPayments: 1,
        });
      }

      if (payment.couponCode) {
        const code = String(payment.couponCode).toUpperCase();

        const existingCoupon = couponMap.get(code);

        if (existingCoupon) {
          existingCoupon.successfulPayments++;
          existingCoupon.totalDiscountGiven += discount;
          existingCoupon.totalNetRevenue += net;
        } else {
          couponMap.set(code, {
            code,
            successfulPayments: 1,
            totalDiscountGiven: discount,
            totalNetRevenue: net,
          });
        }
      }
    }

    const planBreakdown = Array.from(planMap.values()).sort(
      (a, b) => b.totalNetRevenue - a.totalNetRevenue
    );

    const couponBreakdown = Array.from(couponMap.values()).sort(
      (a, b) => b.totalDiscountGiven - a.totalDiscountGiven
    );

    return buildNoStoreResponse(
      {
        success: true,
        summary: {
          totalGrossRevenue,
          totalDiscountGiven,
          totalNetRevenue,
          totalSuccessfulPayments,
          totalNewSubscriptionRevenue,
          totalRenewalRevenue,
        },
        filters: {
          from: from ? from.toISOString() : null,
          to: to ? to.toISOString() : null,
        },
        paymentAccessSession: {
          id: String(access.paymentAccessSession._id),
          verifiedAt: access.paymentAccessSession.verifiedAt ?? null,
          sessionExpiresAt:
            access.paymentAccessSession.sessionExpiresAt ?? null,
          lastUsedAt: access.paymentAccessSession.lastUsedAt ?? null,
        },
        planBreakdown,
        couponBreakdown,
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/payments/revenue error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch revenue data.",
      },
      500
    );
  }
}