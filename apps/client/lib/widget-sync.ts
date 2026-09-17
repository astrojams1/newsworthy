import { requireOptionalNativeModule } from 'expo';
import type { Reading } from './use-reading';
import { validReading } from './reading';

const native = requireOptionalNativeModule<{
  syncReading(apiBaseURL: string, payload: string): Promise<void>;
}>('NewsworthyWidgets');

export async function syncWidgets(apiBaseURL: string, reading: Reading, fetchedAt: number) {
  if (!validReading(reading)) return;
  try {
    await native?.syncReading(apiBaseURL, JSON.stringify({ reading: {
      score: reading.score, explanation: reading.explanation, created_at: reading.created_at,
    }, fetchedAt }));
  } catch { /* A widget failure must not turn a fresh app reading into an error. */ }
}
