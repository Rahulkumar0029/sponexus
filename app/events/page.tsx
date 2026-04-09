'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';

export default function EventsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError('');

      try {
        let url = `/api/events/get?page=${page}&limit=12&activeOnly=true`;

        // Organizer can see their own events first
        if (user?.role === 'ORGANIZER' && user?._id) {
          url += `&organizer=${user._id}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch events');
        }

        setData(result);
      } catch (err: any) {
        setError(err.message || 'Something went wrong while fetching events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, user]);

  const isOrganizer = user?.role === 'ORGANIZER';
  const isSponsor = user?.role === 'SPONSOR';

  const pageTitle = useMemo(() => {
    if (isOrganizer) return 'My Events';
    return 'Explore Events';
  }, [isOrganizer]);

  const pageDescription = useMemo(() => {
    if (isOrganizer) {
      return 'Manage your active events and keep them ready for sponsor discovery';
    }
    if (isSponsor) {
      return 'Discover active events and find the right sponsorship opportunities';
    }
    return 'Browse active events and explore sponsorship opportunities';
  }, [isOrganizer, isSponsor]);

  const emptyTitle = useMemo(() => {
    if (isOrganizer) return 'No Active Events Yet';
    return 'No Active Events Found';
  }, [isOrganizer]);

  const emptyDescription = useMemo(() => {
    if (isOrganizer) {
      return 'You have not created any active events yet. Start by creating your first event.';
    }
    return 'There are no active events available right now. Check back later.';
  }, [isOrganizer]);

  return (
    <div className="relative min-h-screen px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">{pageTitle}</h1>
            <p className="text-text-muted">{pageDescription}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
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
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center text-red-300">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-text-muted animate-pulse">
            Loading events...
          </div>
        ) : data?.events && data.events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-2 lg:grid-cols-3">
              {data.events.map((event: any) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {data.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ← Previous
                </Button>

                <span className="text-text-muted">
                  Page {page} of {data.pagination.pages}
                </span>

                <Button
                  variant="secondary"
                  disabled={page === data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={isOrganizer ? 'Create First Event' : undefined}
            onAction={isOrganizer ? () => router.push('/events/create') : undefined}
          />
        )}
      </div>
    </div>
  );
}