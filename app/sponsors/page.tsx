'use client';

import { useEffect, useState } from 'react';
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
      setUser(JSON.parse(storedUser));
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
            <h1 className="text-4xl font-bold text-white mb-2">Explore Sponsors</h1>
            <p className="text-text-muted">
              Discover brands and businesses open to meaningful event partnerships
            </p>
          </div>

          {user?.role === 'SPONSOR' && (
            <Link href="/sponsors/create">
              <Button variant="primary">+ Create Profile</Button>
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
            Loading sponsors...
          </div>
        ) : data?.sponsors && data.sponsors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {data.sponsors.map((sponsor: any) => (
                <SponsorCard key={sponsor._id} sponsor={sponsor} />
              ))}
            </div>

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
            title="No Sponsors Found"
            description="There are no sponsor profiles available yet. Be the first to create one and start discovering event partnerships."
            actionLabel={user?.role === 'SPONSOR' ? 'Create Your Profile' : undefined}
            onAction={
              user?.role === 'SPONSOR'
                ? () => (window.location.href = '/sponsors/create')
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}