import { Event } from "@/types/event";
import { Sponsor } from "@/types/sponsor";
import {
  EventMatchResult,
  MatchBreakdown,
  MatchFactor,
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

function scoreCategoryMatch(preferredCategories: string[], event: Event) {
  const sponsorCategories = preferredCategories.map(normalize);
  const eventCategories = [event.eventType, ...(event.categories || [])].map(normalize);

  const exactMatch = sponsorCategories.some((sponsorCat) =>
    eventCategories.some((eventCat) => sponsorCat === eventCat)
  );

  if (exactMatch) {
    return 40;
  }

  const partialMatch = sponsorCategories.some((sponsorCat) =>
    eventCategories.some(
      (eventCat) => sponsorCat.includes(eventCat) || eventCat.includes(sponsorCat)
    )
  );

  if (partialMatch) {
    return 20;
  }

  return 0;
}

function scoreAudienceMatch(targetAudience: string, event: Event) {
  const sponsorAudienceTerms = splitTerms(targetAudience);
  const eventAudienceTerms = (event.targetAudience || []).flatMap(splitTerms);

  if (sponsorAudienceTerms.length === 0 || eventAudienceTerms.length === 0) {
    return 0;
  }

  const exactMatch = sponsorAudienceTerms.some((term) =>
    eventAudienceTerms.some((eventTerm) => eventTerm === term)
  );

  if (exactMatch) {
    return 30;
  }

  const partialMatch = sponsorAudienceTerms.some((term) =>
    eventAudienceTerms.some(
      (eventTerm) => eventTerm.includes(term) || term.includes(eventTerm)
    )
  );

  return partialMatch ? 15 : 0;
}

function scoreLocationMatch(preferredLocations: string[], eventLocation: string) {
  const sponsorLocations = preferredLocations.map(normalize).filter(Boolean);
  const normalizedEventLocation = normalize(eventLocation);

  if (sponsorLocations.length === 0 || !normalizedEventLocation) {
    return 0;
  }

  const exactMatch = sponsorLocations.some(
    (location) =>
      location === normalizedEventLocation ||
      normalizedEventLocation.includes(location) ||
      location.includes(normalizedEventLocation)
  );

  if (exactMatch) {
    return 30;
  }

  const eventTokens = splitTerms(normalizedEventLocation);

  const partialMatch = sponsorLocations.some((location) => {
    const sponsorTokens = splitTerms(location);
    return sponsorTokens.some((token) => eventTokens.includes(token));
  });

  return partialMatch ? 15 : 0;
}

function buildMatchQuality(score: number): "Excellent" | "Strong" | "Good" | "Fair" {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Good";
  return "Fair";
}

function buildMatchReason(breakdown: MatchBreakdown) {
  const reasons: string[] = [];

  if (breakdown.categoryScore >= 40) {
    reasons.push("Exact category match");
  } else if (breakdown.categoryScore > 0) {
    reasons.push("Related category alignment");
  }

  if (breakdown.audienceScore >= 30) {
    reasons.push("Audience alignment is strong");
  } else if (breakdown.audienceScore > 0) {
    reasons.push("Audience overlap detected");
  }

  if (breakdown.locationScore >= 30) {
    reasons.push("Same location focus");
  } else if (breakdown.locationScore > 0) {
    reasons.push("Regional location fit");
  }

  if (reasons.length === 0) {
    reasons.push("No strong match factors yet");
  }

  return reasons.join(", ");
}

function buildMatchedFactors(breakdown: MatchBreakdown): MatchFactor[] {
  const factors: MatchFactor[] = [];

  if (breakdown.categoryScore > 0) factors.push("category");
  if (breakdown.audienceScore > 0) factors.push("audience");
  if (breakdown.locationScore > 0) factors.push("location");

  return factors;
}

function createBreakdown(sponsor: Sponsor, event: Event): MatchBreakdown {
  return {
    budgetScore: 0,
    categoryScore: scoreCategoryMatch(sponsor.preferredCategories || [], event),
    audienceScore: scoreAudienceMatch(sponsor.targetAudience || "", event),
    locationScore: scoreLocationMatch(
      sponsor.preferredLocations || [],
      event.location || ""
    ),
  };
}

export function matchSponsorToEvents(
  sponsor: Sponsor,
  events: Event[],
  minScore = 30
): EventMatchResult[] {
  return events
    .map((event) => {
      const breakdown = createBreakdown(sponsor, event);

      const rawScore =
        breakdown.categoryScore +
        breakdown.audienceScore +
        breakdown.locationScore;

      const score = Math.round(rawScore);

      return {
        event,
        score,
        quality: buildMatchQuality(score),
        reason: buildMatchReason(breakdown),
        matchedFactors: buildMatchedFactors(breakdown),
        breakdown,
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export function matchEventToSponsors(
  event: Event,
  sponsors: Sponsor[],
  minScore = 30
): SponsorMatchResult[] {
  return sponsors
    .map((sponsor) => {
      const breakdown = createBreakdown(sponsor, event);

      const rawScore =
        breakdown.categoryScore +
        breakdown.audienceScore +
        breakdown.locationScore;

      const score = Math.round(rawScore);

      return {
        sponsor,
        score,
        quality: buildMatchQuality(score),
        reason: buildMatchReason(breakdown),
        matchedFactors: buildMatchedFactors(breakdown),
        breakdown,
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
}