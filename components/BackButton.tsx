'use client';

import { useRouter } from 'next/navigation';

type BackButtonProps = {
  label?: string;
  className?: string;
};

export default function BackButton({
  label = 'Back',
  className = '',
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 ${className}`}
    >
      <span>←</span>
      <span>{label}</span>
    </button>
  );
}