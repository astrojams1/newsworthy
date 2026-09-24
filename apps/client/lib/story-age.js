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
 * the last two hours. Past that the update time beside it says enough, and a
 * reading an afternoon old labelled new would be false.
 */
export function isNew(reading, now = Date.now()) {
  if (reading?.explanation_new !== true || typeof reading.explanation_text !== 'string') return false;
  const saved = Date.parse(reading.created_at);
  return Number.isFinite(saved) && Number.isFinite(now) && now - saved < NEW_LABEL_MS;
}

/** A display guard for legacy/overlong readings; stored prose is never changed. */
export function fitExplanation(text, limit) {
  const chars = Array.from(text);
  if (chars.length <= limit) return text;
  const slice = chars.slice(0, limit - 1).join('');
  const space = Array.from(slice).lastIndexOf(' ');
  return `${(space > limit / 2 ? Array.from(slice).slice(0, space).join('') : slice).trimEnd()}…`;
}

/** The label (empty when not new) and the body, fitted together within 140 characters. */
export function explanationParts(reading, now = Date.now()) {
  if (!reading) return { label: '', body: '' };
  const label = isNew(reading, now) ? NEW_LABEL : '';
  // Missing metadata means an old client/cache: its explanation is shown as stored.
  const body = typeof reading.explanation_text === 'string' ? reading.explanation_text : reading.explanation;
  return { label, body: fitExplanation(body ?? '', DISPLAY_CHARACTER_LIMIT - (label ? NEW_LABEL_RESERVE : 0)) };
}

/** Plain text, for sharing and any surface that cannot style the label. */
export function displayExplanation(reading, now = Date.now()) {
  const { label, body } = explanationParts(reading, now);
  return label ? `${label} ${body}` : body;
}
