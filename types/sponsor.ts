export interface ISponsor {
  _id: string;
  ownerId: string;
  brandName: string;
  description: string;
  budget: string;
  preferredCategories: string[];
  targetAudience: string;
  locationPreference: string;
  createdAt: string;
  updatedAt?: string;
}

export type Sponsor = ISponsor;

export interface CreateSponsorInput {
  companyName: string;
  description: string;
  categories: string[];
  targetAudience: string[];
  locations: string[];
  budget: number;
  logo?: string;
  website?: string;
}

export interface SponsorResponse {
  success: boolean;
  message: string;
  sponsor?: Sponsor;
  sponsors?: Sponsor[];
}
