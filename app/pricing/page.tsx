'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { PlanCard } from '@/components/subscription/PlanCard';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type Plan = {
  _id: string;
  code: string;
  role: 'ORGANIZER' | 'SPONSOR' | 'BOTH';
  name: string;
  description?: string;
  price: number;
  currency: 'INR';
  interval: 'CUSTOM' | 'MONTHLY' | 'YEARLY';
  durationInDays: number;
  extraDays?: number;
  postingLimitPerDay?: number | null;
  dealRequestLimitPerDay?: number | null;
  canPublish: boolean;
  canContact: boolean;
  canUseMatch: boolean;
  canRevealContact: boolean;
  isActive: boolean;
  isVisible?: boolean;
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
  data?: Plan[];
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

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false);

    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
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
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
const [couponLoading, setCouponLoading] = useState(false);
const [couponError, setCouponError] = useState<string | null>(null);
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

        const nextPlans = Array.isArray(plansJson.data)
          ? plansJson.data
          : Array.isArray(plansJson.plans)
          ? plansJson.plans
          : [];

        setPlans(nextPlans);
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
      organizers: plans.filter(
        (plan) => plan.role === 'ORGANIZER' || plan.role === 'BOTH'
      ),
      sponsors: plans.filter(
        (plan) => plan.role === 'SPONSOR' || plan.role === 'BOTH'
      ),
    };
  }, [plans]);

  const visiblePlanSections = useMemo(() => {
    if (authLoading) return [];

    if (!isAuthenticated || !user || isAdmin) {
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

  async function refreshSubscription() {
    const refreshed = await fetch('/api/subscriptions/my', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    const refreshedJson = await refreshed.json();
    setSubscriptionData(refreshedJson);
    router.refresh();
  }

  async function handleApplyCoupon(planId: string) {
  try {
    setCouponLoading(true);
    setCouponError(null);
    setAppliedCoupon(null);

    const code = couponCode.trim().toUpperCase();

    if (!code) {
      throw new Error('Enter a coupon code first.');
    }

    const res = await fetch('/api/payments/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        code,
        planId,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.valid) {
      throw new Error(data.message || 'Invalid coupon.');
    }

    setAppliedCoupon({
      planId,
      code: data.coupon.code,
      coupon: data.coupon,
      pricing: data.pricing,
    });
  } catch (err: any) {
    setCouponError(err?.message || 'Failed to apply coupon.');
  } finally {
    setCouponLoading(false);
  }
}

 async function handleCheckout(planId: string) {
  if (checkoutLoading) return;

  try {
    setCheckoutLoading(planId);
    setError(null);

    const idempotencyKey = createIdempotencyKey();

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const checkoutRes = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
       headers: {
  'Content-Type': 'application/json',
  'x-idempotency-key': idempotencyKey,
},
        credentials: 'include',
        body: JSON.stringify({
  planId,
  couponCode:
  appliedCoupon?.planId === planId ? appliedCoupon.code : undefined,
}),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok || !checkoutData.success) {
        throw new Error(checkoutData?.message || 'Subscription checkout failed');
      }

      const order = checkoutData?.gateway?.order;

const checkoutAttemptId =
  checkoutData?.checkout?.checkoutAttemptId ||
  checkoutData?.payment?.checkoutAttemptId;

const keyId =
  checkoutData?.gateway?.keyId ||
  checkoutData?.gateway?.key ||
  checkoutData?.razorpay?.key ||
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!order?.id || !checkoutAttemptId) {
        throw new Error('Payment order details are missing.');
      }

      if (!keyId) {
        throw new Error('Razorpay key is missing.');
      }

      const selectedPlan = plans.find((plan) => plan._id === planId);

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Sponexus',
        description: selectedPlan?.name || 'Sponexus Subscription',
        order_id: order.id,
        prefill: {
          name:
            user?.name ||
            [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
            '',
          email: user?.email || '',
        },
        notes: {
          checkoutAttemptId,
          planId,
        },
        theme: {
          color: '#FF7A18',
        },
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              checkoutAttemptId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok || !verifyData.success) {
  setError(verifyData?.message || 'Payment verification failed');
  setCheckoutLoading(null);
  return;
}

await refreshSubscription();
setCheckoutLoading(null);
        },
        modal: {
          ondismiss: function () {
            setCheckoutLoading(null);
          },
        },
      });

      razorpay.open();
    } catch (err: any) {
      setError(err?.message || 'Unable to activate subscription');
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
              <InfoCard
                label="Free Access"
                title="Register & Explore"
                text="Create your account, complete your profile, and browse platform opportunities."
              />

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

              <InfoCard
                label="Trust Rule"
                title="Mutual Contact Reveal"
                text="Contacts are revealed only after both sides accept, keeping the marketplace cleaner and safer."
              />
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


<div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
  <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
    Coupon Code
  </p>

  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
    <input
      value={couponCode}
      onChange={(event) => {
  setCouponCode(event.target.value.toUpperCase().trimStart());
  setAppliedCoupon(null);
  setCouponError(null);
}}
      placeholder="Enter coupon code"
      className="w-full rounded-xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-[#FF7A18]/50"
    />

    <button
      type="button"
      onClick={() => setCouponCode('')}
      className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#CBD5E1] transition hover:bg-white/10"
    >
      Clear
    </button>
  </div>

  <p className="mt-3 text-xs text-[#94A3B8]">
    Enter a valid Sponexus coupon before choosing a plan.
  </p>
</div>


        {loading || subscriptionLoading || authLoading ? (
          <LoadingPlans />
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
    couponCode={couponCode}
    appliedCoupon={appliedCoupon}
    couponLoading={couponLoading}
    couponError={couponError}
    onApplyCoupon={handleApplyCoupon}
    onClearCoupon={() => {
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError(null);
    }}
  />
))}
          </div>

        )}

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="grid gap-6 lg:grid-cols-3">
            <InfoBlock
              label="How Billing Works"
              title="Simple, transparent plan validity"
              text="Your plan starts from the payment date and stays active for the selected duration. When the plan ends, your paid actions pause until renewal."
            />
            <InfoBlock
              label="After Expiry"
              title="Visibility pauses, data stays"
              text="Your profile remains, but paid listings and paid actions stop until you renew. Existing account data is preserved."
            />
            <InfoBlock
              label="Support"
              title="Billing help when needed"
              text="Subscription confirmations are sent from billing@sponexus.app after activation or renewal."
            />
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
  couponCode,
  appliedCoupon,
  couponLoading,
  couponError,
  onApplyCoupon,
  onClearCoupon,
}: {
  title: string;
  subtitle: string;
  plans: Plan[];
  currentPlanCode: string | null;
  checkoutLoading: string | null;
  onCheckout: (planId: string) => Promise<void>;
  adminBypass: boolean;
  couponCode: string;
  appliedCoupon: any;
  couponLoading: boolean;
  couponError: string | null;
  onApplyCoupon: (planId: string) => Promise<void>;
  onClearCoupon: () => void;
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
    isLoading={checkoutLoading === plan._id}
    adminBypass={adminBypass}

    couponCode={couponCode}
    appliedCoupon={appliedCoupon?.planId === plan._id ? appliedCoupon : null}
    couponLoading={couponLoading}
    couponError={couponError}
    onApplyCoupon={() => onApplyCoupon(plan._id)}
    onClearCoupon={onClearCoupon}

    onSelect={() => onCheckout(plan._id)}
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

function LoadingPlans() {
  return (
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
  );
}

function InfoCard({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{text}</p>
    </div>
  );
}

function InfoBlock({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-3 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{text}</p>
    </div>
  );
}