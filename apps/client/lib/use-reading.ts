import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readWidgetSnapshot, syncWidgets } from './widget-sync';
import { onForegroundNotification } from './push';
import { apiOrigin } from './config';
import { fetchReading, latestSnapshot, readingSnapshot } from './reading';

export type Reading = { score: number; explanation: string; created_at: string; explanation_text?: string; explanation_since?: string | null };
// Match the previous web cache so an upgrade preserves its saved reading.
const key = `newsworthy.current.v1:${apiOrigin}`;
export function useReading() {
  const [initial] = useState(() => readWidgetSnapshot(apiOrigin));
  const [reading, setReading] = useState<Reading | null>(initial?.reading ?? null);
  const [saved, setSaved] = useState(Boolean(initial));
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const current = useRef(initial);
  const busy = useRef(false);
  const alive = useRef(false);
  const adoptWidget = useCallback(() => {
    const next = latestSnapshot(current.current, readWidgetSnapshot(apiOrigin));
    if (next !== current.current) {
      current.current = next;
      setReading(next.reading); setSaved(true);
    }
  }, []);
  const refresh = useCallback(async () => {
    // Read the native cache synchronously, even while an older request is pending.
    adoptWidget();
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const fetchedAt = Date.now();
      const value = await fetchReading(apiOrigin);
      if (!alive.current) return;
      adoptWidget();
      const next = latestSnapshot(current.current, { reading: value, fetchedAt });
      current.current = next;
      setReading(next.reading); setSaved(false); setFailed(false);
      void syncWidgets(apiOrigin, next.reading, next.fetchedAt);
      // Storage failure must not discard a successful network response.
      await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
    } catch {
      if (alive.current) { setFailed(true); setSaved(Boolean(current.current)); }
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  }, [adoptWidget]);
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const value = readingSnapshot(JSON.parse(await AsyncStorage.getItem(key) ?? 'null'));
        if (alive.current) {
          const next = latestSnapshot(latestSnapshot(current.current, value), readWidgetSnapshot(apiOrigin));
          if (next !== current.current) {
            current.current = next; setReading(next.reading); setSaved(true);
          }
        }
      } catch { /* Missing or invalid saved data is a normal first launch. */ }
      if (alive.current) void refresh();
    })();
    const active = () => process.env.EXPO_OS === 'web' ? !document.hidden : AppState.currentState === 'active';
    const interval = setInterval(() => { if (active()) void refresh(); }, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    const online = () => { if (active()) void refresh(); };
    // A notification arriving while the app is open refreshes the reading it
    // announces instead of interrupting with a banner.
    const notified = onForegroundNotification(() => { if (active()) void refresh(); });
    if (process.env.EXPO_OS === 'web') {
      window.addEventListener('online', online);
      document.addEventListener('visibilitychange', online);
    }
    return () => {
      alive.current = false; clearInterval(interval); subscription.remove(); notified();
      if (process.env.EXPO_OS === 'web') { window.removeEventListener('online', online); document.removeEventListener('visibilitychange', online); }
    };
  }, [refresh]);
  return { reading, saved, failed, loading, refresh };
}
