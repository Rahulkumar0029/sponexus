'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError(null);
    setStatusMessage(null);
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
      setError(err?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-text-muted">
            Manage your account information and profile details.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Account Card */}
          <div className="h-fit rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="mb-5 text-xl font-semibold text-white">Account</h2>

            <div className="space-y-5">
              <div>
                <p className="text-sm text-text-muted">Name</p>
                <p className="mt-1 font-semibold text-white">{user.name}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Role</p>
                <p className="mt-1 font-semibold text-white">{user.role}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Email</p>
                <p className="mt-1 break-words font-semibold text-white">{user.email}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </Button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Profile Details</h2>
              <p className="mt-2 text-sm text-text-muted">
                Update your personal information shown inside your workspace.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="mb-5 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
                {statusMessage}
              </div>
            )}

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />

                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </div>

              <Input label="Email" value={user.email} disabled />

              <Input label="Role" value={user.role} disabled />

              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Your phone number"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-accent-orange/50 focus:ring-1 focus:ring-accent-orange/30 h-36"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button type="submit" fullWidth disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFormData({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    phone: (user as any).phone || '',
                    bio: (user as any).bio || '',
                  });
                  setError(null);
                  setStatusMessage(null);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}