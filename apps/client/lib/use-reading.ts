import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiOrigin } from './config';
import { fetchReading, validReading } from './reading';

export type Reading = { score: number; explanation: string; created_at: string };
// Match the previous web cache so an upgrade preserves its saved reading.
const key = `newsworthy.current.v1:${apiOrigin}`;
export function useReading() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const current = useRef<Reading | null>(null);
  const busy = useRef(false);
  const alive = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const value = await fetchReading(apiOrigin);
      if (!alive.current) return;
      current.current = value;
      setReading(value); setSaved(false); setFailed(false);
      // Storage failure must not discard a successful network response.
      await AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
    } catch {
      if (alive.current) { setFailed(true); setSaved(Boolean(current.current)); }
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const value = JSON.parse(await AsyncStorage.getItem(key) ?? 'null');
        if (alive.current && !current.current && validReading(value)) {
          current.current = value; setReading(value); setSaved(true);
        }
      } catch { /* Missing or invalid saved data is a normal first launch. */ }
      if (alive.current) void refresh();
    })();
    const active = () => process.env.EXPO_OS === 'web' ? !document.hidden : AppState.currentState === 'active';
    const interval = setInterval(() => { if (active()) void refresh(); }, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    const online = () => { if (active()) void refresh(); };
    if (process.env.EXPO_OS === 'web') {
      window.addEventListener('online', online);
      document.addEventListener('visibilitychange', online);
    }
    return () => {
      alive.current = false; clearInterval(interval); subscription.remove();
      if (process.env.EXPO_OS === 'web') { window.removeEventListener('online', online); document.removeEventListener('visibilitychange', online); }
    };
  }, [refresh]);
  return { reading, saved, failed, loading, refresh };
}
