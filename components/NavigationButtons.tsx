'use client';

import { useRouter } from 'next/navigation';

type NavigationButtonsProps = {
  className?: string;
};

export default function NavigationButtons({
  className = '',
}: NavigationButtonsProps) {
  const router = useRouter();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        ← Back
      </button>

      <button
        type="button"
        onClick={() => router.forward()}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Forward →
      </button>
    </div>
  );
}