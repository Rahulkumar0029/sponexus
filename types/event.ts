export type EventCategory =
  | 'CONFERENCE'
  | 'WORKSHOP'
  | 'WEBINAR'
  | 'FESTIVAL'
  | 'MEETUP'
  | 'OTHER';

export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

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
  eventType: EventCategory;
  image?: string;
  images?: string[];
  video?: string;
  organizerProvides?: string[];
  status: EventStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
  images?: string[];
  video?: string;
  organizerProvides?: string[];
}

export interface EventResponse {
  success: boolean;
  message: string;
  event?: Event;
  events?: Event[];
}
