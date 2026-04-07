'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import Link from 'next/link';

interface FormData {
  brandName: string;
  description: string;
  budget: string;
  preferredCategories: string;
  targetAudience: string;
  locationPreference: string;
}

export default function CreateSponsorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    brandName: '',
    description: '',
    budget: '',
    preferredCategories: '',
    targetAudience: '',
    locationPreference: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.role !== 'SPONSOR') {
        router.push('/sponsors');
      }
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sponsors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          preferredCategories: formData.preferredCategories.split(',').map(cat => cat.trim()).filter(cat => cat),
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/sponsors/${result.sponsor._id}`);
      } else {
        setError(result.message || 'Failed to create sponsor profile');
      }
    } catch (error) {
      setError('An error occurred while creating your profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (!user) {
    return (
      <div className="section">
        <div className="container-custom">
          <div className="text-center text-text-muted py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (user.role !== 'SPONSOR') {
    return (
      <div className="section">
        <div className="container-custom">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-text-muted mb-6">
              Only sponsors can create sponsor profiles.
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Sponsor Profile</h1>
            <p className="text-text-muted">
              Showcase your brand and connect with event organizers
            </p>
          </div>

          {/* Form */}
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Brand Name"
                placeholder="Enter your brand name"
                value={formData.brandName}
                onChange={handleChange('brandName')}
                required
              />

              <Input
                label="Description"
                placeholder="Describe your brand and sponsorship goals"
                value={formData.description}
                onChange={handleChange('description')}
                as="textarea"
                required
              />

              <Input
                label="Budget Range"
                placeholder="e.g., $5,000 - $10,000 per event"
                value={formData.budget}
                onChange={handleChange('budget')}
                required
              />

              <Input
                label="Preferred Categories"
                placeholder="e.g., Technology, Music, Sports (comma-separated)"
                value={formData.preferredCategories}
                onChange={handleChange('preferredCategories')}
                required
              />

              <Input
                label="Target Audience"
                placeholder="Describe your target audience"
                value={formData.targetAudience}
                onChange={handleChange('targetAudience')}
                required
              />

              <Input
                label="Location Preference"
                placeholder="Preferred event locations or regions"
                value={formData.locationPreference}
                onChange={handleChange('locationPreference')}
                required
              />

              {error && (
                <div className="text-red-400 text-sm">{error}</div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="flex-1"
                >
                  Create Profile
                </Button>
                <Link href="/sponsors">
                  <Button variant="secondary" type="button">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}