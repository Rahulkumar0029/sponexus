"use client";

import { Button } from "@/components/Button";
import type { PlanDTO } from "@/types/subscription";

type AppliedCoupon = {
  planId: string;
  code: string;
  pricing: {
    amountBeforeDiscount: number;
    discountAmount: number;
    finalAmount: number;
    currency: "INR";
  };
};

type PlanCardProps = {
  plan: PlanDTO;
  isCurrent?: boolean;
  isLoading?: boolean;
  adminBypass?: boolean;

  couponCode?: string;
  appliedCoupon?: AppliedCoupon | null;
  couponLoading?: boolean;
  couponError?: string | null;
  onApplyCoupon?: () => void;
  onClearCoupon?: () => void;

  onSelect?: (planId: string) => void;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price || 0);
}

function FeatureTag({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${
        active
          ? "border-white/10 bg-white/5 text-[#CBD5E1]"
          : "border-white/5 bg-transparent text-[#64748B]"
      }`}
    >
      {label}
    </div>
  );
}

function getIntervalLabel(plan: PlanDTO) {
  if (plan.interval === "YEARLY") return "YEARLY";
  if (plan.interval === "MONTHLY") return "MONTHLY";
  return `${plan.durationInDays} DAYS`;
}

function getCtaLabel(plan: PlanDTO) {
  if (plan.interval === "YEARLY") return "Choose Yearly Plan";
  if (plan.interval === "MONTHLY") return "Choose Monthly Plan";
  return "Choose Plan";
}

function getPlanVisibleBenefits(plan: PlanDTO) {
  const items: { label: string; active: boolean }[] = [];

  const postingLimitPerDay =
    typeof plan.postingLimitPerDay === "number" ? plan.postingLimitPerDay : null;

  const dealRequestLimitPerDay =
    typeof plan.dealRequestLimitPerDay === "number"
      ? plan.dealRequestLimitPerDay
      : null;

  items.push({
    label:
      postingLimitPerDay === null
        ? "Unlimited posting"
        : `${postingLimitPerDay} posts/day`,
    active: true,
  });

  if (plan.canPublish) items.push({ label: "Publishing access", active: true });
  if (plan.canContact) items.push({ label: "Direct contact actions", active: true });
  if (plan.canUseMatch) items.push({ label: "Smart match tools", active: true });
  if (plan.canRevealContact) items.push({ label: "Contact reveal access", active: true });

  items.push({
    label:
      dealRequestLimitPerDay === null
        ? "Unlimited deal requests"
        : `${dealRequestLimitPerDay} requests/day`,
    active: true,
  });

  if (typeof plan.extraDays === "number" && plan.extraDays > 0) {
    items.push({ label: `+${plan.extraDays} bonus days`, active: true });
  }

  return items.slice(0, 6);
}

export function PlanCard({
  plan,
  isCurrent = false,
  isLoading = false,
  adminBypass = false,
  couponCode = "",
  appliedCoupon = null,
  couponLoading = false,
  couponError = null,
  onApplyCoupon,
  onClearCoupon,
  onSelect,
}: PlanCardProps) {
  const visibleBenefits = getPlanVisibleBenefits(plan);
  const couponApplied = appliedCoupon?.planId === plan._id;
  const finalPrice = couponApplied
    ? appliedCoupon.pricing.finalAmount
    : plan.price;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isCurrent
          ? "border-[#FF7A18]/40 bg-[linear-gradient(180deg,rgba(255,122,24,0.14),rgba(255,122,24,0.05))]"
          : "border-white/10 bg-[#07152F]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

            {isCurrent && (
              <span className="rounded-full border border-[#FF7A18]/30 bg-[#FF7A18]/10 px-2.5 py-1 text-xs font-medium text-[#FFB347]">
                Current Plan
              </span>
            )}

            {adminBypass && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#CBD5E1]">
                Admin Access
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
            {plan.description || "Premium access for active marketplace users."}
          </p>
        </div>

        <div className="md:text-right">
          {couponApplied && (
            <p className="text-sm text-[#94A3B8] line-through">
              {formatPrice(plan.price)}
            </p>
          )}

          <p className="text-3xl font-bold text-white">
            {formatPrice(finalPrice)}
          </p>

          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
            {getIntervalLabel(plan)}
          </p>
        </div>
      </div>

      {couponCode.trim() && !isCurrent && !adminBypass && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {couponApplied ? (
            <div>
              <p className="text-sm font-semibold text-[#FFB347]">
                Coupon {appliedCoupon.code} applied
              </p>
              <p className="mt-1 text-sm text-[#CBD5E1]">
                You save {formatPrice(appliedCoupon.pricing.discountAmount)} on this plan.
              </p>

              <button
                type="button"
                onClick={onClearCoupon}
                className="mt-3 text-xs font-semibold text-[#94A3B8] transition hover:text-white"
              >
                Remove coupon
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#CBD5E1]">
                Apply coupon <span className="font-semibold text-white">{couponCode}</span> to this plan.
              </p>

              <button
                type="button"
                onClick={onApplyCoupon}
                disabled={couponLoading}
                className="rounded-xl border border-[#FF7A18]/25 bg-[#FF7A18]/10 px-4 py-2 text-sm font-semibold text-[#FFB347] transition hover:bg-[#FF7A18]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {couponLoading ? "Applying..." : "Apply"}
              </button>
            </div>
          )}

          {couponError && !couponApplied && (
            <p className="mt-3 text-xs text-red-300">{couponError}</p>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visibleBenefits.map((feature) => (
          <FeatureTag
            key={feature.label}
            label={feature.label}
            active={feature.active}
          />
        ))}
      </div>

      <div className="mt-5">
        <Button
          variant={isCurrent || adminBypass ? "secondary" : "primary"}
          className="w-full"
          disabled={isCurrent || isLoading || adminBypass}
          onClick={() => onSelect?.(plan._id)}
        >
          {adminBypass
            ? "Admin access enabled"
            : isCurrent
            ? "Already Active"
            : isLoading
            ? "Processing..."
            : getCtaLabel(plan)}
        </Button>
      </div>
    </div>
  );
}