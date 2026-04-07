'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong');
      } else {
        setMessage('If this email exists, a reset link has been generated.');
      }
    } catch (err) {
      setError('Server error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#020617_0%,#07152f_45%,#020617_100%)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl sm:p-10">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
            <p className="mt-2 text-sm text-text-muted">
              Enter your email to receive a reset link
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-accent-orange hover:text-yellow-400 transition"
            >
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}