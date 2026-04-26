'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type Plan = {
  _id: string;
  code: string;
  name: string;
  role: 'ORGANIZER' | 'SPONSOR' | 'BOTH';
  price: number;
  currency: string;
  durationInDays: number;
  extraDays?: number;
  isActive: boolean;
  isVisible: boolean;
  isArchived?: boolean;
  createdAt?: string | null;

  features?: {
    canPublishEvent?: boolean;
    canPublishSponsorship?: boolean;
    canUseMatch?: boolean;
    canRevealContact?: boolean;
    canSendDealRequest?: boolean;
  };

  limits?: {
    eventPostsPerDay?: number | null;
    sponsorshipPostsPerDay?: number | null;
    dealRequestsPerDay?: number | null;
    contactRevealsPerDay?: number | null;
    matchUsesPerDay?: number | null;
    eventPostsPerMonth?: number | null;
    sponsorshipPostsPerMonth?: number | null;
    dealRequestsPerMonth?: number | null;
    contactRevealsPerMonth?: number | null;
    matchUsesPerMonth?: number | null;
    maxPostBudgetAmount?: number | null;
    maxVisibleBudgetAmount?: number | null;
  };
};
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatLimit(value?: number | null) {
  return value === null || value === undefined ? 'Unlimited' : String(value);
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchPlans() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/admin/plans', {
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load plans.');
      }

      setPlans(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  async function togglePlan(planId: string, field: 'isActive' | 'isVisible', currentValue: boolean) {
    try {
      setActionLoading(`${field}-${planId}`);
      setError('');

      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: !currentValue,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update plan.');
      }

      await fetchPlans();
    } catch (err: any) {
      setError(err?.message || 'Failed to update plan.');
    } finally {
      setActionLoading(null);
    }
  }

  async function archivePlan(planId: string) {
    try {
      setActionLoading(`archive-${planId}`);
      setError('');

      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to archive plan.');
      }

      await fetchPlans();
    } catch (err: any) {
      setError(err?.message || 'Failed to archive plan.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFB347]">
                Super Admin Only
              </p>
              <h1 className="text-3xl font-bold">Plans Management</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Control pricing, duration, visibility, and monetization strategy.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchPlans}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Refresh
              </button>

              <Link
                href="/admin/payments/plans/create"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-2 text-sm font-semibold text-[#020617]"
              >
                + Create Plan
              </Link>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-[#94A3B8]">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="text-[#94A3B8]">No plans found.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const activeLoading = actionLoading === `isActive-${plan._id}`;
                const visibleLoading = actionLoading === `isVisible-${plan._id}`;
                const archiveLoading = actionLoading === `archive-${plan._id}`;

                return (
                  <div
                    key={plan._id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">{plan.name}</h2>
                        <p className="text-sm text-[#94A3B8]">{plan.code}</p>
                      </div>

                      {plan.isArchived ? (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
                          Archived
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 text-2xl font-bold">
                      {formatCurrency(plan.price)}
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-[#94A3B8]">
                      <p>Role: {plan.role}</p>
                      <p>Duration: {plan.durationInDays} days</p>
                      <p>Extra Days: {plan.extraDays ?? 0}</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#94A3B8]">
  <p className="mb-2 font-semibold text-white">Plan Limits</p>
  <p>Event/day: {formatLimit(plan.limits?.eventPostsPerDay)}</p>
  <p>Sponsorship/day: {formatLimit(plan.limits?.sponsorshipPostsPerDay)}</p>
  <p>Deal requests/day: {formatLimit(plan.limits?.dealRequestsPerDay)}</p>
  <p>Contact reveals/day: {formatLimit(plan.limits?.contactRevealsPerDay)}</p>
  <p>Match uses/day: {formatLimit(plan.limits?.matchUsesPerDay)}</p>
  <p>Match uses/month: {formatLimit(plan.limits?.matchUsesPerMonth)}</p>
  <p>
    Max budget:{' '}
    {plan.limits?.maxPostBudgetAmount == null
      ? 'Unlimited'
      : formatCurrency(plan.limits.maxPostBudgetAmount)}
  </p>
</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          plan.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          plan.isVisible
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {plan.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => togglePlan(plan._id, 'isActive', plan.isActive)}
                        disabled={activeLoading || archiveLoading}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeLoading ? 'Updating...' : 'Toggle Active'}
                      </button>

                      <button
                        onClick={() => togglePlan(plan._id, 'isVisible', plan.isVisible)}
                        disabled={visibleLoading || archiveLoading}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {visibleLoading ? 'Updating...' : 'Toggle Visibility'}
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Link
                        href={`/admin/payments/plans/${plan._id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 py-2 text-sm text-[#FFB347] transition hover:bg-[#FF7A18]/15"
                      >
                        Edit Plan
                      </Link>

                      <button
                        onClick={() => archivePlan(plan._id)}
                        disabled={archiveLoading || plan.isArchived}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-sm text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {archiveLoading ? 'Archiving...' : 'Archive'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PaymentAccessGate>
  );
}