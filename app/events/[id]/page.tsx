'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';

type EventMediaItem = {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  title?: string;
  uploadedAt?: string;
};

type OrganizerRef =
  | {
      _id?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      name?: string;
      email?: string;
    }
  | string
  | null
  | undefined;

type EventType = {
  _id: string;
  title: string;
  description?: string;
  eventType?: string;
  status?: string;
  coverImage?: string;
  categories?: string[];
  targetAudience?: string[];
  venueImages?: EventMediaItem[];
  pastEventMedia?: EventMediaItem[];
  location?: string;
  budget?: number | string;
  attendeeCount?: number | string;
  startDate?: string;
  endDate?: string;
  organizerId?: OrganizerRef;
  isPast?: boolean;
  isActive?: boolean;
};

type StoredUser = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  brandName?: string;
  preferredCategories?: string[];
  officialPhone?: string;
};

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getSafeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function getOrganizerId(organizer: OrganizerRef): string | null {
  if (!organizer) return null;
  if (typeof organizer === 'string') return organizer;
  return organizer._id || null;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawEventId = params?.id;
  const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as StoredUser;
        setUser(parsedUser);
      }
    } catch (err) {
      console.error('Failed to parse user from localStorage:', err);
      setUser(null);
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    if (!eventId || typeof eventId !== 'string') {
      setError('Invalid event ID');
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to fetch event');
        }

        setEvent(data.event as EventType);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        const message =
          err instanceof Error ? err.message : 'Failed to load event';

        setError(message);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

    return () => {
      controller.abort();
    };
  }, [eventId]);

  const venueImages = useMemo(
    () => getSafeArray<EventMediaItem>(event?.venueImages),
    [event]
  );

  const pastEventMedia = useMemo(
    () => getSafeArray<EventMediaItem>(event?.pastEventMedia),
    [event]
  );

  const hasVenueImages = venueImages.length > 0;
  const hasPastMedia = pastEventMedia.length > 0;

  const organizerId = getOrganizerId(event?.organizerId);
  const isOwner = Boolean(user?._id && organizerId && user._id === organizerId);
  const isSponsor = user?.role === 'SPONSOR';

  const isEventPast = useMemo(() => {
    if (!event) return false;
    if (typeof event.isPast === 'boolean') return event.isPast;
    if (!event.endDate) return false;
    return new Date(event.endDate) < new Date();
  }, [event]);

  const isEventActive = useMemo(() => {
    if (!event) return false;
    if (typeof event.isActive === 'boolean') return event.isActive;
    return event.status === 'PUBLISHED' || event.status === 'ONGOING';
  }, [event]);

  const sponsorProfileComplete = useMemo(() => {
    if (!isSponsor || !user) return false;

    return Boolean(
      user.brandName &&
        Array.isArray(user.preferredCategories) &&
        user.preferredCategories.length > 0 &&
        user.officialPhone
    );
  }, [isSponsor, user]);

  const sponsorButtonLabel = useMemo(() => {
    if (!isSponsor) return 'Login to Continue';
    if (isEventPast || !isEventActive) return 'Event Closed';
    if (!sponsorProfileComplete) return 'Complete Profile First';
    return 'Sponsor This Event';
  }, [isSponsor, isEventPast, isEventActive, sponsorProfileComplete]);

  const handleSponsorAction = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isSponsor) {
      router.push('/events');
      return;
    }

    if (isEventPast || !isEventActive) return;

    if (!sponsorProfileComplete) {
      router.push('/settings');
      return;
    }

    // Temporary flow until dedicated sponsor-now page is built
    router.push('/match');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 text-text-muted backdrop-blur-xl">
          Loading event...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.05] p-10 text-center backdrop-blur-xl">
          <h2 className="mb-4 text-2xl font-bold text-white">Event Not Found</h2>
          <p className="mb-6 text-text-muted">
            {error || 'Event not available'}
          </p>
          <Link href="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl space-y-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-text-muted transition hover:text-white"
          >
            ← Back
          </button>

          {isEventPast ? (
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-300">
              Past Event
            </span>
          ) : isEventActive ? (
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300">
              Active Event
            </span>
          ) : (
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-300">
              Not Active
            </span>
          )}
        </div>

        {/* Hero Image */}
        {event.coverImage && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <img
              src={event.coverImage}
              alt={event.title || 'Event cover'}
              className="h-[350px] w-full object-cover"
            />
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="mb-3 text-4xl font-bold text-white">
            {event.title || 'Untitled Event'}
          </h1>

          <div className="flex flex-wrap gap-2">
            {event.eventType && (
              <span className="rounded-full bg-accent-orange/20 px-3 py-1 text-sm text-accent-orange">
                {event.eventType}
              </span>
            )}

            {event.status && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-400">
                {event.status}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="mb-3 text-xl font-semibold text-white">About Event</h2>
              <p className="leading-relaxed text-text-muted">
                {event.description || 'No description available.'}
              </p>
            </div>

            {event.organizerId && typeof event.organizerId !== 'string' && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                <h3 className="mb-3 font-semibold text-white">Organizer</h3>
                <p className="text-text-light">
                  {event.organizerId.firstName || ''} {event.organizerId.lastName || ''}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {event.organizerId.companyName || 'Organizer'}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Categories</h3>
              {getSafeArray(event.categories).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getSafeArray(event.categories).map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-accent-orange/20 px-3 py-1 text-sm text-accent-orange"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No categories added yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Target Audience</h3>
              {getSafeArray(event.targetAudience).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getSafeArray(event.targetAudience).map((aud) => (
                    <span
                      key={aud}
                      className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-400"
                    >
                      {aud}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No target audience details added yet.
                </p>
              )}
            </div>

            {hasVenueImages && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                <h3 className="mb-4 font-semibold text-white">Venue Gallery</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {venueImages.map((media) => (
                    <a
                      key={media.publicId}
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                    >
                      <img
                        src={media.url}
                        alt={media.title || 'Venue image'}
                        className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="p-3">
                        <p className="text-sm text-text-light">
                          {media.title || 'Venue image'}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {hasPastMedia && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                <h3 className="mb-4 font-semibold text-white">Past Event Media</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {pastEventMedia.map((media) => (
                    <div
                      key={media.publicId}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                    >
                      {media.type === 'image' ? (
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
                          <img
                            src={media.url}
                            alt={media.title || 'Past event media'}
                            className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        </a>
                      ) : (
                        <video
                          controls
                          preload="metadata"
                          className="h-56 w-full bg-black object-cover"
                        >
                          <source src={media.url} />
                          Your browser does not support the video tag.
                        </video>
                      )}

                      <div className="p-3">
                        <p className="text-sm text-text-light">
                          {media.title ||
                            (media.type === 'video'
                              ? 'Past event video'
                              : 'Past event image')}
                        </p>
                        <p className="mt-1 text-xs uppercase text-text-muted">
                          {media.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <div>
                <p className="text-sm text-text-muted">Location</p>
                <p className="text-white">{event.location || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Budget</p>
                <p className="text-2xl font-bold text-accent-orange">
                  {formatCurrency(event.budget)}
                </p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Attendees</p>
                <p className="text-white">
                  {event.attendeeCount !== undefined &&
                  event.attendeeCount !== null &&
                  event.attendeeCount !== ''
                    ? event.attendeeCount
                    : 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Dates</p>
                <p className="text-white">
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </p>
              </div>
            </div>

            {!isOwner && (
              <Button
                fullWidth
                onClick={handleSponsorAction}
                disabled={isSponsor && (isEventPast || !isEventActive)}
              >
                {sponsorButtonLabel}
              </Button>
            )}

            {isOwner && (
              <Link href={`/events/${event._id}/edit`}>
                <Button variant="secondary" fullWidth>
                  Edit Event
                </Button>
              </Link>
            )}

            {isSponsor && !isOwner && !sponsorProfileComplete && !isEventPast && (
              <p className="text-sm text-text-muted">
                Complete your sponsor profile first so you can move ahead with relevant event opportunities.
              </p>
            )}

            {isEventPast && (
              <p className="text-sm text-red-300">
                This event has already ended, so sponsorship actions are closed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}