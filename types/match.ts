import { Event } from "@/types/event";

export type MatchFactor =
  | "category"
  | "audience"
  | "location"
  | "budget"
  | "deliverables";

export type MatchMode =
  | "sponsorship_to_events"
  | "event_to_sponsorships";

export type MatchType =
  | "sponsorship-to-events"
  | "event-to-sponsorships";

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

export type MatchedSponsorship = {
  _id?: string;
  sponsorOwnerId?: string;
  sponsorProfileId?: string;

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

  status?: string;
  visibilityStatus?: string;
  moderationStatus?: string;
  expiresAt?: string | Date | null;

  sponsorProfile?: {
    _id?: string;
    brandName?: string;
    companyName?: string;
    logoUrl?: string;
    website?: string;
    industry?: string;
    about?: string;
    isPublic?: boolean;
    isProfileComplete?: boolean;
    [key: string]: any;
  } | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;

  [key: string]: any;
};

export interface SponsorshipMatchResult extends BaseMatchResult {
  sponsorship: MatchedSponsorship;
}

export interface MatchResponse<
  T = EventMatchResult | SponsorshipMatchResult
> {
  success: boolean;
  matches: T[];
  message?: string;
  matchType?: MatchType;
  mode?: MatchMode;
  count?: number;
  weights?: MatchWeights;
}