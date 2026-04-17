'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type BackButtonProps = {
  label?: string;
  className?: string;
  fallback?: string;
};

export default function BackButton({
  label = 'Back',
  className = '',
  fallback,
}: BackButtonProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    // fallback priority
    if (fallback) {
      router.push(fallback);
      return;
    }

    // role-based fallback
    if (user?.role === 'SPONSOR') {
      router.push('/dashboard/sponsor');
    } else if (user?.role === 'ORGANIZER') {
      router.push('/dashboard/organizer');
    } else {
      router.push('/');
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 ${className}`}
    >
      <span>←</span>
      <span>{label}</span>
    </button>
  );
}