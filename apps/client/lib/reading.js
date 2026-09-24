// Validate both server responses and persisted data before putting them on screen.
export function validReading(data) {
  return Boolean(data && Number.isInteger(data.score) && data.score >= 1 && data.score <= 10
    && typeof data.explanation === 'string' && data.explanation.trim().length > 0
    && data.explanation.length <= 2000 && typeof data.created_at === 'string'
    && Number.isFinite(Date.parse(data.created_at)));
}

export function readingSnapshot(value) {
  if (validReading(value)) return { reading: value, fetchedAt: 0 }; // Existing app caches.
  if (validReading(value?.reading) && Number.isFinite(value.fetchedAt) && value.fetchedAt >= 0) return value;
  return null;
}

export function latestSnapshot(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  const difference = Date.parse(candidate.reading.created_at) - Date.parse(current.reading.created_at);
  return difference > 0 || (difference === 0 && candidate.fetchedAt > current.fetchedAt) ? candidate : current;
}

export async function fetchReading(apiBaseUrl, fetcher = fetch) {
  // An explicit controller works across the native and web fetch implementations.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`${apiBaseUrl}/api/current`, {
      cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Reading unavailable (${response.status})`);
    const data = await response.json();
    if (!validReading(data)) throw new Error('Invalid reading');
    return { score: data.score, explanation: data.explanation, created_at: data.created_at,
      ...(typeof data.explanation_text === 'string' && data.explanation_text.length <= 2000
        ? { explanation_text: data.explanation_text, explanation_new: data.explanation_new === true } : {}),
    };
  } finally {
    clearTimeout(timeout);
  }
}
