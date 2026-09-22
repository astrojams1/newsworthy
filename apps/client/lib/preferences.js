// Settings a person chooses in the app. Shared by the provider, the settings
// screen and the tests, so the rules about what a stored value may be live in
// one place and a corrupted store degrades to the defaults rather than to a
// crash on launch.

/** @typedef {'system' | 'light' | 'dark'} ThemePreference */
/** @typedef {{ enabled: boolean, threshold: number, token: string | null }} NotificationPreferences */
/** @typedef {{ theme: ThemePreference, notifications: NotificationPreferences }} Preferences */

export const THEME_CHOICES = /** @type {const} */ ([
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]);

export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 10;
export const DEFAULT_THRESHOLD = 8;
// What the app offers. Below 5 is most days, which is not a notification
// anyone asked for; the server still accepts the whole scale.
export const THRESHOLD_CHOICES = /** @type {const} */ ([5, 6, 7, 8, 9, 10]);

/** @type {Preferences} */
export const DEFAULT_PREFERENCES = Object.freeze({
  theme: 'system',
  // `token` is this device's push token once registered, kept so turning
  // notifications off can tell the server which row to delete.
  notifications: Object.freeze({ enabled: false, threshold: DEFAULT_THRESHOLD, token: null }),
});

// Versioned like the reading cache, so a future shape change can migrate
// rather than misread.
export const STORAGE_KEY = 'newsworthy.preferences.v1';

/** @param {unknown} value @returns {value is ThemePreference} */
export function validTheme(value) {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** @param {unknown} value @returns {value is number} */
export function validThreshold(value) {
  return Number.isInteger(value) && /** @type {number} */ (value) >= MIN_THRESHOLD && /** @type {number} */ (value) <= MAX_THRESHOLD;
}

/**
 * Read a stored value back, field by field. Anything malformed falls back to
 * its default without taking the well-formed fields with it.
 * @param {unknown} raw the parsed JSON, or the JSON text
 * @returns {Preferences}
 */
export function parsePreferences(raw) {
  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { value = null; }
  }
  const stored = value && typeof value === 'object' ? /** @type {Record<string, unknown>} */ (value) : {};
  const notifications = stored.notifications && typeof stored.notifications === 'object'
    ? /** @type {Record<string, unknown>} */ (stored.notifications) : {};
  return {
    theme: validTheme(stored.theme) ? stored.theme : DEFAULT_PREFERENCES.theme,
    notifications: {
      // Enabled only with a token to send to: a stored "on" with nothing
      // registered would show a switch the server knows nothing about.
      enabled: notifications.enabled === true && typeof notifications.token === 'string' && notifications.token !== '',
      threshold: validThreshold(notifications.threshold) ? notifications.threshold : DEFAULT_THRESHOLD,
      token: typeof notifications.token === 'string' && notifications.token !== '' ? notifications.token : null,
    },
  };
}

/**
 * Whether the app renders dark. The preference wins; "system" defers to the
 * operating system's appearance.
 * @param {ThemePreference} theme
 * @param {boolean} systemDark
 */
export function resolveDark(theme, systemDark) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return systemDark;
}

/** Keep a threshold inside the scale when stepping it. @param {number} value */
export function clampThreshold(value) {
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, Math.round(value)));
}
