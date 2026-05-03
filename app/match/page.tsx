"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { SponsorshipCard } from "@/components/SponsorshipCard";
import { MatchWeights } from "@/types/match";
import { useMatch } from "@/hooks/useMatch";
import { useSubscription } from "@/hooks/useSubscription";


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

type MatchBreakdown = {
  categoryScore?: number;
  audienceScore?: number;
  locationScore?: number;
  budgetScore?: number;
  deliverablesScore?: number;
  weights?: MatchWeights;
};

type MatchItem = {
  score: number;
  event?: any;
  sponsorship?: any;
  breakdown: MatchBreakdown;
  reasons?: string[];
  weakPoints?: string[];
};

type SelectableEvent = {
  _id: string;
  title?: string;
  status?: string;
  endDate?: string | Date;
  isDeleted?: boolean;
  visibilityStatus?: string;
  moderationStatus?: string;
};

type SelectableSponsorship = {
  _id: string;
  sponsorshipTitle?: string;
  status?: string;
  expiresAt?: string | Date | null;
  isDeleted?: boolean;
  visibilityStatus?: string;
  moderationStatus?: string;
};

const BALANCED_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

const PRESETS: Record<string, MatchWeights> = {
  balanced: BALANCED_WEIGHTS,
  audience_first: {
    category: 15,
    audience: 35,
    location: 15,
    budget: 15,
    deliverables: 20,
  },
  budget_first: {
    category: 15,
    audience: 15,
    location: 15,
    budget: 35,
    deliverables: 20,
  },
  deliverables_first: {
    category: 15,
    audience: 15,
    location: 15,
    budget: 15,
    deliverables: 40,
  },
};

