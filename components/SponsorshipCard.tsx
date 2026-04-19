"use client";

import Link from "next/link";

type SponsorshipStatus = "active" | "paused" | "closed";

interface SponsorshipCardItem {
  _id: string;
  sponsorshipTitle?: string;
  sponsorshipType?: string;
  category?: string;
  budget?: number;
  campaignGoal?: string;
  locationPreference?: string;
  targetAudience?: string;
  status?: SponsorshipStatus;
  createdAt?: string;
  expiresAt?: string | null;
}

interface SponsorshipCardProps {
  sponsorship: SponsorshipCardItem;
  href?: string;
  showActions?: boolean;
  primaryActionHref?: string;
  primaryActionLabel?: string;
}

function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not specified";
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "No expiry";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status?: SponsorshipStatus) {
  if (status === "paused") return "Paused";
  if (status === "closed") return "Closed";
  return "Active";
}

export function SponsorshipCard({
  sponsorship,
  href,
  showActions = true,
  primaryActionHref,
  primaryActionLabel = "View Details",
}: SponsorshipCardProps) {
  const resolvedHref = href || `/sponsorships/${sponsorship._id}`;
  const resolvedPrimaryHref = primaryActionHref || resolvedHref;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-lg font-semibold text-white">
            {sponsorship.sponsorshipTitle || "Untitled Sponsorship"}
          </h3>

          <p className="mt-2 text-sm text-text-muted">
            {sponsorship.category || "No category"} •{" "}
            {sponsorship.locationPreference || "No location"} •{" "}
            {formatCurrency(sponsorship.budget)}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-text-light">
          {getStatusLabel(sponsorship.status)}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-text-muted">
        {sponsorship.campaignGoal || "No campaign goal added yet."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-text-muted">Audience</p>
          <p className="mt-1 line-clamp-2 font-semibold text-white">
            {sponsorship.targetAudience || "Not added"}
          </p>
        </div>

        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-text-muted">Expires</p>
          <p className="mt-1 font-semibold text-white">
            {formatDate(sponsorship.expiresAt)}
          </p>
        </div>
      </div>

      {showActions && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={resolvedPrimaryHref} className="flex-1">
            <div className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] px-6 py-3 text-base font-medium text-white backdrop-blur-md transition-all duration-300 ease-out hover:border-white/25 hover:bg-white/[0.08]">
              {primaryActionLabel}
            </div>
          </Link>

          <Link href="/sponsorships/create" className="flex-1">
            <div className="relative inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 px-6 py-3 text-base font-medium text-black shadow-[0_6px_30px_rgba(245,158,11,0.25)] transition-all duration-300 ease-out hover:brightness-110 hover:shadow-[0_10px_40px_rgba(245,158,11,0.35)]">
              New Post
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}