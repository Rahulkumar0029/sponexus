import { Event } from "@/types/event";
import {
  EventMatchResult,
  MatchBreakdown,
  MatchWeights,
  SponsorshipMatchResult,
} from "@/types/match";

type SponsorshipMatchSource = {
  _id?: string;
  sponsorshipTitle?: string;
  sponsorshipType?: string;
  budget?: number;
  category?: string;
  targetAudience?: string;
  city?: string;
  locationPreference?: string;
  campaignGoal?: string;
  coverImage?: string;
  deliverablesExpected?: string[];
  sponsorProfile?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
};

function normalize(value: string) {
  return value?.toLowerCase().trim() || "";
}

function splitTerms(value: string) {
  return normalize(value)
    .split(/[,&/\-|\s]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeWeight(value: number, fallback: number) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

function normalizeWeights(weights?: MatchWeights): MatchWeights {
  const safeWeights: MatchWeights = {
    category: sanitizeWeight(weights?.category ?? 20, 20),
    audience: sanitizeWeight(weights?.audience ?? 20, 20),
    location: sanitizeWeight(weights?.location ?? 20, 20),
    budget: sanitizeWeight(weights?.budget ?? 20, 20),
    deliverables: sanitizeWeight(weights?.deliverables ?? 20, 20),
  };

  const total =
    safeWeights.category +
    safeWeights.audience +
    safeWeights.location +
    safeWeights.budget +
    safeWeights.deliverables;

  if (total !== 100) {
    return DEFAULT_MATCH_WEIGHTS;
  }

  return safeWeights;
}

function dedupeNormalized(values: string[] = []) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function arrayOverlapScore(source: string[] = [], target: string[] = []) {
  const normalizedSource = dedupeNormalized(source);
  const normalizedTarget = dedupeNormalized(target);

  if (!normalizedSource.length || !normalizedTarget.length) return 0;

  const overlap = normalizedSource.filter((item) =>
    normalizedTarget.includes(item)
  );

  return clampScore((overlap.length / normalizedTarget.length) * 100);
}

function scoreCategoryMatch(preferredCategories: string[], event: Event) {
  const sponsorshipCategories = dedupeNormalized(preferredCategories);
  const eventCategories = dedupeNormalized([
    event.eventType || "",
    ...(event.categories || []),
  ]);

  return arrayOverlapScore(sponsorshipCategories, eventCategories);
}

function scoreAudienceMatch(targetAudience: string, event: Event) {
  const sponsorshipAudienceTerms = dedupeNormalized(splitTerms(targetAudience));
  const eventAudienceTerms = dedupeNormalized(
    (event.targetAudience || []).flatMap(splitTerms)
  );

  return arrayOverlapScore(sponsorshipAudienceTerms, eventAudienceTerms);
}

function scoreLocationMatch(preferredLocations: string[], eventLocation: string) {
  const sponsorshipLocations = dedupeNormalized(preferredLocations);
  const normalizedEventLocation = normalize(eventLocation);

  if (!normalizedEventLocation) return 0;
  if (!sponsorshipLocations.length) return 0;

  const exact = sponsorshipLocations.some(
    (location) => location === normalizedEventLocation
  );

  if (exact) return 100;

  const partial = sponsorshipLocations.some(
    (location) =>
      normalizedEventLocation.includes(location) ||
      location.includes(normalizedEventLocation)
  );

  if (partial) return 70;

  const eventTokens = splitTerms(normalizedEventLocation);

  const tokenOverlap = sponsorshipLocations.some((location) => {
    const sponsorshipTokens = splitTerms(location);
    return sponsorshipTokens.some((token) => eventTokens.includes(token));
  });

  return tokenOverlap ? 50 : 0;
}

function scoreBudgetMatch(eventBudget: number, sponsorshipBudget?: number) {
  const safeEventBudget =
    typeof eventBudget === "number" && Number.isFinite(eventBudget)
      ? eventBudget
      : 0;

  const safeSponsorshipBudget =
    typeof sponsorshipBudget === "number" && Number.isFinite(sponsorshipBudget)
      ? sponsorshipBudget
      : 0;

  if (!safeEventBudget || safeEventBudget <= 0) return 0;

  if (!safeSponsorshipBudget || safeSponsorshipBudget <= 0) {
    if (safeEventBudget <= 50000) return 100;
    if (safeEventBudget <= 100000) return 75;
    if (safeEventBudget <= 200000) return 55;
    return 35;
  }

  const difference = Math.abs(safeEventBudget - safeSponsorshipBudget);
  const base = Math.max(safeEventBudget, safeSponsorshipBudget);
  const differenceRatio = difference / base;

  if (differenceRatio <= 0.1) return 100;
  if (differenceRatio <= 0.25) return 80;
  if (differenceRatio <= 0.5) return 55;
  if (differenceRatio <= 0.75) return 30;

  return 0;
}

function scoreDeliverablesMatch(
  sponsorshipInterests: string[] = [],
  eventDeliverables: string[] = []
) {
  const normalizedSponsorshipInterests = dedupeNormalized(sponsorshipInterests);
  const normalizedEventDeliverables = dedupeNormalized(eventDeliverables);

  if (
    !normalizedSponsorshipInterests.length ||
    !normalizedEventDeliverables.length
  ) {
    return 0;
  }

  const overlap = normalizedSponsorshipInterests.filter((item) =>
    normalizedEventDeliverables.includes(item)
  );

  return clampScore(
    (overlap.length / normalizedSponsorshipInterests.length) * 100
  );
}

function createBreakdown(
  sponsorship: SponsorshipMatchSource,
  event: Event,
  weights?: MatchWeights
): MatchBreakdown {
  const safeWeights = normalizeWeights(weights);

  return {
    categoryScore: scoreCategoryMatch(
      sponsorship.category ? [sponsorship.category] : [],
      event
    ),
    audienceScore: scoreAudienceMatch(sponsorship.targetAudience || "", event),
    locationScore: scoreLocationMatch(
      [sponsorship.city || "", sponsorship.locationPreference || ""].filter(Boolean),
      event.location || ""
    ),
    budgetScore: scoreBudgetMatch(event.budget || 0, sponsorship.budget),
    deliverablesScore: scoreDeliverablesMatch(
      sponsorship.deliverablesExpected || [],
      event.providedDeliverables || []
    ),
    weights: safeWeights,
  };
}

function finalWeightedScore(breakdown: MatchBreakdown, weights: MatchWeights) {
  const safeWeights = normalizeWeights(weights);

  return clampScore(
    (breakdown.categoryScore * safeWeights.category +
      breakdown.audienceScore * safeWeights.audience +
      breakdown.locationScore * safeWeights.location +
      breakdown.budgetScore * safeWeights.budget +
      breakdown.deliverablesScore * safeWeights.deliverables) /
      100
  );
}

function buildReasons(breakdown: MatchBreakdown): string[] {
  const reasons: string[] = [];

  if (breakdown.categoryScore >= 70) reasons.push("Strong category fit");
  if (breakdown.audienceScore >= 70) reasons.push("Target audience aligns well");
  if (breakdown.locationScore >= 70) reasons.push("Location preference matches");
  if (breakdown.budgetScore >= 70) reasons.push("Budget fit looks practical");

  if (breakdown.deliverablesScore >= 70) {
    reasons.push("Requested deliverables are strongly aligned");
  } else if (breakdown.deliverablesScore > 0) {
    reasons.push("Some deliverables are aligned");
  }

  if (reasons.length === 0) {
    reasons.push("This result is based on your current weight distribution.");
  }

  return reasons.slice(0, 5);
}

function buildWeakPoints(breakdown: MatchBreakdown): string[] {
  const weakPoints: string[] = [];

  if (breakdown.categoryScore < 50) weakPoints.push("Category alignment is limited");
  if (breakdown.audienceScore < 50) weakPoints.push("Audience fit is weaker");
  if (breakdown.locationScore < 50) weakPoints.push("Location fit is weaker");
  if (breakdown.budgetScore < 50) weakPoints.push("Budget fit is weaker");

  if (breakdown.deliverablesScore < 50) {
    weakPoints.push("Deliverables fit is weaker");
  }

  return weakPoints.slice(0, 5);
}
export function matchEventToSponsorships(
  event: Event,
  sponsorships: SponsorshipMatchSource[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  minScore = 0
): SponsorshipMatchResult[] {
  const safeWeights = normalizeWeights(weights);
  const safeMinScore = clampScore(minScore);

  return (Array.isArray(sponsorships) ? sponsorships : [])
    .map((sponsorship) => {
      const breakdown = createBreakdown(sponsorship, event, safeWeights);
      const score = finalWeightedScore(breakdown, safeWeights);

      return {
        sponsorship,
        score,
        breakdown,
        reasons: buildReasons(breakdown),
        weakPoints: buildWeakPoints(breakdown),
      };
    })
    .filter((item) => item.score >= safeMinScore)
    .sort((a, b) => b.score - a.score);
}

export function matchSponsorshipToEvents(
  sponsorship: SponsorshipMatchSource,
  events: Event[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  minScore = 0
): EventMatchResult[] {
  const safeWeights = normalizeWeights(weights);
  const safeMinScore = clampScore(minScore);

  return (Array.isArray(events) ? events : [])
    .map((event) => {
      const breakdown = createBreakdown(sponsorship, event, safeWeights);
      const score = finalWeightedScore(breakdown, safeWeights);

      return {
        event,
        score,
        breakdown,
        reasons: buildReasons(breakdown),
        weakPoints: buildWeakPoints(breakdown),
      };
    })
    .filter((item) => item.score >= safeMinScore)
    .sort((a, b) => b.score - a.score);
}