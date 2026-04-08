'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import Link from 'next/link';

export default function SponsorDetailPage() {
  const params = useParams();

  const [sponsor, setSponsor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
          <h2 className="text-2xl font-bold text-white mb-4">Sponsor Not Found</h2>
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
          <Link href="/sponsors">
            <Button variant="secondary" className="mb-4">
              ← Back
            </Button>
          </Link>

          <h1 className="text-4xl font-bold text-white mb-2">
            {sponsor.brandName}
          </h1>

          <p className="text-text-muted">Sponsor Profile</p>
        </div>

        {/* Grid */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-3">
                About
              </h2>
              <p className="text-text-muted">
                {sponsor.description}
              </p>
            </div>

            {/* Categories */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Preferred Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {sponsor.preferredCategories.map((cat: string) => (
                  <span
                    key={cat}
                    className="bg-accent-orange/20 text-accent-orange px-3 py-1 rounded-full text-sm"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Target Audience
              </h3>
              <p className="text-text-muted">
                {sponsor.targetAudience}
              </p>
            </div>

            {/* Location */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-white mb-3 font-semibold">
                Location Preference
              </h3>
              <p className="text-text-muted">
                {sponsor.locationPreference}
              </p>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6 space-y-4">

              <div>
                <p className="text-text-muted text-sm">Budget</p>
                <p className="text-accent-orange text-2xl font-bold">
                  {sponsor.budget}
                </p>
              </div>

              <div>
                <p className="text-text-muted text-sm">Joined</p>
                <p className="text-white">
                  {new Date(sponsor.createdAt).toLocaleDateString()}
                </p>
              </div>

            </div>

            <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Interested in Partnering?
              </h3>

              <p className="text-text-muted text-sm mb-4">
                This sponsor is open for collaboration with relevant events.
              </p>

              <Button fullWidth disabled>
                Contact Sponsor 🚀
              </Button>

              <p className="text-xs text-text-muted mt-2 text-center">
                Feature coming soon
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}