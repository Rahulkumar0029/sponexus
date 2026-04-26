export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import PaymentTransaction from "@/lib/models/PaymentTransaction";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";

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

function monthKey(dateValue: Date | string) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) {
      return access.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"), true);

    const match: Record<string, any> = {};

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lte = to;
    }

    const payments = await PaymentTransaction.find(match)
      .select(
        "_id role status transactionType amount amountBeforeDiscount couponCode couponDiscountAmount fraudFlagged createdAt"
      )
      .lean();

    let totalTransactions = 0;
    let totalSuccessfulPayments = 0;
    let totalFailedPayments = 0;
    let totalFlaggedPayments = 0;
    let totalCouponPayments = 0;

    let organizerRevenue = 0;
    let sponsorRevenue = 0;

    let newSubscriptionCount = 0;
    let renewalCount = 0;
    let newSubscriptionRevenue = 0;
    let renewalRevenue = 0;

    const statusBreakdown: Record<string, number> = {};
    const monthlyMap = new Map<
      string,
      {
        month: string;
        totalTransactions: number;
        successfulPayments: number;
        failedPayments: number;
        grossRevenue: number;
        discountGiven: number;
        netRevenue: number;
      }
    >();

    for (const payment of payments) {
      totalTransactions += 1;

      const status = String(payment.status || "UNKNOWN");
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      if (payment.fraudFlagged) {
        totalFlaggedPayments += 1;
      }

      if (payment.couponCode) {
        totalCouponPayments += 1;
      }

      const month = monthKey(payment.createdAt);
      const existingMonth = monthlyMap.get(month) || {
        month,
        totalTransactions: 0,
        successfulPayments: 0,
        failedPayments: 0,
        grossRevenue: 0,
        discountGiven: 0,
        netRevenue: 0,
      };

      existingMonth.totalTransactions += 1;

      if (status === "SUCCESS") {
        const gross = Number(payment.amountBeforeDiscount ?? 0);
        const discount = Number(payment.couponDiscountAmount ?? 0);
        const net = Number(payment.amount ?? 0);

        totalSuccessfulPayments += 1;

        existingMonth.successfulPayments += 1;
        existingMonth.grossRevenue += gross;
        existingMonth.discountGiven += discount;
        existingMonth.netRevenue += net;

        if (payment.role === "ORGANIZER") {
          organizerRevenue += net;
        }

        if (payment.role === "SPONSOR") {
          sponsorRevenue += net;
        }

        if (payment.transactionType === "RENEWAL") {
          renewalCount += 1;
          renewalRevenue += net;
        } else if (payment.transactionType === "NEW_SUBSCRIPTION") {
          newSubscriptionCount += 1;
          newSubscriptionRevenue += net;
        }
      }

      if (status === "FAILED") {
        totalFailedPayments += 1;
        existingMonth.failedPayments += 1;
      }

      monthlyMap.set(month, existingMonth);
    }

    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return buildNoStoreResponse(
      {
        success: true,
        summary: {
          totalTransactions,
          totalSuccessfulPayments,
          totalFailedPayments,
          totalFlaggedPayments,
          totalCouponPayments,
        },
        filters: {
          from: from ? from.toISOString() : null,
          to: to ? to.toISOString() : null,
        },
        paymentAccessSession: {
          id: String(access.paymentAccessSession._id),
          verifiedAt: access.paymentAccessSession.verifiedAt ?? null,
          sessionExpiresAt: access.paymentAccessSession.sessionExpiresAt ?? null,
          lastUsedAt: access.paymentAccessSession.lastUsedAt ?? null,
        },
        statusBreakdown,
        roleRevenueSplit: {
          ORGANIZER: organizerRevenue,
          SPONSOR: sponsorRevenue,
        },
        transactionTypeSplit: {
          NEW_SUBSCRIPTION: {
            count: newSubscriptionCount,
            revenue: newSubscriptionRevenue,
          },
          RENEWAL: {
            count: renewalCount,
            revenue: renewalRevenue,
          },
        },
        monthlyTrend,
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/payments/analytics error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch payment analytics.",
      },
      500
    );
  }
}