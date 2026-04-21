"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { SponsorCard } from "@/components/SponsorCard";
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
  sponsor?: any;
  breakdown: MatchBreakdown;
  reasons?: string[];
  weakPoints?: string[];
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
  const [currentEventId, setCurrentEventId] = useState("");
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
    async (userId: string, nextWeights: MatchWeights) => {
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
        setCurrentEventId(latestEvent._id || "");
        setActiveSourceLabel(latestEvent.title || "Your latest event");
        setEmptyMessage("");

        await findMatches({
          eventId: latestEvent._id,
          mode: "event_to_sponsors",
          weights: nextWeights,
        });
        return;
      }

      setCurrentEventId("");
      setActiveSourceLabel("");
      setEmptyMessage("Create your first event to receive sponsor recommendations.");
      resetMatches();
    },
    [findMatches, resetMatches]
  );

  const fetchSponsorMatches = useCallback(
    async (userId: string, nextWeights: MatchWeights) => {
      if (!sponsorProfileComplete) {
        setActiveSourceLabel("");
        setEmptyMessage(
          "Complete your sponsor profile in Settings to receive event recommendations."
        );
        resetMatches();
        return;
      }

      setActiveSourceLabel(
        sponsorProfile?.brandName || sponsorProfile?.companyName || "Your sponsor profile"
      );
      setEmptyMessage("");

      await findMatches({
        sponsorOwnerId: userId,
        mode: "sponsor_to_events",
        weights: nextWeights,
      });
    },
    [findMatches, resetMatches, sponsorProfile, sponsorProfileComplete]
  );

  const loadMatches = useCallback(
  async (nextWeights: MatchWeights): Promise<void> => {
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
        await fetchSponsorMatches(userId, nextWeights);
        return;
      }

      if (isOrganizer) {
        await fetchOrganizerEventAndMatch(userId, nextWeights);
        return;
      }

      setPageError("Unsupported account role.");
      return;
    } catch (err: any) {
      setPageError(err?.message || "Failed to load matches.");
      return;
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
    loadMatches(weights);
  }, [loadMatches]);

  const handleRefresh = async () => {
    if (!weightsValid) {
      setPageError("Your weight total must equal 100 before matching.");
      return;
    }

    await loadMatches(weights);
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
    if (isSponsor) return "/settings";
    return "/login";
  }, [isOrganizer, isSponsor]);

  const stepOneButton = useMemo(() => {
    if (isOrganizer) return "Create Event";
    if (isSponsor) return sponsorProfileComplete ? "Manage Profile" : "Complete Profile";
    return "Log In";
  }, [isOrganizer, isSponsor, sponsorProfileComplete]);

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
              Step 2: Run Weighted Matching
            </h3>
            <p className="mb-6 text-text-muted">
              Adjust your weight mix, keep the total at 100, and refresh recommendations
              anytime to see what matters most to you.
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleRefresh}
              disabled={!weightsValid || loading}
            >
              {loading
                ? "Refreshing Matches..."
                : isOrganizer
                ? "Find Sponsors"
                : "Find Events"}
            </Button>
          </div>
        </div>

        <div className="mb-12 rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Live Match Weights</h2>
              <p className="mt-2 text-sm text-text-muted">
                Control how much each factor influences your results.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="sm" variant="secondary" onClick={() => applyPreset(PRESETS.balanced)}>
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

        {activeSourceLabel && !loading && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-text-muted">
            Matching based on:{" "}
            <span className="font-semibold text-text-light">{activeSourceLabel}</span>
            {isOrganizer && currentEventId ? " (latest event)" : ""}
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
                  {isOrganizer ? (
                    <SponsorCard sponsor={match.sponsor} matchScore={match.score} />
                  ) : (
                    <EventCard event={match.event} matchScore={match.score} />
                  )}

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
            actionLabel={isOrganizer ? "Create Event" : "Complete Profile"}
            onAction={() => router.push(isOrganizer ? "/events/create" : "/settings")}
          />
        )}

        {!loading && matches.length === 0 && !emptyMessage && !error && !pageError && (
          <EmptyState
            title="No matches found"
            description={
              isOrganizer
                ? "Try improving your event details or adjusting your weight mix to discover more relevant sponsors."
                : "Try adjusting your weight mix or improving your sponsor profile to discover stronger event matches."
            }
            actionLabel={isOrganizer ? "Create Event" : "Complete Profile"}
            onAction={() => router.push(isOrganizer ? "/events/create" : "/settings")}
          />
        )}
      </div>
    </div>
  );
}