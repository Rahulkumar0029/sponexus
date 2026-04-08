'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { EventCard } from '@/components/EventCard';
import { SponsorCard } from '@/components/SponsorCard';
import { EmptyState } from '@/components/EmptyState';
import { useMatch } from '@/hooks/useMatch';
import { useAuth } from '@/hooks/useAuth';
import { Sponsor } from '@/types/sponsor';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { matches, loading: matchLoading, error, findMatches } = useMatch();

  const [sponsorProfile, setSponsorProfile] = useState<Sponsor | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || authLoading) return;

      setLoadingPage(true);

      try {
        if (user.role === 'ORGANIZER') {
          const res = await fetch(`/api/events/get?organizer=${user._id}&limit=1`);
          const data = await res.json();

          if (data.events?.length > 0) {
            await findMatches({ eventId: data.events[0]._id });
          }
        } else {
          const result = await findMatches({ sponsorOwnerId: user._id });

          if (result.success && result.matches.length > 0) {
            setSponsorProfile((result.matches[0] as any).sponsor || null);
          }
        }
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoadingPage(false);
      }
    };

    loadDashboard();
  }, [user, authLoading, findMatches]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading dashboard...
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
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container-custom max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-3">
            Welcome back, <span className="gradient-text">{user.firstName || user.name}</span>
          </h1>
          <p className="text-text-muted text-lg">
            Your smart sponsorship workspace 🚀
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card p-6 flex flex-col justify-between min-h-[190px]">
            <div>
              <h3 className="font-semibold mb-3 text-text-light text-xl">Create</h3>
              <p className="text-sm text-text-muted mb-6">
                {user.role === 'ORGANIZER'
                  ? 'Launch a new event and start attracting the right sponsors.'
                  : 'Set up your sponsor profile and unlock smart event recommendations.'}
              </p>
            </div>
            <Link href={user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create'}>
              <Button variant="primary" fullWidth>
                {user.role === 'ORGANIZER' ? 'Create Event' : 'Sponsor Profile'}
              </Button>
            </Link>
          </div>

          <div className="card p-6 flex flex-col justify-between min-h-[190px]">
            <div>
              <h3 className="font-semibold mb-3 text-text-light text-xl">Explore</h3>
              <p className="text-sm text-text-muted mb-6">
                {user.role === 'ORGANIZER'
                  ? 'Browse sponsor profiles that align with your event goals.'
                  : 'Discover relevant events that match your brand strategy.'}
              </p>
            </div>
            <Link href={user.role === 'ORGANIZER' ? '/sponsors' : '/events'}>
              <Button variant="primary" fullWidth>
                {user.role === 'ORGANIZER' ? 'Browse Sponsors' : 'Browse Events'}
              </Button>
            </Link>
          </div>

          <div className="card p-6 flex flex-col justify-between min-h-[190px]">
            <div>
              <h3 className="font-semibold mb-3 text-text-light text-xl">Matching</h3>
              <p className="text-sm text-text-muted mb-6">
                View your smartest recommendations based on budget, category, audience, and location.
              </p>
            </div>
            <Link href="/match">
              <Button variant="primary" fullWidth>
                View Matches
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="card p-6 mb-12">
          <h2 className="text-xl font-semibold mb-4 text-text-light">Profile Overview</h2>

          {user.role === 'ORGANIZER' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Role</p>
                <p className="text-text-light font-semibold mt-1">Organizer</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Account</p>
                <p className="text-text-light font-semibold mt-1">{user.email}</p>
              </div>
            </div>
          ) : sponsorProfile ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Budget</p>
                <p className="text-text-light font-semibold mt-1">{sponsorProfile.budget}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Categories</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sponsorProfile.preferredCategories.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1 text-xs bg-white/5 rounded-full text-text-light"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 p-4 text-text-muted">
              Create your sponsor profile to start matching with relevant events.
            </div>
          )}
        </div>

        {/* Matches Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-light">Top Matches</h2>
            <p className="text-text-muted text-sm mt-1">
              Your best recommendations based on smart matching
            </p>
          </div>
          <Link href="/match">
            <Button size="sm" variant="primary">
              View All
            </Button>
          </Link>
        </div>

        {/* Matches Content */}
        {loadingPage || matchLoading ? (
          <div className="card text-center py-12 text-text-muted">
            Loading matches...
          </div>
        ) : error ? (
          <div className="card text-center py-12 text-red-300">{error}</div>
        ) : matches.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.slice(0, 6).map((match, i) => (
              <div
                key={i}
                className={`card p-0 overflow-hidden ${
                  i === 0 ? 'border border-accent-orange shadow-glow-orange' : 'border border-white/10'
                }`}
              >
                {i === 0 && (
                  <div className="px-4 py-2 text-xs font-semibold text-black bg-accent-orange text-center">
                    BEST MATCH
                  </div>
                )}

                {user.role === 'ORGANIZER' ? (
                  <SponsorCard sponsor={(match as any).sponsor} matchScore={match.score} />
                ) : (
                  <EventCard event={(match as any).event} matchScore={match.score} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matches yet"
            description="Complete your setup to start seeing recommendations"
            actionLabel={user.role === 'ORGANIZER' ? 'Create Event' : 'Create Profile'}
            onAction={() =>
              router.push(user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create')
            }
          />
        )}
      </div>
    </div>
  );
}