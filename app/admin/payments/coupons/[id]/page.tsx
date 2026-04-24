'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type CouponType = 'PERCENTAGE' | 'FLAT';
type RoleType = 'ORGANIZER' | 'SPONSOR' | 'BOTH';

type CouponResponse = {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  applicableRoles?: RoleType[];
  applicablePlanIds?: string[];
  startsAt?: string | null;
  expiresAt?: string | null;
  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;
  usedCount?: number;
  isActive: boolean;
  isArchived?: boolean;
  metadata?: Record<string, unknown>;
};

type FormState = {
  code: string;
  name: string;
  description: string;
  type: CouponType;
  value: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  applicableRoles: RoleType[];
  startsAt: string;
  expiresAt: string;
  totalUsageLimit: string;
  perUserUsageLimit: string;
  isActive: boolean;
  isArchived: boolean;
  metadata: string;
};

function formatDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (num: number) => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialForm(coupon: CouponResponse): FormState {
  return {
    code: coupon.code ?? '',
    name: coupon.name ?? '',
    description: coupon.description ?? '',
    type: coupon.type ?? 'PERCENTAGE',
    value: String(coupon.value ?? ''),
    maxDiscountAmount:
      coupon.maxDiscountAmount == null ? '' : String(coupon.maxDiscountAmount),
    minOrderAmount:
      coupon.minOrderAmount == null ? '' : String(coupon.minOrderAmount),
    applicableRoles:
      Array.isArray(coupon.applicableRoles) && coupon.applicableRoles.length > 0
        ? coupon.applicableRoles
        : ['BOTH'],
    startsAt: formatDateTimeLocal(coupon.startsAt),
    expiresAt: formatDateTimeLocal(coupon.expiresAt),
    totalUsageLimit:
      coupon.totalUsageLimit == null ? '' : String(coupon.totalUsageLimit),
    perUserUsageLimit:
      coupon.perUserUsageLimit == null
        ? ''
        : String(coupon.perUserUsageLimit),
    isActive: Boolean(coupon.isActive),
    isArchived: Boolean(coupon.isArchived),
    metadata: JSON.stringify(coupon.metadata ?? {}, null, 2),
  };
}

