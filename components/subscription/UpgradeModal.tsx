"use client";

import { Button } from "@/components/Button";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenPricing?: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
};

export function UpgradeModal({
  open,
  onClose,
  onOpenPricing,
  title = "Upgrade required",
  description = "This action needs an active subscription plan. Activate or renew your plan to continue.",
  actionLabel = "View Plans",
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-[101] w-full max-w-lg rounded-3xl border border-white/10 bg-[#07152F] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[#FFB347]">
              Subscription Access
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#94A3B8]">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#FF7A18]/20 bg-[linear-gradient(180deg,rgba(255,122,24,0.10),rgba(255,122,24,0.03))] p-4">
          <ul className="space-y-3 text-sm text-[#CBD5E1]">
            <li>Publish events or sponsorships with an active plan</li>
            <li>Create and manage paid deal actions</li>
            <li>Unlock contact reveal after mutual acceptance</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Not Now
          </Button>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              onClose();
              onOpenPricing?.();
            }}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}