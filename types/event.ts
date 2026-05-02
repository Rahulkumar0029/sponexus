export const EVENT_CATEGORY_OPTIONS = [
  "Technology",
  "Education",
  "Sports",
  "Cultural",
  "Music & Entertainment",
  "Startup & Business",
  "Food & Beverage",
  "Fashion & Lifestyle",
  "Health & Wellness",
  "Finance & Fintech",
  "Gaming & Esports",
  "Automobile",
  "Travel & Tourism",
  "Social Impact / NGO",
  "College Fest",
  "Corporate Event",
  "Exhibition / Expo",
  "Influencer / Creator Campaign",
  "Community Event",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORY_OPTIONS)[number];

export type EventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ONGOING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export const EVENT_DELIVERABLE_OPTIONS = [
  "Stage Branding",
  "Stall Space",
  "Social Media Promotion",
  "Product Display",
  "Announcements / Stage Mentions",
  "Email Promotion",
  "Title Sponsorship",
  "Co-Branding",
] as const;

export type EventDeliverable = (typeof EVENT_DELIVERABLE_OPTIONS)[number];

export interface IEvent {
  _id?: string;
  title: string;
  description: string;
  organizerId: string;

  categories: string[];
  targetAudience: string[];
  location: string;
  budget: number;

  startDate: Date | string;
  endDate: Date | string;
  attendeeCount: number;
  eventType: string;

   image?: string;
  coverImage?: string;
  status: EventStatus;

  providedDeliverables?: EventDeliverable[];

  pausedAt?: Date | string | null;
  resumedAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  completedAt?: Date | string | null;

  duplicatedFrom?: string | null;
  repostCount?: number;

  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type Event = IEvent;

export interface CreateEventInput {
  title: string;
  description: string;

  categories: string[];
  customCategory?: string;

  targetAudience: string[];
  location: string;
  budget: number;

  startDate: string;
  endDate: string;
  attendeeCount: number;
  eventType: string;

  image?: string;
  coverImage?: string;

  providedDeliverables?: EventDeliverable[];
}

export interface UpdateEventInput extends CreateEventInput {
  action?: "edit" | "pause" | "resume" | "cancel" | "complete" | "repost";
}

export interface EventResponse {
  success: boolean;
  message: string;
  event?: Event;
  events?: Event[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}