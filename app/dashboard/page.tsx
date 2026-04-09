'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'ORGANIZER') {
      router.replace('/dashboard/organizer');
    } else {
      router.replace('/dashboard/sponsor');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-text-muted">
      Redirecting to your dashboard...
    </div>
  );
}