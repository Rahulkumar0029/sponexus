import { EventDeliverable } from "@/types/event";

export interface ISponsor {
  _id: string;
  userId: string;

  brandName: string;
  companyName: string;
  website: string;
  officialEmail: string;
  phone: string;

  industry: string;
  companySize: string;
  about: string;
  logoUrl: string;

  targetAudience: string;
  preferredCategories: string[];
  preferredLocations: string[];
  sponsorshipInterests: EventDeliverable[];

  instagramUrl: string;
  linkedinUrl: string;

  isProfileComplete: boolean;
  isPublic: boolean;

  createdAt: string;
  updatedAt?: string;
}

export type Sponsor = ISponsor;

export interface CreateSponsorInput {
  brandName: string;
  companyName: string;
  website?: string;
  officialEmail: string;
  phone: string;
  industry: string;
  companySize?: string;
  about?: string;
  logoUrl?: string;
  targetAudience?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: EventDeliverable[];
  instagramUrl?: string;
  linkedinUrl?: string;
  isPublic?: boolean;
}

export interface SponsorResponse {
  success: boolean;
  message: string;
  sponsor?: Sponsor;
  sponsors?: Sponsor[];
}