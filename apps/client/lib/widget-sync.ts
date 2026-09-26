import { requireOptionalNativeModule } from 'expo';
import type { Reading } from './use-reading';
import { validTheme, type ThemePreference } from './preferences';
import { latestSnapshot, readingSnapshot, validReading } from './reading';

const native = requireOptionalNativeModule<{
  syncReading(apiBaseURL: string, payload: string): Promise<void>;
  getReadings?(apiBaseURL: string): string[];
  setAppearance?(appearance: string): Promise<void>;
}>('NewsworthyWidgets');

export function readWidgetSnapshot(apiBaseURL: string): { reading: Reading; fetchedAt: number } | null {
  try {
    let latest = null;
    for (const payload of native?.getReadings?.(apiBaseURL) ?? []) {
      try { latest = latestSnapshot(latest, readingSnapshot(JSON.parse(payload))); }
      catch { /* A damaged cache must not hide another valid snapshot. */ }
    }
    return latest;
  } catch { return null; }
}

export async function syncWidgets(apiBaseURL: string, reading: Reading, fetchedAt: number) {
  if (!validReading(reading)) return;
  try {
    await native?.syncReading(apiBaseURL, JSON.stringify({ reading: {
      score: reading.score, explanation: reading.explanation, created_at: reading.created_at,
      explanation_text: reading.explanation_text, explanation_new: reading.explanation_new,
    }, fetchedAt }));
  } catch { /* A widget failure must not turn a fresh app reading into an error. */ }
}

// The widgets' own appearance. Widgets cannot read the app's store, so the
// choice is handed to the native side, which keeps it where the widget reads.
export async function syncWidgetAppearance(appearance: ThemePreference) {
  if (!validTheme(appearance)) return;
  try { await native?.setAppearance?.(appearance); }
  catch { /* An older native build without the setting keeps following the device. */ }
}
