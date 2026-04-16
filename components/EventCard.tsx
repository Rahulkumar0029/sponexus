"use client";

import Link from "next/link";
import { Event } from "@/types/event";

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
  actionLabel: _actionLabel = "View Details",
}: EventCardProps) {
  const formattedDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not set";

  const categories = Array.isArray(event.categories) ? event.categories : [];

  const formattedBudget =
    typeof event.budget === "number" && event.budget > 0
      ? `₹${event.budget.toLocaleString("en-IN")}`
      : "Not specified";

  const formattedAttendees =
    typeof event.attendeeCount === "number" && event.attendeeCount > 0
      ? event.attendeeCount.toLocaleString("en-IN")
      : "N/A";

  return (
    <Link href={`/events/${event._id}`}>
      <div className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-300 hover:border-accent-orange/40 hover:shadow-[0_0_25px_rgba(251,191,36,0.12)]">
        {matchScore != null && (
          <div className="absolute right-4 top-4 z-10 rounded-full bg-accent-orange/90 px-3 py-1 text-sm font-bold text-dark-base">
            {matchScore}% Match
          </div>
        )}

        {event.image && (
          <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-dark-layer">
            <img
              src={event.image}
              alt={event.title || "Event image"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 flex-1 text-lg font-semibold text-text-light transition group-hover:text-accent-orange">
              {event.title || "Untitled Event"}
            </h3>

            <span className="whitespace-nowrap rounded-full bg-accent-orange/10 px-3 py-1 text-xs font-medium text-accent-orange">
              {event.eventType || "Event"}
            </span>
          </div>

          <p className="line-clamp-2 flex-1 text-sm text-text-muted">
            {event.description || "No description available."}
          </p>

          <div className="flex flex-wrap gap-2">
            {categories.length > 0 ? (
              <>
                {categories.slice(0, 2).map((cat) => (
                  <span
                    key={cat}
                    className="rounded-md bg-white/5 px-2 py-1 text-xs text-text-muted"
                  >
                    {cat}
                  </span>
                ))}
                {categories.length > 2 && (
                  <span className="text-xs text-text-muted">
                    +{categories.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-text-muted">No categories added</span>
            )}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/10 pt-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Date</p>
              <p className="font-medium text-text-light">{formattedDate}</p>
            </div>

            <div>
              <p className="text-xs text-text-muted">Budget</p>
              <p className="font-bold text-accent-orange">{formattedBudget}</p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-text-muted">Location • Attendees</p>
              <p className="font-medium text-text-light">
                {event.location || "Location not specified"} • 👥 {formattedAttendees}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}