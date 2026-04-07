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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/events/get?page=${page}&limit=12`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page]);

  return (
    <div className="section">
      <div className="container-custom">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Events</h1>
            <p className="text-text-muted">
              Explore upcoming events and find sponsorship opportunities
            </p>
          </div>
          {user?.role === 'ORGANIZER' && (
            <Link href="/events/create">
              <Button variant="primary">+ Create Event</Button>
            </Link>
          )}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center text-text-muted py-12">Loading events...</div>
        ) : data?.events && data.events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {data.events.map((event: any) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.pages > 1 && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ← Previous
                </Button>
                <span className="text-text-muted flex items-center px-4">
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
            description="There are no events available at the moment. Check back later or create your first event."
            actionLabel={user?.role === 'ORGANIZER' ? 'Create Your First Event' : undefined}
            onAction={user?.role === 'ORGANIZER' ? () => window.location.href = '/events/create' : undefined}
          />
        )}
      </div>
    </div>
  );
}
