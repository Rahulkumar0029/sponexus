"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

type MediaItem = {
  url: string;
  publicId: string;
  type: "image" | "video";
  title?: string;
  uploadedAt?: string;
};

type OrganizerInfo =
  | string
  | {
      _id?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
    };

type EventDetail = {
  _id?: string;
  title?: string;
  description?: string;
  organizerId?: OrganizerInfo;
  categories?: string[];
  targetAudience?: string[];
  location?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  attendeeCount?: number;
  eventType?: string;
  image?: string;
  coverImage?: string;
  status?: string;
  venueImages?: MediaItem[];
  pastEventMedia?: MediaItem[];
  providedDeliverables?: string[];
  isPast?: boolean;
  isActive?: boolean;
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const eventId = typeof params?.id === "string" ? params.id : "";
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dealAmount, setDealAmount] = useState("");
  const [dealMessage, setDealMessage] = useState("");
  const [error, setError] = useState("");
  const [dealError, setDealError] = useState("");
  const [dealSuccess, setDealSuccess] = useState("");
const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

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
        : event.organizerId?._id;

    return organizer === user._id;
  }, [user, event]);

  const organizerDisplay = useMemo(() => {
    if (!event?.organizerId) return "Organizer not available";

    if (typeof event.organizerId === "string") return "Organizer";

    const organizer = event.organizerId;
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
    if (
      !event ||
      typeof event.attendeeCount !== "number" ||
      event.attendeeCount <= 0
    ) {
      return "N/A";
    }

    return event.attendeeCount.toLocaleString("en-IN");
  }, [event]);

  const categories = Array.isArray(event?.categories) ? event.categories : [];
  const targetAudience = Array.isArray(event?.targetAudience)
    ? event.targetAudience
    : [];
  const providedDeliverables = Array.isArray(event?.providedDeliverables)
    ? event.providedDeliverables
    : [];

  const venueImages: MediaItem[] = Array.isArray(event?.venueImages)
    ? event.venueImages
    : [];

  const pastEventMedia: MediaItem[] = Array.isArray(event?.pastEventMedia)
    ? event.pastEventMedia
    : [];

    const allMedia: MediaItem[] = [
  ...(event?.coverImage
    ? [
        {
          url: event.coverImage,
          publicId: "cover-image",
          type: "image" as const,
          title: "Cover Image",
        },
      ]
    : []),
  ...venueImages,
  ...pastEventMedia,
];

  const handleCreateDeal = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    if (user?.role !== "SPONSOR") {
      return;
    }

    if (!event?._id || !user?._id) {
      setDealError("Missing event or user details.");
      setDealSuccess("");
      return;
    }

    const organizerId =
      typeof event.organizerId === "string"
        ? event.organizerId
        : event.organizerId?._id;

    if (!organizerId) {
      setDealError("Organizer information is missing.");
      setDealSuccess("");
      return;
    }

    const parsedAmount = Number(dealAmount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setDealError("Please enter a valid proposed amount.");
      setDealSuccess("");
      return;
    }

    if (!dealMessage.trim()) {
      setDealError("Please write a proposal message.");
      setDealSuccess("");
      return;
    }

    try {
      setActionLoading(true);
      setDealError("");
      setDealSuccess("");

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizerId,
          sponsorId: user._id,
          eventId: event._id,
          title: `Sponsorship for ${event.title || "Event"}`,
          description: event.description || "",
          proposedAmount: parsedAmount,
          message: dealMessage.trim(),
          deliverables: [],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create deal");
      }

      setDealSuccess("Deal created successfully. Redirecting...");
      router.push(`/deals/${data.deal._id}`);
    } catch (err: any) {
      const message =
        err?.message ||
        "Failed to create deal";

      if (
        typeof message === "string" &&
        message.toLowerCase().includes("active deal already exists")
      ) {
        setDealError("You already have an active deal for this event.");
      } else {
        setDealError(message);
      }

      setDealSuccess("");
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
  <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,122,24,0.10),transparent_35%),linear-gradient(135deg,#020617,#07152f,#020617)] px-4 py-8 text-text-light">
    <div className="container-custom mx-auto max-w-7xl">
      <section className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="grid gap-0 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="relative min-h-[320px] overflow-hidden bg-dark-layer sm:min-h-[430px]">
            {event.coverImage ? (
              <Image
                src={event.coverImage}
                alt={event.title || "Event cover image"}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-text-muted">
                No cover image
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="mb-3 inline-flex rounded-full border border-accent-orange/30 bg-accent-orange/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-orange">
                {event.isPast ? "Past Event" : event.isActive ? "Active Event" : event.status || "Event"}
              </p>

              <h1 className="max-w-4xl text-3xl font-bold text-white sm:text-5xl">
                {event.title || "Untitled Event"}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
                {event.description || "No description available."}
              </p>
            </div>
          </div>

          <aside className="border-t border-white/10 bg-[#07152F]/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <InfoTile label="Date" value={formattedDateRange} />
              <InfoTile label="Budget" value={formattedBudget} accent />
              <InfoTile label="Location" value={event.location || "Not specified"} />
              <InfoTile label="Expected Attendees" value={`👥 ${formattedAttendees}`} />
              <InfoTile label="Event Type" value={event.eventType || "Event"} />
              <InfoTile label="Organizer" value={organizerDisplay} />
            </div>

            <div className="mt-6 space-y-3">
              {isOwner ? (
                <>
                  <Button variant="primary" className="w-full" onClick={() => router.push("/events")}>
                    View My Events
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={() => router.push("/dashboard/organizer")}>
                    Back to Dashboard
                  </Button>
                </>
              ) : user?.role === "SPONSOR" ? (
                <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <h2 className="text-lg font-semibold text-white">Start Sponsorship Deal</h2>

                  <input
                    type="number"
                    placeholder="Enter your proposed amount"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#020617]/70 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8]"
                  />

                  <textarea
                    placeholder="Write your proposal message"
                    value={dealMessage}
                    onChange={(e) => setDealMessage(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-[#020617]/70 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8]"
                  />

                  {dealError ? <p className="text-sm text-red-300">{dealError}</p> : null}
                  {dealSuccess ? <p className="text-sm text-[#FFB347]">{dealSuccess}</p> : null}

                  <Button variant="primary" loading={actionLoading} onClick={handleCreateDeal} className="w-full">
                    {actionLoading ? "Creating..." : "Start Deal"}
                  </Button>
                </div>
              ) : (
                <Button asChild variant="primary" className="w-full">
                  <Link href={`/login?redirect=/events/${eventId}`}>Login to Continue</Link>
                </Button>
              )}
            </div>
          </aside>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.7fr_0.8fr]">
        <div className="space-y-8">

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-2xl font-bold text-white">Categories & Audience</h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold text-text-muted">Categories</p>
                <div className="flex flex-wrap gap-3">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <span key={category} className="rounded-full border border-accent-orange/20 bg-accent-orange/10 px-4 py-2 text-sm text-accent-orange">
                        {category}
                      </span>
                    ))
                  ) : (
                    <p className="text-text-muted">No categories added.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-text-muted">Target Audience</p>
                <div className="flex flex-wrap gap-3">
                  {targetAudience.length > 0 ? (
                    targetAudience.map((audience) => (
                      <span key={audience} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                        {audience}
                      </span>
                    ))
                  ) : (
                    <p className="text-text-muted">No audience details added.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {providedDeliverables.length > 0 && (
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
              <h2 className="text-2xl font-bold text-white">Sponsor Deliverables</h2>
              <p className="mt-2 text-sm text-text-muted">
                These are the sponsorship benefits or deliverables available for brand partners.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {providedDeliverables.map((deliverable) => (
                  <span key={deliverable} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                    {deliverable.split("_").join(" ")}
                  </span>
                ))}
              </div>
            </section>
          )}

          {allMedia.length > 0 && (
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Event Media</h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Venue, event space, and past event proof in one gallery.
                  </p>
                </div>
                <p className="text-sm text-accent-orange">{allMedia.length} media files</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allMedia.map((item, index) => (
                  <button
                    key={`${item.publicId}-${index}`}
                    type="button"
                    onClick={() => setPreviewMedia(item)}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-dark-layer text-left transition hover:border-accent-orange/40 hover:shadow-[0_0_30px_rgba(255,122,24,0.14)]"
                  >
                    {item.type === "video" ? (
                      <video className="h-56 w-full object-cover" src={item.url} />
                    ) : (
                      <div className="relative aspect-[16/10] w-full bg-[#020617]">
                        <Image
                          src={item.url}
                          alt={item.title || `Event media ${index + 1}`}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    )}

                    <div className="px-4 py-3 text-sm text-text-muted">
                      {item.title || `Media ${index + 1}`}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold">Why this matters</h2>
            <div className="mt-4 space-y-3 text-sm text-text-muted">
              <p>• Strong event details improve sponsor confidence.</p>
              <p>• Clear audience and budget help better-fit matching.</p>
              <p>• Venue and past-event proof build credibility fast.</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-accent-orange/20 bg-accent-orange/10 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">Quick Action</h2>
            <p className="mt-2 text-sm text-[#CBD5E1]">
              Review this event and take the next action based on your role.
            </p>

            <div className="mt-5">
              {isOwner ? (
                <Button variant="primary" className="w-full" onClick={() => router.push("/events")}>
                  Go to My Events
                </Button>
              ) : user?.role === "SPONSOR" ? (
                <Button variant="primary" className="w-full" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  Start Deal
                </Button>
              ) : (
                <Button asChild variant="primary" className="w-full">
                  <Link href={`/login?redirect=/events/${eventId}`}>Login as Sponsor</Link>
                </Button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>

    {previewMedia ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-md"
        onClick={() => setPreviewMedia(null)}
      >
        <div className="relative h-[82vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#020617]">
          {previewMedia.type === "video" ? (
            <video controls autoPlay className="h-full w-full object-contain" src={previewMedia.url} />
          ) : (
            <Image
              src={previewMedia.url}
              alt={previewMedia.title || "Event media preview"}
              fill
              className="object-contain"
              sizes="100vw"
            />
          )}

          <button
            type="button"
            onClick={() => setPreviewMedia(null)}
            className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    ) : null}
  </main>
);
}
function InfoTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#020617]/50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-semibold ${
          accent ? "text-accent-orange" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
