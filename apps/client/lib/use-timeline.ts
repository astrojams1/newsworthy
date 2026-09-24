import { useCallback, useEffect, useRef, useState } from 'react';
import { apiOrigin } from './config';
import { fetchTimeline } from './timeline';

export type Development = { root: number; story: string | null; since: string; score: number; displayed: number; leading: boolean; explanation: string };

/**
 * Refetches whenever the reading changes: a new reading can open a development.
 * Off (the default, see preferences.js), nothing is fetched and nothing shown.
 */
export function useTimeline(enabled: boolean, readingAt: string | undefined) {
  const [developments, setDevelopments] = useState<Development[]>([]);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const next = await fetchTimeline(apiOrigin);
      if (alive.current) setDevelopments(next);
    } catch { /* The timeline is supplementary; the reading stands without it. */ }
  }, []);
  useEffect(() => {
    alive.current = true;
    if (enabled) void load();
    return () => { alive.current = false; };
  }, [load, enabled, readingAt]);
  return enabled ? developments : [];
}
