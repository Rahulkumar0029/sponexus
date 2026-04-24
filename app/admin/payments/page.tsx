'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type PaymentAccessSession = {
  id: string;
  verifiedAt: string | null;
  sessionExpiresAt: string | null;
  lastUsedAt: string | null;
};

type AnalyticsResponse = {
  success: boolean;
  summary?: {
    totalTransactions: number;
    totalSuccessfulPayments: number;
    totalFailedPayments: number;
    totalFlaggedPayments: number;
    totalCouponPayments: number;
  };
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
  paymentAccessSession?: PaymentAccessSession;
  message?: string;
};

type RevenueResponse = {
  success: boolean;
  summary?: {
    totalGrossRevenue: number;
    totalDiscountGiven: number;
    totalNetRevenue: number;
    totalSuccessfulPayments: number;
    totalNewSubscriptionRevenue: number;
    totalRenewalRevenue: number;
  };
  paymentAccessSession?: PaymentAccessSession;
  message?: string;
};

type PaymentItem = {
  _id: string;
  userId: string;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    companyName?: string;
    role?: string | null;
  } | null;
  plan?: {
    _id: string;
    code?: string | null;
    name?: string | null;
  } | null;
  planSnapshot?: {
    code?: string | null;
    name?: string | null;
  } | null;
  transactionType?: string;
  amount?: number;
  currency?: string;
  status?: string;
  gateway?: string;
  fraudFlagged?: boolean;
  couponCode?: string | null;
  createdAt?: string | null;
};


