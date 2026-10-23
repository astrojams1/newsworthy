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

// Story slugs are the judge's kebab-case names ("us-iran-war"). A word the
// story's own sentences write with a capital past its first letter takes that
// casing ("php-flaw" beside "PHP developers…" reads "PHP Flaw"); short tokens
// that read as initialisms are capitalised; everything else is title case,
// because a slug cannot say which of its words are proper nouns.
const INITIALISMS = new Set(['us', 'uk', 'eu', 'un', 'ai', 'nato', 'imf', 'ecb', 'opec', 'who', 'gdp', 'drc']);
function casingIn(word, text) {
  if (word.length < 2) return null;
  return text.split(/[^A-Za-z0-9]+/)
    .find((token) => token.toLowerCase() === word && /[A-Z]/.test(token.slice(1))) ?? null;
}
export function storyLabel(slug, ...sentences) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  const text = sentences.filter((sentence) => typeof sentence === 'string').join('\n');
  return slug.trim().split(/[-_\s]+/).map((word) => {
    const lower = word.toLowerCase();
    return casingIn(lower, text)
      ?? (INITIALISMS.has(lower) ? lower.toUpperCase() : lower.charAt(0).toUpperCase() + lower.slice(1));
  }).join(' ');
}

// One convention for every time the app prints: the home screen's age, the
// timeline's tags and Settings' "Last checked" all read 2m ago, 2h ago,
// 2d ago; under a minute is "just now".
export function shortAge(at, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export const timelineAge = shortAge;

// Each entry's tag line says only what changed from the entry above: a run of
// one story is tagged once, and "1d ago" is said once however many
// developments broke yesterday. An entry with nothing new gets no tag line.
// A story is named alike on every entry, from all of its sentences together.
export function timelineLabels(developments, now = Date.now()) {
  let story = null;
  let age = null;
  return developments.map((development, index) => {
    const nextStory = storyLabel(development.story, ...developments
      .filter((other) => other.story === development.story).map((other) => other.explanation));
    const nextAge = timelineAge(development.since, now);
    const label = {
      name: nextStory,
      story: index === 0 || nextStory !== story ? nextStory : null,
      age: index === 0 || nextAge !== age ? nextAge : null,
    };
    story = nextStory;
    age = nextAge;
    return label;
  });
}
