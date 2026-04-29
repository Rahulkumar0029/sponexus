'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { validateRegistration } from '@/lib/validations';



export default function RegisterClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    role: 'ORGANIZER' as 'ORGANIZER' | 'SPONSOR',
  });

  const updateRole = (role: 'ORGANIZER' | 'SPONSOR') => {
    setFormData((prev) => ({ ...prev, role }));

    if (fieldErrors.role) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.role;
        return next;
      });
    }

    if (generalError) setGeneralError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    const validation = validateRegistration(formData);

    if (!validation.isValid) {
      const errors: { [key: string]: string } = {};

      validation.errors.forEach((err) => {
        errors[err.field] = err.message;
      });

      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const errors: { [key: string]: string } = {};

          data.errors.forEach((err: { field: string; message: string }) => {
            errors[err.field] = err.message;
          });

          setFieldErrors(errors);
        } else {
          setGeneralError(data.message || 'Registration failed.');
        }
        return;
      }

      router.push(
  `/verify-email?email=${encodeURIComponent(
    formData.email.trim().toLowerCase()
  )}&from=register`
);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setGeneralError(err.message || 'Something went wrong.');
      } else {
        setGeneralError('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Create Account
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Join Sponexus and start smart matching
            </p>
          </div>

          {/* General Error */}
          {generalError && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="mb-3 block text-sm font-medium text-text-light">
                I am joining as
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateRole('ORGANIZER')}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    formData.role === 'ORGANIZER'
                      ? 'border-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black shadow-[0_8px_30px_rgba(245,158,11,0.25)]'
                      : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-accent-orange hover:text-white'
                  }`}
                >
                  Event Organizer
                </button>

                <button
                  type="button"
                  onClick={() => updateRole('SPONSOR')}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    formData.role === 'SPONSOR'
                      ? 'border-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 text-black shadow-[0_8px_30px_rgba(245,158,11,0.25)]'
                      : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-accent-orange hover:text-white'
                  }`}
                >
                  Sponsor / Business
                </button>
              </div>

              {fieldErrors.role && (
                <p className="mt-2 text-sm text-red-300">{fieldErrors.role}</p>
              )}
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={fieldErrors.firstName}
                placeholder="John"
                required
              />

              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={fieldErrors.lastName}
                placeholder="Doe"
                required
              />
            </div>

            {/* Company */}
            <Input
              label="Company / Organization"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              error={fieldErrors.companyName}
              placeholder="Your company or brand"
              required
            />

            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={fieldErrors.email}
              placeholder="you@example.com"
              required
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password}
              placeholder="••••••••"
              required
            />

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={fieldErrors.confirmPassword}
              placeholder="••••••••"
              required
            />

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-accent-orange transition hover:text-yellow-400"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}