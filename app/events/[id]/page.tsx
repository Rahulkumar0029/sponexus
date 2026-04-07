'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        const data = await response.json();
        if (data.success) {
          setEvent(data.event);
        } else {
          setEvent(null);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return <div className="section text-center text-text-muted">Loading...</div>;
  }

  if (!event) {
    return (
      <div className="section text-center">
        <div className="card py-16">
          <h2 className="text-2xl font-bold text-text-light mb-4">Event Not Found</h2>
          <p className="text-text-muted mb-8">The event you're looking for doesn't exist or has been removed.</p>
          <Link href="/events">
            <Button variant="primary">Browse Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isOwner = user && event.organizerId._id === user._id;

  return (
    <div className="section">
      <div className="container-custom max-w-4xl">
        {/* Hero */}
        {event.image && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-80 object-cover"
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold mb-2">{event.title}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="bg-accent-orange/20 text-accent-orange px-4 py-2 rounded-full text-sm font-medium">
                  {event.eventType}
                </span>
                <span className="bg-accent-orange/20 text-accent-orange px-4 py-2 rounded-full text-sm font-medium">
                  {event.status}
                </span>
              </div>
            </div>
            {isOwner && (
              <Link href={`/events/${event._id}/edit`}>
                <Button variant="secondary">Edit Event</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Description */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <p className="text-text-muted leading-relaxed">{event.description}</p>
            </div>

            {/* Categories & Audience */}
            <div className="card space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-light mb-4">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {event.categories.map((cat: string) => (
                    <span key={cat} className="bg-accent-orange/20 text-accent-orange px-4 py-2 rounded-full text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-text-light mb-4">Target Audience</h3>
                <div className="flex flex-wrap gap-2">
                  {event.targetAudience.map((aud: string) => (
                    <span key={aud} className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm">
                      {aud}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Details */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-light mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-text-muted text-sm">Date</p>
                  <p className="text-text-light font-medium">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-text-muted text-sm">Location</p>
                  <p className="text-text-light font-medium">{event.location}</p>
                </div>
                <div>
                  <p className="text-text-muted text-sm">Budget</p>
                  <p className="text-accent-orange font-bold text-2xl">
                    ${(event.budget / 1000).toFixed(1)}k
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-sm">Expected Attendees</p>
                  <p className="text-text-light font-medium">
                    {event.attendeeCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            {!isOwner && (
              <Link href="/sponsors/create">
                <Button variant="primary" className="w-full">
                  Register as Sponsor
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
