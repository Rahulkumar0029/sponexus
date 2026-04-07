'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { SponsorCard } from '@/components/SponsorCard';
import { useMatch } from '@/hooks/useMatch';
import { EventMatchResult, SponsorMatchResult } from '@/types/match';

export default function MatchPage() {
  const [user, setUser] = useState<any>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [noEventMessage, setNoEventMessage] = useState('');
  const { matches, loading, error, findMatches } = useMatch();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setHasLoaded(true);
  }, []);

  const getUserId = () => user?._id ?? user?.id ?? '';

  useEffect(() => {
    const loadMatches = async () => {
      if (!user) return;

      const userId = getUserId();
      if (!userId) return;

      if (user.role === 'SPONSOR') {
        await findMatches({ sponsorOwnerId: userId });
        return;
      }

      const response = await fetch(`/api/events/get?organizer=${userId}&limit=1`);
      const data = await response.json();

      if (data.events?.length > 0) {
        await findMatches({ eventId: data.events[0]._id });
        setNoEventMessage('');
      } else {
        setNoEventMessage('Create your first event to receive sponsor recommendations.');
      }
    };

    loadMatches();
  }, [user, findMatches]);

  const handleRefresh = async () => {
    if (!user) return;

    const userId = getUserId();
    if (!userId) return;

    if (user.role === 'SPONSOR') {
      await findMatches({ sponsorOwnerId: userId });
      return;
    }

    const response = await fetch(`/api/events/get?organizer=${userId}&limit=1`);
    const data = await response.json();

    if (data.events?.length > 0) {
      await findMatches({ eventId: data.events[0]._id });
    }
  };

  if (!hasLoaded) {
    return <div className="section text-center text-text-muted py-20">Loading matching experience...</div>;
  }

  if (!user) {
    return (
      <div className="section">
        <div className="container-custom max-w-2xl">
          <EmptyState
            title="Log in to see your matches"
            description="Sponsors and organizers can discover their best-fit partners once they log in."
            actionLabel="Log In"
            onAction={() => window.location.href = '/login'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container-custom max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 gradient-text">Smart Matching Engine</h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Our rule-based engine connects sponsors and events using budget, category, audience, and location.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="card">
            <div className="text-4xl mb-4">{user.role === 'ORGANIZER' ? '📅' : '🏢'}</div>
            <h3 className="text-xl font-semibold text-text-light mb-3">
              {user.role === 'ORGANIZER' ? 'Step 1: Create an Event' : 'Step 1: Create a Sponsor Profile'}
            </h3>
            <p className="text-text-muted mb-6">
              {user.role === 'ORGANIZER'
                ? 'Provide clear budget, category and audience details so we can recommend the best sponsors for your event.'
                : 'Share your sponsorship goals, preferred categories and location so we can surface the right events.'}
            </p>
            <Link href={user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create'}>
              <Button variant="primary" className="w-full">
                {user.role === 'ORGANIZER' ? 'Create Event' : 'Create Profile'}
              </Button>
            </Link>
          </div>

          <div className="card">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-text-light mb-3">Step 2: Discover Matches</h3>
            <p className="text-text-muted mb-6">
              Click to refresh your recommendations anytime. Scores show how closely each partner aligns with your goals.
            </p>
            <Button variant="secondary" className="w-full" onClick={handleRefresh}>
              {loading ? 'Refreshing Matches...' : user.role === 'ORGANIZER' ? 'Find Sponsors' : 'Find Events'}
            </Button>
          </div>
        </div>

        <div className="card mb-12">
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
              <p className="text-text-muted text-sm">Shared themes and focus areas.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-orange mb-2">20%</div>
              <p className="text-text-light font-medium">Audience</p>
              <p className="text-text-muted text-sm">Target audience overlap.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-orange mb-2">20%</div>
              <p className="text-text-light font-medium">Location</p>
              <p className="text-text-muted text-sm">Same city or strong regional fit.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="card text-center text-red-300 mb-8">
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center text-text-muted py-12">Finding your best matches...</div>
        )}

        {!loading && matches.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {matches.map((match, index) => (
              <div key={`${index}-${match.score}`} className="card p-0 overflow-hidden border border-white/10">
                <div className="bg-dark-base px-6 py-4 flex items-center justify-between gap-4 border-b border-white/10">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-text-muted">{match.quality} Match</p>
                    <p className="text-4xl font-bold text-accent-orange">{match.score}%</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-text-muted text-right">
                    {match.matchedFactors.map((factor) => factor.charAt(0).toUpperCase() + factor.slice(1)).join(' • ')}
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

        {!loading && matches.length === 0 && noEventMessage && (
          <EmptyState
            title="No matches available yet"
            description={noEventMessage}
            actionLabel="Create Event"
            onAction={() => window.location.href = '/events/create'}
          />
        )}

        {!loading && matches.length === 0 && !noEventMessage && !error && (
          <EmptyState
            title="No matches found"
            description={
              user.role === 'ORGANIZER'
                ? 'Create an event with clear budget and target audience details so we can recommend sponsors.'
                : 'Complete your sponsor profile to receive top event recommendations.'
            }
            actionLabel={user.role === 'ORGANIZER' ? 'Create Event' : 'Create Sponsor Profile'}
            onAction={() => window.location.href = user.role === 'ORGANIZER' ? '/events/create' : '/sponsors/create'}
          />
        )}
      </div>
    </div>
  );
}
