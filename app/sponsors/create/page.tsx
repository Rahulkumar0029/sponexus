'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import Link from 'next/link';

const categories = [
  'Technology',
  'Finance',
  'Health',
  'Entertainment',
  'Sports',
  'Education',
  'Marketing',
  'Sustainability',
];

export default function CreateSponsorPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    brandName: '',
    description: '',
    budget: '',
    preferredCategories: [] as string[],
    targetAudience: '',
    locationPreference: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);

    if (parsed.role !== 'SPONSOR') {
      router.push('/dashboard');
      return;
    }

    setUser(parsed);
  }, [router]);

  const toggleCategory = (cat: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(cat)
        ? prev.preferredCategories.filter((c) => c !== cat)
        : [...prev.preferredCategories, cat],
    }));
  };

  const handleChange = (field: string) => (e: any) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    if (!formData.brandName || !formData.description || !formData.budget) {
      setError('Please fill required fields');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/sponsors/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create profile');
      }

      router.push(`/sponsors/${data.sponsor._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-white p-10">Loading...</div>;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">

      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="w-full max-w-3xl">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">
              Create Sponsor Profile
            </h1>
            <p className="text-text-muted mt-2">
              Showcase your brand and connect with events
            </p>
          </div>

          {error && (
            <div className="mb-6 text-red-400 text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            <Input
              label="Brand Name"
              value={formData.brandName}
              onChange={handleChange('brandName')}
              required
            />

            <textarea
              placeholder="Describe your brand..."
              value={formData.description}
              onChange={handleChange('description')}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white"
              rows={4}
            />

            <Input
              label="Budget"
              placeholder="₹50,000 per event"
              value={formData.budget}
              onChange={handleChange('budget')}
              required
            />

            {/* Categories */}
            <div>
              <h3 className="text-white mb-3">Preferred Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-2 rounded-full text-sm ${
                      formData.preferredCategories.includes(cat)
                        ? 'bg-accent-orange text-black'
                        : 'bg-white/5 border border-white/10 text-text-muted'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Target Audience"
              value={formData.targetAudience}
              onChange={handleChange('targetAudience')}
            />

            <Input
              label="Location Preference"
              value={formData.locationPreference}
              onChange={handleChange('locationPreference')}
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Creating...' : 'Create Profile 🚀'}
              </Button>

              <Link href="/sponsors">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}