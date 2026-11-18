import { Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as StoreReview from 'expo-store-review';
import { RATING_STORAGE_KEY, ratingGoodMoment } from '@/lib/rating';

// Newsworthy's good moment for the shared rating rule (lib/rating.ts): the reader shared a reading and the share
// went through. Only the iPhone and iPad app asks, through the App Store's own prompt; Android never asks.
//
// Launch arguments (read from the iOS argument domain): `-uiTest 1` or `-uiTestReset 1` clears the stored state and
// never asks, so tours, store captures and reel recordings cannot reach the prompt. `-ratingDue 1` in a development
// build seeds a state one share from due, to check the prompt appears.
let seeded = false;

export async function ratingAfterShare(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    if (Settings.get('uiTest') || Settings.get('uiTestReset')) {
      await AsyncStorage.removeItem(RATING_STORAGE_KEY);
      return false;
    }
    if (__DEV__ && Settings.get('ratingDue') && !seeded) {
      seeded = true;
      const yesterday = new Date(Date.now() - 86_400_000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const day = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
      await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify({ moments: 2, days: [day], lastAsk: null, lastAskVersion: null }));
    }
    return await ratingGoodMoment(Application.nativeApplicationVersion || '?', {
      read: () => AsyncStorage.getItem(RATING_STORAGE_KEY),
      write: text => AsyncStorage.setItem(RATING_STORAGE_KEY, text),
      requestReview: async () => { if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview(); },
    });
  } catch {
    return false;
  }
}
