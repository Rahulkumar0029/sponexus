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
      const organizerReady = Boolean(
        user.organizationName?.trim() &&
          user.eventFocus?.trim() &&
          user.organizerTargetAudience?.trim() &&
          user.organizerLocation?.trim() &&
          user.phone?.trim()
      );

      router.replace(organizerReady ? '/dashboard/organizer' : '/settings');
      return;
    }

    router.replace('/dashboard/sponsor');
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-text-muted">
      Redirecting to your dashboard...
    </div>
  );
}
