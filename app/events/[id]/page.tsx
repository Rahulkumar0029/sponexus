"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { Event } from "@/types/event";

type EventDetailResponse = Event & {
  isPast?: boolean;
  isActive?: boolean;
};

type MediaItem = {
  url: string;
  publicId: string;
  type: "image" | "video";
  title?: string;
  uploadedAt?: string;
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const eventId = typeof params?.id === "string" ? params.id : "";
  const [event, setEvent] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setError("Invalid event ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/events/${eventId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Failed to load event.");
          setEvent(null);
          return;
        }

        setEvent(data.data || null);
      } catch {
        setError("Something went wrong while loading the event.");
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const isOwner = useMemo(() => {
    if (!user || !event?.organizerId) return false;

    const organizer =
      typeof event.organizerId === "string"
        ? event.organizerId
        : (event.organizerId as any)?._id;

    return organizer === user._id;
  }, [user, event]);

  const organizerDisplay = useMemo(() => {
    if (!event?.organizerId) return "Organizer not available";

    if (typeof event.organizerId === "string") return "Organizer";

    const organizer = event.organizerId as any;
    const firstName = organizer?.firstName || "";
    const lastName = organizer?.lastName || "";
    const companyName = organizer?.companyName || "";

    const fullName = `${firstName} ${lastName}`.trim();

    return companyName || fullName || "Organizer";
  }, [event]);

  const formattedDateRange = useMemo(() => {
    if (!event?.startDate) return "Date not set";

    const start = new Date(event.startDate).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const end = event.endDate
      ? new Date(event.endDate).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return end && end !== start ? `${start} - ${end}` : start;
  }, [event]);

  const formattedBudget = useMemo(() => {
    if (!event || typeof event.budget !== "number" || event.budget <= 0) {
      return "Not specified";
    }

    return `₹${event.budget.toLocaleString("en-IN")}`;
  }, [event]);

  const formattedAttendees = useMemo(() => {
    if (!event || typeof event.attendeeCount !== "number" || event.attendeeCount <= 0) {
      return "N/A";
    }

    return event.attendeeCount.toLocaleString("en-IN");
  }, [event]);

  const categories = Array.isArray(event?.categories) ? event!.categories : [];
  const targetAudience = Array.isArray(event?.targetAudience)
    ? event!.targetAudience
    : [];

  const venueImages: MediaItem[] = Array.isArray(event?.venueImages)
    ? (event!.venueImages as MediaItem[])
    : [];

  const pastEventMedia: MediaItem[] = Array.isArray(event?.pastEventMedia)
    ? (event!.pastEventMedia as MediaItem[])
    : [];

  const handleSponsorInterest = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    if (user?.role !== "SPONSOR") {
      return;
    }

    try {
      setActionLoading(true);

      // Temporary CTA flow until direct deal initiation / sponsor-now flow is finalized
      router.push("/match");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4 text-text-light">
        Loading event...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-text-light">
          <h1 className="text-2xl font-bold">Event unavailable</h1>
          <p className="mt-3 text-text-muted">
            {error || "This event could not be loaded."}
          </p>
          <div className="mt-6">
            <Button asChild variant="primary">
              <Link href="/events">Back to Events</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dark-base px-4 py-8 text-text-light">
      <div className="container-custom mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-accent-orange">
              {event.isPast ? "Past Event" : event.isActive ? "Active Event" : "Event"}
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {event.title || "Untitled Event"}
            </h1>
            <p className="mt-3 max-w-3xl text-text-muted">
              {event.description || "No description available."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            {isOwner ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/dashboard/organizer")}
                >
                  Back to Dashboard
                </Button>

                <Button
                  variant="primary"
                  onClick={() => router.push("/events")}
                >
                  View My Events
                </Button>
              </>
            ) : user?.role === "SPONSOR" ? (
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={handleSponsorInterest}
              >
                {actionLoading ? "Opening..." : "Interested in This Event"}
              </Button>
            ) : (
              <Button asChild variant="primary">
                <Link href={`/login?redirect=/events/${eventId}`}>Login to Continue</Link>
              </Button>
            )}
          </div>
        </div>

        {event.coverImage ? (
          <div className="relative mb-8 h-[260px] w-full overflow-hidden rounded-3xl border border-white/10 bg-dark-layer sm:h-[380px]">
            <Image
              src={event.coverImage}
              alt={event.title || "Event cover image"}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Event Overview</h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Date</p>
                  <p className="mt-1 font-medium text-text-light">{formattedDateRange}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Budget</p>
                  <p className="mt-1 font-medium text-accent-orange">{formattedBudget}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Location</p>
                  <p className="mt-1 font-medium text-text-light">
                    {event.location || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    Expected Attendees
                  </p>
                  <p className="mt-1 font-medium text-text-light">
                    👥 {formattedAttendees}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Event Type</p>
                  <p className="mt-1 font-medium text-text-light">
                    {event.eventType || "Event"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">Organizer</p>
                  <p className="mt-1 font-medium text-text-light">{organizerDisplay}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Categories</h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-accent-orange/10 px-4 py-2 text-sm text-accent-orange"
                    >
                      {category}
                    </span>
                  ))
                ) : (
                  <p className="text-text-muted">No categories added.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Target Audience</h2>

              <div className="mt-5 flex flex-wrap gap-3">
                {targetAudience.length > 0 ? (
                  targetAudience.map((audience) => (
                    <span
                      key={audience}
                      className="rounded-full bg-white/5 px-4 py-2 text-sm text-text-light"
                    >
                      {audience}
                    </span>
                  ))
                ) : (
                  <p className="text-text-muted">No audience details added.</p>
                )}
              </div>
            </section>

            {venueImages.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                <h2 className="text-xl font-semibold">Venue & Event Space</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {venueImages.map((item, index) => (
                    <div
                      key={`${item.publicId}-${index}`}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-dark-layer"
                    >
                      {item.type === "video" ? (
                        <video
                          controls
                          className="h-56 w-full object-cover"
                          src={item.url}
                        />
                      ) : (
                        <div className="relative h-56 w-full">
                          <Image
                            src={item.url}
                            alt={item.title || `Venue media ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      )}

                      {item.title ? (
                        <div className="px-4 py-3 text-sm text-text-muted">
                          {item.title}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pastEventMedia.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                <h2 className="text-xl font-semibold">Past Event Proof</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Previous event media to help sponsors evaluate trust and execution quality.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {pastEventMedia.map((item, index) => (
                    <div
                      key={`${item.publicId}-${index}`}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-dark-layer"
                    >
                      {item.type === "video" ? (
                        <video
                          controls
                          className="h-56 w-full object-cover"
                          src={item.url}
                        />
                      ) : (
                        <div className="relative h-56 w-full">
                          <Image
                            src={item.url}
                            alt={item.title || `Past event media ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      )}

                      {item.title ? (
                        <div className="px-4 py-3 text-sm text-text-muted">
                          {item.title}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold">Why this matters</h2>
              <div className="mt-4 space-y-3 text-sm text-text-muted">
                <p>• Strong event details improve sponsor confidence.</p>
                <p>• Clear audience and budget help better-fit matching.</p>
                <p>• Venue and past-event proof build credibility fast.</p>
              </div>
            </section>

            {isOwner ? (
              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-lg font-semibold">Organizer Actions</h2>
                <div className="mt-4 space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => router.push("/events")}
                  >
                    Go to My Events
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push("/dashboard/organizer")}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </section>
            ) : user?.role === "SPONSOR" ? (
              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-lg font-semibold">Sponsor Action</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Interested in this event? Continue to matching and next-step sponsor flow.
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    className="w-full"
                    loading={actionLoading}
                    onClick={handleSponsorInterest}
                  >
                    {actionLoading ? "Opening..." : "Continue"}
                  </Button>
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-lg font-semibold">Want to sponsor this?</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Login as a sponsor to explore opportunities and continue the next step.
                </p>
                <div className="mt-4">
                  <Button asChild variant="primary" className="w-full">
                    <Link href={`/login?redirect=/events/${eventId}`}>Login as Sponsor</Link>
                  </Button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}