'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useMatch } from '@/hooks/useMatch';

type SponsorProfile = {
  _id?: string;
  brandName?: string;
  preferredCategories?: string[];
  targetAudience?: string;
  locationPreference?: string;
  website?: string;
  officialEmail?: string;
  officialPhone?: string;
};

type MatchedEvent = {
  _id?: string;
  title?: string;
  status?: string;
  startDate?: string;
};

type MatchItem = {
  score: number;
  sponsor?: SponsorProfile;
  event?: MatchedEvent;
};

export default function SponsorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    matches,
    loading: matchLoading,
    error: matchError,
    findMatches,
  } = useMatch();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'SPONSOR') {
      router.replace('/dashboard/organizer');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadSponsorDashboard = async () => {
      if (!user || user.role !== 'SPONSOR') return;

      setProfileLoading(true);
      setProfileError('');

      try {
        const result = await findMatches({ sponsorOwnerId: user._id });

        if (result?.success && result.matches?.length > 0) {
          setSponsorProfile((result.matches[0] as any)?.sponsor || null);
        } else {
          setSponsorProfile(null);
        }
      } catch (err: any) {
        setProfileError(err?.message || 'Unable to load sponsor dashboard data');
      } finally {
        setProfileLoading(false);
      }
    };

    loadSponsorDashboard();
  }, [user, findMatches]);

  const profileCompletion = useMemo(() => {
    if (!sponsorProfile) return 20;

    let score = 20;

    if (sponsorProfile.brandName) score += 20;
    if (sponsorProfile.preferredCategories?.length) score += 20;
    if (sponsorProfile.targetAudience) score += 20;
    if (sponsorProfile.locationPreference) score += 20;
    if (sponsorProfile.website) score += 20;

    return Math.min(score, 100);
  }, [sponsorProfile]);

  const isProfileComplete = profileCompletion >= 80;

  const activeMatches = useMemo(() => {
    const now = new Date();

    return (matches as MatchItem[]).filter((match) => {
      const event = match?.event;
      if (!event) return false;

      const status = event.status?.toUpperCase();

      if (status === 'COMPLETED' || status === 'CANCELLED') {
        return false;
      }

      if (event.startDate) {
        const eventDate = new Date(event.startDate);
        if (!isNaN(eventDate.getTime()) && eventDate < now) {
          return false;
        }
      }

      return true;
    });
  }, [matches]);

  const primaryActionLabel = isProfileComplete
    ? '🚀 Sponsor Now'
    : 'Complete Profile';

  const primaryActionDescription = isProfileComplete
    ? 'Your sponsor profile is ready. Now create your sponsorship post and move toward real event partnerships.'
    : 'Complete your core sponsor details first so Sponexus can unlock better opportunities for you.';

  const handlePrimaryAction = () => {
    if (isProfileComplete) {
      router.push('/sponsorships/create');
    } else {
      router.push('/settings');
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading sponsor dashboard...
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
              Sponsor Workspace
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Welcome back,{' '}
              <span className="gradient-text">{user.firstName || user.name}</span>
            </h1>

            <p className="mt-3 max-w-2xl text-text-muted">
              Discover relevant event opportunities, keep your sponsor details ready,
              and move toward meaningful partnerships.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={handlePrimaryAction}>
              {primaryActionLabel}
            </Button>

            <Link href="/settings">
              <Button variant="secondary">My Sponsor Profile</Button>
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Role</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Sponsor</h3>
            <p className="mt-3 text-sm text-text-muted">
              Your workspace is optimized for event discovery and sponsorship fit.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Profile Completion</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {profileCompletion}%
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Complete only the important profile details to improve matching.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Active Match Count</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {activeMatches.length}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Upcoming event opportunities currently recommended for your profile.
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <p className="mt-2 text-sm text-text-muted">
              Start from the most important things a sponsor needs to do.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">
                {primaryActionLabel}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {primaryActionDescription}
              </p>
              <div className="mt-6">
                <Button variant="primary" fullWidth onClick={handlePrimaryAction}>
                  {primaryActionLabel}
                </Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">
                My Sponsor Profile
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Review your saved sponsor details and update them anytime from your
                settings.
              </p>
              <div className="mt-6">
                <Link href="/settings">
                  <Button variant="secondary" fullWidth>
                    Open Profile
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">View Matches</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                See your smartest recommended upcoming event opportunities based on
                your profile.
              </p>
              <div className="mt-6">
                <Link href="/match">
                  <Button variant="secondary" fullWidth>
                    Open Match Page
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Profile overview */}
        <div className="mb-12 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Profile Overview</h2>
              <p className="mt-2 text-sm text-text-muted">
                These core details are currently powering your recommendations.
              </p>
            </div>

            <Link href="/settings">
              <Button size="sm" variant="secondary">
                {isProfileComplete ? 'Edit Profile' : 'Complete Profile'}
              </Button>
            </Link>
          </div>

          {profileLoading ? (
            <div className="text-text-muted">Loading profile details...</div>
          ) : profileError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {profileError}
            </div>
          ) : sponsorProfile ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Brand</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.brandName || 'Not added'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Target Audience</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.targetAudience || 'Not added'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Location Preference</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.locationPreference || 'Not added'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Website</p>
                <p className="mt-1 break-words font-semibold text-white">
                  {sponsorProfile.website || 'Not added'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Official Email</p>
                <p className="mt-1 break-words font-semibold text-white">
                  {sponsorProfile.officialEmail || 'Not added'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Official Phone</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.officialPhone || 'Not added'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 md:col-span-2 xl:col-span-1">
                <p className="text-sm text-text-muted">Status</p>
                <p className="mt-1 font-semibold text-white">
                  {isProfileComplete ? 'Ready for sponsorship' : 'Needs completion'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-sm text-text-muted">Preferred Categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sponsorProfile.preferredCategories?.length ? (
                    sponsorProfile.preferredCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-light"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      No categories added yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Your sponsor details are incomplete"
              description="Complete only the important sponsor information in settings to unlock stronger event recommendations."
              actionLabel="Complete Profile"
              onAction={() => router.push('/settings')}
            />
          )}
        </div>

        {/* Top event matches */}
        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Top Event Matches</h2>
              <p className="mt-2 text-sm text-text-muted">
                Recommended upcoming event opportunities for your sponsorship preferences.
              </p>
            </div>

            <Link href="/match">
              <Button size="sm" variant="primary">
                View All
              </Button>
            </Link>
          </div>

          {matchLoading ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-10 text-center text-text-muted backdrop-blur-xl">
              Loading event matches...
            </div>
          ) : matchError ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
              {matchError}
            </div>
          ) : activeMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {activeMatches.slice(0, 6).map((match, index) => (
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
                  <EventCard event={(match as any).event} matchScore={match.score} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active event matches yet"
              description="Complete your sponsor settings first so Sponexus can recommend better upcoming event opportunities."
              actionLabel={isProfileComplete ? '🚀 Sponsor Now' : 'Complete Profile'}
              onAction={() =>
                router.push(isProfileComplete ? '/sponsorships/create' : '/settings')
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}