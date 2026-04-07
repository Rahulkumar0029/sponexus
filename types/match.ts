import { Event } from '@/types/event';
import { Sponsor } from '@/types/sponsor';

export type MatchFactor = 'budget' | 'category' | 'audience' | 'location';

export interface MatchBreakdown {
  budgetScore: number;
  categoryScore: number;
  audienceScore: number;
  locationScore: number;
}

export interface BaseMatchResult {
  score: number;
  quality: 'Excellent' | 'Strong' | 'Good' | 'Fair';
  reason: string;
  matchedFactors: MatchFactor[];
  breakdown: MatchBreakdown;
}

export interface EventMatchResult extends BaseMatchResult {
  event: Event;
}

export interface SponsorMatchResult extends BaseMatchResult {
  sponsor: Sponsor;
}

export interface MatchResponse<T = EventMatchResult | SponsorMatchResult> {
  success: boolean;
  matches: T[];
  message?: string;
}
