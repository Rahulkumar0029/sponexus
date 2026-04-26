'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type RoleType = 'ORGANIZER' | 'SPONSOR' | 'BOTH';

type PlanResponse = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  role: RoleType;
  interval: 'CUSTOM' | 'MONTHLY' | 'YEARLY';
  price: number;
  durationInDays: number;
  extraDays?: number;
  postingLimitPerDay?: number | null;
  dealRequestLimitPerDay?: number | null;
  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;
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
  eventPostsPerMonth?: number | null;
  sponsorshipPostsPerMonth?: number | null;
  dealRequestsPerMonth?: number | null;
  matchUsesPerDay?: number | null;
  matchUsesPerMonth?: number | null;
  contactRevealsPerMonth?: number | null;
  maxPostBudgetAmount?: number | null;
  maxVisibleBudgetAmount?: number | null;
};

  budgetMin?: number | null;
  budgetMax?: number | null;
  isActive: boolean;
  isVisible: boolean;
  visibleToRoles: RoleType[];
  visibleToLoggedOut: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

type FormState = {
  code: string;
  name: string;
  description: string;
  role: RoleType;
  interval: 'CUSTOM' | 'MONTHLY' | 'YEARLY';
  price: string;
  durationInDays: string;
  extraDays: string;
  postingLimitPerDay: string;
  dealRequestLimitPerDay: string;
  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;
  
  canPublishEvent: boolean;
canPublishSponsorship: boolean;
canSendDealRequest: boolean;

eventPostsPerDay: string;
sponsorshipPostsPerDay: string;
dealRequestsPerDay: string;
contactRevealsPerDay: string;
matchUsesPerDay: string;

eventPostsPerMonth: string;
sponsorshipPostsPerMonth: string;
dealRequestsPerMonth: string;
contactRevealsPerMonth: string;
  matchUsesPerMonth: string;
maxPostBudgetAmount: string;
maxVisibleBudgetAmount: string;

  budgetMin: string;
  budgetMax: string;
  isActive: boolean;
  isVisible: boolean;
  visibleToRoles: RoleType[];
  visibleToLoggedOut: boolean;
  sortOrder: string;
  metadata: string;
};

function normalizeNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialForm(plan: PlanResponse): FormState {
  return {
    code: plan.code ?? '',
    name: plan.name ?? '',
    description: plan.description ?? '',
    role: plan.role ?? 'BOTH',
    interval: plan.interval ?? 'CUSTOM',
    price: String(plan.price ?? ''),
    durationInDays: String(plan.durationInDays ?? ''),
    extraDays: String(plan.extraDays ?? 0),
    postingLimitPerDay:
      plan.postingLimitPerDay == null ? '' : String(plan.postingLimitPerDay),
    dealRequestLimitPerDay:
      plan.dealRequestLimitPerDay == null
        ? ''
        : String(plan.dealRequestLimitPerDay),
    canPublish: Boolean(plan.canPublish),
    canContact: Boolean(plan.canContact),
    canUseMatch: Boolean(plan.canUseMatch),
    canRevealContact: Boolean(plan.canRevealContact),

    canPublishEvent: plan.features?.canPublishEvent !== false,
canPublishSponsorship: plan.features?.canPublishSponsorship !== false,
canSendDealRequest: plan.features?.canSendDealRequest !== false,

eventPostsPerDay:
  plan.limits?.eventPostsPerDay == null ? '' : String(plan.limits.eventPostsPerDay),
sponsorshipPostsPerDay:
  plan.limits?.sponsorshipPostsPerDay == null ? '' : String(plan.limits.sponsorshipPostsPerDay),
dealRequestsPerDay:
  plan.limits?.dealRequestsPerDay == null ? '' : String(plan.limits.dealRequestsPerDay),
contactRevealsPerDay:
  plan.limits?.contactRevealsPerDay == null ? '' : String(plan.limits.contactRevealsPerDay),
matchUsesPerDay:
  plan.limits?.matchUsesPerDay == null ? '' : String(plan.limits.matchUsesPerDay),
eventPostsPerMonth:
  plan.limits?.eventPostsPerMonth == null ? '' : String(plan.limits.eventPostsPerMonth),
sponsorshipPostsPerMonth:
  plan.limits?.sponsorshipPostsPerMonth == null ? '' : String(plan.limits.sponsorshipPostsPerMonth),
dealRequestsPerMonth:
  plan.limits?.dealRequestsPerMonth == null ? '' : String(plan.limits.dealRequestsPerMonth),
contactRevealsPerMonth:
  plan.limits?.contactRevealsPerMonth == null ? '' : String(plan.limits.contactRevealsPerMonth),
matchUsesPerMonth:
  plan.limits?.matchUsesPerMonth == null ? '' : String(plan.limits.matchUsesPerMonth),
maxPostBudgetAmount:
  plan.limits?.maxPostBudgetAmount == null ? '' : String(plan.limits.maxPostBudgetAmount),
maxVisibleBudgetAmount:
  plan.limits?.maxVisibleBudgetAmount == null ? '' : String(plan.limits.maxVisibleBudgetAmount),

    budgetMin: plan.budgetMin == null ? '' : String(plan.budgetMin),
    budgetMax: plan.budgetMax == null ? '' : String(plan.budgetMax),
    isActive: Boolean(plan.isActive),
    isVisible: Boolean(plan.isVisible),
    visibleToRoles:
      Array.isArray(plan.visibleToRoles) && plan.visibleToRoles.length > 0
        ? plan.visibleToRoles
        : ['BOTH'],
    visibleToLoggedOut: Boolean(plan.visibleToLoggedOut),
    sortOrder: String(plan.sortOrder ?? 0),
    metadata: JSON.stringify(plan.metadata ?? {}, null, 2),
  };
}

