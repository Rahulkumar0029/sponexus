'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { validateLogin } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

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

    const validation = validateLogin(formData);
    if (!validation.isValid) {
      const errors: { [key: string]: string } = {};
      validation.errors.forEach((error) => {
        errors[error.field] = error.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (!result || result.error) {
        setGeneralError(result?.error || 'Invalid email or password.');
        return;
      }

      const session = await getSession();

      if (!session?.user) {
        setGeneralError('Login failed. Please try again.');
        return;
      }

      const user = {
        _id: (session.user as any).id || '',
        name: session.user.name || '',
        email: session.user.email || '',
        role: (session.user as any).role || '',
        firstName: session.user.name?.split(' ')[0] || '',
        lastName: session.user.name?.split(' ')[1] || '',
      };

      localStorage.setItem('user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (err: any) {
      setGeneralError(err?.message || 'Something went wrong.');
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
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Sign in to your Sponexus account
            </p>
          </div>

          {/* Error */}
          {generalError && (
            <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {generalError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={fieldErrors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              error={fieldErrors.password}
              required
            />

            {/* Row */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-text-muted hover:text-text-light transition cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-dark-base border border-white/10 accent-accent-orange"
                />
                Remember me
              </label>

              <Link
                href="/forgot-password"
                className="text-accent-orange hover:text-yellow-400 transition font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Signing in' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-accent-orange font-medium hover:text-yellow-400 transition"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}