// app-standard: rating
// rating.ts
// The shared "ask for a rating" rule for Expo, React Native and Capacitor apps (references/standards.md in the
// app-release skill). Copy this file into the app and call ratingGoodMoment right after a good moment: a finished
// round, a saved entry, a completed set. Never at launch, in the middle of a task or after an error. In a Kids Category
// app, call it only from a screen behind the parental gate. It imports nothing; the screen passes the platform's calls.
//
// Expo (expo-store-review, AsyncStorage):
//   ratingGoodMoment(Application.nativeApplicationVersion || '?', {
//     read: () => AsyncStorage.getItem(RATING_STORAGE_KEY), write: text => AsyncStorage.setItem(RATING_STORAGE_KEY, text),
//     requestReview: async () => { if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview(); } });
//
// Capacitor (@capacitor-community/in-app-review, Preferences): `read` and `write` use Preferences.get and
// Preferences.set, and `requestReview` calls InAppReview.requestReview(). In a browser build pass no requestReview.
//
// Only the store's own prompt is used. There is no screen of the app's own in front of it and no reward for rating
// (App Review Guideline 5.6.1; Google Play's in-app review rules). The store decides whether the prompt appears.
// Nothing leaves the device: the counts live in the app's own storage.
// Written without optional chaining or nullish coalescing, which some of the app repositories ban, so the copy stays unchanged.

export const RATING_STORAGE_KEY = 'app-standard.rating.state';

export type RatingPolicy = {
  // Good moments needed before the first ask.
  momentsNeeded: number;
  // Different days those moments must fall on.
  daysNeeded: number;
  // Days to wait after an ask before asking again, and then only in a newer version.
  daysBetweenAsks: number;
};

export const RATING_POLICY: RatingPolicy = { momentsNeeded: 3, daysNeeded: 2, daysBetweenAsks: 90 };

export type RatingState = {
  moments: number;
  // Distinct local days (yyyy-mm-dd) with a good moment, oldest first.
  days: string[];
  // Milliseconds since 1970, or null before the first ask.
  lastAsk: number | null;
  lastAskVersion: string | null;
};

export type RatingPlatform = {
  read: () => Promise<string | null>;
  write: (text: string) => Promise<unknown>;
  // The store's own prompt. Leave it out where there is no store (a browser build).
  requestReview?: () => Promise<unknown>;
};

export const emptyRatingState = (): RatingState => ({ moments: 0, days: [], lastAsk: null, lastAskVersion: null });

export function ratingDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The state after one more good moment.
export function ratingRecord(state: RatingState, now: Date, policy: RatingPolicy = RATING_POLICY): RatingState {
  const today = ratingDay(now);
  const days = state.days.includes(today) ? state.days : [...state.days, today];
  return { ...state, moments: state.moments + 1, days: days.slice(-policy.daysNeeded) };
}

// Whether to ask now: enough good moments on enough days, never twice for one version, never within the wait.
export function ratingShouldAsk(state: RatingState, version: string, now: Date, policy: RatingPolicy = RATING_POLICY): boolean {
  if (state.moments < policy.momentsNeeded || state.days.length < policy.daysNeeded) return false;
  if (state.lastAskVersion === version) return false;
  if (state.lastAsk !== null && now.getTime() - state.lastAsk < policy.daysBetweenAsks * 86_400_000) return false;
  return true;
}

export function parseRatingState(text: string | null): RatingState {
  try {
    const value = JSON.parse(text === null ? '' : text);
    if (value && typeof value.moments === 'number' && Array.isArray(value.days)) {
      return { moments: value.moments, days: value.days.map(String), lastAsk: typeof value.lastAsk === 'number' ? value.lastAsk : null,
        lastAskVersion: typeof value.lastAskVersion === 'string' ? value.lastAskVersion : null };
    }
  } catch { /* nothing stored yet, or not ours: start again */ }
  return emptyRatingState();
}

// Records a good moment and, when one is due, asks through the store's own prompt. Resolves true when it asked.
// A failure to read, write or ask never reaches the user: the moment is simply not counted.
export async function ratingGoodMoment(version: string, platform: RatingPlatform, now: Date = new Date(), policy: RatingPolicy = RATING_POLICY): Promise<boolean> {
  try {
    let state = ratingRecord(parseRatingState(await platform.read()), now, policy);
    const ask = Boolean(platform.requestReview) && ratingShouldAsk(state, version, now, policy);
    // After asking the count starts again, so the next ask also follows fresh good moments.
    if (ask) state = { moments: 0, days: [], lastAsk: now.getTime(), lastAskVersion: version };
    await platform.write(JSON.stringify(state));
    if (ask) await platform.requestReview!();
    return ask;
  } catch {
    return false;
  }
}
