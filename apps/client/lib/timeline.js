// Prototype: the developments behind the front page, from /api/timeline.
// Validated like the reading, so a malformed entry is dropped rather than drawn.
export function validDevelopment(value) {
  return Boolean(value && Number.isInteger(value.score) && value.score >= 1 && value.score <= 10
    && typeof value.explanation === 'string' && value.explanation.trim().length > 0
    && value.explanation.length <= 2000 && typeof value.since === 'string'
    && Number.isFinite(Date.parse(value.since))
    && (value.story === null || typeof value.story === 'string'));
}

export async function fetchTimeline(apiBaseUrl, fetcher = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`${apiBaseUrl}/api/timeline`, {
      cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Timeline unavailable (${response.status})`);
    const data = await response.json();
    return Array.isArray(data?.developments) ? data.developments.filter(validDevelopment) : [];
  } finally {
    clearTimeout(timeout);
  }
}

// Story slugs are the judge's kebab-case names ("us-iran-war"). Short tokens
// that read as initialisms are capitalised; everything else is title case,
// because a slug cannot say which of its words are proper nouns.
const INITIALISMS = new Set(['us', 'uk', 'eu', 'un', 'ai', 'nato', 'imf', 'ecb', 'opec', 'who', 'gdp', 'drc']);
export function storyLabel(slug) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  return slug.trim().split(/[-_\s]+/).map((word) => {
    const lower = word.toLowerCase();
    return INITIALISMS.has(lower) ? lower.toUpperCase() : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

// How often the screen re-reads the clock for its ages.
export const CLOCK_TICK_MS = 30_000;

// The reading's own age, under the sentence: "just now", "12 min ago".
export function updatedAge(createdAt, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

export function timelineAge(since, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  const days = Math.floor(minutes / 1440);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

// Each entry's tag line says only what changed from the entry above: a run of
// one story is tagged once, and "Yesterday" is said once however many
// developments broke yesterday. An entry with nothing new gets no tag line.
export function timelineLabels(developments, now = Date.now()) {
  let story = null;
  let age = null;
  return developments.map((development, index) => {
    const nextStory = storyLabel(development.story);
    const nextAge = timelineAge(development.since, now);
    const label = {
      story: index === 0 || nextStory !== story ? nextStory : null,
      age: index === 0 || nextAge !== age ? nextAge : null,
    };
    story = nextStory;
    age = nextAge;
    return label;
  });
}
