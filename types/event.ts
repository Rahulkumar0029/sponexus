export type EventCategory = 'CONFERENCE' | 'WORKSHOP' | 'WEBINAR' | 'FESTIVAL' | 'MEETUP' | 'OTHER';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface IEvent {
  _id?: string;
  title: string;
  description: string;
  organizerId: string;
  categories: string[];
  targetAudience: string[];
  location: string;
  budget: number;
  startDate: Date;
  endDate: Date;
  attendeeCount: number;
  eventType: EventCategory;
  category?: EventCategory;
  image?: string;
  status: EventStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type Event = IEvent;

export interface CreateEventInput {
  title: string;
  description: string;
  categories: string[];
  targetAudience: string[];
  location: string;
  budget: number;
  startDate: string;
  endDate: string;
  attendeeCount: number;
  eventType: EventCategory;
  image?: string;
}

export interface EventResponse {
  success: boolean;
  message: string;
  event?: Event;
  events?: Event[];
}
