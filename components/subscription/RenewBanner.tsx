"use client";

import { Button } from "@/components/Button";

type RenewBannerProps = {
  status?: string | null;
  endDate?: string | null;
  adminBypass?: boolean;
  onOpenPricing?: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getBannerContent(
  status?: string | null,
  endDate?: string | null,
  adminBypass?: boolean
) {
  if (adminBypass) {
    return {
      show: true,
      title: "Admin access active",
      description:
        "You can access subscription-based features without purchasing a plan.",
      tone: "neutral",
      cta: "Open Pricing",
    };
  }

  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return {
        show: true,
        title: "Your plan is active",
        description: `Your subscription is active until ${formatDate(endDate)}.`,
        tone: "neutral",
        cta: "Manage Plan",
      };

    case "GRACE":
      return {
        show: true,
        title: "Your subscription is in grace period",
        description: `Renew now to avoid losing access. Current validity ended on ${formatDate(
          endDate
        )}.`,
        tone: "warning",
        cta: "Renew Now",
      };

    case "EXPIRED":
      return {
        show: true,
        title: "Your subscription has expired",
        description:
          "Renew your plan to continue publishing, creating deals, and unlocking paid actions.",
        tone: "warning",
        cta: "Renew Plan",
      };

    case "CANCELLED":
      return {
        show: true,
        title: "Your subscription is cancelled",
        description:
          "Activate a plan again to restore your paid access across Sponexus.",
        tone: "warning",
        cta: "Activate Plan",
      };

    case "SUSPENDED":
      return {
        show: true,
        title: "Your subscription is suspended",
        description:
          "Your access is currently restricted. Review your plan or contact support if needed.",
        tone: "danger",
        cta: "View Plans",
      };

    case "NO_ACTIVE_SUBSCRIPTION":
      return {
        show: true,
        title: "No active subscription",
        description:
          "You can explore the platform, but paid actions need an active subscription.",
        tone: "warning",
        cta: "Activate Plan",
      };

    default:
      return {
        show: false,
        title: "",
        description: "",
        tone: "neutral",
        cta: "View Plans",
      };
  }
}

function getToneClasses(tone: "neutral" | "warning" | "danger") {
  switch (tone) {
    case "warning":
      return "border-[#FF7A18]/30 bg-[#FF7A18]/10";
    case "danger":
      return "border-red-500/30 bg-red-500/10";
    case "neutral":
    default:
      return "border-white/10 bg-white/[0.04]";
  }
}

export function RenewBanner({
  status,
  endDate,
  adminBypass = false,
  onOpenPricing,
}: RenewBannerProps) {
  const content = getBannerContent(status, endDate, adminBypass);

  if (!content.show) return null;

  return (
    <div
      className={`rounded-3xl border p-6 sm:p-8 ${getToneClasses(
        content.tone as "neutral" | "warning" | "danger"
      )}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[#94A3B8]">
            Subscription Status
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {content.title}
          </h2>
          <p className="mt-2 text-sm text-text-muted">{content.description}</p>
        </div>

        <Button variant="primary" onClick={onOpenPricing}>
          {content.cta}
        </Button>
      </div>
    </div>
  );
}