function formatCurrency(amount: number | null | undefined) {
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getUserLabel(payment: PaymentItem) {
  const user = payment.user;

  if (!user) return 'Unknown user';

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return (
    fullName ||
    user.name ||
    user.companyName ||
    user.email ||
    'Unknown user'
  );
}

function getPlanLabel(payment: PaymentItem) {
  return (
    payment.plan?.name ||
    payment.planSnapshot?.name ||
    payment.plan?.code ||
    payment.planSnapshot?.code ||
    'Unknown plan'
  );
}

function getStatusBadgeClass(status: string | undefined) {
  switch (status) {
    case 'SUCCESS':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    case 'FAILED':
      return 'border-red-500/20 bg-red-500/10 text-red-300';
    case 'PENDING':
    case 'CREATED':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    case 'FLAGGED':
    case 'MANUAL_REVIEW':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
    default:
      return 'border-white/10 bg-white/5 text-white';
  }
}

export default function AdminPaymentsDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');

        const [analyticsRes, revenueRes, paymentsRes] = await Promise.all([
          fetch('/api/admin/payments/analytics', { cache: 'no-store' }),
          fetch('/api/admin/payments/revenue', { cache: 'no-store' }),
          fetch('/api/admin/payments?limit=8', { cache: 'no-store' }),
        ]);

        const [analyticsData, revenueData, paymentsData] = await Promise.all([
          analyticsRes.json(),
          revenueRes.json(),
          paymentsRes.json(),
        ]);

        if (!active) return;

        if (!analyticsRes.ok || !analyticsData.success) {
          throw new Error(analyticsData.message || 'Failed to load payment analytics.');
        }

        if (!revenueRes.ok || !revenueData.success) {
          throw new Error(revenueData.message || 'Failed to load revenue summary.');
        }

        if (!paymentsRes.ok || !paymentsData.success) {
          throw new Error(paymentsData.message || 'Failed to load payments.');
        }

        setAnalytics(analyticsData);
        setRevenue(revenueData);
        setPayments(Array.isArray(paymentsData.data) ? paymentsData.data : []);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Failed to load payment dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const paymentAccessSession =
    analytics?.paymentAccessSession ||
    revenue?.paymentAccessSession ||
    null;

  const flaggedPayments = useMemo(
    () => payments.filter((item) => item.fraudFlagged || item.status === 'FLAGGED' || item.status === 'MANUAL_REVIEW'),
    [payments]
  );

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#FFB347]">
                Super Admin Payment Control
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Payments Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#94A3B8] sm:text-base">
                Control monetization, review revenue, inspect risk signals, and manage plans and coupons from one secured payment command center.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
                Payment Access Session
              </p>
              <p className="mt-2 text-sm text-white">
                Expires: {formatDateTime(paymentAccessSession?.sessionExpiresAt)}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Last used: {formatDateTime(paymentAccessSession?.lastUsedAt)}
              </p>
              <Link
                href="/admin/payments/access"
                className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Manage Access
              </Link>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <DashboardCard
              title="Total Transactions"
              value={analytics?.summary?.totalTransactions ?? 0}
              helper="All payment records"
            />
            <DashboardCard
              title="Successful Payments"
              value={analytics?.summary?.totalSuccessfulPayments ?? 0}
              helper="Completed money flow"
            />
            <DashboardCard
              title="Failed Payments"
              value={analytics?.summary?.totalFailedPayments ?? 0}
              helper="Need retry / follow-up"
            />
            <DashboardCard
              title="Flagged Payments"
              value={analytics?.summary?.totalFlaggedPayments ?? 0}
              helper="Fraud/manual review cases"
            />
            <DashboardCard
              title="Coupon Payments"
              value={analytics?.summary?.totalCouponPayments ?? 0}
              helper="Discount-influenced payments"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MoneyCard
              title="Gross Revenue"
              value={formatCurrency(revenue?.summary?.totalGrossRevenue)}
              helper="Before discounts"
            />
            <MoneyCard
              title="Discount Given"
              value={formatCurrency(revenue?.summary?.totalDiscountGiven)}
              helper="Coupon impact"
            />
            <MoneyCard
              title="Net Revenue"
              value={formatCurrency(revenue?.summary?.totalNetRevenue)}
              helper="Actual money collected"
            />
            <MoneyCard
              title="Renewal Revenue"
              value={formatCurrency(revenue?.summary?.totalRenewalRevenue)}
              helper="Returning paid users"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <QuickLinkCard
              title="Plans"
              description="Create, edit, archive, reorder, and control pricing visibility and entitlements."
              href="/admin/payments/plans"
              cta="Open Plans"
            />
            <QuickLinkCard
              title="Coupons"
              description="Launch discount campaigns, control limits, expiry, and role/plan eligibility."
              href="/admin/payments/coupons"
              cta="Open Coupons"
            />
            <QuickLinkCard
              title="Revenue"
              description="Inspect gross, discount, net, plan-wise and coupon-wise revenue trends."
              href="/admin/payments/revenue"
              cta="Open Revenue"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-white">Role Revenue Split</p>
              <div className="mt-4 space-y-3">
                <SplitRow
                  label="Organizer"
                  value={formatCurrency(analytics?.roleRevenueSplit?.ORGANIZER)}
                />
                <SplitRow
                  label="Sponsor"
                  value={formatCurrency(analytics?.roleRevenueSplit?.SPONSOR)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-white">Transaction Type Split</p>
              <div className="mt-4 space-y-3">
                <SplitRow
                  label="New Subscriptions"
                  value={`${analytics?.transactionTypeSplit?.NEW_SUBSCRIPTION?.count ?? 0} / ${formatCurrency(
                    analytics?.transactionTypeSplit?.NEW_SUBSCRIPTION?.revenue
                  )}`}
                />
                <SplitRow
                  label="Renewals"
                  value={`${analytics?.transactionTypeSplit?.RENEWAL?.count ?? 0} / ${formatCurrency(
                    analytics?.transactionTypeSplit?.RENEWAL?.revenue
                  )}`}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-white">Risk Snapshot</p>
              <div className="mt-4 space-y-3">
                <SplitRow
                  label="Flagged / Review in recent list"
                  value={String(flaggedPayments.length)}
                />
                <SplitRow
                  label="Payment access session"
                  value={paymentAccessSession?.sessionExpiresAt ? 'Verified' : 'Missing'}
                />
                <Link
                  href="/admin/payments/security"
                  className="mt-2 inline-flex rounded-xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-2 text-xs font-semibold text-[#FFB347] transition hover:bg-[#FF7A18]/15"
                >
                  Open Security View
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent Payments</h2>
                <p className="text-sm text-[#94A3B8]">
                  Latest transactions across subscriptions, renewals, coupons, and fraud review cases.
                </p>
              </div>

              <Link
                href="/admin/payments/access"
                className="inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Refresh Access Session
              </Link>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-6 text-sm text-[#94A3B8]">
                Loading payment dashboard...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
                {error}
              </div>
            ) : payments.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-6 text-sm text-[#94A3B8]">
                No payments found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-[#94A3B8]">
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">Plan</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Gateway</th>
                      <th className="px-4 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment._id}
                        className="rounded-2xl border border-white/10 bg-[#07152F]/80"
                      >
                        <td className="rounded-l-2xl px-4 py-4 align-top">
                          <div className="font-medium text-white">
                            {getUserLabel(payment)}
                          </div>
                          <div className="mt-1 text-xs text-[#94A3B8]">
                            {payment.user?.email || '—'}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-white">
                            {getPlanLabel(payment)}
                          </div>
                          <div className="mt-1 text-xs text-[#94A3B8]">
                            {payment.couponCode ? `Coupon: ${payment.couponCode}` : 'No coupon'}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-white">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="mt-1 text-xs text-[#94A3B8]">
                            {payment.currency || 'INR'}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              payment.status
                            )}`}
                          >
                            {payment.status || 'UNKNOWN'}
                          </span>

                          {payment.fraudFlagged ? (
                            <div className="mt-2 text-xs font-semibold text-orange-300">
                              Fraud Flagged
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-white">
                          {payment.transactionType || '—'}
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-white">
                          {payment.gateway || '—'}
                        </td>

                        <td className="rounded-r-2xl px-4 py-4 align-top text-sm text-[#94A3B8]">
                          {formatDateTime(payment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PaymentAccessGate>
  );
}

function DashboardCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-[#94A3B8]">{helper}</p>
    </div>
  );
}

function MoneyCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-[#FF7A18]/15 bg-gradient-to-br from-[#07152F] to-[#0a1835] p-5 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-[#94A3B8]">{helper}</p>
    </div>
  );
}

function QuickLinkCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-4 py-2 text-sm font-semibold text-[#020617] transition hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}

function SplitRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#07152F]/70 px-4 py-3">
      <span className="text-sm text-[#94A3B8]">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}