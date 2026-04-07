'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import Link from 'next/link';

interface Sponsor {
  _id: string;
  brandName: string;
  description: string;
  budget: string;
  preferredCategories: string[];
  targetAudience: string;
  locationPreference: string;
  ownerId: string;
  createdAt: string;
}

export default function SponsorDetailPage() {
  const params = useParams();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSponsor = async () => {
      if (!params.id) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/sponsors/${params.id}`);
        const result = await response.json();

        if (result.success) {
          setSponsor(result.sponsor);
        } else {
          setError(result.message || 'Sponsor not found');
        }
      } catch (error) {
        setError('Failed to load sponsor details');
      } finally {
        setLoading(false);
      }
    };

    fetchSponsor();
  }, [params.id]);

  if (loading) {
    return (
      <div className="section">
        <div className="container-custom">
          <div className="text-center text-text-muted py-12">Loading sponsor details...</div>
        </div>
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="section">
        <div className="container-custom">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Sponsor Not Found</h1>
            <p className="text-text-muted mb-6">
              {error || 'The sponsor profile you are looking for does not exist.'}
            </p>
            <Link href="/sponsors">
              <Button variant="primary">Browse Sponsors</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/sponsors">
              <Button variant="secondary" className="mb-4">← Back to Sponsors</Button>
            </Link>
            <h1 className="text-4xl font-bold mb-2">{sponsor.brandName}</h1>
            <p className="text-text-muted">
              Sponsor Profile
            </p>
          </div>

          {/* Sponsor Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">About</h2>
                <p className="text-text-muted leading-relaxed">{sponsor.description}</p>
              </div>

              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Sponsorship Details</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Budget Range</h3>
                    <p className="text-text-muted">{sponsor.budget}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Preferred Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {sponsor.preferredCategories.map((category, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Target Audience</h3>
                    <p className="text-text-muted">{sponsor.targetAudience}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Location Preference</h3>
                    <p className="text-text-muted">{sponsor.locationPreference}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Interested in Partnering?</h3>
                <p className="text-text-muted text-sm mb-4">
                  This sponsor is looking for partnership opportunities. Contact them through our platform.
                </p>
                <Button variant="primary" className="w-full" disabled>
                  Contact Sponsor (Coming Soon)
                </Button>
                <p className="text-xs text-text-muted mt-2 text-center">
                  Contact feature will be available soon
                </p>
              </div>

              {/* Meta Info */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Profile Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Joined</span>
                    <span className="text-text-primary">
                      {new Date(sponsor.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}