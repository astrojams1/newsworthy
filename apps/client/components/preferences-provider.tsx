import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, STORAGE_KEY, parsePreferences, type Preferences, type ThemePreference } from '@/lib/preferences';
import { createSubscriptionController } from '@/lib/subscription';
import { disablePush, enablePush, updatePushThreshold } from '@/lib/push';
import { syncWidgetAppearance } from '@/lib/widget-sync';

type Notifications = Preferences['notifications'];
type PreferencesValue = {
  preferences: Preferences;
  // False until the stored value has been read, so the first paint cannot
  // flash the default theme over a chosen one and then switch.
  loaded: boolean;
  savingNotifications: boolean;
  setTheme(theme: ThemePreference): void;
  setWidgetTheme(theme: ThemePreference): void;
  setNotifications(update: Partial<Notifications>): void;
  setTimeline(on: boolean): void;
  // The device's registration, serialised here rather than on the settings
  // screen: a screen can be closed with a request in flight and reopened with
  // a fresh queue, and the provider is the thing that lives as long as the app.
  subscription: ReturnType<typeof createSubscriptionController>;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
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
  const setWidgetTheme = useCallback((widgetTheme: ThemePreference) => save({ ...current.current, widgetTheme }), [save]);
  // Handed over once the stored choice is known and again on every change, so
  // a widget installed before the app last ran still gets the chosen look.
  useEffect(() => { if (loaded) void syncWidgetAppearance(preferences.widgetTheme); }, [loaded, preferences.widgetTheme]);
  const setNotifications = useCallback((update: Partial<Notifications>) =>
    save({ ...current.current, notifications: { ...current.current.notifications, ...update } }), [save]);
  const setTimeline = useCallback((timeline: boolean) => save({ ...current.current, timeline }), [save]);
  const subscription = useMemo(() => createSubscriptionController({
    read: () => current.current.notifications,
    write: setNotifications,
    onPendingChange: setSavingNotifications,
    api: { enablePush, disablePush, updatePushThreshold },
  }), [setNotifications]);
  return <PreferencesContext value={{ preferences, loaded, savingNotifications, setTheme, setWidgetTheme, setNotifications, setTimeline, subscription }}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const value = use(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider is required');
  return value;
}
