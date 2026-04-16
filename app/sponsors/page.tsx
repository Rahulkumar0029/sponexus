"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SponsorCard } from "@/components/SponsorCard";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

type CurrentUser = {
  _id?: string;
  name?: string;
  email?: string;
  role?: "SPONSOR" | "ORGANIZER" | string;
};

type SponsorProfile = {
  _id: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  website?: string;
  officialEmail?: string;
  phone?: string;
  officialPhone?: string;
  industry?: string;
  about?: string;
  logoUrl?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: string[];
  isProfileComplete?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SponsorsResponse = {
  success: boolean;
  sponsors: SponsorProfile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
};

type MeResponse = {
  success?: boolean;
  user?: CurrentUser | null;
  sponsorProfile?: SponsorProfile | null;
  organizerProfile?: Record<string, unknown> | null;
  data?: {
    user?: CurrentUser | null;
    sponsorProfile?: SponsorProfile | null;
    organizerProfile?: Record<string, unknown> | null;
  };
  message?: string;
};

function getSafeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function isSponsorProfileComplete(profile: SponsorProfile | null | undefined): boolean {
  if (!profile) return false;

  const brandOrCompany = Boolean(profile.brandName || profile.companyName);
  const phone = Boolean(profile.phone || profile.officialPhone);
  const categories = getSafeArray(profile.preferredCategories);

  return brandOrCompany && phone && categories.length > 0;
}

export default function SponsorsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SponsorsResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentSponsorProfile, setCurrentSponsorProfile] = useState<SponsorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchPageData = async () => {
      try {
        if (page === 1 && !data) {
          setLoading(true);
        } else {
          setPageLoading(true);
        }

        setError("");

        const [meRes, sponsorsRes] = await Promise.all([
          fetch("/api/settings/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/sponsors/get?page=${page}&limit=12`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        let meJson: MeResponse | null = null;
        let sponsorsJson: SponsorsResponse | null = null;

        try {
          meJson = await meRes.json();
        } catch {
          meJson = null;
        }

        try {
          sponsorsJson = await sponsorsRes.json();
        } catch {
          sponsorsJson = null;
        }

        if (!sponsorsRes.ok || !sponsorsJson?.success) {
          throw new Error(sponsorsJson?.message || "Failed to fetch sponsors");
        }

        if (cancelled) return;

        const meUser = meJson?.user ?? meJson?.data?.user ?? null;
        const meSponsorProfile =
          meJson?.sponsorProfile ?? meJson?.data?.sponsorProfile ?? null;

        setCurrentUser(meUser);
        setCurrentSponsorProfile(meSponsorProfile);
        setData(sponsorsJson);
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong while loading sponsors";

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPageLoading(false);
        }
      }
    };

    fetchPageData();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const isSponsor = currentUser?.role === "SPONSOR";
  const isOrganizer = currentUser?.role === "ORGANIZER";
  const sponsorProfileComplete = isSponsorProfileComplete(currentSponsorProfile);

  const pageTitle = useMemo(() => {
    if (isOrganizer) return "Explore Sponsors";
    if (isSponsor) return "Sponsor Directory";
    return "Explore Sponsors";
  }, [isOrganizer, isSponsor]);

  const pageDescription = useMemo(() => {
    if (isOrganizer) {
      return "Discover verified brands and businesses open to real event partnerships.";
    }

    if (isSponsor) {
      return "Browse sponsor profiles and manage your public sponsor presence on Sponexus.";
    }

    return "Discover verified brands and businesses open to real event partnerships.";
  }, [isOrganizer, isSponsor]);

  const sponsorActionLabel = useMemo(() => {
    if (!isSponsor) return "";
    return sponsorProfileComplete ? "Manage My Profile" : "Complete Profile";
  }, [isSponsor, sponsorProfileComplete]);

  const sponsorActionHref = "/settings";

  const sponsors = data?.sponsors ?? [];
  const totalPages = data?.pagination?.pages ?? 1;

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">{pageTitle}</h1>
            <p className="text-text-muted">{pageDescription}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isOrganizer && (
              <Link href="/match">
                <Button variant="secondary">View Matches</Button>
              </Link>
            )}

            {isSponsor && (
              <Link href={sponsorActionHref}>
                <Button variant="primary">{sponsorActionLabel}</Button>
              </Link>
            )}
          </div>
        </div>

        {isSponsor && !sponsorProfileComplete && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            Your sponsor profile is incomplete. Complete it from Settings so organizers can
            discover your brand properly.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-text-muted animate-pulse">
            Loading sponsors...
          </div>
        ) : sponsors.length > 0 ? (
          <>
            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((sponsor) => (
                <SponsorCard key={sponsor._id} sponsor={sponsor} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  disabled={page === 1 || pageLoading}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  ← Previous
                </Button>

                <span className="text-text-muted">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="secondary"
                  disabled={page === totalPages || pageLoading}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title={isSponsor ? "No Sponsors Visible Yet" : "No Sponsors Found"}
            description={
              isSponsor
                ? "Sponsor profiles will appear here as more brands complete their public profiles on Sponexus."
                : "There are no sponsor profiles available yet. Check back later as more brands join the platform."
            }
            actionLabel={isSponsor ? sponsorActionLabel : undefined}
            onAction={
              isSponsor
                ? () => {
                    window.location.href = sponsorActionHref;
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}