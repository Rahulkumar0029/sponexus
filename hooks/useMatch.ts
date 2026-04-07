'use client';

import { useState, useCallback } from 'react';
import { EventMatchResult, SponsorMatchResult } from '@/types/match';

interface FindMatchesParams {
  sponsorId?: string;
  sponsorOwnerId?: string;
  eventId?: string;
}

type MatchResult = EventMatchResult | SponsorMatchResult;

export function useMatch() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async (params: FindMatchesParams) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params.sponsorId) searchParams.append('sponsorId', params.sponsorId);
      if (params.sponsorOwnerId) searchParams.append('sponsorOwnerId', params.sponsorOwnerId);
      if (params.eventId) searchParams.append('eventId', params.eventId);

      const response = await fetch(`/api/match?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data?.message || 'Failed to load match results';
        setError(message);
        setMatches([]);
        return { success: false, message, matches: [] as MatchResult[] };
      }

      const loadedMatches: MatchResult[] = data.matches || [];
      setMatches(loadedMatches);
      return { success: true, matches: loadedMatches };
    } catch (err: any) {
      const message = err?.message || 'Unexpected error loading matches';
      setError(message);
      setMatches([]);
      return { success: false, message, matches: [] as MatchResult[] };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    matches,
    loading,
    error,
    findMatches,
  };
}
