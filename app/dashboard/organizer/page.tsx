"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/hooks/useAuth";
import { Event } from "@/types/event";

type EventsApiResponse = {
  success: boolean;
  ownerView?: boolean;
  events: Event[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
};

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?redirect=/dashboard/organizer");
      return;
    }

    if (user.role !== "ORGANIZER") {
      router.replace("/dashboard/sponsor");
      return;
    }

    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/events/get?status=ALL&page=1&limit=6",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data: EventsApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch your events");
        }

        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading your dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [authLoading, user, router]);

  const stats = useMemo(() => {
    const total = events.length;
    const drafts = events.filter((event) => event.status === "DRAFT").length;
    const active = events.filter(
      (event) => event.status === "PUBLISHED" || event.status === "ONGOING"
    ).length;
    const past = events.filter(
      (event) => event.status === "COMPLETED" || event.status === "CANCELLED"
    ).length;

    return { total, drafts, active, past };
  }, [events]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4 text-text-light">
        Loading organizer dashboard...
      </div>
    );
  }

  if (!user || user.role !== "ORGANIZER") {
    return null;
  }

  return (
    <main className="min-h-screen bg-dark-base px-4 py-8 text-text-light">
      <div className="container-custom mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-accent-orange">
              Organizer Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Welcome back, {user.firstName || user.name}
            </h1>
            <p className="mt-3 max-w-2xl text-text-muted">
              Manage your events, review draft and published listings, and keep your
              sponsorship opportunities ready for the right sponsors.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => router.push("/events")}
            >
              View My Events
            </Button>

            <Button
              variant="primary"
              onClick={() => router.push("/events/create")}
            >
              + Create Event
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Total Events</p>
            <p className="mt-3 text-3xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Drafts</p>
            <p className="mt-3 text-3xl font-bold text-white">{stats.drafts}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Active Events</p>
            <p className="mt-3 text-3xl font-bold text-accent-orange">
              {stats.active}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Past / Closed</p>
            <p className="mt-3 text-3xl font-bold text-white">{stats.past}</p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Quick Event Actions</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button
              onClick={() => router.push("/events/create")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">Create New Event</p>
              <p className="mt-2 text-sm text-text-muted">
                Launch a new sponsorship-ready event listing.
              </p>
            </button>

            <button
              onClick={() => router.push("/events")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">Manage My Events</p>
              <p className="mt-2 text-sm text-text-muted">
                Review and manage your current event listings.
              </p>
            </button>

            <button
              onClick={() => router.push("/match")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">Check Matches</p>
              <p className="mt-2 text-sm text-text-muted">
                Explore sponsorship matches related to your events.
              </p>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Events</h2>
              <p className="mt-2 text-sm text-text-muted">
                Only your events are visible here.
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={() => router.push("/events")}
            >
              View All
            </Button>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-dark-layer px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-white">
                You have not created any events yet
              </h3>
              <p className="mt-3 text-text-muted">
                Start with your first event and make it sponsor-ready.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => router.push("/events/create")}
                >
                  Create First Event
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}