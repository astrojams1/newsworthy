/**
 * Content-word overlap between two sentences: the share of their content
 * words they have in common. Crude, and known to be: it finds a story's
 * neighbour well enough but cannot tell a re-report from a new development
 * inside one story, which is why a model judges that. Kept for the jobs it can
 * do: the mock judge, and checking that an unjudged reading is about the
 * development the replay would otherwise inherit it into (current.js).
 * No imports, so current.js can use it without reaching the model client.
 */
const STOP = new Set(('the a an and or of to in on at for with after as by from into over under about '
  + 'than that this these those its their his her is are was were be been has have had but not no more '
  + 'most new still while amid across near').split(' '));

export function contentWords(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9$% ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w)),
  );
}

export function similarity(a, b) {
  const left = contentWords(a);
  const right = contentWords(b);
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}
