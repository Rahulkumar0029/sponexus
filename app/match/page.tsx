"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { SponsorCard } from "@/components/SponsorCard";
import { useMatch } from "@/hooks/useMatch";
import { EventMatchResult, SponsorMatchResult } from "@/types/match";

type CurrentUser = {
  _id?: string;
  id?: string;
  role?: "ORGANIZER" | "SPONSOR";
  name?: string;
  firstName?: string;
  email?: string;
};

type SponsorProfile = {
  _id?: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  officialEmail?: string;
  phone?: string;
  industry?: string;
  about?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  targetAudience?: string;
  sponsorshipInterests?: string[];
  isProfileComplete?: boolean;
  isPublic?: boolean;
};

type SettingsMeResponse = {
  success: boolean;
  user?: CurrentUser;
  sponsorProfile?: SponsorProfile | null;
  message?: string;
};

export default function MatchPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [activeSourceLabel, setActiveSourceLabel] = useState("");
  const [activeSourceId, setActiveSourceId] = useState("");
  const [pageError, setPageError] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState(40);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dealLoadingId, setDealLoadingId] = useState("");

  const { matches, loading, error, findMatches , resetMatches } = useMatch();

  const getUserId = useCallback(() => {
    return user?._id ?? user?.id ?? "";
  }, [user]);

  const isSponsor = user?.role === "SPONSOR";
  const isOrganizer = user?.role === "ORGANIZER";
  const sponsorProfileComplete = Boolean(sponsorProfile?.isProfileComplete);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setBootLoading(true);
        setPageError("");

        const res = await fetch("/api/settings/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: SettingsMeResponse = await res.json();

        if (!res.ok || !data.success) {
          setUser(null);
          setSponsorProfile(null);
          return;
        }

        setUser(data.user || null);
        setSponsorProfile(data.sponsorProfile || null);
      } catch {
        setUser(null);
        setSponsorProfile(null);
      } finally {
        setBootLoading(false);
      }
    };

    bootstrap();
  }, []);

  const fetchOrganizerEventAndMatch = useCallback(
    async (userId: string) => {
      const response = await fetch(`/api/events/get?organizer=${userId}&limit=1`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load your event data");
      }

      if (data.events?.length > 0) {
        const latestEvent = data.events[0];
        setActiveSourceLabel(latestEvent.title || "Your latest event");
        setActiveSourceId(latestEvent._id || "");
        setEmptyMessage("");
        await findMatches({ eventId: latestEvent._id });
        return;
      }

      setActiveSourceLabel("");
      setActiveSourceId("");
      setEmptyMessage("Create your first event to receive sponsor recommendations.");
      resetMatches();
    },
    [findMatches]
  );

  const fetchSponsorMatches = useCallback(
    async (userId: string) => {
      if (!sponsorProfileComplete) {
        setActiveSourceLabel("");
        setActiveSourceId("");
        setEmptyMessage("Complete your sponsor profile in Settings to receive event recommendations.");
        resetMatches();
        return;
      }

      const sponsorshipRes = await fetch(
        `/api/sponsorships/get?sponsorOwnerId=${userId}&status=active&limit=1`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );
      const sponsorshipData = await sponsorshipRes.json();

      const latestSponsorship = sponsorshipData?.data?.[0];
      if (!latestSponsorship?._id) {
        setActiveSourceLabel("");
        setActiveSourceId("");
        setEmptyMessage("Create an active sponsorship post to unlock event matches.");
        resetMatches();
        return;
      }

      setActiveSourceLabel(latestSponsorship.sponsorshipTitle || "Your latest sponsorship");
      setActiveSourceId(latestSponsorship._id);
      setEmptyMessage("");
      await findMatches({ sponsorOwnerId: userId });
    },
    [findMatches, sponsorProfile, sponsorProfileComplete]
  );

  useEffect(() => {
    const loadMatches = async () => {
      if (!user) return;

      const userId = getUserId();

      if (!userId) {
        setPageError("User session is missing a valid ID.");
        return;
      }

      setPageError("");
      setEmptyMessage("");

      try {
        if (isSponsor) {
          await fetchSponsorMatches(userId);
          return;
        }

        if (isOrganizer) {
          await fetchOrganizerEventAndMatch(userId);
          return;
        }

        setPageError("Unsupported account role.");
      } catch (err: any) {
        setPageError(err.message || "Failed to load matches.");
      }
    };

    loadMatches();
  }, [
    user,
    getUserId,
    isSponsor,
    isOrganizer,
    fetchOrganizerEventAndMatch,
    fetchSponsorMatches,
  ]);

  const handleRefresh = async () => {
    if (!user) return;

    const userId = getUserId();

    if (!userId) {
      setPageError("User session is missing a valid ID.");
      return;
    }

    setPageError("");

    try {
      if (isSponsor) {
        await fetchSponsorMatches(userId);
        return;
      }

      if (isOrganizer) {
        await fetchOrganizerEventAndMatch(userId);
      }
    } catch (err: any) {
      setPageError(err.message || "Failed to refresh matches.");
    }
  };

  const stepOneTitle = useMemo(() => {
    if (isOrganizer) return "Step 1: Create an Event";
    if (isSponsor) return "Step 1: Complete Sponsor Profile";
    return "Step 1";
  }, [isOrganizer, isSponsor]);

  const stepOneDescription = useMemo(() => {
    if (isOrganizer) {
      return "Add clear category, audience, location, and event details so we can recommend the right sponsors.";
    }

    if (isSponsor) {
      return "Complete your sponsor profile in Settings so Sponexus can recommend the best-fit events for your brand.";
    }

    return "Set up your profile and marketplace data to unlock smart matching.";
  }, [isOrganizer, isSponsor]);

  const stepOneHref = useMemo(() => {
    if (isOrganizer) return "/events/create";
    if (isSponsor) return "/sponsorships/create";
    return "/login";
  }, [isOrganizer, isSponsor]);

  const stepOneButton = useMemo(() => {
    if (isOrganizer) return "Create Event";
    if (isSponsor) return "Sponsor Now";
    return "Log In";
  }, [isOrganizer, isSponsor]);

  const visibleMatches = useMemo(() => {
    return matches.filter((match) => {
      if (match.score < minScoreFilter) return false;

      if (categoryFilter.trim()) {
        const categoryText = isSponsor
          ? (match as EventMatchResult).event?.categories?.join(" ")
          : (match as SponsorMatchResult).sponsor?.preferredCategories?.join(" ");

        if (!categoryText?.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
      }

      if (locationFilter.trim()) {
        const locationText = isSponsor
          ? (match as EventMatchResult).event?.location || ""
          : ((match as SponsorMatchResult).sponsor?.preferredLocations || []).join(" ");

        if (!locationText.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [matches, minScoreFilter, categoryFilter, locationFilter, isSponsor]);

  const handleCreateDealFromMatch = async (match: EventMatchResult) => {
    if (!isSponsor || !user?._id || !activeSourceId) return;

    try {
      setDealLoadingId(match.event._id || "");
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerId: match.event.organizerId,
          sponsorId: user._id,
          eventId: match.event._id,
          sponsorshipId: activeSourceId,
          initiatedBy: "sponsor",
          proposedAmount: match.event.budget || 0,
          message: `Interested based on ${match.score}% match score.`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to start deal");
      }

      router.push("/deals");
    } catch (err: any) {
      setPageError(err?.message || "Failed to create deal");
    } finally {
      setDealLoadingId("");
    }
  };

  if (bootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading matching experience...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen px-4 py-12">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="Log in to see your matches"
            description="Sponsors and organizers can discover their best-fit partners once they log in."
            actionLabel="Log In"
            onAction={() => router.push("/login")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="container-custom max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold gradient-text">Your Best Matches</h1>
          <p className="mx-auto max-w-2xl text-lg text-text-muted">
            Based on your event or sponsorship preferences, ranked by fit and deal potential.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 md:grid-cols-3">
          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Filter by category"
            className="rounded-xl border border-white/10 bg-dark-layer px-4 py-3 text-sm text-text-light outline-none"
          />
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Filter by location"
            className="rounded-xl border border-white/10 bg-dark-layer px-4 py-3 text-sm text-text-light outline-none"
          />
          <select
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-dark-layer px-4 py-3 text-sm text-text-light outline-none"
          >
            <option value={30}>Match score: 30%+</option>
            <option value={40}>Match score: 40%+</option>
            <option value={50}>Match score: 50%+</option>
            <option value={60}>Match score: 60%+</option>
            <option value={70}>Match score: 70%+</option>
          </select>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <div className="mb-4 text-4xl">{isOrganizer ? "📅" : "🏢"}</div>
            <h3 className="mb-3 text-xl font-semibold text-text-light">{stepOneTitle}</h3>
            <p className="mb-6 text-text-muted">{stepOneDescription}</p>
            <Link href={stepOneHref}>
              <Button variant="primary" className="w-full">
                {stepOneButton}
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <div className="mb-4 text-4xl">🎯</div>
            <h3 className="mb-3 text-xl font-semibold text-text-light">
              Step 2: Discover Matches
            </h3>
            <p className="mb-6 text-text-muted">
              Refresh recommendations anytime. Match scores show how closely each result
              aligns with your needs.
            </p>
            <Button variant="secondary" className="w-full" onClick={handleRefresh}>
              {loading
                ? "Refreshing Matches..."
                : isOrganizer
                ? "Find Sponsors"
                : "Find Events"}
            </Button>
          </div>
        </div>

        <div className="mb-12 rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
          <h2 className="mb-6 text-2xl font-bold">How We Match</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-accent-orange">40%</div>
              <p className="font-medium text-text-light">Category Fit</p>
              <p className="text-sm text-text-muted">
                Shared themes, industries, and event relevance.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-accent-orange">30%</div>
              <p className="font-medium text-text-light">Audience Fit</p>
              <p className="text-sm text-text-muted">
                How well sponsor and event audiences overlap.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-accent-orange">30%</div>
              <p className="font-medium text-text-light">Location Fit</p>
              <p className="text-sm text-text-muted">
                Matching preferred regions and event locations.
              </p>
            </div>
          </div>
        </div>

        {activeSourceLabel && !loading && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-text-muted">
            Matching based on:{" "}
            <span className="font-semibold text-text-light">{activeSourceLabel}</span>
          </div>
        )}

        {(pageError || error) && (
          <div className="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center text-red-300">
            <p>{pageError || error}</p>
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-text-muted">
            Finding your best matches...
          </div>
        )}

        {!loading && visibleMatches.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {visibleMatches.map((match, index) => (
              <div
                key={`${index}-${match.score}`}
                className={`relative overflow-hidden rounded-2xl border bg-white/[0.05] backdrop-blur-xl ${
                  index === 0
                    ? "border-accent-orange shadow-[0_0_25px_rgba(251,191,36,0.25)]"
                    : "border-white/10"
                }`}
              >
                {index === 0 && (
                  <div className="absolute right-3 top-3 z-10 rounded-full bg-accent-orange px-3 py-1 text-xs font-semibold text-black">
                    BEST MATCH
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-dark-base px-6 py-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
                      {match.quality} Match
                    </p>
                    <p className="text-4xl font-bold text-accent-orange">
                      {match.score}%
                    </p>
                  </div>

                  <p className="text-right text-xs uppercase tracking-[0.24em] text-text-muted">
                    {match.matchedFactors.length > 0
                      ? match.matchedFactors
                          .map((factor) => factor.charAt(0).toUpperCase() + factor.slice(1))
                          .join(" • ")
                      : "No strong factors yet"}
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  {isOrganizer ? (
                    <SponsorCard
                      sponsor={(match as SponsorMatchResult).sponsor}
                      matchScore={match.score}
                    />
                  ) : (
                    <EventCard
                      event={(match as EventMatchResult).event}
                      matchScore={match.score}
                    />
                  )}

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="mb-2 text-sm font-semibold text-text-light">
                      Why this match?
                    </p>
                    <p className="text-sm text-text-muted">{match.reason}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm text-text-muted">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Category</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.categoryScore}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Audience</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.audienceScore}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Location</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.locationScore}%
                      </p>
                    </div>
                  </div>

                  {isSponsor && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        onClick={() => handleCreateDealFromMatch(match as EventMatchResult)}
                        loading={dealLoadingId === (match as EventMatchResult).event?._id}
                      >
                        Start Deal
                      </Button>
                      <Link href={`/events/${(match as EventMatchResult).event?._id}`}>
                        <Button size="sm" variant="secondary">View Details</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && visibleMatches.length === 0 && emptyMessage && (
          <EmptyState
            title="No matches available yet"
            description={emptyMessage}
            actionLabel={isOrganizer ? "Create Event" : "Complete Profile"}
            onAction={() => router.push(isOrganizer ? "/events/create" : "/settings")}
          />
        )}

        {!loading && visibleMatches.length === 0 && !emptyMessage && !error && !pageError && (
          <EmptyState
            title="No matches found"
            description={
              isOrganizer
                ? "Create an event with clear category, audience, and location details so we can recommend relevant sponsors."
                : "Complete your sponsor profile to receive top event recommendations."
            }
            actionLabel={isOrganizer ? "Create Event" : "Complete Profile"}
            onAction={() => router.push(isOrganizer ? "/events/create" : "/settings")}
          />
        )}
      </div>
    </div>
  );
}
