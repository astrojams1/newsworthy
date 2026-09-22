import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, STORAGE_KEY, parsePreferences, type Preferences, type ThemePreference } from '@/lib/preferences';

type Notifications = Preferences['notifications'];
type PreferencesValue = {
  preferences: Preferences;
  // False until the stored value has been read, so the first paint cannot
  // flash the default theme over a chosen one and then switch.
  loaded: boolean;
  setTheme(theme: ThemePreference): void;
  setNotifications(update: Partial<Notifications>): void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(preferences);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = parsePreferences(await AsyncStorage.getItem(STORAGE_KEY));
        if (alive) { current.current = stored; setPreferences(stored); }
      } catch { /* A missing or unreadable store is a first launch. */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);
  const save = useCallback((next: Preferences) => {
    current.current = next;
    setPreferences(next);
    // A storage failure keeps the choice for this session and nothing more.
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);
  const setTheme = useCallback((theme: ThemePreference) => save({ ...current.current, theme }), [save]);
  const setNotifications = useCallback((update: Partial<Notifications>) =>
    save({ ...current.current, notifications: { ...current.current.notifications, ...update } }), [save]);
  return <PreferencesContext value={{ preferences, loaded, setTheme, setNotifications }}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const value = use(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider is required');
  return value;
}
