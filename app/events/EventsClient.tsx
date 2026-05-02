"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { Event } from "@/types/event";
import { useSubscription } from "@/hooks/useSubscription";

type EventStatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "ONGOING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

type ApiResponse = {
  success: boolean;
  events: Event[];
  preview?: boolean;
  ownerView?: boolean;
  sponsorView?: boolean;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const ORGANIZER_STATUS_FILTERS: { label: string; value: EventStatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Ongoing", value: "ONGOING" },
  { label: "Paused", value: "PAUSED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Expired", value: "EXPIRED" },
];

export default function EventsClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess } = useSubscription();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    pages: 0,
  });

  const isOrganizer = user?.role === "ORGANIZER";
  const isSponsor = user?.role === "SPONSOR";

  const fetchEvents = useCallback(async () => {
    if (authLoading) return;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");

      if (isOrganizer) {
        if (statusFilter !== "ALL") {
          params.set("status", statusFilter);
        }
      } else {
        params.set("activeOnly", "true");
      }

      const res = await fetch(`/api/events/get?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch events");
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
      setPagination({
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 12,
        pages: data.pagination?.pages || 0,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load events");
      setEvents([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 12,
        pages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, page, statusFilter, isOrganizer, isSponsor]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const pageTitle = useMemo(() => {
    if (!user) return "Featured Events";
    if (isOrganizer) return "My Events";
    if (isSponsor) return "Explore Events";
    return "Events";
  }, [user, isOrganizer, isSponsor]);

  const pageDescription = useMemo(() => {
    if (!user) {
      return "Explore a few featured events. Login to unlock full marketplace.";
    }

    if (isOrganizer) {
      return "Manage your events, status, visibility, and sponsorship opportunities.";
    }

    if (isSponsor) {
      return "Discover active events and find the right sponsorship opportunities.";
    }

    return "";
  }, [user, isOrganizer, isSponsor]);

  const activeCount = useMemo(
    () =>
      events.filter(
        (event) => event.status === "PUBLISHED" || event.status === "ONGOING"
      ).length,
    [events]
  );

  const handleStatusChange = (value: EventStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
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
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              {isOrganizer ? "Organizer Event Control" : isSponsor ? "Sponsor Browse" : "Public Preview"}
            </p>

            <h1 className="text-4xl font-bold text-white">{pageTitle}</h1>
            <p className="mt-2 max-w-3xl text-text-muted">{pageDescription}</p>
          </div>

          <div className="flex gap-3">
            {isOrganizer && (
              <Button
                variant="primary"
                onClick={() => {
                  if (!hasAccess) {
                    router.push("/pricing");
                    return;
                  }

                  router.push("/events/create");
                }}
              >
                + Create Event
              </Button>
            )}

            {isSponsor && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (!hasAccess) {
                    router.push("/pricing");
                    return;
                  }

                  router.push("/match");
                }}
              >
                View Matches
              </Button>
            )}

            {!user && (
              <Link href="/login?redirect=/events">
                <Button variant="primary">Login</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-text-muted">
              {isOrganizer ? "Total Events" : "Visible Events"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pagination.total}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isOrganizer
                ? "Events available in your organizer workspace."
                : "Events currently available in this view."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-text-muted">
              {isOrganizer ? "Active On Page" : "Current Page"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {isOrganizer ? activeCount : pagination.page}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isOrganizer
                ? "Published or ongoing events currently shown on this page."
                : "Your current position in event results."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-text-muted">Access Mode</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {isOrganizer ? "Owner" : isSponsor ? "Sponsor" : "Preview"}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isOrganizer
                ? "You can manage only your own events."
                : isSponsor
                ? "You can browse active public events."
                : "Limited public event preview."}
            </p>
          </div>
        </div>

        {isOrganizer ? (
          <div className="mb-10 rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Event Status Filter</h2>
              <p className="mt-2 text-sm text-text-muted">
                Filter your events by lifecycle status.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {ORGANIZER_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleStatusChange(filter.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    statusFilter === filter.value
                      ? "border-accent-orange bg-accent-orange text-dark-base"
                      : "border-white/10 bg-white/5 text-text-light hover:border-accent-orange/50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
            {error}
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 sm:flex-row">
              <p className="text-sm text-text-muted">
                Page {pagination.page} of {Math.max(pagination.pages, 1)}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>

                <Button
                  variant="primary"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    setPage((prev) =>
                      prev < pagination.pages ? prev + 1 : prev
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-6 py-20 text-center text-text-muted">
            {isOrganizer
              ? "No events found for this status."
              : "No active events available right now."}
          </div>
        )}

        {!user && events.length > 0 && (
          <div className="mt-12 text-center">
            <p className="mb-4 text-text-muted">
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