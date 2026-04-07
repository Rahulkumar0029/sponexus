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
}

export default function SponsorsPage() {
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SponsorsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchSponsors = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/sponsors/get?page=${page}&limit=12`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching sponsors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, [page]);

  return (
    <div className="section">
      <div className="container-custom">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sponsors</h1>
            <p className="text-text-muted">
              Discover potential sponsors and explore partnership opportunities
            </p>
          </div>
          {user?.role === 'SPONSOR' && (
            <Link href="/sponsors/create">
              <Button variant="primary">+ Create Profile</Button>
            </Link>
          )}
        </div>

        {/* Sponsors Grid */}
        {loading ? (
          <div className="text-center text-text-muted py-12">Loading sponsors...</div>
        ) : data?.sponsors && data.sponsors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {data.sponsors.map((sponsor: any) => (
                <SponsorCard key={sponsor._id} sponsor={sponsor} />
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
            title="No Sponsors Found"
            description="There are no sponsor profiles available at the moment. Check back later or create your sponsor profile."
            actionLabel={user?.role === 'SPONSOR' ? 'Create Your Profile' : undefined}
            onAction={user?.role === 'SPONSOR' ? () => window.location.href = '/sponsors/create' : undefined}
          />
        )}
      </div>
    </div>
  );
}