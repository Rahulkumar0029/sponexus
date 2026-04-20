"use client";

import Link from "next/link";
import { useState } from "react";

type SearchResults = {
  success: boolean;
  query?: string;
  results?: {
    users: any[];
    sponsorProfiles: any[];
    events: any[];
    sponsorships: any[];
    deals: any[];
  };
  message?: string;
};

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResults | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/search?q=${encodeURIComponent(query.trim())}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setData(json);
    } catch {
      setData({
        success: false,
        message: "Failed to search admin data",
      });
    } finally {
      setLoading(false);
    }
  };

  const results = data?.results;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Global Admin Search
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Platform Search</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Search across users, sponsor profiles, events, sponsorships, and deals
          from one place.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search by email, name, phone, company, event title, deal id..."
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
          />
          <button
            onClick={handleSearch}
            className="rounded-2xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-medium text-white"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {!data ? null : !data.success ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {data.message || "Search failed"}
        </div>
      ) : (
        <div className="grid gap-6">
          <SearchSection title="Users" count={results?.users?.length || 0}>
            {(results?.users || []).map((user) => (
              <SearchCard
                key={user._id}
                title={user.name || "Unnamed User"}
                subtitle={user.email}
                meta={`${user.role} • ${user.accountStatus}`}
                href={`/admin/users/${user._id}`}
              />
            ))}
          </SearchSection>

          <SearchSection title="Sponsor Profiles" count={results?.sponsorProfiles?.length || 0}>
            {(results?.sponsorProfiles || []).map((profile) => (
              <SearchCard
                key={profile._id}
                title={profile.brandName || profile.companyName || "Sponsor Profile"}
                subtitle={profile.officialEmail || "No official email"}
                meta={profile.officialPhone || "No official phone"}
              />
            ))}
          </SearchSection>

          <SearchSection title="Events" count={results?.events?.length || 0}>
            {(results?.events || []).map((event) => (
              <SearchCard
                key={event._id}
                title={event.title || "Untitled Event"}
                subtitle={event.location || "No location"}
                meta={`${event.status} • ${event.visibilityStatus}`}
                href={`/admin/events/${event._id}`}
              />
            ))}
          </SearchSection>

          <SearchSection title="Sponsorships" count={results?.sponsorships?.length || 0}>
            {(results?.sponsorships || []).map((item) => (
              <SearchCard
                key={item._id}
                title={item.sponsorshipTitle || "Untitled Sponsorship"}
                subtitle={item.category || "No category"}
                meta={`${item.status} • ${item.visibilityStatus}`}
                href={`/admin/sponsorships/${item._id}`}
              />
            ))}
          </SearchSection>

          <SearchSection title="Deals" count={results?.deals?.length || 0}>
            {(results?.deals || []).map((deal) => (
              <SearchCard
                key={deal._id}
                title={deal.title || "Untitled Deal"}
                subtitle={deal.status || "No status"}
                meta={`${deal.paymentStatus} • ${deal.adminReviewStatus}`}
                href={`/admin/deals/${deal._id}`}
              />
            ))}
          </SearchSection>
        </div>
      )}
    </div>
  );
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#94A3B8]">
          {count}
        </span>
      </div>

      {!hasChildren ? (
        <p className="mt-4 text-sm text-[#94A3B8]">No results found.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
      )}
    </div>
  );
}

function SearchCard({
  title,
  subtitle,
  meta,
  href,
}: {
  title: string;
  subtitle: string;
  meta: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4 transition hover:border-white/20 hover:bg-[#07152F]">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-[#94A3B8]">{subtitle}</p>
      <p className="mt-2 text-xs text-[#94A3B8]">{meta}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}