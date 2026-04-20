'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

type FormErrors = {
  email?: string;
  password?: string;
  general?: string;
};

type LoginResponseUser = {
  _id: string;
  name: string;
  email: string;
  role: 'ORGANIZER' | 'SPONSOR';
  firstName: string;
  lastName: string;
  companyName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  organizationName?: string;
  eventFocus?: string;
  organizerTargetAudience?: string;
  organizerLocation?: string;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  createdAt?: string;
  updatedAt?: string;
};

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your Sponexus account to manage events, sponsorships, and deals.",
};

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors: FormErrors = {};

    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: 'email' | 'password', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      general: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({
          general: data.message || 'Invalid email or password.',
        });
        return;
      }

      const user: LoginResponseUser | undefined = data.user;

      if (!user) {
        setErrors({
          general: 'Login failed. Please try again.',
        });
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));

      if (!user.isEmailVerified) {
        router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
        return;
      }

      if (!user.isProfileComplete) {
        router.push('/settings?completeProfile=1');
        return;
      }

      router.push(
        user.role === 'ORGANIZER'
          ? '/dashboard/organizer'
          : '/dashboard/sponsor'
      );
    } catch (error) {
      setErrors({
        general: 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#020617_0%,#07152f_45%,#020617_100%)]" />

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-24 left-12 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-12 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Login</h1>
            <p className="mt-2 text-sm text-text-muted">
              Access your Sponexus account
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@example.com"
              required
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Enter your password"
              required
              error={errors.password}
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-accent-orange transition hover:text-yellow-400"
              >
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-accent-orange transition hover:text-yellow-400"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}