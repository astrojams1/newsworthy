// Shared by the API and Expo. Native widget equivalents use the same fixtures.
export const DISPLAY_CHARACTER_LIMIT = 140;
/** Shown, bold, before a sentence that opened its own development. */
export const NEW_LABEL = 'New:';
/** "New: " — the label and the space after it. */
export const NEW_LABEL_RESERVE = Array.from(`${NEW_LABEL} `).length;
export const EXPLANATION_CHARACTER_LIMIT = DISPLAY_CHARACTER_LIMIT - NEW_LABEL_RESERVE;
/** How long after its reading was saved a new development is still labelled new. */
export const NEW_LABEL_MS = 2 * 3600_000;

/**
 * A sentence is new when its reading opened a development and was saved within
 * the last two hours. Past that the sentence leads with its age instead, and a
 * reading an afternoon old labelled new would be false.
 */
export function isNew(reading, now = Date.now()) {
  if (reading?.explanation_new !== true || typeof reading.explanation_text !== 'string') return false;
  const saved = Date.parse(reading.created_at);
  return Number.isFinite(saved) && Number.isFinite(now) && now - saved < NEW_LABEL_MS;
}

/**
 * How long ago the shown sentence's development was first reported, as the
 * muted prefix that leads it once "New:" has come off: "5h —", then "1d —"
 * from a day. Nothing under an hour, where "Checked" beside it says as much,
 * and nothing without `explanation_at`, which an older server or cache lacks.
 * The space before the dash does not break, so a line never ends on "5h"
 * with the dash leading the next.
 */
export function sentenceAge(reading, now = Date.now()) {
  if (!reading || isNew(reading, now) || typeof reading.explanation_text !== 'string'
    || typeof reading.explanation_at !== 'string') return '';
  const at = Date.parse(reading.explanation_at);
  if (!Number.isFinite(at) || !Number.isFinite(now)) return '';
  const hours = Math.floor((now - at) / 3600_000);
  if (hours < 1) return '';
  return `${hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`}\u00A0—`;
}

/** A display guard for legacy/overlong readings; stored prose is never changed. */
export function fitExplanation(text, limit) {
  const chars = Array.from(text);
  if (chars.length <= limit) return text;
  const slice = chars.slice(0, limit - 1).join('');
  const space = Array.from(slice).lastIndexOf(' ');
  return `${(space > limit / 2 ? Array.from(slice).slice(0, space).join('') : slice).trimEnd()}…`;
}

/**
 * The bold label (empty when not new), the muted age (empty when new or under
 * an hour) and the body, fitted together within 140 characters.
 */
export function explanationParts(reading, now = Date.now()) {
  if (!reading) return { label: '', age: '', body: '' };
  const label = isNew(reading, now) ? NEW_LABEL : '';
  const age = label ? '' : sentenceAge(reading, now);
  const prefix = label || age;
  // Missing metadata means an old client/cache: its explanation is shown as stored.
  const body = typeof reading.explanation_text === 'string' ? reading.explanation_text : reading.explanation;
  return { label, age, body: fitExplanation(body ?? '', DISPLAY_CHARACTER_LIMIT - (prefix ? Array.from(prefix).length + 1 : 0)) };
}

/** Plain text, for sharing and any surface that cannot style the prefix. */
export function displayExplanation(reading, now = Date.now()) {
  const { label, age, body } = explanationParts(reading, now);
  const prefix = label || age;
  return prefix ? `${prefix} ${body}` : body;
}
