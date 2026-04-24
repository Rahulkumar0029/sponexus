'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type FormState = {
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  totalUsageLimit: string;
  perUserUsageLimit: string;
  expiresAt: string;
  isActive: boolean;
};

const initialForm: FormState = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  totalUsageLimit: '',
  perUserUsageLimit: '1',
  expiresAt: '',
  isActive: true,
};

function normalizeNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function CreateCouponPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const value = Number(form.discountValue);

      if (!form.code.trim()) {
        throw new Error('Coupon code is required.');
      }

      if (!form.name.trim()) {
        throw new Error('Coupon name is required.');
      }

      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Discount value must be greater than 0.');
      }

      if (form.discountType === 'PERCENTAGE' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100.');
      }

      const body = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.discountType,
        value,
        maxDiscountAmount: normalizeNullableNumber(form.maxDiscountAmount),
        minOrderAmount: normalizeNullableNumber(form.minOrderAmount),
        applicableRoles: ['BOTH'],
        applicablePlanIds: [],
        startsAt: null,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
        totalUsageLimit: normalizeNullableNumber(form.totalUsageLimit),
        perUserUsageLimit:
          normalizeNullableNumber(form.perUserUsageLimit) ?? 1,
        isActive: form.isActive,
        isArchived: false,
        metadata: {},
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create coupon.');
      }

      router.push('/admin/payments/coupons');
    } catch (err: any) {
      setError(err?.message || 'Failed to create coupon.');
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
              <h1 className="text-3xl font-bold">Create New Coupon</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Launch a new discount campaign for growth, activation, and retention.
              </p>
            </div>

            <Link
              href="/admin/payments/coupons"
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to Coupons
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold">Coupon Details</h2>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Coupon Code">
                  <input
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value)}
                    placeholder="WELCOME50"
                    className="input-admin"
                    required
                  />
                </Field>

                <Field label="Coupon Name">
                  <input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Welcome Offer"
                    className="input-admin"
                    required
                  />
                </Field>

                <Field label="Description">
                  <input
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="For first-time users"
                    className="input-admin"
                  />
                </Field>

                <Field label="Discount Type">
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      updateField('discountType', e.target.value as 'PERCENTAGE' | 'FLAT')
                    }
                    className="input-admin"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat</option>
                  </select>
                </Field>

                <Field
                  label={
                    form.discountType === 'PERCENTAGE'
                      ? 'Discount Percentage'
                      : 'Discount Amount (INR)'
                  }
                >
                  <input
                    type="number"
                    min="0"
                    value={form.discountValue}
                    onChange={(e) => updateField('discountValue', e.target.value)}
                    placeholder={form.discountType === 'PERCENTAGE' ? '20' : '100'}
                    className="input-admin"
                    required
                  />
                </Field>

                <Field label="Max Discount Amount (Optional)">
                  <input
                    type="number"
                    min="0"
                    value={form.maxDiscountAmount}
                    onChange={(e) => updateField('maxDiscountAmount', e.target.value)}
                    placeholder="500"
                    className="input-admin"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold">Usage Rules</h2>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Minimum Order Amount">
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) => updateField('minOrderAmount', e.target.value)}
                    placeholder="199"
                    className="input-admin"
                  />
                </Field>

                <Field label="Total Usage Limit">
                  <input
                    type="number"
                    min="0"
                    value={form.totalUsageLimit}
                    onChange={(e) => updateField('totalUsageLimit', e.target.value)}
                    placeholder="100"
                    className="input-admin"
                  />
                </Field>

                <Field label="Per User Limit">
                  <input
                    type="number"
                    min="1"
                    value={form.perUserUsageLimit}
                    onChange={(e) => updateField('perUserUsageLimit', e.target.value)}
                    placeholder="1"
                    className="input-admin"
                  />
                </Field>

                <Field label="Expiry Date & Time">
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => updateField('expiresAt', e.target.value)}
                    className="input-admin"
                  />
                </Field>
              </div>

              <div className="mt-5">
                <Toggle
                  label="Coupon Active"
                  checked={form.isActive}
                  onChange={(value) => updateField('isActive', value)}
                />
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
                {submitting ? 'Creating Coupon...' : 'Create Coupon'}
              </button>
            </div>
          </form>
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