'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AccessState =
  | 'LOADING'
  | 'ALLOWED'
  | 'DENIED';

export default function PaymentAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>('LOADING');

  /* ===============================
     CHECK ACCESS
  =================================*/
  async function checkAccess() {
    try {
      const res = await fetch('/api/admin/payments/access/session');
      const data = await res.json();

      if (!data.success) {
        setState('DENIED');
        router.replace('/admin/payments/access');
        return;
      }

      const access = data.access;

      if (access.active && !access.requiresVerification) {
        setState('ALLOWED');
        return;
      }

      // Not allowed → redirect
      setState('DENIED');
      router.replace('/admin/payments/access');
    } catch (err) {
      console.error(err);
      setState('DENIED');
      router.replace('/admin/payments/access');
    }
  }

  useEffect(() => {
    checkAccess();
  }, []);

  /* ===============================
     LOADING UI
  =================================*/
  if (state === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <p className="text-[#94A3B8]">Verifying secure access...</p>
      </div>
    );
  }

  /* ===============================
     DENIED (fallback UI)
  =================================*/
  if (state === 'DENIED') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <p className="text-red-400">Access denied. Redirecting...</p>
      </div>
    );
  }

  /* ===============================
     ALLOWED
  =================================*/
  return <>{children}</>;
}