export default function EditCouponPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const couponId = typeof params?.id === 'string' ? params.id : '';

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleApplicableRole(role: RoleType) {
    setForm((prev) => {
      if (!prev) return prev;

      let next = prev.applicableRoles.includes(role)
        ? prev.applicableRoles.filter((item) => item !== role)
        : [...prev.applicableRoles, role];

      if (next.length === 0) next = ['BOTH'];

      if (role === 'BOTH' && !prev.applicableRoles.includes('BOTH')) {
        next = ['BOTH'];
      } else if (role !== 'BOTH') {
        next = next.filter((item) => item !== 'BOTH');
        if (next.length === 0) next = ['BOTH'];
      }

      return {
        ...prev,
        applicableRoles: next,
      };
    });
  }

  useEffect(() => {
    async function fetchCoupon() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/admin/coupons/${couponId}`, {
          cache: 'no-store',
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load coupon.');
        }

        setForm(buildInitialForm(data.coupon));
      } catch (err: any) {
        setError(err?.message || 'Failed to load coupon.');
      } finally {
        setLoading(false);
      }
    }

    if (couponId) {
      fetchCoupon();
    }
  }, [couponId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    setSubmitting(true);
    setError('');

    try {
      const code = form.code.trim().toUpperCase();
      const name = form.name.trim();
      const value = Number(form.value);

      if (!code) throw new Error('Coupon code is required.');
      if (!name) throw new Error('Coupon name is required.');
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Coupon value must be greater than 0.');
      }
      if (form.type === 'PERCENTAGE' && value > 100) {
        throw new Error('Percentage coupon cannot exceed 100.');
      }

      let parsedMetadata: Record<string, unknown> = {};

      try {
        const rawMetadata = form.metadata.trim();
        const parsed = rawMetadata ? JSON.parse(rawMetadata) : {};

        if (
          parsed === null ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed)
        ) {
          throw new Error();
        }

        parsedMetadata = parsed;
      } catch {
        throw new Error('Metadata must be a valid JSON object.');
      }

      const body = {
        code,
        name,
        description: form.description.trim(),
        type: form.type,
        value,
        maxDiscountAmount: normalizeNullableNumber(form.maxDiscountAmount),
        minOrderAmount: normalizeNullableNumber(form.minOrderAmount),
        applicableRoles: form.applicableRoles,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
        totalUsageLimit: normalizeNullableNumber(form.totalUsageLimit),
        perUserUsageLimit: normalizeNullableNumber(form.perUserUsageLimit),
        isActive: form.isActive,
        isArchived: form.isArchived,
        metadata: parsedMetadata,
      };

      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update coupon.');
      }

      router.push('/admin/payments/coupons');
    } catch (err: any) {
      setError(err?.message || 'Failed to update coupon.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFB347]">
                Super Admin Only
              </p>
              <h1 className="text-3xl font-bold">Edit Coupon</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Update coupon rules, usage limits, and activation status.
              </p>
            </div>

            <Link
              href="/admin/payments/coupons"
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to Coupons
            </Link>
          </div>

          {loading ? (
            <div className="text-[#94A3B8]">Loading coupon...</div>
          ) : !form ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error || 'Coupon not found.'}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Coupon Details</h2>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Coupon Code">
                    <input
                      value={form.code}
                      onChange={(e) => updateField('code', e.target.value)}
                      className="input-admin"
                      required
                    />
                  </Field>

                  <Field label="Coupon Name">
                    <input
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="input-admin"
                      required
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Description">
                      <input
                        value={form.description}
                        onChange={(e) =>
                          updateField('description', e.target.value)
                        }
                        className="input-admin"
                      />
                    </Field>
                  </div>

                  <Field label="Discount Type">
                    <select
                      value={form.type}
                      onChange={(e) =>
                        updateField('type', e.target.value as CouponType)
                      }
                      className="input-admin"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FLAT">Flat</option>
                    </select>
                  </Field>

                  <Field
                    label={
                      form.type === 'PERCENTAGE'
                        ? 'Discount Percentage'
                        : 'Discount Amount (INR)'
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      value={form.value}
                      onChange={(e) => updateField('value', e.target.value)}
                      className="input-admin"
                      required
                    />
                  </Field>

                  <Field label="Max Discount Amount">
                    <input
                      type="number"
                      min="0"
                      value={form.maxDiscountAmount}
                      onChange={(e) =>
                        updateField('maxDiscountAmount', e.target.value)
                      }
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Minimum Order Amount">
                    <input
                      type="number"
                      min="0"
                      value={form.minOrderAmount}
                      onChange={(e) =>
                        updateField('minOrderAmount', e.target.value)
                      }
                      className="input-admin"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Usage Rules</h2>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Field label="Starts At">
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => updateField('startsAt', e.target.value)}
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Expires At">
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(e) => updateField('expiresAt', e.target.value)}
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Total Usage Limit">
                    <input
                      type="number"
                      min="0"
                      value={form.totalUsageLimit}
                      onChange={(e) =>
                        updateField('totalUsageLimit', e.target.value)
                      }
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Per User Usage Limit">
                    <input
                      type="number"
                      min="1"
                      value={form.perUserUsageLimit}
                      onChange={(e) =>
                        updateField('perUserUsageLimit', e.target.value)
                      }
                      className="input-admin"
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-medium text-white">
                    Applicable Roles
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(['ORGANIZER', 'SPONSOR', 'BOTH'] as RoleType[]).map(
                      (role) => {
                        const active = form.applicableRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleApplicableRole(role)}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                              active
                                ? 'border-[#FF7A18]/20 bg-[#FF7A18]/10 text-[#FFB347]'
                                : 'border-white/10 bg-white/5 text-[#94A3B8] hover:bg-white/10'
                            }`}
                          >
                            {role}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Toggle
                    label="Coupon Active"
                    checked={form.isActive}
                    onChange={(value) => updateField('isActive', value)}
                  />
                  <Toggle
                    label="Coupon Archived"
                    checked={form.isArchived}
                    onChange={(value) => updateField('isArchived', value)}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Metadata</h2>
                <div className="mt-5">
                  <Field label="Metadata JSON">
                    <textarea
                      value={form.metadata}
                      onChange={(e) => updateField('metadata', e.target.value)}
                      className="input-admin min-h-[160px] font-mono text-sm"
                    />
                  </Field>
                </div>
              </section>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/admin/payments/coupons"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Saving Coupon...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          )}
        </div>

        <style jsx>{`
          .input-admin {
            width: 100%;
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            padding: 0.85rem 1rem;
            color: white;
            outline: none;
            transition: 0.2s ease;
          }

          .input-admin:focus {
            border-color: rgba(255, 122, 24, 0.45);
            box-shadow: 0 0 0 3px rgba(255, 122, 24, 0.08);
          }
        `}</style>
      </div>
    </PaymentAccessGate>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
        checked
          ? 'border-[#FF7A18]/20 bg-[#FF7A18]/10'
          : 'border-white/10 bg-[#07152F]/70'
      }`}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          checked
            ? 'bg-[#FFB347] text-[#020617]'
            : 'bg-white/10 text-[#94A3B8]'
        }`}
      >
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    </button>
  );
}