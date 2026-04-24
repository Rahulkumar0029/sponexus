'use client';

import { useEffect, useMemo, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type AnalyticsSummary = {
  totalTransactions: number;
  totalSuccessfulPayments: number;
  totalFailedPayments: number;
  totalFlaggedPayments: number;
  totalCouponPayments: number;
};

type MonthlyTrendItem = {
  month: string;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  grossRevenue: number;
  discountGiven: number;
  netRevenue: number;
};

type AnalyticsResponse = {
  success: boolean;
  summary?: AnalyticsSummary;
  statusBreakdown?: Record<string, number>;
  roleRevenueSplit?: {
    ORGANIZER: number;
    SPONSOR: number;
  };
  transactionTypeSplit?: {
    NEW_SUBSCRIPTION: {
      count: number;
      revenue: number;
    };
    RENEWAL: {
      count: number;
      revenue: number;
    };
  };
  monthlyTrend?: MonthlyTrendItem[];
  message?: string;
};

function formatCurrency(amount: number | null | undefined) {
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

function formatMonth(month: string) {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);

  if (Number.isNaN(date.getTime())) return month;

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function getBarWidth(value: number, max: number) {
  if (max <= 0) return '0%';
  return `${Math.max(6, (value / max) * 100)}%`;
}

export default function PaymentAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/admin/payments/analytics', {
          cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load payment analytics.');
        }

        if (!active) return;
        setData(json);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Failed to load payment analytics.');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const monthlyTrend = data?.monthlyTrend || [];
  const maxMonthlyNetRevenue = useMemo(
    () => Math.max(...monthlyTrend.map((item) => item.netRevenue), 0),
    [monthlyTrend]
  );

  const statusItems = Object.entries(data?.statusBreakdown || {});
  const maxStatusCount = Math.max(...statusItems.map(([, count]) => count), 0);

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="mb-2 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFB347]">
              Super Admin Analytics
            </p>
            <h1 className="text-3xl font-bold">Payment Analytics</h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Track transaction quality, revenue splits, fraud signals, and monthly money movement across Sponexus.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-[#94A3B8]">
              Loading analytics...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
              {error}
            </div>
          ) : !data?.summary ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-[#94A3B8]">
              No analytics data found.
            </div>
          ) : (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  title="Total Transactions"
                  value={String(data.summary.totalTransactions)}
                />
                <MetricCard
                  title="Successful"
                  value={String(data.summary.totalSuccessfulPayments)}
                />
                <MetricCard
                  title="Failed"
                  value={String(data.summary.totalFailedPayments)}
                />
                <MetricCard
                  title="Flagged"
                  value={String(data.summary.totalFlaggedPayments)}
                />
                <MetricCard
                  title="Coupon Payments"
                  value={String(data.summary.totalCouponPayments)}
                />
              </div>

              <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Role Revenue Split</h2>
                  <div className="mt-4 space-y-3">
                    <SplitRow
                      label="Organizer Revenue"
                      value={formatCurrency(data.roleRevenueSplit?.ORGANIZER)}
                    />
                    <SplitRow
                      label="Sponsor Revenue"
                      value={formatCurrency(data.roleRevenueSplit?.SPONSOR)}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Transaction Type Split</h2>
                  <div className="mt-4 space-y-3">
                    <SplitRow
                      label="New Subscriptions"
                      value={`${data.transactionTypeSplit?.NEW_SUBSCRIPTION?.count ?? 0} / ${formatCurrency(
                        data.transactionTypeSplit?.NEW_SUBSCRIPTION?.revenue
                      )}`}
                    />
                    <SplitRow
                      label="Renewals"
                      value={`${data.transactionTypeSplit?.RENEWAL?.count ?? 0} / ${formatCurrency(
                        data.transactionTypeSplit?.RENEWAL?.revenue
                      )}`}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Status Breakdown</h2>
                  <div className="mt-5 space-y-4">
                    {statusItems.length === 0 ? (
                      <p className="text-sm text-[#94A3B8]">No status data available.</p>
                    ) : (
                      statusItems.map(([status, count]) => (
                        <div key={status}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-white">{status}</span>
                            <span className="text-[#94A3B8]">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347]"
                              style={{ width: getBarWidth(count, maxStatusCount) }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <h2 className="text-lg font-semibold">Quick Insight</h2>
                  <div className="mt-5 space-y-3">
                    <SplitRow
                      label="Success Rate"
                      value={`${data.summary.totalTransactions > 0
                        ? Math.round(
                            (data.summary.totalSuccessfulPayments / data.summary.totalTransactions) * 100
                          )
                        : 0}%`}
                    />
                    <SplitRow
                      label="Failure Rate"
                      value={`${data.summary.totalTransactions > 0
                        ? Math.round(
                            (data.summary.totalFailedPayments / data.summary.totalTransactions) * 100
                          )
                        : 0}%`}
                    />
                    <SplitRow
                      label="Flagged Share"
                      value={`${data.summary.totalTransactions > 0
                        ? Math.round(
                            (data.summary.totalFlaggedPayments / data.summary.totalTransactions) * 100
                          )
                        : 0}%`}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Monthly Trend</h2>
                <p className="mt-1 text-sm text-[#94A3B8]">
                  Net revenue, transactions, and failures month by month.
                </p>

                <div className="mt-5 space-y-4">
                  {monthlyTrend.length === 0 ? (
                    <p className="text-sm text-[#94A3B8]">No monthly trend data available.</p>
                  ) : (
                    monthlyTrend.map((item) => (
                      <div
                        key={item.month}
                        className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4"
                      >
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">{formatMonth(item.month)}</p>
                            <p className="text-xs text-[#94A3B8]">
                              {item.totalTransactions} txns • {item.successfulPayments} success • {item.failedPayments} failed
                            </p>
                          </div>
                          <div className="text-sm font-semibold text-white">
                            {formatCurrency(item.netRevenue)}
                          </div>
                        </div>

                        <div className="h-3 rounded-full bg-white/5">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347]"
                            style={{ width: getBarWidth(item.netRevenue, maxMonthlyNetRevenue) }}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#94A3B8] sm:grid-cols-3">
                          <div>Gross: {formatCurrency(item.grossRevenue)}</div>
                          <div>Discount: {formatCurrency(item.discountGiven)}</div>
                          <div>Net: {formatCurrency(item.netRevenue)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PaymentAccessGate>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function SplitRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07152F]/70 px-4 py-3">
      <span className="text-sm text-[#94A3B8]">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}