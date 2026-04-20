"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminActionButton from "@/app/admin/components/AdminActionButton";

type AdminEvent = {
  _id: string;
  title: string;
  organizerId: string;
  status: string;
  visibilityStatus: string;
  moderationStatus: string;
  location: string;
  budget: number;
  startDate?: string;
  endDate?: string;
  attendeeCount: number;
  eventType: string;
  createdAt: string;
  updatedAt: string;
};

type EventsResponse = {
  success: boolean;
  events?: AdminEvent[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export default function AdminEventsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [visibilityStatus, setVisibilityStatus] = useState("");
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (visibilityStatus) params.set("visibilityStatus", visibilityStatus);
    params.set("page", "1");
    params.set("limit", "20");
    return params.toString();
  }, [query, status, visibilityStatus]);

  const loadEvents = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events?${searchParams}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setData({
          success: false,
          message: "Failed to load events",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Event Moderation
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Events</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Review events, visibility state, quick moderation actions, and trust quality.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, location..."
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Lifecycle</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={visibilityStatus}
            onChange={(e) => setVisibilityStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Visibility</option>
            <option value="VISIBLE">Visible</option>
            <option value="HIDDEN">Hidden</option>
            <option value="UNDER_REVIEW">Under Review</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading events...
        </div>
      ) : !data?.success ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {data?.message || "Unable to load events"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-4 font-medium">Event</th>
                  <th className="px-4 py-4 font-medium">Lifecycle</th>
                  <th className="px-4 py-4 font-medium">Visibility</th>
                  <th className="px-4 py-4 font-medium">Budget</th>
                  <th className="px-4 py-4 font-medium">Dates</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.events || []).map((event) => (
                  <tr key={event._id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-4">
                      <Link href={`/admin/events/${event._id}`} className="block">
                        <div className="font-medium text-white hover:text-[#FFB347]">
                          {event.title}
                        </div>
                        <div className="mt-1 text-xs text-[#94A3B8]">{event.location}</div>
                        <div className="mt-1 text-xs text-[#94A3B8]">
                          {event.eventType} • Audience {event.attendeeCount}
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-white/90">{event.status}</div>
                      <div className="mt-1 text-xs text-[#94A3B8]">{event.moderationStatus}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/90">
                        {event.visibilityStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      ₹{Number(event.budget || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      <div>
                        {event.startDate
                          ? new Date(event.startDate).toLocaleDateString("en-IN")
                          : "-"}
                      </div>
                      <div className="mt-1 text-xs text-[#94A3B8]">
                        {event.endDate
                          ? new Date(event.endDate).toLocaleDateString("en-IN")
                          : "-"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {event.visibilityStatus !== "HIDDEN" ? (
                          <AdminActionButton
                            endpoint={`/api/admin/events/${event._id}/hide`}
                            body={{ reason: "Hidden from events list", moderationStatus: "FLAGGED" }}
                            label="Hide"
                            confirmText="Hide this event?"
                            successMessage="Event hidden"
                            className="border-red-500/20 bg-red-500/10 text-red-200"
                            onSuccess={() => loadEvents()}
                          />
                        ) : (
                          <AdminActionButton
                            endpoint={`/api/admin/events/${event._id}/restore`}
                            body={{ reason: "Restored from events list" }}
                            label="Restore"
                            confirmText="Restore this event?"
                            successMessage="Event restored"
                            onSuccess={() => loadEvents()}
                          />
                        )}

                        <Link
                          href={`/admin/events/${event._id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 px-4 py-4 text-sm text-[#94A3B8]">
            Total events: {data.pagination?.total ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}