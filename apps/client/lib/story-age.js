// Shared by the API and Expo. Native widget equivalents use the same fixtures.
export const DISPLAY_CHARACTER_LIMIT = 140;
export const AGE_PREFIX_RESERVE = 20;
export const EXPLANATION_CHARACTER_LIMIT = DISPLAY_CHARACTER_LIMIT - AGE_PREFIX_RESERVE;

/** Age of this development's first coverage, never the score's decay anchor. */
export function agePrefix(since, now = Date.now()) {
  const start = typeof since === 'string' ? Date.parse(since) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(now) || start > now) return '';
  const minutes = Math.floor((now - start) / 60_000);
  if (minutes < 1) return 'Just now: ';
  const [value, unit] = minutes < 60 ? [minutes, 'minute']
    : minutes < 2880 ? [Math.floor(minutes / 60), 'hour']
      : minutes < 525600 ? [Math.floor(minutes / 1440), 'day']
        : [Math.floor(minutes / 525600), 'year'];
  return `${value} ${unit}${value === 1 ? '' : 's'} ago: `;
}

/** A display guard for legacy/overlong readings; stored prose is never changed. */
export function fitExplanation(text, limit) {
  const chars = Array.from(text);
  if (chars.length <= limit) return text;
  const slice = chars.slice(0, limit - 1).join('');
  const space = Array.from(slice).lastIndexOf(' ');
  return `${(space > limit / 2 ? Array.from(slice).slice(0, space).join('') : slice).trimEnd()}…`;
}

export function displayExplanation(reading, now = Date.now()) {
  if (!reading) return '';
  // Missing metadata means an old client/cache. Do not prepend a second age.
  const hasBody = typeof reading.explanation_text === 'string';
  // A summary that repeats an earlier one says how old it is; one that does not says it is new.
  const prefix = !hasBody ? '' : reading.explanation_new === true ? 'New: ' : agePrefix(reading.explanation_since, now);
  const body = hasBody ? reading.explanation_text : reading.explanation;
  return prefix + fitExplanation(body ?? '', DISPLAY_CHARACTER_LIMIT - Array.from(prefix).length);
}
