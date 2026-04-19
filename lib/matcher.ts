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
    .filter(Boolean);
}

function arrayOverlapScore(source: string[] = [], target: string[] = []) {
  const normalizedSource = source.map(normalize).filter(Boolean);
  const normalizedTarget = target.map(normalize).filter(Boolean);

  if (!normalizedSource.length || !normalizedTarget.length) return 0;

  const overlap = normalizedSource.filter((item) => normalizedTarget.includes(item));
  return Math.min(100, Math.round((overlap.length / normalizedTarget.length) * 100));
}

function scoreCategoryMatch(preferredCategories: string[], event: Event) {
  const sponsorCategories = preferredCategories.map(normalize).filter(Boolean);
  const eventCategories = [event.eventType, ...(event.categories || [])]
    .map(normalize)
    .filter(Boolean);

  return arrayOverlapScore(sponsorCategories, eventCategories);
}

function scoreAudienceMatch(targetAudience: string, event: Event) {
  const sponsorAudienceTerms = splitTerms(targetAudience);
  const eventAudienceTerms = (event.targetAudience || []).flatMap(splitTerms);

  return arrayOverlapScore(sponsorAudienceTerms, eventAudienceTerms);
}

function scoreLocationMatch(preferredLocations: string[], eventLocation: string) {
  const sponsorLocations = preferredLocations.map(normalize).filter(Boolean);
  const normalizedEventLocation = normalize(eventLocation);

  if (!normalizedEventLocation) return 0;
  if (!sponsorLocations.length) return 50;

  const exact = sponsorLocations.some((location) => location === normalizedEventLocation);
  if (exact) return 100;

  const partial = sponsorLocations.some(
    (location) =>
      normalizedEventLocation.includes(location) || location.includes(normalizedEventLocation)
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
  if (!eventBudget || eventBudget <= 0) return 30;
  if (eventBudget <= 50000) return 100;
  if (eventBudget <= 100000) return 75;
  if (eventBudget <= 200000) return 55;
  return 35;
}

function scoreDeliverablesMatch(
  sponsorInterests: string[] = [],
  eventDeliverables: string[] = []
) {
  const normalizedSponsorInterests = sponsorInterests.map(normalize).filter(Boolean);
  const normalizedEventDeliverables = eventDeliverables.map(normalize).filter(Boolean);

  if (!normalizedSponsorInterests.length || !normalizedEventDeliverables.length) {
    return 0;
  }

  const overlap = normalizedSponsorInterests.filter((item) =>
    normalizedEventDeliverables.includes(item)
  );

  return Math.min(
    100,
    Math.round((overlap.length / normalizedSponsorInterests.length) * 100)
  );
}

function createBreakdown(
  sponsor: Sponsor,
  event: Event,
  weights?: MatchWeights
): MatchBreakdown {
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
    weights,
  };
}

function finalWeightedScore(breakdown: MatchBreakdown, weights: MatchWeights) {
  return Math.round(
    (breakdown.categoryScore * weights.category +
      breakdown.audienceScore * weights.audience +
      breakdown.locationScore * weights.location +
      breakdown.budgetScore * weights.budget +
      breakdown.deliverablesScore * weights.deliverables) /
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

  return reasons;
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

  return weakPoints;
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
  return events
    .map((event) => {
      const breakdown = createBreakdown(sponsor, event, weights);
      const score = finalWeightedScore(breakdown, weights);

      return {
        event,
        score,
        breakdown,
        reasons: buildReasons(breakdown),
        weakPoints: buildWeakPoints(breakdown),
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function matchEventToSponsors(
  event: Event,
  sponsors: Sponsor[],
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
  minScore = 0
): SponsorMatchResult[] {
  return sponsors
    .map((sponsor) => {
      const breakdown = createBreakdown(sponsor, event, weights);
      const score = finalWeightedScore(breakdown, weights);

      return {
        sponsor,
        score,
        breakdown,
        reasons: buildReasons(breakdown),
        weakPoints: buildWeakPoints(breakdown),
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
}