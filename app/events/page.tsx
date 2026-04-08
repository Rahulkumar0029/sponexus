'use client';

import { useEffect, useState } from 'react';
import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';

export default function EventsPage() {
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/events/get?page=${page}&limit=12`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch events');
        }

        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page]);

  return (
    <div className="relative min-h-screen px-4 py-12">

      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Explore Events
            </h1>
            <p className="text-text-muted">
              Discover events and find the perfect sponsorship opportunities
            </p>
          </div>

          {user?.role === 'ORGANIZER' && (
            <Link href="/events/create">
              <Button variant="primary">+ Create Event</Button>
            </Link>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-text-muted animate-pulse">
            Loading events...
          </div>
        ) : data?.events && data.events.length > 0 ? (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {data.events.map((event: any) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4">
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
            title="No Events Found"
            description="There are no events available yet. Be the first to create one and attract sponsors."
            actionLabel={
              user?.role === 'ORGANIZER'
                ? 'Create First Event'
                : undefined
            }
            onAction={
              user?.role === 'ORGANIZER'
                ? () => (window.location.href = '/events/create')
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}