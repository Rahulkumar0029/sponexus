import { Event } from "@/types/event";
import { Sponsor } from "@/types/sponsor";
import {
  EventMatchResult,
  MatchBreakdown,
  MatchWeights,
  SponsorMatchResult,
} from "@/types/match";

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
  const sponsorCategories = dedupeNormalized(preferredCategories);
  const eventCategories = dedupeNormalized([
    event.eventType || "",
    ...(event.categories || []),
  ]);

  return arrayOverlapScore(sponsorCategories, eventCategories);
}

function scoreAudienceMatch(targetAudience: string, event: Event) {
  const sponsorAudienceTerms = dedupeNormalized(splitTerms(targetAudience));
  const eventAudienceTerms = dedupeNormalized(
    (event.targetAudience || []).flatMap(splitTerms)
  );

  return arrayOverlapScore(sponsorAudienceTerms, eventAudienceTerms);
}

function scoreLocationMatch(preferredLocations: string[], eventLocation: string) {
  const sponsorLocations = dedupeNormalized(preferredLocations);
  const normalizedEventLocation = normalize(eventLocation);

  if (!normalizedEventLocation) return 0;
  if (!sponsorLocations.length) return 50;

  const exact = sponsorLocations.some((location) => location === normalizedEventLocation);
  if (exact) return 100;

  const partial = sponsorLocations.some(
    (location) =>
      normalizedEventLocation.includes(location) ||
      location.includes(normalizedEventLocation)
  );

  if (partial) return 70;

  const eventTokens = splitTerms(normalizedEventLocation);

  const tokenOverlap = sponsorLocations.some((location) => {
    const sponsorTokens = splitTerms(location);
    return sponsorTokens.some((token) => eventTokens.includes(token));
  });

  return tokenOverlap ? 50 : 20;
}

function scoreBudgetMatch(eventBudget: number) {
  const safeBudget =
    typeof eventBudget === "number" && Number.isFinite(eventBudget) ? eventBudget : 0;

  if (!safeBudget || safeBudget <= 0) return 30;
  if (safeBudget <= 50000) return 100;
  if (safeBudget <= 100000) return 75;
  if (safeBudget <= 200000) return 55;
  return 35;
}

function scoreDeliverablesMatch(
  sponsorInterests: string[] = [],
  eventDeliverables: string[] = []
) {
  const normalizedSponsorInterests = dedupeNormalized(sponsorInterests);
  const normalizedEventDeliverables = dedupeNormalized(eventDeliverables);

  if (!normalizedSponsorInterests.length || !normalizedEventDeliverables.length) {
    return 0;
  }

  const overlap = normalizedSponsorInterests.filter((item) =>
    normalizedEventDeliverables.includes(item)
  );

  return clampScore((overlap.length / normalizedSponsorInterests.length) * 100);
}

function createBreakdown(
  sponsor: Sponsor,
  event: Event,
  weights?: MatchWeights
): MatchBreakdown {
  const safeWeights = normalizeWeights(weights);

  return {
    categoryScore: scoreCategoryMatch(sponsor.preferredCategories || [], event),
    audienceScore: scoreAudienceMatch(sponsor.targetAudience || "", event),
    locationScore: scoreLocationMatch(
      sponsor.preferredLocations || [],
      event.location || ""
    ),
    budgetScore: scoreBudgetMatch(event.budget || 0),
    deliverablesScore: scoreDeliverablesMatch(
      sponsor.sponsorshipInterests || [],
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
    reasons.push("Some sponsor deliverables are available");
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

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

export function matchSponsorToEvents(
  sponsor: Sponsor,
  events: Event[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  minScore = 0
): EventMatchResult[] {
  const safeWeights = normalizeWeights(weights);
  const safeMinScore = clampScore(minScore);

  return (Array.isArray(events) ? events : [])
    .map((event) => {
      const breakdown = createBreakdown(sponsor, event, safeWeights);
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

export function matchEventToSponsors(
  event: Event,
  sponsors: Sponsor[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  minScore = 0
): SponsorMatchResult[] {
  const safeWeights = normalizeWeights(weights);
  const safeMinScore = clampScore(minScore);

  return (Array.isArray(sponsors) ? sponsors : [])
    .map((sponsor) => {
      const breakdown = createBreakdown(sponsor, event, safeWeights);
      const score = finalWeightedScore(breakdown, safeWeights);

      return {
        sponsor,
        score,
        breakdown,
        reasons: buildReasons(breakdown),
        weakPoints: buildWeakPoints(breakdown),
      };
    })
    .filter((item) => item.score >= safeMinScore)
    .sort((a, b) => b.score - a.score);
}