'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type Coupon = {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  type: 'PERCENTAGE' | 'FLAT';
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;
  usedCount: number;
  applicableRoles?: string[];
  applicablePlanIds?: string[];
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  isArchived?: boolean;
  createdAt?: string | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchCoupons() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/admin/coupons', {
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load coupons.');
      }

      setCoupons(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function toggleCoupon(coupon: Coupon) {
    try {
      setActionLoading(`toggle-${coupon._id}`);
      setError('');

      const res = await fetch(`/api/admin/coupons/${coupon._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !coupon.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update coupon.');
      }

      await fetchCoupons();
    } catch (err: any) {
      setError(err?.message || 'Failed to update coupon.');
    } finally {
      setActionLoading(null);
    }
  }

  async function archiveCoupon(couponId: string) {
    try {
      setActionLoading(`archive-${couponId}`);
      setError('');

      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to archive coupon.');
      }

      await fetchCoupons();
    } catch (err: any) {
      setError(err?.message || 'Failed to archive coupon.');
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
              <h1 className="text-3xl font-bold">Coupons</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Manage discounts, campaigns, and promotional growth levers.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchCoupons}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Refresh
              </button>

              <Link
                href="/admin/payments/coupons/create"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-2 text-sm font-semibold text-[#020617]"
              >
                + Create Coupon
              </Link>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="text-[#94A3B8]">Loading coupons...</p>
          ) : coupons.length === 0 ? (
            <p className="text-[#94A3B8]">No coupons found.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coupons.map((coupon) => {
                const toggleLoading = actionLoading === `toggle-${coupon._id}`;
                const archiveLoading = actionLoading === `archive-${coupon._id}`;

                return (
                  <div
                    key={coupon._id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold">{coupon.code}</h2>
                        {coupon.name ? (
                          <p className="mt-1 text-sm text-[#94A3B8]">{coupon.name}</p>
                        ) : null}
                      </div>

                      {coupon.isArchived ? (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
                          Archived
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm text-[#94A3B8]">
                      {coupon.type === 'PERCENTAGE'
                        ? `${coupon.value}% OFF`
                        : `${formatCurrency(coupon.value)} OFF`}
                    </p>

                    {coupon.maxDiscountAmount ? (
                      <p className="mt-1 text-xs text-[#94A3B8]">
                        Max Discount: {formatCurrency(coupon.maxDiscountAmount)}
                      </p>
                    ) : null}

                    {coupon.minOrderAmount ? (
                      <p className="mt-1 text-xs text-[#94A3B8]">
                        Min Order: {formatCurrency(coupon.minOrderAmount)}
                      </p>
                    ) : null}

                    <div className="mt-3 text-sm">
                      <p>
                        Used: {coupon.usedCount} / {coupon.totalUsageLimit ?? '∞'}
                      </p>
                      <p className="mt-1">
                        Per User: {coupon.perUserUsageLimit ?? '∞'}
                      </p>
                    </div>

                    <div className="mt-2 text-xs text-[#94A3B8]">
                      {coupon.expiresAt
                        ? `Expires: ${new Date(coupon.expiresAt).toLocaleDateString()}`
                        : 'No Expiry'}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          coupon.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>

                      {coupon.applicableRoles?.length ? (
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                          {coupon.applicableRoles.join(', ')}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => toggleCoupon(coupon)}
                        disabled={toggleLoading || archiveLoading || !!coupon.isArchived}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {toggleLoading ? 'Updating...' : 'Toggle Active'}
                      </button>

                      <Link
                        href={`/admin/payments/coupons/${coupon._id}`}
                        className="inline-flex items-center rounded-xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-2 text-xs text-[#FFB347] transition hover:bg-[#FF7A18]/15"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => archiveCoupon(coupon._id)}
                        disabled={archiveLoading || !!coupon.isArchived}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
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