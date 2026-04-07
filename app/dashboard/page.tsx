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
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { matches, loading: matchLoading, error: matchError, findMatches } = useMatch();
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
          const response = await fetch(`/api/events/get?organizer=${user._id}&limit=6`);
          const data = await response.json();

          if (Array.isArray(data.events) && data.events.length > 0) {
            await findMatches({ eventId: data.events[0]._id });
          }
        } else {
          const result = await findMatches({ sponsorOwnerId: user._id });
          if (result.success && result.matches.length > 0) {
            setSponsorProfile((result.matches[0] as any).sponsor || null);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoadingPage(false);
      }
    };

    loadDashboard();
  }, [user, authLoading, findMatches]);

  if (authLoading || (!user && !authLoading)) {
    return <div className="section py-20 text-center text-text-muted">Loading dashboard...</div>;
  }

  if (!user || !isAuthenticated) {
    return null;
  }

  return (
    <div className="section">
      <div className="container-custom">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-3">
            Welcome back, <span className="gradient-text">{user.firstName || user.name}</span>
          </h1>
          <p className="text-text-muted text-lg max-w-3xl">
            Your premium workspace for building, matching, and managing sponsorships.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-text-light mb-2">
                {user.role === 'ORGANIZER' ? 'Create an Event' : 'Browse Events'}
              </h3>
              <p className="text-text-muted mb-6">
                {user.role === 'ORGANIZER'
                  ? 'Share your next event and attract the best sponsors.'
                  : 'Browse curated events that match your sponsorship goals.'}
              </p>
              <Link href={user.role === 'ORGANIZER' ? '/events/create' : '/events'}>
                <Button variant="primary" className="w-full">
                  {user.role === 'ORGANIZER' ? 'Create Event' : 'Explore Events'}
                </Button>
              </Link>
            </div>

            <div className="card p-6">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-text-light mb-2">Quick Access</h3>
              <p className="text-text-muted mb-6">
                Jump into your workspace, update your profile, or review your matches.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/dashboard">
                  <Button variant="secondary" className="w-full">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" className="w-full">
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-xl font-semibold text-text-light mb-4">Profile Summary</h3>
            {user.role === 'ORGANIZER' ? (
              <div className="space-y-4">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-text-muted">Role</p>
                  <p className="text-text-light font-semibold">Organizer</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-text-muted">Email</p>
                  <p className="text-text-light font-semibold">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-text-muted">Sponsor Name</p>
                  <p className="text-text-light font-semibold">{user.name}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm text-text-muted">Email</p>
                  <p className="text-text-light font-semibold">{user.email}</p>
                </div>
                {sponsorProfile ? (
                  <div className="rounded-3xl bg-white/5 p-5">
                    <p className="text-sm text-text-muted">Budget</p>
                    <p className="text-text-light font-semibold">{sponsorProfile.budget}</p>
                    <p className="text-sm text-text-muted mt-3">Preferred Categories</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sponsorProfile.preferredCategories.map((category) => (
                        <span key={category} className="text-xs text-text-muted bg-white/5 px-3 py-1 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white/5 p-5 text-text-muted">
                    No sponsor profile found yet. Create your profile to receive tailored event matches.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">
              {user.role === 'ORGANIZER' ? 'Suggested Sponsors' : 'Recommended Events'}
            </h2>
            <p className="text-text-muted">Top matches based on your profile and preferences.</p>
          </div>
          <Link href="/match">
            <Button variant="secondary" size="sm">
              View All Matches
            </Button>
          </Link>
        </div>

        {loadingPage || matchLoading ? (
          <div className="card text-center py-12 text-text-muted">Loading recommendations...</div>
        ) : matchError ? (
          <div className="card text-center py-12 text-red-300">{matchError}</div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {matches.slice(0, 6).map((match, idx) => (
              <div key={`${match.score}-${idx}`} className="card p-0 overflow-hidden border border-white/10">
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
            title="No recommendations available"
            description={
              user.role === 'ORGANIZER'
                ? 'Create an event with full budget and audience details to start receiving sponsor suggestions.'
                : 'Set up your sponsor profile to receive event recommendations.'
            }
            actionLabel={user.role === 'ORGANIZER' ? 'Create Event' : 'Create Sponsor Profile'}
            onAction={() => router.push(user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create')}
          />
        )}
      </div>
    </div>
  );
}
