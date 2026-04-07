import { Event } from '@/types/event';
import { Sponsor } from '@/types/sponsor';
import { EventMatchResult, MatchBreakdown, MatchFactor, SponsorMatchResult } from '@/types/match';

function normalize(value: string) {
  return value?.toLowerCase().trim() || '';
}

function splitTerms(value: string) {
  return normalize(value)
    .split(/[,&/\-\|\s]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function parseBudgetNumber(value: string): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const matches = value.match(/(\d+(?:\.\d+)?)(\s*[kKmM]?)/g) || [];
  let maxValue = 0;

  matches.forEach((raw) => {
    const match = raw.match(/(\d+(?:\.\d+)?)(\s*[kKmM]?)/);
    if (!match) return;

    let valueNumber = Number(match[1]);
    const unit = match[2].trim().toLowerCase();

    if (unit === 'k') {
      valueNumber *= 1000;
    } else if (unit === 'm') {
      valueNumber *= 1000000;
    }

    if (!Number.isNaN(valueNumber)) {
      maxValue = Math.max(maxValue, valueNumber);
    }
  });

  return Math.round(maxValue);
}

function scoreBudgetMatch(sponsorBudget: string, eventBudget: number) {
  const sponsorValue = parseBudgetNumber(sponsorBudget);
  if (eventBudget <= 0) {
    return 30;
  }

  if (sponsorValue >= eventBudget) {
    return 30;
  }

  if (sponsorValue <= 0) {
    return 0;
  }

  const ratio = sponsorValue / eventBudget;
  if (ratio >= 0.9) return 24;
  if (ratio >= 0.7) return 18;
  if (ratio >= 0.5) return 12;
  if (ratio >= 0.3) return 6;
  return 0;
}

function scoreCategoryMatch(preferredCategories: string[], event: Event) {
  const sponsorCategories = preferredCategories.map(normalize);
  const eventCategories = [event.eventType, ...(event.categories || [])].map(normalize);

  const exactMatch = sponsorCategories.some((sponsorCat) =>
    eventCategories.some((eventCat) => sponsorCat === eventCat)
  );

  if (exactMatch) {
    return 30;
  }

  const partialMatch = sponsorCategories.some((sponsorCat) =>
    eventCategories.some((eventCat) =>
      sponsorCat.includes(eventCat) || eventCat.includes(sponsorCat)
    )
  );

  if (partialMatch) {
    return 15;
  }

  return 0;
}

function scoreAudienceMatch(targetAudience: string, event: Event) {
  const sponsorAudienceTerms = splitTerms(targetAudience);
  const eventAudienceTerms = event.targetAudience.flatMap(splitTerms);

  if (sponsorAudienceTerms.length === 0 || eventAudienceTerms.length === 0) {
    return 0;
  }

  const exactMatch = sponsorAudienceTerms.some((term) =>
    eventAudienceTerms.some((eventTerm) => eventTerm === term)
  );
  if (exactMatch) {
    return 20;
  }

  const partialMatch = sponsorAudienceTerms.some((term) =>
    eventAudienceTerms.some((eventTerm) => eventTerm.includes(term) || term.includes(eventTerm))
  );

  return partialMatch ? 10 : 0;
}

function scoreLocationMatch(locationPreference: string, eventLocation: string) {
  const sponsorLocation = normalize(locationPreference);
  const eventLocationNormalized = normalize(eventLocation);

  if (!sponsorLocation || !eventLocationNormalized) {
    return 0;
  }

  if (
    sponsorLocation === eventLocationNormalized ||
    eventLocationNormalized.includes(sponsorLocation) ||
    sponsorLocation.includes(eventLocationNormalized)
  ) {
    return 20;
  }

  const sponsorTokens = splitTerms(sponsorLocation);
  const eventTokens = splitTerms(eventLocationNormalized);
  const partialMatch = sponsorTokens.some((token) => eventTokens.includes(token));

  return partialMatch ? 10 : 0;
}

function buildMatchQuality(score: number): 'Excellent' | 'Strong' | 'Good' | 'Fair' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Good';
  return 'Fair';
}

function buildMatchReason(breakdown: MatchBreakdown) {
  const reasons: string[] = [];

  if (breakdown.budgetScore === 30) {
    reasons.push('Full budget coverage');
  } else if (breakdown.budgetScore >= 18) {
    reasons.push('Strong budget compatibility');
  } else if (breakdown.budgetScore > 0) {
    reasons.push('Budget partially aligned');
  }

  if (breakdown.categoryScore === 30) {
    reasons.push('Exact category match');
  } else if (breakdown.categoryScore > 0) {
    reasons.push('Related category alignment');
  }

  if (breakdown.audienceScore === 20) {
    reasons.push('Audience alignment is strong');
  } else if (breakdown.audienceScore > 0) {
    reasons.push('Audience overlap detected');
  }

  if (breakdown.locationScore === 20) {
    reasons.push('Same location focus');
  } else if (breakdown.locationScore > 0) {
    reasons.push('Regional location fit');
  }

  if (reasons.length === 0) {
    reasons.push('No strong match factors yet');
  }

  return reasons.join(', ');
}

function buildMatchedFactors(breakdown: MatchBreakdown): MatchFactor[] {
  const factors: MatchFactor[] = [];
  if (breakdown.budgetScore > 0) factors.push('budget');
  if (breakdown.categoryScore > 0) factors.push('category');
  if (breakdown.audienceScore > 0) factors.push('audience');
  if (breakdown.locationScore > 0) factors.push('location');
  return factors;
}

function createBreakdown(sponsor: Sponsor, event: Event): MatchBreakdown {
  return {
    budgetScore: scoreBudgetMatch(sponsor.budget, event.budget),
    categoryScore: scoreCategoryMatch(sponsor.preferredCategories, event),
    audienceScore: scoreAudienceMatch(sponsor.targetAudience, event),
    locationScore: scoreLocationMatch(sponsor.locationPreference, event.location),
  };
}

export function matchSponsorToEvents(sponsor: Sponsor, events: Event[]): EventMatchResult[] {
  return events
    .map((event) => {
      const breakdown = createBreakdown(sponsor, event);
      const score =
        breakdown.budgetScore +
        breakdown.categoryScore +
        breakdown.audienceScore +
        breakdown.locationScore;

      return {
        event,
        score,
        quality: buildMatchQuality(score),
        reason: buildMatchReason(breakdown),
        matchedFactors: buildMatchedFactors(breakdown),
        breakdown,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function matchEventToSponsors(event: Event, sponsors: Sponsor[]): SponsorMatchResult[] {
  return sponsors
    .map((sponsor) => {
      const breakdown = createBreakdown(sponsor, event);
      const score =
        breakdown.budgetScore +
        breakdown.categoryScore +
        breakdown.audienceScore +
        breakdown.locationScore;

      return {
        sponsor,
        score,
        quality: buildMatchQuality(score),
        reason: buildMatchReason(breakdown),
        matchedFactors: buildMatchedFactors(breakdown),
        breakdown,
      };
    })
    .sort((a, b) => b.score - a.score);
}
