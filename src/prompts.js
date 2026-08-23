import { createHash } from 'node:crypto';

/**
 * Versioned prompt registry.
 *
 * Prompts are append-only: never edit a published version in place. To change
 * the rating behaviour, add a new entry with the next version number. Every
 * rating row stores the version AND a hash of the exact text that was sent, so
 * a row can always be traced back to the words that produced it — even if this
 * file is later edited by mistake.
 */

const V1_INSTRUCTIONS = `Check the current top news and rate from 1–10 how worthwhile it is for me to check the news right now. Calibrate the scale harshly:
* 1–2: Routine news; nothing I’m likely to care about or act on.
* 3–4: Some notable developments, but I lose little by ignoring them.
* 5: At least one genuinely important development worth knowing today.
* 6–7: Major development with meaningful implications for my money, career, technology, safety, travel, or daily life.
* 8–9: Exceptional event likely to materially affect me or the world.
* 10: Historic/emergency-level event where I should check immediately.
Do not confuse “big headline” with “worth my attention.” Political drama, incremental geopolitical developments, routine market moves, and stories that merely could affect markets should generally score low. Assume my default preference is not to consume news unless something unusually consequential has happened. Search current top news, then output only the number and /10.`;

// The rating instructions ask for a bare number. Newsworthy also shows one line
// of reasoning, so the output contract below overrides that final sentence. It
// is versioned alongside the instructions and included in the prompt hash.
const V1_OUTPUT_CONTRACT = `Output format overrides the instruction above to print only a number.

Reply with a single JSON object and nothing else — no prose, no markdown fences:
{"score": <integer 1-10>, "explanation": "<one sentence, at most 25 words>"}

The explanation names the one story that drove the score, or says plainly that nothing did. Write it for someone who will read no other news today. No preamble, no hedging, no "the news today".`;

const REGISTRY = {
  1: {
    version: 1,
    label: 'harsh-calibration-v1',
    added: '2026-08-23',
    instructions: V1_INSTRUCTIONS,
    outputContract: V1_OUTPUT_CONTRACT,
  },
};

/** Full text actually sent to the model for a given version. */
export function renderPrompt(version) {
  const entry = REGISTRY[version];
  if (!entry) {
    throw new Error(`Unknown prompt version: ${version}. Known: ${Object.keys(REGISTRY).join(', ')}`);
  }
  const text = `${entry.instructions}\n\n${entry.outputContract}`;
  return {
    version: entry.version,
    label: entry.label,
    text,
    hash: createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16),
  };
}

export function latestVersion() {
  return Math.max(...Object.keys(REGISTRY).map(Number));
}

export function allPrompts() {
  return Object.keys(REGISTRY)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => ({ ...renderPrompt(v), added: REGISTRY[v].added }));
}
