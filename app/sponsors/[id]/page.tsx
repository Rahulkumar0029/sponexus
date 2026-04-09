'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import Link from 'next/link';

export default function SponsorDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [sponsor, setSponsor] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
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

    const fetchSponsor = async () => {
      if (!params.id) return;

      try {
        const res = await fetch(`/api/sponsors/${params.id}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Sponsor not found');
        }

        setSponsor(data.sponsor);
      } catch (err: any) {
        setError(err.message);
        setSponsor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsor();
  }, [params.id]);

  const categories = useMemo(() => {
    return Array.isArray(sponsor?.preferredCategories)
      ? sponsor.preferredCategories
      : [];
  }, [sponsor]);

  const hasContact = Boolean(
    sponsor?.officialEmail || sponsor?.officialPhone
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading sponsor...
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Sponsor Not Found
          </h2>
          <p className="text-text-muted mb-6">{error}</p>
          <Link href="/sponsors">
            <Button>Browse Sponsors</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-text-muted hover:text-white"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-bold text-white mb-2">
            {sponsor.brandName || 'Sponsor'}
          </h1>

          <p className="text-text-muted">
            Sponsor Profile
          </p>
        </div>

        {/* Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-3">
                About
              </h2>
              <p className="text-text-muted">
                {sponsor.description || 'No description available.'}
              </p>
            </div>

            {/* Categories */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Preferred Categories
              </h3>

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat: string) => (
                    <span
                      key={cat}
                      className="bg-accent-orange/20 text-accent-orange px-3 py-1 rounded-full text-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-sm">
                  No categories added
                </p>
              )}
            </div>

            {/* Audience */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Target Audience
              </h3>
              <p className="text-text-muted">
                {sponsor.targetAudience || 'Not specified'}
              </p>
            </div>

            {/* Location */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Location Preference
              </h3>
              <p className="text-text-muted">
                {sponsor.locationPreference || 'Flexible'}
              </p>
            </div>

            {/* Website */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Website
              </h3>
              {sponsor.website ? (
                <a
                  href={sponsor.website}
                  target="_blank"
                  className="text-accent-orange underline"
                >
                  {sponsor.website}
                </a>
              ) : (
                <p className="text-text-muted text-sm">
                  Not provided
                </p>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Info */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6 space-y-4">
              <div>
                <p className="text-text-muted text-sm">Joined</p>
                <p className="text-white">
                  {sponsor.createdAt
                    ? new Date(sponsor.createdAt).toLocaleDateString()
                    : 'Unknown'}
                </p>
              </div>

              <div>
                <p className="text-text-muted text-sm">Contact</p>
                <p className="text-white text-sm">
                  {hasContact
                    ? sponsor.officialEmail || sponsor.officialPhone
                    : 'Not available'}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Partnership
              </h3>

              <p className="text-text-muted text-sm mb-4">
                This sponsor is open to relevant event collaborations.
              </p>

              <Link href="/events">
                <Button fullWidth>
                  Explore Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}