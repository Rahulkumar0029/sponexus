'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { SponsorCard } from '@/components/SponsorCard';
import { useMatch } from '@/hooks/useMatch';
import { EventMatchResult, SponsorMatchResult } from '@/types/match';

type StoredUser = {
  _id?: string;
  id?: string;
  role?: 'ORGANIZER' | 'SPONSOR';
  name?: string;
  firstName?: string;
};

export default function MatchPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [activeSourceLabel, setActiveSourceLabel] = useState('');
  const [pageError, setPageError] = useState('');

  const { matches, loading, error, findMatches } = useMatch();

  const getUserId = useCallback(() => user?._id ?? user?.id ?? '', [user]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      setUser(null);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  const fetchOrganizerEventAndMatch = useCallback(
    async (userId: string) => {
      const response = await fetch(`/api/events/get?organizer=${userId}&limit=1`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load your event data');
      }

      if (data.events?.length > 0) {
        const latestEvent = data.events[0];
        setActiveSourceLabel(latestEvent.title || 'Your latest event');
        setEmptyMessage('');
        await findMatches({ eventId: latestEvent._id });
        return;
      }

      setActiveSourceLabel('');
      setEmptyMessage('Create your first event to receive sponsor recommendations.');
    },
    [findMatches]
  );

  const fetchSponsorMatches = useCallback(
    async (userId: string) => {
      setActiveSourceLabel('Your sponsor profile');
      setEmptyMessage('Create your sponsor profile to receive event recommendations.');
      await findMatches({ sponsorOwnerId: userId });
    },
    [findMatches]
  );

  useEffect(() => {
    const loadMatches = async () => {
      if (!user) return;

      const userId = getUserId();
      if (!userId) {
        setPageError('User session is missing a valid ID.');
        return;
      }

      setPageError('');
      setEmptyMessage('');

      try {
        if (user.role === 'SPONSOR') {
          await fetchSponsorMatches(userId);
          return;
        }

        if (user.role === 'ORGANIZER') {
          await fetchOrganizerEventAndMatch(userId);
          return;
        }

        setPageError('Unsupported account role.');
      } catch (err: any) {
        setPageError(err.message || 'Failed to load matches.');
      }
    };

    loadMatches();
  }, [user, getUserId, fetchOrganizerEventAndMatch, fetchSponsorMatches]);

  const handleRefresh = async () => {
    if (!user) return;

    const userId = getUserId();
    if (!userId) {
      setPageError('User session is missing a valid ID.');
      return;
    }

    setPageError('');

    try {
      if (user.role === 'SPONSOR') {
        await fetchSponsorMatches(userId);
        return;
      }

      if (user.role === 'ORGANIZER') {
        await fetchOrganizerEventAndMatch(userId);
      }
    } catch (err: any) {
      setPageError(err.message || 'Failed to refresh matches.');
    }
  };

  if (!hasLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading matching experience...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen px-4 py-12">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto">
          <EmptyState
            title="Log in to see your matches"
            description="Sponsors and organizers can discover their best-fit partners once they log in."
            actionLabel="Log In"
            onAction={() => router.push('/login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container-custom max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 gradient-text">Smart Matching Engine</h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Sponexus connects sponsors and events using budget, category, audience, and location fit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <div className="text-4xl mb-4">{user.role === 'ORGANIZER' ? '📅' : '🏢'}</div>
            <h3 className="text-xl font-semibold text-text-light mb-3">
              {user.role === 'ORGANIZER' ? 'Step 1: Create an Event' : 'Step 1: Create a Sponsor Profile'}
            </h3>
            <p className="text-text-muted mb-6">
              {user.role === 'ORGANIZER'
                ? 'Add clear budget, category, location, and audience details so we can recommend the right sponsors.'
                : 'Complete your sponsor profile so we can discover the events that best fit your brand goals.'}
            </p>
            <Link href={user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create'}>
              <Button variant="primary" className="w-full">
                {user.role === 'ORGANIZER' ? 'Create Event' : 'Create Profile'}
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-text-light mb-3">Step 2: Discover Matches</h3>
            <p className="text-text-muted mb-6">
              Refresh your recommendations anytime. Scores show how closely each result aligns with your needs.
            </p>
            <Button variant="secondary" className="w-full" onClick={handleRefresh}>
              {loading ? 'Refreshing Matches...' : user.role === 'ORGANIZER' ? 'Find Sponsors' : 'Find Events'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl mb-12">
          <h2 className="text-2xl font-bold mb-6">How We Match</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-orange mb-2">30%</div>
              <p className="text-text-light font-medium">Budget</p>
              <p className="text-text-muted text-sm">Does sponsor funding cover the event target?</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-orange mb-2">30%</div>
              <p className="text-text-light font-medium">Category</p>
              <p className="text-text-muted text-sm">Shared themes and industry alignment.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-orange mb-2">20%</div>
              <p className="text-text-light font-medium">Audience</p>
              <p className="text-text-muted text-sm">Target audience overlap and relevance.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-orange mb-2">20%</div>
              <p className="text-text-light font-medium">Location</p>
              <p className="text-text-muted text-sm">Same city or strong regional fit.</p>
            </div>
          </div>
        </div>

        {activeSourceLabel && !loading && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-text-muted">
            Matching based on: <span className="text-text-light font-semibold">{activeSourceLabel}</span>
          </div>
        )}

        {(pageError || error) && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center text-red-300 mb-8">
            <p>{pageError || error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center text-text-muted py-12">Finding your best matches...</div>
        )}

        {!loading && matches.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {matches.map((match, index) => (
              <div
                key={`${index}-${match.score}`}
                className={`relative rounded-2xl overflow-hidden border bg-white/[0.05] backdrop-blur-xl ${
                  index === 0
                    ? 'border-accent-orange shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                    : 'border-white/10'
                }`}
              >
                {index === 0 && (
                  <div className="absolute top-3 right-3 z-10 bg-accent-orange text-black text-xs px-3 py-1 rounded-full font-semibold">
                    BEST MATCH
                  </div>
                )}

                <div className="bg-dark-base px-6 py-4 flex items-center justify-between gap-4 border-b border-white/10">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-text-muted">{match.quality} Match</p>
                    <p className="text-4xl font-bold text-accent-orange">{match.score}%</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-text-muted text-right">
                    {match.matchedFactors
                      .map((factor) => factor.charAt(0).toUpperCase() + factor.slice(1))
                      .join(' • ')}
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  {user.role === 'ORGANIZER' ? (
                    <SponsorCard
                      sponsor={(match as SponsorMatchResult).sponsor}
                      matchScore={match.score}
                    />
                  ) : (
                    <EventCard
                      event={(match as EventMatchResult).event}
                      matchScore={match.score}
                    />
                  )}

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm font-semibold text-text-light mb-2">Why this match?</p>
                    <p className="text-text-muted text-sm">{match.reason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-text-muted">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs uppercase mb-1">Budget</p>
                      <p className="text-text-light font-semibold">{match.breakdown.budgetScore}%</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs uppercase mb-1">Category</p>
                      <p className="text-text-light font-semibold">{match.breakdown.categoryScore}%</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs uppercase mb-1">Audience</p>
                      <p className="text-text-light font-semibold">{match.breakdown.audienceScore}%</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs uppercase mb-1">Location</p>
                      <p className="text-text-light font-semibold">{match.breakdown.locationScore}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && emptyMessage && (
          <EmptyState
            title="No matches available yet"
            description={emptyMessage}
            actionLabel={user.role === 'ORGANIZER' ? 'Create Event' : 'Create Sponsor Profile'}
            onAction={() => router.push(user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create')}
          />
        )}

        {!loading && matches.length === 0 && !emptyMessage && !error && !pageError && (
          <EmptyState
            title="No matches found"
            description={
              user.role === 'ORGANIZER'
                ? 'Create an event with clear budget and audience details so we can recommend relevant sponsors.'
                : 'Complete your sponsor profile to receive top event recommendations.'
            }
            actionLabel={user.role === 'ORGANIZER' ? 'Create Event' : 'Create Sponsor Profile'}
            onAction={() => router.push(user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create')}
          />
        )}
      </div>
    </div>
  );
}