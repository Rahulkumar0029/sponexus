export type EventCategory =
  | "CONFERENCE"
  | "WORKSHOP"
  | "WEBINAR"
  | "FESTIVAL"
  | "MEETUP"
  | "OTHER";

export type EventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";

export type EventDeliverable =
  | "STAGE_BRANDING"
  | "STALL_SPACE"
  | "SOCIAL_MEDIA_PROMOTION"
  | "PRODUCT_DISPLAY"
  | "ANNOUNCEMENTS"
  | "EMAIL_PROMOTION"
  | "TITLE_SPONSORSHIP"
  | "CO_BRANDING";

export interface IEvent {
  _id?: string;
  title: string;
  description: string;
  organizerId: string;

  categories: EventCategory[];
  targetAudience: string[];
  location: string;
  budget: number;

  startDate: Date | string;
  endDate: Date | string;
  attendeeCount: number;
  eventType: EventCategory;

  image?: string;
  coverImage?: string;
  status: EventStatus;

  providedDeliverables?: EventDeliverable[];

  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type Event = IEvent;

export interface CreateEventInput {
  title: string;
  description: string;
  categories: EventCategory[];
  targetAudience: string[];
  location: string;
  budget: number;
  startDate: string;
  endDate: string;
  attendeeCount: number;
  eventType: EventCategory;
  image?: string;
  coverImage?: string;

  providedDeliverables?: EventDeliverable[];
}

export interface EventResponse {
  success: boolean;
  message: string;
  event?: Event;
  events?: Event[];
}