import { Event } from "@/types/event";
import { Sponsor } from "@/types/sponsor";

export type MatchFactor =
  | "category"
  | "audience"
  | "location"
  | "budget"
  | "deliverables";

export interface MatchWeights {
  category: number;
  audience: number;
  location: number;
  budget: number;
  deliverables: number;
}

export interface MatchBreakdown {
  categoryScore: number;
  audienceScore: number;
  locationScore: number;
  budgetScore: number;
  deliverablesScore: number;
  weights?: MatchWeights;
}

export interface BaseMatchResult {
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  weakPoints: string[];
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
  matchType?: "sponsor-to-events" | "event-to-sponsors";
  mode?: "sponsor_to_events" | "event_to_sponsors";
  count?: number;
  weights?: MatchWeights;
}