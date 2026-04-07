'use client';

import Link from 'next/link';
import { Event } from '@/types/event';

interface EventCardProps {
  event: Event;
  matchScore?: number;
  onAction?: () => void;
  actionLabel?: string;
}

export function EventCard({
  event,
  matchScore,
  onAction: _onAction,
  actionLabel: _actionLabel = 'View Details',
}: EventCardProps) {
  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/events/${event._id}`}>
      <div className="card-hover cursor-pointer group h-full flex flex-col transition-all duration-300 hover:shadow-glow-orange">
        {/* Image */}
        {event.image && (
          <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 bg-dark-layer">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {matchScore && (
              <div className="absolute top-2 right-2 bg-accent-orange/90 text-dark-base px-3 py-1 rounded-full text-sm font-bold">
                {matchScore}% Match
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 flex-1 flex flex-col">
          {/* Header with Type Badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-text-light group-hover:text-accent-orange smooth-transition line-clamp-2 flex-1">
              {event.title}
            </h3>
            <span className="flex-shrink-0 text-xs font-medium text-accent-orange bg-accent-orange/10 px-3 py-1 rounded-full whitespace-nowrap">
              {event.eventType}
            </span>
          </div>

          {/* Description */}
          <p className="text-text-muted text-sm line-clamp-2 flex-1">{event.description}</p>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {event.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-md"
              >
                {cat}
              </span>
            ))}
            {event.categories.length > 2 && (
              <span className="text-xs text-text-muted">
                +{event.categories.length - 2}
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/10 pt-3 mt-auto">
            <div>
              <p className="text-text-muted text-xs">Date</p>
              <p className="text-text-light font-medium">{formattedDate}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Budget</p>
              <p className="text-accent-orange font-bold">
                ${(event.budget / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-text-muted text-xs">Location • Attendees</p>
              <p className="text-text-light font-medium">
                {event.location} • 👥 {(event.attendeeCount / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
