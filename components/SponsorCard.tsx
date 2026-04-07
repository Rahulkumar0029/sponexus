'use client';

import Link from 'next/link';

interface Sponsor {
  _id: string;
  brandName: string;
  description: string;
  budget: string;
  preferredCategories: string[];
  targetAudience: string;
  locationPreference: string;
  ownerId: string;
  createdAt: string;
}

interface SponsorCardProps {
  sponsor: Sponsor;
  matchScore?: number;
}

export function SponsorCard({ sponsor, matchScore }: SponsorCardProps) {
  return (
    <Link href={`/sponsors/${sponsor._id}`}>
      <div className="relative card-hover cursor-pointer group h-full flex flex-col transition-all duration-300 hover:shadow-glow-orange">
        {matchScore != null && (
          <div className="absolute right-4 top-4 rounded-full bg-accent-orange/95 px-3 py-1 text-xs font-semibold text-dark-base">
            {matchScore}% Match
          </div>
        )}
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Brand Info */}
          <div>
            <h3 className="text-lg font-semibold text-text-light group-hover:text-accent-orange smooth-transition">
              {sponsor.brandName}
            </h3>
          </div>

          {/* Description */}
          <p className="text-text-muted text-sm line-clamp-2 flex-1">{sponsor.description}</p>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {sponsor.preferredCategories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-md"
              >
                {cat}
              </span>
            ))}
            {sponsor.preferredCategories.length > 2 && (
              <span className="text-xs text-text-muted">
                +{sponsor.preferredCategories.length - 2}
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/10 pt-3 mt-auto">
            <div>
              <p className="text-text-muted text-xs">Budget</p>
              <p className="text-accent-orange font-bold">
                {sponsor.budget}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Target</p>
              <p className="text-text-light font-medium text-sm line-clamp-1">
                {sponsor.targetAudience}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-text-muted text-xs">Location</p>
              <p className="text-text-light font-medium text-sm line-clamp-1">
                {sponsor.locationPreference}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
