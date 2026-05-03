"use client";

import Image from "next/image";
import Link from "next/link";

type SponsorshipStatus = "active" | "paused" | "closed" | "expired";

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
  deliverablesExpected?: string[];
  brandName?: string;
  companyName?: string;
  logoUrl?: string;
  coverImage?: string;
}

interface SponsorshipCardProps {
  sponsorship: SponsorshipCardItem;
  href?: string;
  showActions?: boolean;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  matchScore?: number;
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
  if (status === "expired") return "Expired";
  return "Active";
}

function getStatusClasses(status?: SponsorshipStatus) {
  if (status === "paused") {
    return "border border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "closed") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (status === "expired") {
    return "border border-slate-500/30 bg-slate-500/10 text-slate-300";
  }

  return "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
}

function getCoverFallback() {
  return "/images/default-sponsorship-cover.png";
}

export function SponsorshipCard({
  sponsorship,
  href,
  showActions = true,
  primaryActionHref,
  primaryActionLabel = "View Details",
  matchScore,
}: SponsorshipCardProps) {
  const resolvedHref = href || `/sponsorships/${sponsorship._id}`;
  const resolvedPrimaryHref = primaryActionHref || resolvedHref;

 const hasCustomCover = Boolean(sponsorship.coverImage);
const hasLogoOnly = !hasCustomCover && Boolean(sponsorship.logoUrl);

const coverSrc = hasCustomCover
  ? sponsorship.coverImage!
  : getCoverFallback();

  const deliverables = Array.isArray(sponsorship.deliverablesExpected)
    ? sponsorship.deliverablesExpected.slice(0, 3)
    : [];

  return (
    <article className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-300 hover:border-accent-orange/40 hover:shadow-[0_0_25px_rgba(255,122,24,0.12)]">
     <Link href={resolvedHref} className="block h-full">
       <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07152F]">
  <Image
    src={coverSrc}
    alt={sponsorship.sponsorshipTitle || "Sponsorship campaign"}
    fill
    className={`transition duration-500 group-hover:scale-105 ${
      hasCustomCover ? "object-cover" : "object-cover opacity-35"
    }`}
    sizes="(max-width: 768px) 100vw, 50vw"
  />

  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,179,71,0.20),transparent_35%),linear-gradient(135deg,rgba(2,6,23,0.92),rgba(7,21,47,0.82),rgba(2,6,23,0.95))]" />

  {hasLogoOnly && sponsorship.logoUrl ? (
    <div className="absolute right-4 top-14 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/90 p-2 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
      <Image
        src={sponsorship.logoUrl}
        alt={sponsorship.brandName || sponsorship.companyName || "Sponsor logo"}
        width={72}
        height={72}
        className="h-full w-full object-contain"
      />
    </div>
  ) : null}

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClasses(
                sponsorship.status
              )}`}
            >
              {getStatusLabel(sponsorship.status)}
            </span>

            {sponsorship.sponsorshipType ? (
              <span className="rounded-full border border-[#FF7A18]/30 bg-[#FF7A18]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FFB347]">
                {sponsorship.sponsorshipType}
              </span>
            ) : null}
          </div>

{matchScore != null ? (
  <div className="absolute right-4 top-4 z-10 rounded-full bg-accent-orange/90 px-3 py-1 text-sm font-bold text-dark-base">
    {matchScore}% Match
  </div>
) : null}

<div className="absolute bottom-4 left-4 right-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#FFB347]">
              {sponsorship.brandName ||
                sponsorship.companyName ||
                sponsorship.category ||
                "Sponsor Campaign"}
            </p>

            <h3 className="mt-1 line-clamp-2 text-xl font-bold text-white">
              {sponsorship.sponsorshipTitle || "Untitled Sponsorship"}
            </h3>
          </div>
        </div>

        <div className="p-5">
          <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">
            {sponsorship.campaignGoal || "No campaign goal added yet."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {deliverables.length ? (
              deliverables.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-text-muted">
                No deliverables added
              </span>
            )}
          </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-3 text-sm">
  <div>
    <p className="text-xs text-text-muted">Budget</p>
    <p className="font-bold text-accent-orange">
      {formatCurrency(sponsorship.budget)}
    </p>
  </div>

  <div>
    <p className="text-xs text-text-muted">Expires</p>
    <p className="font-medium text-text-light">
      {formatDate(sponsorship.expiresAt)}
    </p>
  </div>

  <div className="col-span-2">
    <p className="text-xs text-text-muted">Location • Category</p>
    <p className="font-medium text-text-light">
      {sponsorship.locationPreference || "Anywhere"} •{" "}
      {sponsorship.category || "N/A"}
    </p>
  </div>
</div>
        </div>
      </Link>

      {showActions && (
  <div className="border-t border-white/10 p-5">
    <Link href={resolvedPrimaryHref}>
      <div className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]">
        {primaryActionLabel}
      </div>
    </Link>
  </div>
)}
    </article>
  );
}