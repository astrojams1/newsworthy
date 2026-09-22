import { requireOptionalNativeModule } from 'expo';
import type { Reading } from './use-reading';
import { latestSnapshot, readingSnapshot, validReading } from './reading';

const native = requireOptionalNativeModule<{
  syncReading(apiBaseURL: string, payload: string): Promise<void>;
  getReadings?(apiBaseURL: string): string[];
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
      explanation_text: reading.explanation_text, explanation_since: reading.explanation_since,
    }, fetchedAt }));
  } catch { /* A widget failure must not turn a fresh app reading into an error. */ }
}
