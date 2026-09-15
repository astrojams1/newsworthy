// Validate both server responses and persisted data before putting them on screen.
export function validReading(data) {
  return Boolean(data && Number.isInteger(data.score) && data.score >= 1 && data.score <= 10
    && typeof data.explanation === 'string' && data.explanation.trim().length > 0
    && data.explanation.length <= 2000 && typeof data.created_at === 'string'
    && Number.isFinite(Date.parse(data.created_at)));
}

export async function fetchReading(apiBaseUrl, fetcher = fetch) {
  // AbortSignal.timeout is missing from older supported iOS WebViews.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`${apiBaseUrl}/api/current`, {
      cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Reading unavailable (${response.status})`);
    const data = await response.json();
    if (!validReading(data)) throw new Error('Invalid reading');
    return { score: data.score, explanation: data.explanation, created_at: data.created_at };
  } finally {
    clearTimeout(timeout);
  }
}
