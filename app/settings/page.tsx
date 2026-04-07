'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: (user as any).phone || '',
        bio: (user as any).bio || '',
      });
    }
  }, [user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSaving(true);

    try {
      const updatedUser = {
        ...user,
        ...formData,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setStatusMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Unable to save profile information.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !user) {
    return <div className="section py-20 text-center text-text-muted">Loading settings...</div>;
  }

  return (
    <div className="section">
      <div className="container-custom max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-text-muted">Manage your account preferences and security details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card space-y-3 p-5">
              <div>
                <p className="text-sm text-text-muted">Account</p>
                <p className="text-text-light font-semibold text-lg">{user.name}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Role</p>
                <p className="text-text-light font-semibold">{user.role}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Email</p>
                <p className="text-text-light font-semibold">{user.email}</p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full rounded-2xl border border-white/10 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/15 smooth-transition"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="card space-y-6 p-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {statusMessage && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
                  {statusMessage}
                </div>
              )}

              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-text-light">Profile Details</h2>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                  />
                  <Input
                    label="Last Name"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                  />
                </div>

                <Input label="Email" type="email" value={user.email} disabled className="opacity-50" />
                <Input label="Role" type="text" value={user.role} disabled className="opacity-50" />

                <Input
                  label="Phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Your phone number"
                />

                <div>
                  <label className="block text-sm font-medium text-text-light mb-2">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="A short biography or sponsorship summary"
                    className="input-base resize-none h-28"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button type="submit" variant="primary" size="lg" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto">
                    Back to Dashboard
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
