"use client";

import { Button } from "@/components/Button";
import type { PlanDTO } from "@/types/subscription";

type PlanCardProps = {
  plan: PlanDTO;
  isCurrent?: boolean;
  isLoading?: boolean;
  adminBypass?: boolean;
  onSelect?: (planCode: string) => void;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

type FeatureTagProps = {
  label: string;
  active?: boolean;
};

function FeatureTag({ label, active = true }: FeatureTagProps) {
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

export function PlanCard({
  plan,
  isCurrent = false,
  isLoading = false,
  adminBypass = false,
  onSelect,
}: PlanCardProps) {
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
          <p className="text-3xl font-bold text-white">
            {formatPrice(plan.price)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
            {plan.interval}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <FeatureTag label="Unlimited posting" active={plan.postingLimit === null} />
        <FeatureTag label="Publish access" active={plan.canPublish} />
        <FeatureTag label="Direct contact actions" active={plan.canContact} />
        <FeatureTag label="Match tools" active={plan.canUseMatch} />
        <FeatureTag label="Contact reveal support" active={plan.canRevealContact} />
        <FeatureTag
          label={
            plan.interval === "YEARLY"
              ? "11 months price benefit"
              : "Flexible monthly access"
          }
          active
        />
      </div>

      <div className="mt-5">
        <Button
          variant={isCurrent || adminBypass ? "secondary" : "primary"}
          className="w-full"
          disabled={isCurrent || isLoading || adminBypass}
          onClick={() => onSelect?.(plan.code)}
        >
          {adminBypass
            ? "Admin access enabled"
            : isCurrent
            ? "Already Active"
            : isLoading
            ? "Processing..."
            : `Choose ${plan.interval === "YEARLY" ? "Yearly" : "Monthly"} Plan`}
        </Button>
      </div>
    </div>
  );
}