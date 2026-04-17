"use client";

import Link from "next/link";

interface SponsorCardSponsor {
  _id: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  website?: string;
  officialEmail?: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  about?: string;
  logoUrl?: string;
  targetAudience?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: string[];
  isProfileComplete?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SponsorCardProps {
  sponsor: SponsorCardSponsor;
  matchScore?: number;
}

function formatWebsite(url?: string) {
  if (!url) return "Not added";

  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .trim();
}

function formatLocations(locations: string[]) {
  if (!locations.length) return "Flexible";
  if (locations.length <= 2) return locations.join(", ");
  return `${locations.slice(0, 2).join(", ")} +${locations.length - 2}`;
}

export function SponsorCard({ sponsor, matchScore }: SponsorCardProps) {
  const categories = Array.isArray(sponsor.preferredCategories)
    ? sponsor.preferredCategories.filter(Boolean)
    : [];

  const locations = Array.isArray(sponsor.preferredLocations)
    ? sponsor.preferredLocations.filter(Boolean)
    : [];

  const profileSubtitle = sponsor.isProfileComplete
    ? "Brand profile available"
    : "Sponsor profile preview";

  return (
    <Link href={`/sponsors/${sponsor._id}`} className="block h-full">
      <div className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-300 hover:border-accent-orange/40 hover:shadow-[0_0_25px_rgba(251,191,36,0.12)]">
        {matchScore != null && (
          <div className="absolute right-4 top-4 rounded-full bg-accent-orange/95 px-3 py-1 text-xs font-semibold text-dark-base">
            {matchScore}% Match
          </div>
        )}

        <div className="flex flex-1 flex-col space-y-4">
          <div className="pr-16">
            <h3 className="text-lg font-semibold text-text-light transition group-hover:text-accent-orange">
              {sponsor.brandName || sponsor.companyName || "Unnamed Sponsor"}
            </h3>

            <p className="mt-1 text-xs text-text-muted">{profileSubtitle}</p>
          </div>

          <p className="line-clamp-3 flex-1 text-sm text-text-muted">
            {sponsor.about?.trim()
              ? sponsor.about
              : "This sponsor is exploring meaningful partnerships on Sponexus."}
          </p>

          <div className="flex flex-wrap gap-2">
            {categories.length > 0 ? (
              <>
                {categories.slice(0, 3).map((cat) => (
                  <span
                    key={cat}
                    className="rounded-md bg-white/5 px-2 py-1 text-xs text-text-muted"
                  >
                    {cat}
                  </span>
                ))}
                {categories.length > 3 && (
                  <span className="text-xs text-text-muted">
                    +{categories.length - 3}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-text-muted">No categories added</span>
            )}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="text-xs text-text-muted">Industry</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {sponsor.industry || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs text-text-muted">Target</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {sponsor.targetAudience || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs text-text-muted">Location</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {formatLocations(locations)}
              </p>
            </div>

            <div>
              <p className="text-xs text-text-muted">Company</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {sponsor.companyName || sponsor.brandName || "Not added"}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-text-muted">Website</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {formatWebsite(sponsor.website)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}