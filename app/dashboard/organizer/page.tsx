'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { EventCard } from '@/components/EventCard';
import { SponsorCard } from '@/components/SponsorCard';
import { EmptyState } from '@/components/EmptyState';
import { Event } from '@/types/event';
import { useAuth } from '@/hooks/useAuth';
import { useMatch } from '@/hooks/useMatch';


export default function OrganizerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { matches, loading: matchLoading, error: matchError, findMatches } = useMatch();

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'ORGANIZER') {
      router.replace('/dashboard/sponsor');
    }


    const isProfileComplete = Boolean(
      user.organizationName?.trim() &&
        user.eventFocus?.trim() &&
        user.organizerTargetAudience?.trim() &&
        user.organizerLocation?.trim() &&
        user.phone?.trim()
    );

    if (!isProfileComplete) {
      router.replace('/settings');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadOrganizerDashboard = async () => {
      if (!user || user.role !== 'ORGANIZER') return;

      setEventsLoading(true);
      setEventsError('');

      try {
        const res = await fetch(`/api/events/get?organizer=${user._id}&page=1&limit=6`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load your events');
        }

        const loadedEvents = data?.events || [];
        setEvents(loadedEvents);

        if (loadedEvents.length > 0) {
          await findMatches({ eventId: loadedEvents[0]._id });
        }
      } catch (err: any) {
        setEventsError(err?.message || 'Unable to load dashboard data');
      } finally {
        setEventsLoading(false);
      }
    };

    loadOrganizerDashboard();
  }, [user, findMatches]);

  const activeEventsCount = useMemo(() => {
    return events.filter((event) => event.status !== 'COMPLETED' && event.status !== 'CANCELLED').length;
  }, [events]);

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading organizer dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="container-custom max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Organizer Workspace
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Welcome back, <span className="gradient-text">{user.firstName || user.name}</span>
            </h1>

            <p className="mt-3 max-w-2xl text-text-muted">
              Manage your events, discover relevant sponsors, and move toward stronger partnerships.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/events/create">
              <Button variant="primary">+ Create Event</Button>
            </Link>
            <Link href="/sponsorships">
              <Button variant="secondary">Explore Sponsorships</Button>
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Role</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Organizer</h3>
            <p className="mt-3 text-sm text-text-muted">
              Your workspace is optimized for event creation and sponsor discovery.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Your Events</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{events.length}</h3>
            <p className="mt-3 text-sm text-text-muted">
              Total events created in your organizer account.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Active Events</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{activeEventsCount}</h3>
            <p className="mt-3 text-sm text-text-muted">
              Events that can still attract sponsor opportunities.
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <p className="mt-2 text-sm text-text-muted">
              Start from the most important things an organizer needs to do.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">Create Event</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Launch a new event and make it available for sponsor matching.
              </p>
              <div className="mt-6">
                <Link href="/events/create">
                  <Button variant="primary" fullWidth>
                    Create Event
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">Manage Events</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Review your existing events and keep them updated for better sponsor discovery.
              </p>
              <div className="mt-6">
                <Link href="/events">
                  <Button variant="secondary" fullWidth>
                    View My Events
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">Explore Sponsorships</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Browse active sponsorship posts that align with your event category, audience, and location.
              </p>
              <div className="mt-6">
                <Link href="/sponsorships">
                  <Button variant="secondary" fullWidth>
                    Explore Sponsorships
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* My events */}
        <div className="mb-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">My Events</h2>
              <p className="mt-2 text-sm text-text-muted">
                Your latest events are shown here first.
              </p>
            </div>

            {events.length > 0 && (
              <Link href="/events">
                <Button size="sm" variant="secondary">
                  View All
                </Button>
              </Link>
            )}
          </div>

          {eventsLoading ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-10 text-center text-text-muted backdrop-blur-xl">
              Loading your events...
            </div>
          ) : eventsError ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
              {eventsError}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No events yet"
              description="Create your first event to start matching with relevant sponsors."
              actionLabel="Create First Event"
              onAction={() => router.push('/events/create')}
            />
          )}
        </div>

        {/* Top sponsor matches */}
        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Top Sponsor Matches</h2>
              <p className="mt-2 text-sm text-text-muted">
                Recommended sponsors based on your latest event data.
              </p>
            </div>

            <Link href="/match">
              <Button size="sm" variant="primary">
                View Matches
              </Button>
            </Link>
          </div>

          {matchLoading ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-10 text-center text-text-muted backdrop-blur-xl">
              Loading sponsor matches...
            </div>
          ) : matchError ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
              {matchError}
            </div>
          ) : matches.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {matches.slice(0, 6).map((match, index) => (
                <div
                  key={index}
                  className={`overflow-hidden rounded-[24px] bg-transparent ${
                    index === 0 ? 'border border-accent-orange shadow-glow-orange' : ''
                  }`}
                >
                  {index === 0 && (
                    <div className="bg-accent-orange px-4 py-2 text-center text-xs font-semibold text-black">
                      BEST MATCH
                    </div>
                  )}
                  <SponsorCard sponsor={(match as any).sponsor} matchScore={match.score} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No sponsor matches yet"
              description="Create an event first so Sponexus can recommend relevant sponsors."
              actionLabel="Create Event"
              onAction={() => router.push('/events/create')}
            />
          )}
        </div>
      </div>
    </div>
  );
}