function clampWeight(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function MatchPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [activeSourceLabel, setActiveSourceLabel] = useState("");
  const [pageError, setPageError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedSponsorshipId, setSelectedSponsorshipId] = useState("");
  const [organizerEvents, setOrganizerEvents] = useState<SelectableEvent[]>([]);
  const [sponsorSponsorships, setSponsorSponsorships] = useState<
    SelectableSponsorship[]
  >([]);
  const [weights, setWeights] = useState<MatchWeights>(BALANCED_WEIGHTS);

  const { matches, loading, error, findMatches, resetMatches } = useMatch();
const { hasAccess } = useSubscription();

  const getUserId = useCallback(() => {
    return user?._id ?? user?.id ?? "";
  }, [user]);

  const isSponsor = user?.role === "SPONSOR";
  const isOrganizer = user?.role === "ORGANIZER";
  const sponsorProfileComplete = Boolean(sponsorProfile?.isProfileComplete);

  const totalWeight = useMemo(() => {
    return (
      weights.category +
      weights.audience +
      weights.location +
      weights.budget +
      weights.deliverables
    );
  }, [weights]);

  const weightsValid = totalWeight === 100;

    const isActiveEvent = useCallback((event: SelectableEvent) => {
    const status = String(event?.status || "").toUpperCase();
    const endDate = event?.endDate ? new Date(event.endDate) : null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return (
      Boolean(event?._id) &&
      ["PUBLISHED", "ONGOING"].includes(status) &&
      event?.isDeleted !== true &&
      event?.visibilityStatus !== "HIDDEN" &&
      event?.moderationStatus !== "FLAGGED" &&
      (!endDate || endDate >= todayStart)
    );
  }, []);

  const isActiveSponsorship = useCallback((sponsorship: SelectableSponsorship) => {
    const expiryDate = sponsorship?.expiresAt
      ? new Date(sponsorship.expiresAt)
      : null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return (
      Boolean(sponsorship?._id) &&
      sponsorship?.status === "active" &&
      sponsorship?.isDeleted !== true &&
      sponsorship?.visibilityStatus !== "HIDDEN" &&
      sponsorship?.moderationStatus !== "FLAGGED" &&
      (!expiryDate || expiryDate >= todayStart)
    );
  }, []);

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
    async (userId: string, nextWeights: MatchWeights, preferredEventId?: string) => {
      const response = await fetch(`/api/events/get?organizer=${userId}&limit=50`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load your event data");
      }

      const activeEvents: SelectableEvent[] = Array.isArray(data.events)
        ? data.events.filter(isActiveEvent)
        : [];

      setOrganizerEvents(activeEvents);

      const selectedEvent =
        activeEvents.find((event) => event._id === preferredEventId) ||
        activeEvents[0];

      if (selectedEvent?._id) {
        setSelectedEventId(selectedEvent._id);
        setActiveSourceLabel(
          `${selectedEvent.title || "Your active event"}${
            preferredEventId ? " (selected event)" : " (latest active event)"
          }`
        );
        setEmptyMessage("");

        await findMatches({
          eventId: selectedEvent._id,
          mode: "event_to_sponsorships",
          weights: nextWeights,
        });

        return;
      }

      setSelectedEventId("");
      setOrganizerEvents([]);
      setActiveSourceLabel("");
      setEmptyMessage(
        "Create or publish an active event to receive sponsorship recommendations."
      );
      resetMatches();
    },
    [findMatches, isActiveEvent, resetMatches]
  );

  const fetchSponsorMatches = useCallback(
    async (_userId: string, nextWeights: MatchWeights, preferredSponsorshipId?: string) => {
      if (!sponsorProfileComplete) {
        setSelectedSponsorshipId("");
        setSponsorSponsorships([]);
        setActiveSourceLabel("");
        setEmptyMessage(
          "Complete your sponsor profile in Settings before matching events."
        );
        resetMatches();
        return;
      }

      const response = await fetch("/api/sponsorships/get?status=active&limit=50", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("Sponsorship API route returned HTML instead of JSON. Check API path.");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load your sponsorship posts");
      }

      const activeSponsorships: SelectableSponsorship[] = Array.isArray(data.data)
        ? data.data.filter(isActiveSponsorship)
        : [];

      setSponsorSponsorships(activeSponsorships);

      const selectedSponsorship =
        activeSponsorships.find(
          (sponsorship) => sponsorship._id === preferredSponsorshipId
        ) || activeSponsorships[0];

      if (selectedSponsorship?._id) {
        setSelectedSponsorshipId(selectedSponsorship._id);
        setActiveSourceLabel(
          `${selectedSponsorship.sponsorshipTitle || "Your sponsorship post"}${
            preferredSponsorshipId
              ? " (selected sponsorship)"
              : " (latest active sponsorship)"
          }`
        );
        setEmptyMessage("");

        await findMatches({
          sponsorshipId: selectedSponsorship._id,
          mode: "sponsorship_to_events",
          weights: nextWeights,
        });

        return;
      }

      setSelectedSponsorshipId("");
      setSponsorSponsorships([]);
      setActiveSourceLabel("");
      setEmptyMessage(
        "Create your first active sponsorship post to receive event recommendations."
      );
      resetMatches();
    },
    [findMatches, isActiveSponsorship, resetMatches, sponsorProfileComplete]
  );

  const loadMatches = useCallback(
    async (
      nextWeights: MatchWeights,
      options?: {
        eventId?: string;
        sponsorshipId?: string;
      }
    ): Promise<void> => {
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
          await fetchSponsorMatches(userId, nextWeights, options?.sponsorshipId);
          return;
        }

        if (isOrganizer) {
          await fetchOrganizerEventAndMatch(userId, nextWeights, options?.eventId);
          return;
        }

        setPageError("Unsupported account role.");
      } catch (err: any) {
        setPageError(err?.message || "Failed to load matches.");
      }
    },
    [
      user,
      getUserId,
      isSponsor,
      isOrganizer,
      fetchOrganizerEventAndMatch,
      fetchSponsorMatches,
    ]
  );

   useEffect(() => {
    if (!user || !hasAccess) return;

    loadMatches(BALANCED_WEIGHTS);
  }, [user, hasAccess, loadMatches]);

    const handleRefresh = async () => {
    if (!weightsValid) {
      setPageError("Your weight total must equal 100 before matching.");
      return;
    }

    if (isOrganizer && !selectedEventId) {
      setPageError("Select an active event before applying match settings.");
      return;
    }

    if (isSponsor && !selectedSponsorshipId) {
      setPageError("Select an active sponsorship post before applying match settings.");
      return;
    }

    await loadMatches(weights, {
      eventId: isOrganizer ? selectedEventId : undefined,
      sponsorshipId: isSponsor ? selectedSponsorshipId : undefined,
    });
  };

  const updateWeight = (key: keyof MatchWeights, value: number) => {
    setWeights((prev: MatchWeights) => ({
      ...prev,
      [key]: clampWeight(value),
    }));
  };

  const applyPreset = (preset: MatchWeights) => {
    setWeights(preset);
    setPageError("");
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
if (user && !hasAccess) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <EmptyState
        title="Upgrade to unlock Smart Matching"
        description="Matching is available only for active users."
        actionLabel="View Plans"
        onAction={() => router.push("/pricing")}
      />
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

      <div className="container-custom max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold gradient-text">Smart Matching Engine</h1>
          <p className="mx-auto max-w-3xl text-lg text-text-muted">
            Adjust what matters most to you, keep the total at 100, and let Sponexus
            rank the best-fit opportunities based on real marketplace data.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-orange">
                Smart Matching Setup
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-light">
                {isOrganizer
                  ? "Match your active event with sponsorship opportunities"
                  : "Match your active sponsorship with relevant events"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-text-muted">
                Balanced matching runs automatically for your latest active item.
                Change weights or choose another item, then press Apply to refresh results.
              </p>
            </div>

            <Link href={isOrganizer ? "/events/create" : "/sponsorships/create"}>
              <Button variant="primary" className="w-full lg:w-auto">
                {isOrganizer ? "Create Event" : "Create Sponsorship"}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-12 rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Live Match Weights</h2>
              <p className="mt-2 text-sm text-text-muted">
                Change weights or select another item, then press Apply to refresh matches.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => applyPreset(PRESETS.balanced)}
                >
                  Balanced
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => applyPreset(PRESETS.audience_first)}
                >
                  Audience First
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => applyPreset(PRESETS.budget_first)}
                >
                  Budget First
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => applyPreset(PRESETS.deliverables_first)}
                >
                  Deliverables First
                </Button>
              </div>

              <Button
                variant="primary"
                className="w-full lg:w-auto"
                onClick={handleRefresh}
                disabled={!weightsValid || loading}
              >
                {loading
                  ? "Applying Changes..."
                  : isOrganizer
                  ? "Apply Changes & Find Sponsorships"
                  : "Apply Changes & Find Events"}
              </Button>

              <p className="text-xs text-text-muted">
                Default results use Balanced weights and your latest active item.
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-text-muted">Current total</p>
              <p
                className={`text-2xl font-bold ${
                  weightsValid ? "text-accent-orange" : "text-red-400"
                }`}
              >
                {totalWeight}/100
              </p>
            </div>

            {!weightsValid && (
              <p className="mt-2 text-sm text-red-300">
                Adjust your weights so the total becomes exactly 100.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ["category", "Category"],
                ["audience", "Audience"],
                ["location", "Location"],
                ["budget", "Budget"],
                ["deliverables", "Deliverables"],
              ] as [keyof MatchWeights, string][]
            ).map(([key, label]) => (
              <div
              key={String(key)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-sm font-semibold text-accent-orange">
                    {weights[key]}%
                  </p>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weights[key]}
                  onChange={(e) => updateWeight(key, Number(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>
            ))}
          </div>
        </div>

        {(isOrganizer && organizerEvents.length > 1) ||
        (isSponsor && sponsorSponsorships.length > 1) ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className="mb-2 block text-sm font-medium text-text-light">
              {isOrganizer ? "Choose Event for Matching" : "Choose Sponsorship for Matching"}
            </label>

            {isOrganizer ? (
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-dark-base px-4 py-3 text-text-light outline-none focus:border-accent-orange"
              >
                {organizerEvents.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title || "Untitled Event"}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedSponsorshipId}
                onChange={(event) => setSelectedSponsorshipId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-dark-base px-4 py-3 text-text-light outline-none focus:border-accent-orange"
              >
                {sponsorSponsorships.map((sponsorship) => (
                  <option key={sponsorship._id} value={sponsorship._id}>
                    {sponsorship.sponsorshipTitle || "Untitled Sponsorship"}
                  </option>
                ))}
              </select>
            )}

            <p className="mt-2 text-xs text-text-muted">
              Latest active item is selected by default. Choose another item, then press Apply Changes above to refresh matches.
            </p>
          </div>
        ) : null}

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
            Finding your best weighted matches...
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {(matches as MatchItem[]).map((match, index) => (
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
                      Weighted Match
                    </p>
                    <p className="text-4xl font-bold text-accent-orange">
                      {match.score}%
                    </p>
                  </div>

                  <p className="text-right text-xs uppercase tracking-[0.24em] text-text-muted">
                    {match.reasons?.length
                      ? match.reasons.slice(0, 2).join(" • ")
                      : "Needs review"}
                  </p>
                </div>

                <div className="space-y-4 p-6">
{isOrganizer && match.sponsorship ? (
  <SponsorshipCard
    sponsorship={{
      ...match.sponsorship,
      _id: String(match.sponsorship._id || ""),
      brandName:
        match.sponsorship.brandName ||
        match.sponsorship.sponsorProfile?.brandName ||
        "",
      companyName:
        match.sponsorship.companyName ||
        match.sponsorship.sponsorProfile?.companyName ||
        "",
      logoUrl:
        match.sponsorship.logoUrl ||
        match.sponsorship.sponsorProfile?.logoUrl ||
        "",
    }}
    matchScore={match.score}
    showActions={false}
  />
) : !isOrganizer && match.event ? (
  <EventCard event={match.event} matchScore={match.score} />
) : null}

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="mb-2 text-sm font-semibold text-text-light">
                      Why this match?
                    </p>

                    {match.reasons?.length ? (
                      <ul className="space-y-2 text-sm text-text-muted">
                        {match.reasons.map((reason, idx) => (
                          <li key={idx}>• {reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-text-muted">
                        This result is based on your current weight distribution.
                      </p>
                    )}

                    {match.weakPoints?.length ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-light">
                          Weaker Areas
                        </p>
                        <ul className="space-y-1 text-sm text-text-muted">
                          {match.weakPoints.map((point, idx) => (
                            <li key={idx}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-text-muted md:grid-cols-5">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Category</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.categoryScore ?? 0}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Audience</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.audienceScore ?? 0}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Location</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.locationScore ?? 0}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Budget</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.budgetScore ?? 0}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="mb-1 text-xs uppercase">Deliverables</p>
                      <p className="font-semibold text-text-light">
                        {match.breakdown.deliverablesScore ?? 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && emptyMessage && (
            <EmptyState
            title="No matches available yet"
            description={emptyMessage}
            actionLabel={isOrganizer ? "Create Event" : "Create Sponsorship"}
            onAction={() =>
              router.push(isOrganizer ? "/events/create" : "/sponsorships/create")
            }
          />
        )}

        {!loading && matches.length === 0 && !emptyMessage && !error && !pageError && (
          <EmptyState
            title="No matches found"
            description={
              isOrganizer
                ?"Try improving your event details or adjusting your weight mix to discover more relevant sponsorship opportunities."
                : "Create or select an active sponsorship post to discover stronger event matches."
            }
           actionLabel={isOrganizer ? "Create Event" : "Create Sponsorship"}
onAction={() =>
  router.push(isOrganizer ? "/events/create" : "/sponsorships/create")
}
          />
        )}
      </div>
    </div>
  );
}