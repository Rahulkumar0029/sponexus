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
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to fetch event');
        }

        setEvent(data.event);
      } catch (err: any) {
        setError(err.message);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading event...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Event Not Found</h2>
          <p className="text-text-muted mb-6">{error || 'Event not available'}</p>
          <Link href="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && event.organizerId?._id === user._id;

  return (
    <div className="relative min-h-screen px-4 py-12">

      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="max-w-6xl mx-auto space-y-10">

        {/* Hero Image */}
        {event.image && (
          <div className="rounded-2xl overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-[350px] object-cover"
            />
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">{event.title}</h1>

          <div className="flex flex-wrap gap-2">
            <span className="bg-accent-orange/20 text-accent-orange px-3 py-1 rounded-full text-sm">
              {event.eventType}
            </span>
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
              {event.status}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-3">About Event</h2>
              <p className="text-text-muted">{event.description}</p>
            </div>

            {/* Categories */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {event.categories.map((cat: string) => (
                  <span key={cat} className="bg-accent-orange/20 text-accent-orange px-3 py-1 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">Target Audience</h3>
              <div className="flex flex-wrap gap-2">
                {event.targetAudience.map((aud: string) => (
                  <span key={aud} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                    {aud}
                  </span>
                ))}
              </div>
            </div>

            {/* Venue Images */}
            {event.venueImagesMeta?.length > 0 && (
              <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
                <h3 className="text-white mb-3 font-semibold">Venue</h3>
                <p className="text-text-muted text-sm">
                  {event.venueImagesMeta.length} venue file(s) uploaded
                </p>
              </div>
            )}

            {/* Past Media */}
            {event.pastEventMediaMeta?.length > 0 && (
              <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
                <h3 className="text-white mb-3 font-semibold">Past Events</h3>
                <p className="text-text-muted text-sm">
                  {event.pastEventMediaMeta.length} media file(s)
                </p>
              </div>
            )}

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6 space-y-4">
              <div>
                <p className="text-text-muted text-sm">Location</p>
                <p className="text-white">{event.location}</p>
              </div>

              <div>
                <p className="text-text-muted text-sm">Budget</p>
                <p className="text-accent-orange text-2xl font-bold">
                  ₹{event.budget.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-text-muted text-sm">Attendees</p>
                <p className="text-white">{event.attendeeCount}</p>
              </div>

              <div>
                <p className="text-text-muted text-sm">Dates</p>
                <p className="text-white">
                  {new Date(event.startDate).toLocaleDateString()} -{' '}
                  {new Date(event.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {!isOwner && (
              <Link href="/sponsors/create">
                <Button fullWidth>Become Sponsor 🚀</Button>
              </Link>
            )}

            {isOwner && (
              <Link href={`/events/${event._id}/edit`}>
                <Button variant="secondary" fullWidth>Edit Event</Button>
              </Link>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}