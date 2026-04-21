"use client";

import { useEffect, useState } from "react";

type SubscriptionState = {
  loading: boolean;
  hasAccess: boolean;
  planCode?: string;
  adminBypass?: boolean;
};

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    hasAccess: false,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/subscriptions/my", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!mounted) return;

        const hasAccess =
          data?.adminBypass ||
          (data?.hasActiveSubscription && data?.plan);

        setState({
          loading: false,
          hasAccess,
          planCode: data?.plan?.code,
          adminBypass: data?.adminBypass,
        });
      } catch {
        if (!mounted) return;

        setState({
          loading: false,
          hasAccess: false,
        });
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}