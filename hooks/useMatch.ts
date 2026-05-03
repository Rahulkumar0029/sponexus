"use client";

import { useCallback, useState } from "react";
import {
  EventMatchResult,
  SponsorshipMatchResult,
  MatchWeights,
  MatchMode,
} from "@/types/match";

interface FindMatchesParams {
  sponsorshipId?: string;
  eventId?: string;
  mode?: MatchMode;
  weights?: MatchWeights;
}

type MatchResult = EventMatchResult | SponsorshipMatchResult;

interface FindMatchesResponse {
  success: boolean;
  message?: string;
  matches: MatchResult[];
  mode?: MatchMode;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  category: 20,
  audience: 20,
  location: 20,
  budget: 20,
  deliverables: 20,
};

export function useMatch() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetMatches = useCallback(() => {
    setMatches([]);
    setError(null);
  }, []);

  const findMatches = useCallback(async (params: FindMatchesParams) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        sponsorshipId: params.sponsorshipId,
        eventId: params.eventId,
        mode: params.mode,
        weights: params.weights || DEFAULT_WEIGHTS,
      };

      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data?.message || "Failed to load match results";
        setError(message);
        setMatches([]);

        return {
          success: false,
          message,
          matches: [] as MatchResult[],
        } satisfies FindMatchesResponse;
      }

      const loadedMatches: MatchResult[] = Array.isArray(data.matches)
        ? data.matches
        : [];

      setMatches(loadedMatches);

      return {
        success: true,
        matches: loadedMatches,
        mode: data.mode,
      } satisfies FindMatchesResponse;
    } catch (err: any) {
      const message = err?.message || "Unexpected error loading matches";
      setError(message);
      setMatches([]);

      return {
        success: false,
        message,
        matches: [] as MatchResult[],
      } satisfies FindMatchesResponse;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    matches,
    loading,
    error,
    findMatches,
    resetMatches,
    defaultWeights: DEFAULT_WEIGHTS,
  };
}