'use client';

import Link from 'next/link';

interface Sponsor {
  _id: string;
  brandName: string;
  description?: string;
  preferredCategories?: string[];
  targetAudience?: string;
  locationPreference?: string;
  website?: string;
  officialEmail?: string;
  officialPhone?: string;
  ownerId: string;
  createdAt?: string;
}

interface SponsorCardProps {
  sponsor: Sponsor;
  matchScore?: number;
}

export function SponsorCard({ sponsor, matchScore }: SponsorCardProps) {
  const categories = Array.isArray(sponsor.preferredCategories)
    ? sponsor.preferredCategories
    : [];

  const hasContactInfo = Boolean(sponsor.officialPhone || sponsor.officialEmail);

  return (
    <Link href={`/sponsors/${sponsor._id}`}>
      <div className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-300 hover:border-accent-orange/40 hover:shadow-[0_0_25px_rgba(251,191,36,0.12)]">
        {matchScore != null && (
          <div className="absolute right-4 top-4 rounded-full bg-accent-orange/95 px-3 py-1 text-xs font-semibold text-dark-base">
            {matchScore}% Match
          </div>
        )}

        <div className="flex flex-1 flex-col space-y-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-text-light transition group-hover:text-accent-orange">
              {sponsor.brandName || 'Unnamed Sponsor'}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {hasContactInfo ? 'Profile ready for contact' : 'Profile details available'}
            </p>
          </div>

          {/* Description */}
          <p className="line-clamp-3 flex-1 text-sm text-text-muted">
            {sponsor.description?.trim()
              ? sponsor.description
              : 'This sponsor is exploring meaningful partnerships on Sponexus.'}
          </p>

          {/* Categories */}
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

          {/* Details */}
          <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="text-xs text-text-muted">Target</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {sponsor.targetAudience || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-xs text-text-muted">Location</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {sponsor.locationPreference || 'Flexible'}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-text-muted">Website</p>
              <p className="line-clamp-1 font-medium text-text-light">
                {sponsor.website || 'Not added'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}