export default function EditPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = typeof params?.id === 'string' ? params.id : '';

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleVisibleRole(role: RoleType) {
    setForm((prev) => {
      if (!prev) return prev;

      let next = prev.visibleToRoles.includes(role)
        ? prev.visibleToRoles.filter((item) => item !== role)
        : [...prev.visibleToRoles, role];

      if (next.length === 0) next = ['BOTH'];

      if (role === 'BOTH' && !prev.visibleToRoles.includes('BOTH')) {
        next = ['BOTH'];
      } else if (role !== 'BOTH') {
        next = next.filter((item) => item !== 'BOTH');
        if (next.length === 0) next = ['BOTH'];
      }

      return {
        ...prev,
        visibleToRoles: next,
      };
    });
  }

  useEffect(() => {
    async function fetchPlan() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/admin/plans/${planId}`, {
          cache: 'no-store',
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load plan.');
        }

        setForm(buildInitialForm(data.plan));
      } catch (err: any) {
        setError(err?.message || 'Failed to load plan.');
      } finally {
        setLoading(false);
      }
    }

    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    setSubmitting(true);
    setError('');

    try {
      const code = form.code.trim().toUpperCase();
      const name = form.name.trim();

      if (!code) throw new Error('Plan code is required.');
      if (!name) throw new Error('Plan name is required.');

      const price = Number(form.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Price must be a valid number.');
      }

      const durationInDays = Number(form.durationInDays);
      if (!Number.isFinite(durationInDays) || durationInDays < 1) {
        throw new Error('Duration must be at least 1 day.');
      }

      const extraDays = Number(form.extraDays || 0);
      if (!Number.isFinite(extraDays) || extraDays < 0) {
        throw new Error('Extra days cannot be negative.');
      }

      const sortOrder = Number(form.sortOrder || 0);
      if (!Number.isFinite(sortOrder) || sortOrder < 0) {
        throw new Error('Sort order cannot be negative.');
      }

      const budgetMin = normalizeNullableNumber(form.budgetMin);
      const budgetMax = normalizeNullableNumber(form.budgetMax);

      if (
        budgetMin !== null &&
        budgetMax !== null &&
        budgetMin > budgetMax
      ) {
        throw new Error('Budget min cannot be greater than budget max.');
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
        role: form.role,
        interval: form.interval,
        price,
        durationInDays,
        extraDays,
        postingLimitPerDay: normalizeNullableNumber(form.postingLimitPerDay),
        dealRequestLimitPerDay: normalizeNullableNumber(
          form.dealRequestLimitPerDay
        ),
        canPublish: form.canPublish,
        canContact: form.canContact,
        canUseMatch: form.canUseMatch,
        canRevealContact: form.canRevealContact,
        features: {
  canPublishEvent: form.canPublishEvent,
  canPublishSponsorship: form.canPublishSponsorship,
  canUseMatch: form.canUseMatch,
  canRevealContact: form.canRevealContact,
  canSendDealRequest: form.canSendDealRequest,
},

limits: {
  eventPostsPerDay: normalizeNullableNumber(form.eventPostsPerDay),
  sponsorshipPostsPerDay: normalizeNullableNumber(form.sponsorshipPostsPerDay),
  dealRequestsPerDay: normalizeNullableNumber(form.dealRequestsPerDay),
  contactRevealsPerDay: normalizeNullableNumber(form.contactRevealsPerDay),
  matchUsesPerDay: normalizeNullableNumber(form.matchUsesPerDay),
  eventPostsPerMonth: normalizeNullableNumber(form.eventPostsPerMonth),
  sponsorshipPostsPerMonth: normalizeNullableNumber(form.sponsorshipPostsPerMonth),
  dealRequestsPerMonth: normalizeNullableNumber(form.dealRequestsPerMonth),
  contactRevealsPerMonth: normalizeNullableNumber(form.contactRevealsPerMonth),
  matchUsesPerMonth: normalizeNullableNumber(form.matchUsesPerMonth),
  maxPostBudgetAmount: normalizeNullableNumber(form.maxPostBudgetAmount),
  maxVisibleBudgetAmount: normalizeNullableNumber(form.maxVisibleBudgetAmount),
},
        budgetMin,
        budgetMax,
        isActive: form.isActive,
        isVisible: form.isVisible,
        visibleToRoles: form.visibleToRoles,
        visibleToLoggedOut: form.visibleToLoggedOut,
        sortOrder,
        metadata: parsedMetadata,
      };

      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update plan.');
      }

      router.push('/admin/payments/plans');
    } catch (err: any) {
      setError(err?.message || 'Failed to update plan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFB347]">
                Super Admin Only
              </p>
              <h1 className="text-3xl font-bold">Edit Plan</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Update plan pricing, visibility, and entitlements.
              </p>
            </div>

            <Link
              href="/admin/payments/plans"
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to Plans
            </Link>
          </div>

          {loading ? (
            <div className="text-[#94A3B8]">Loading plan...</div>
          ) : !form ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error || 'Plan not found.'}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Basic Details</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Plan Code">
                    <input
                      value={form.code}
                      onChange={(e) => updateField('code', e.target.value)}
                      className="input-admin"
                      required
                    />
                  </Field>

                  <Field label="Plan Name">
                    <input
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="input-admin"
                      required
                    />
                  </Field>

                  <Field label="Role">
                    <select
                      value={form.role}
                      onChange={(e) =>
                        updateField('role', e.target.value as RoleType)
                      }
                      className="input-admin"
                    >
                      <option value="ORGANIZER">Organizer</option>
                      <option value="SPONSOR">Sponsor</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </Field>

                  <Field label="Interval">
                    <select
                      value={form.interval}
                      onChange={(e) =>
                        updateField(
                          'interval',
                          e.target.value as 'CUSTOM' | 'MONTHLY' | 'YEARLY'
                        )
                      }
                      className="input-admin"
                    >
                      <option value="CUSTOM">Custom</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Description">
                      <textarea
                        value={form.description}
                        onChange={(e) =>
                          updateField('description', e.target.value)
                        }
                        className="input-admin min-h-[110px]"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Pricing & Duration</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Field label="Price (INR)">
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => updateField('price', e.target.value)}
                      className="input-admin"
                      required
                    />
                  </Field>

                  <Field label="Duration In Days">
                    <input
                      type="number"
                      min="1"
                      value={form.durationInDays}
                      onChange={(e) =>
                        updateField('durationInDays', e.target.value)
                      }
                      className="input-admin"
                      required
                    />
                  </Field>

                  <Field label="Extra Days">
                    <input
                      type="number"
                      min="0"
                      value={form.extraDays}
                      onChange={(e) => updateField('extraDays', e.target.value)}
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Sort Order">
                    <input
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={(e) => updateField('sortOrder', e.target.value)}
                      className="input-admin"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Entitlements</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Posting Limit Per Day">
                    <input
                      type="number"
                      min="0"
                      value={form.postingLimitPerDay}
                      onChange={(e) =>
                        updateField('postingLimitPerDay', e.target.value)
                      }
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Deal Request Limit Per Day">
                    <input
                      type="number"
                      min="0"
                      value={form.dealRequestLimitPerDay}
                      onChange={(e) =>
                        updateField('dealRequestLimitPerDay', e.target.value)
                      }
                      className="input-admin"
                    />
                  </Field>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Toggle
                    label="Can Publish"
                    checked={form.canPublish}
                    onChange={(value) => updateField('canPublish', value)}
                  />
                  <Toggle
                    label="Can Contact"
                    checked={form.canContact}
                    onChange={(value) => updateField('canContact', value)}
                  />
                  <Toggle
                    label="Can Use Match"
                    checked={form.canUseMatch}
                    onChange={(value) => updateField('canUseMatch', value)}
                  />
                  <Toggle
                    label="Can Reveal Contact"
                    checked={form.canRevealContact}
                    onChange={(value) =>
                      updateField('canRevealContact', value)
                    }
                  />
                  
                </div>
              </section>

<section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
  <h2 className="text-lg font-semibold">Dynamic Plan Controls</h2>

  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
    <Toggle label="Can Publish Event" checked={form.canPublishEvent} onChange={(value) => updateField('canPublishEvent', value)} />
    <Toggle label="Can Publish Sponsorship" checked={form.canPublishSponsorship} onChange={(value) => updateField('canPublishSponsorship', value)} />
    <Toggle label="Can Send Deal Request" checked={form.canSendDealRequest} onChange={(value) => updateField('canSendDealRequest', value)} />
  </div>

  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
    <Field label="Event Posts Per Day"><input type="number" min="0" value={form.eventPostsPerDay} onChange={(e) => updateField('eventPostsPerDay', e.target.value)} className="input-admin" /></Field>
    <Field label="Event Posts Per Month"><input type="number" min="0" value={form.eventPostsPerMonth} onChange={(e) => updateField('eventPostsPerMonth', e.target.value)} className="input-admin" /></Field>
    <Field label="Sponsorship Posts Per Day"><input type="number" min="0" value={form.sponsorshipPostsPerDay} onChange={(e) => updateField('sponsorshipPostsPerDay', e.target.value)} className="input-admin" /></Field>
    <Field label="Sponsorship Posts Per Month"><input type="number" min="0" value={form.sponsorshipPostsPerMonth} onChange={(e) => updateField('sponsorshipPostsPerMonth', e.target.value)} className="input-admin" /></Field>
    <Field label="Deal Requests Per Day"><input type="number" min="0" value={form.dealRequestsPerDay} onChange={(e) => updateField('dealRequestsPerDay', e.target.value)} className="input-admin" /></Field>
    <Field label="Deal Requests Per Month"><input type="number" min="0" value={form.dealRequestsPerMonth} onChange={(e) => updateField('dealRequestsPerMonth', e.target.value)} className="input-admin" /></Field>
    <Field label="Contact Reveals Per Day"><input type="number" min="0" value={form.contactRevealsPerDay} onChange={(e) => updateField('contactRevealsPerDay', e.target.value)} className="input-admin" /></Field>
    <Field label="Match Uses Per Day"><input type="number" min="0" value={form.matchUsesPerDay} onChange={(e) => updateField('matchUsesPerDay', e.target.value)} className="input-admin" /></Field>
    <Field label="Match Uses Per Month"><input type="number" min="0" value={form.matchUsesPerMonth} onChange={(e) => updateField('matchUsesPerMonth', e.target.value)} className="input-admin" /></Field>
    <Field label="Contact Reveals Per Month"><input type="number" min="0" value={form.contactRevealsPerMonth} onChange={(e) => updateField('contactRevealsPerMonth', e.target.value)} className="input-admin" /></Field>
    <Field label="Max Post Budget Amount"><input type="number" min="0" value={form.maxPostBudgetAmount} onChange={(e) => updateField('maxPostBudgetAmount', e.target.value)} className="input-admin" /></Field>
    <Field label="Max Visible Budget Amount"><input type="number" min="0" value={form.maxVisibleBudgetAmount} onChange={(e) => updateField('maxVisibleBudgetAmount', e.target.value)} className="input-admin" /></Field>
  </div>
</section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Budget Rules</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Budget Min">
                    <input
                      type="number"
                      min="0"
                      value={form.budgetMin}
                      onChange={(e) => updateField('budgetMin', e.target.value)}
                      className="input-admin"
                    />
                  </Field>

                  <Field label="Budget Max">
                    <input
                      type="number"
                      min="0"
                      value={form.budgetMax}
                      onChange={(e) => updateField('budgetMax', e.target.value)}
                      className="input-admin"
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold">Visibility & Status</h2>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Toggle
                    label="Plan Active"
                    checked={form.isActive}
                    onChange={(value) => updateField('isActive', value)}
                  />
                  <Toggle
                    label="Plan Visible"
                    checked={form.isVisible}
                    onChange={(value) => updateField('isVisible', value)}
                  />
                  <Toggle
                    label="Visible To Logged Out Users"
                    checked={form.visibleToLoggedOut}
                    onChange={(value) =>
                      updateField('visibleToLoggedOut', value)
                    }
                  />
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-medium text-white">
                    Visible To Roles
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(['ORGANIZER', 'SPONSOR', 'BOTH'] as RoleType[]).map(
                      (role) => {
                        const active = form.visibleToRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleVisibleRole(role)}
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
                  href="/admin/payments/plans"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Saving Plan...' : 'Save Plan'}
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
      className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
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