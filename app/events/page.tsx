"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { Event } from "@/types/event";

type ApiResponse = {
  success: boolean;
  events: Event[];
  preview?: boolean;
  ownerView?: boolean;
  sponsorView?: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export default function EventsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isOrganizer = user?.role === "ORGANIZER";
  const isSponsor = user?.role === "SPONSOR";

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/events/get?activeOnly=true", {
          method: "GET",
          credentials: "include",
        });

        const data: ApiResponse = await res.json();

        if (!res.ok) {
          throw new Error("Failed to fetch events");
        }

        setEvents(data.events || []);
      } catch (err) {
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getTitle = () => {
    if (!user) return "Featured Events";
    if (isOrganizer) return "My Events";
    if (isSponsor) return "Explore Events";
    return "Events";
  };

  const getDescription = () => {
    if (!user)
      return "Explore a few featured events. Login to unlock full marketplace.";
    if (isOrganizer)
      return "Manage your events and create new sponsorship opportunities.";
    if (isSponsor)
      return "Discover events and find the right sponsorship opportunities.";
    return "";
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-light">
        Loading events...
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">{getTitle()}</h1>
            <p className="mt-2 text-text-muted">{getDescription()}</p>
          </div>

          <div className="flex gap-3">
            {isOrganizer && (
              <Link href="/events/create">
                <Button variant="primary">+ Create Event</Button>
              </Link>
            )}

            {isSponsor && (
              <Link href="/match">
                <Button variant="secondary">View Matches</Button>
              </Link>
            )}

            {!user && (
              <Link href="/login?redirect=/events">
                <Button variant="primary">Login</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 text-center text-red-400">{error}</div>
        )}

        {/* Events */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted py-20">
            {isOrganizer
              ? "You haven’t created any events yet."
              : "No events available right now."}
          </div>
        )}

        {/* Public CTA */}
        {!user && events.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-text-muted mb-4">
              Login to explore all events and connect with sponsors.
            </p>
            <Link href="/login?redirect=/events">
              <Button variant="primary">Unlock Full Access</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}