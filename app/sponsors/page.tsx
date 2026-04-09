'use client';

import { useEffect, useMemo, useState } from 'react';
import { SponsorCard } from '@/components/SponsorCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';

interface SponsorsResponse {
  success: boolean;
  sponsors: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
}

export default function SponsorsPage() {
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SponsorsResponse | null>(null);
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
    const fetchSponsors = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/sponsors/get?page=${page}&limit=12`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch sponsors');
        }

        setData(result);
      } catch (err: any) {
        setError(err.message || 'Something went wrong while loading sponsors');
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, [page]);

  const isSponsor = user?.role === 'SPONSOR';
  const isOrganizer = user?.role === 'ORGANIZER';

  const sponsorProfileComplete = useMemo(() => {
    if (!isSponsor || !user) return false;

    return !!(
      user.brandName &&
      Array.isArray(user.preferredCategories) &&
      user.preferredCategories.length > 0 &&
      user.officialPhone
    );
  }, [isSponsor, user]);

  const pageTitle = useMemo(() => {
    if (isOrganizer) return 'Explore Sponsors';
    if (isSponsor) return 'Sponsor Directory';
    return 'Explore Sponsors';
  }, [isOrganizer, isSponsor]);

  const pageDescription = useMemo(() => {
    if (isOrganizer) {
      return 'Discover brands and businesses open to meaningful event partnerships';
    }

    if (isSponsor) {
      return 'Browse sponsor profiles and manage your own sponsor presence on Sponexus';
    }

    return 'Discover brands and businesses open to meaningful event partnerships';
  }, [isOrganizer, isSponsor]);

  const sponsorActionLabel = useMemo(() => {
    if (!isSponsor) return '';
    return sponsorProfileComplete ? 'My Sponsor Profile' : 'Complete Profile';
  }, [isSponsor, sponsorProfileComplete]);

  const sponsorActionHref = sponsorProfileComplete ? '/settings' : '/settings';

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
              <Link href="/match">
                <Button variant="secondary">View Matches</Button>
              </Link>
            )}

            {isSponsor && (
              <Link href={sponsorActionHref}>
                <Button variant="primary">{sponsorActionLabel}</Button>
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
            Loading sponsors...
          </div>
        ) : data?.sponsors && data.sponsors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-2 lg:grid-cols-3">
              {data.sponsors.map((sponsor: any) => (
                <SponsorCard key={sponsor._id} sponsor={sponsor} />
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
            title={isSponsor ? 'No Sponsors Visible Yet' : 'No Sponsors Found'}
            description={
              isSponsor
                ? 'Sponsor profiles will appear here as more brands complete their details on Sponexus.'
                : 'There are no sponsor profiles available yet. Check back later as more brands join the platform.'
            }
            actionLabel={isSponsor ? sponsorActionLabel : undefined}
            onAction={
              isSponsor
                ? () => {
                    window.location.href = sponsorActionHref;
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}