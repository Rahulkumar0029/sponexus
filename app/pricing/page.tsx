'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { PlanCard } from '@/components/subscription/PlanCard';

type Plan = {
  _id: string;
  code: string;
  role: 'ORGANIZER' | 'SPONSOR';
  name: string;
  description?: string;
  price: number;
  currency: 'INR';
  interval: 'MONTHLY' | 'YEARLY';
  durationInDays: number;
  postingLimit: number | null;
  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;
  isActive: boolean;
  sortOrder: number;
};

type MySubscriptionResponse = {
  success: boolean;
  adminBypass?: boolean;
  hasActiveSubscription?: boolean;
  subscription?: {
    _id: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
  plan?: Plan | null;
  status?: string;
  message?: string;
};

type PlansResponse = {
  success: boolean;
  plans?: Plan[];
  message?: string;
};

function formatDate(date?: string) {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PricingPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isOrganizer,
    isSponsor,
    isAdmin,
    loading: authLoading,
  } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] =
    useState<MySubscriptionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPageData() {
      try {
        setLoading(true);
        setSubscriptionLoading(true);
        setError(null);

        const [plansRes, mySubRes] = await Promise.all([
          fetch('/api/plans', {
            method: 'GET',
            cache: 'no-store',
          }),
          fetch('/api/subscriptions/my', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        const plansJson: PlansResponse = await plansRes.json();
        const subJson: MySubscriptionResponse = await mySubRes.json();

        if (!mounted) return;

        if (!plansRes.ok || !plansJson.success) {
          throw new Error(plansJson.message || 'Failed to load plans');
        }

        setPlans(plansJson.plans || []);
        setSubscriptionData(subJson);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load pricing page');
      } finally {
        if (!mounted) return;
        setLoading(false);
        setSubscriptionLoading(false);
      }
    }

    loadPageData();

    return () => {
      mounted = false;
    };
  }, []);

  const groupedPlans = useMemo(() => {
    return {
      organizers: plans.filter((plan) => plan.role === 'ORGANIZER'),
      sponsors: plans.filter((plan) => plan.role === 'SPONSOR'),
    };
  }, [plans]);

  const visiblePlanSections = useMemo(() => {
    if (authLoading) return [];

    if (!isAuthenticated || !user) {
      return [
        {
          key: 'organizers',
          title: 'For Organizers',
          subtitle:
            'Publish events, appear in sponsor discovery, and unlock organizer-side actions.',
          plans: groupedPlans.organizers,
        },
        {
          key: 'sponsors',
          title: 'For Sponsors',
          subtitle:
            'Publish sponsor opportunities, contact organizers, and unlock sponsor-side actions.',
          plans: groupedPlans.sponsors,
        },
      ];
    }

    if (isAdmin) {
      return [
        {
          key: 'organizers',
          title: 'For Organizers',
          subtitle:
            'Publish events, appear in sponsor discovery, and unlock organizer-side actions.',
          plans: groupedPlans.organizers,
        },
        {
          key: 'sponsors',
          title: 'For Sponsors',
          subtitle:
            'Publish sponsor opportunities, contact organizers, and unlock sponsor-side actions.',
          plans: groupedPlans.sponsors,
        },
      ];
    }

    if (isOrganizer) {
      return [
        {
          key: 'organizers',
          title: 'Organizer Plans',
          subtitle: 'These plans are available for your organizer account.',
          plans: groupedPlans.organizers,
        },
      ];
    }

    if (isSponsor) {
      return [
        {
          key: 'sponsors',
          title: 'Sponsor Plans',
          subtitle: 'These plans are available for your sponsor account.',
          plans: groupedPlans.sponsors,
        },
      ];
    }

    return [];
  }, [
    authLoading,
    isAuthenticated,
    user,
    isAdmin,
    isOrganizer,
    isSponsor,
    groupedPlans.organizers,
    groupedPlans.sponsors,
  ]);

  async function handleCheckout(planCode: string) {
    try {
      setCheckoutLoading(planCode);
      setError(null);

      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Subscription checkout failed');
      }

      const refreshed = await fetch('/api/subscriptions/my', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const refreshedJson = await refreshed.json();
      setSubscriptionData(refreshedJson);

      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unable to activate subscription');
    } finally {
      setCheckoutLoading(null);
    }
  }

  const currentPlanCode = subscriptionData?.plan?.code || null;
  const isAdminBypass = !!subscriptionData?.adminBypass;
  const hasActiveSubscription = !!subscriptionData?.hasActiveSubscription;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,24,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-[#94A3B8] backdrop-blur-md">
              Sponexus Plans
            </div>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Choose the plan that unlocks your side of the marketplace
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#94A3B8] sm:text-base">
              Free to sign up. Upgrade when you want to publish, unlock direct
              opportunities, use match tools, and reveal contacts after mutual
              acceptance.
            </p>

            {!authLoading && isAuthenticated && user && !isAdmin && (
              <p className="mx-auto mt-4 max-w-2xl text-sm text-[#CBD5E1]">
                {isOrganizer
                  ? 'You are viewing organizer pricing for your account.'
                  : isSponsor
                  ? 'You are viewing sponsor pricing for your account.'
                  : ''}
              </p>
            )}

            {!authLoading && isAdmin && (
              <p className="mx-auto mt-4 max-w-2xl text-sm text-[#CBD5E1]">
                Admin view enabled. You can see both organizer and sponsor plans.
              </p>
            )}
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                  Free Access
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Register & Explore
                </p>
                <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                  Create your account, complete your profile, and browse platform
                  opportunities.
                </p>
              </div>

              <div className="rounded-2xl border border-[#FF7A18]/25 bg-[linear-gradient(180deg,rgba(255,122,24,0.12),rgba(255,122,24,0.04))] p-5 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.24em] text-[#FFB347]">
                  Paid Actions
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Publish & Unlock
                </p>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                  Active members can publish, contact, use match tools, and
                  unlock real opportunities.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                  Trust Rule
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Mutual Contact Reveal
                </p>
                <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                  Contacts are revealed only after both sides accept, keeping the
                  marketplace cleaner and safer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
        {error && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                Current Access
              </p>

              {subscriptionLoading ? (
                <p className="mt-2 text-sm text-[#CBD5E1]">
                  Checking your subscription...
                </p>
              ) : isAdminBypass ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Admin access active
                  </p>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    You can access paid features without purchasing a plan.
                  </p>
                </>
              ) : hasActiveSubscription && subscriptionData?.plan ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {subscriptionData.plan.name}
                  </p>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    Status: {subscriptionData.status} · Valid till{' '}
                    {formatDate(subscriptionData.subscription?.endDate)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">
                    No active subscription
                  </p>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    You can still register and explore. Upgrade when you are
                    ready to act.
                  </p>
                </>
              )}
            </div>

            {hasActiveSubscription &&
              subscriptionData?.subscription?.endDate &&
              !isAdminBypass && (
                <div className="rounded-xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-[#CBD5E1]">
                  <span className="text-[#94A3B8]">Renewal date:</span>{' '}
                  {formatDate(subscriptionData.subscription.endDate)}
                </div>
              )}
          </div>
        </div>

        {loading || subscriptionLoading || authLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((section) => (
              <div
                key={section}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
              >
                <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
                <div className="mt-6 grid gap-5">
                  {[1, 2].map((card) => (
                    <div
                      key={card}
                      className="rounded-2xl border border-white/10 bg-[#07152F] p-5"
                    >
                      <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 h-8 w-24 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 h-16 animate-pulse rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              visiblePlanSections.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {visiblePlanSections.map((section) => (
              <PlanSection
                key={section.key}
                title={section.title}
                subtitle={section.subtitle}
                plans={section.plans}
                currentPlanCode={currentPlanCode}
                checkoutLoading={checkoutLoading}
                onCheckout={handleCheckout}
                adminBypass={isAdminBypass}
              />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                How Billing Works
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                Simple, transparent plan validity
              </p>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                Your plan starts from the payment date and stays active for the
                selected duration. When the plan ends, your paid actions pause
                until renewal.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                After Expiry
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                Visibility pauses, data stays
              </p>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                Your profile remains, but paid listings and paid actions stop
                until you renew. Existing account data is preserved.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                Support
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                Billing help when needed
              </p>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                Subscription confirmations are sent from billing@sponexus.app
                after activation or renewal.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlanSection({
  title,
  subtitle,
  plans,
  currentPlanCode,
  checkoutLoading,
  onCheckout,
  adminBypass,
}: {
  title: string;
  subtitle: string;
  plans: Plan[];
  currentPlanCode: string | null;
  checkoutLoading: string | null;
  onCheckout: (planCode: string) => Promise<void>;
  adminBypass: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
          {title}
        </p>
        <h2 className="mt-3 text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{subtitle}</p>
      </div>

      <div className="grid gap-5">
        {plans.map((plan) => (
          <PlanCard
            key={plan._id || plan.code}
            plan={plan}
            isCurrent={currentPlanCode === plan.code}
            isLoading={checkoutLoading === plan.code}
            adminBypass={adminBypass}
            onSelect={onCheckout}
          />
        ))}

        {plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#07152F] p-5 text-sm text-[#94A3B8]">
            No plans available in this category right now.
          </div>
        )}
      </div>
    </div>
  );
}