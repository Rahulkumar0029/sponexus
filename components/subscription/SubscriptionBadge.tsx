"use client";

type SubscriptionBadgeProps = {
  status?: string | null;
  adminBypass?: boolean;
  className?: string;
};

function getBadgeConfig(status?: string | null, adminBypass?: boolean) {
  if (adminBypass) {
    return {
      label: "Admin Access",
      className:
        "border border-white/10 bg-white/5 text-white",
    };
  }

  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return {
        label: "Active Plan",
        className:
          "border border-[#FF7A18]/30 bg-[#FF7A18]/10 text-[#FFB347]",
      };

    case "GRACE":
      return {
        label: "Grace Period",
        className:
          "border border-[#FFB347]/30 bg-[#FFB347]/10 text-[#FFB347]",
      };

    case "EXPIRED":
      return {
        label: "Expired",
        className:
          "border border-red-500/30 bg-red-500/10 text-red-300",
      };

    case "CANCELLED":
      return {
        label: "Cancelled",
        className:
          "border border-white/10 bg-white/5 text-[#94A3B8]",
      };

    case "SUSPENDED":
      return {
        label: "Suspended",
        className:
          "border border-red-500/30 bg-red-500/10 text-red-300",
      };

    case "NO_ACTIVE_SUBSCRIPTION":
      return {
        label: "No Active Plan",
        className:
          "border border-white/10 bg-white/5 text-[#94A3B8]",
      };

    default:
      return {
        label: "Plan Status",
        className:
          "border border-white/10 bg-white/5 text-[#94A3B8]",
      };
  }
}

export function SubscriptionBadge({
  status,
  adminBypass = false,
  className = "",
}: SubscriptionBadgeProps) {
  const config = getBadgeConfig(status, adminBypass);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}