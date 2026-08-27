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

// v2 keeps v1's rating instructions byte-for-byte and replaces only the output
// contract. v1's explanations kept justifying the score rather than reporting
// the news — "but it's a threat, not yet an event", "everything else is
// incremental". The score already carries that judgement; the sentence should
// not repeat it.
const V2_OUTPUT_CONTRACT = `Output format overrides the instruction above to print only a number.

Reply with a single JSON object and nothing else — no prose, no markdown fences:
{"score": <integer 1-10>, "explanation": "<one sentence, at most 25 words>"}

The explanation reports what happened. Name the single most consequential development and its concrete effect: who or what is affected, and how.

Do not explain or defend the rating. Do not characterise the news as a whole, and do not compare the main story to the rest of the day. Never write clauses like "routine", "incremental", "nothing major", "otherwise quiet", "everything else is minor", "but it is only a threat", or "not yet an event".

If little of consequence happened, state the day's biggest story plainly in the same way. The number already says how much it matters.`;

// v3 adds prediction markets as a source. The rating scale from v1 is preserved
// byte-for-byte and the output contract from v2 is reused unchanged; only the
// sourcing paragraph is new.
//
// Markets are a check on headline inflation, which is exactly what the harsh
// calibration asks for: coverage volume is a poor proxy for consequence, but a
// repricing is a costly signal. The search budget is capped rather than raised
// so this does not increase cost — max_uses is already saturated at 8.
const V3_SOURCES = `Sources: search current top news, and also check liquid prediction markets — Polymarket, Kalshi, and Metaculus — for what they price now and, more importantly, how those prices have moved in the last day.

Use markets as a check on headline volume. A story dominating coverage that has not moved any market is usually not consequential. A sharp repricing — a move of roughly ten percentage points or more, or a new market opening on a live risk — usually means something real happened. Weight a large move more heavily than a high but stable level: a long-running risk sitting at 90% is already priced in and is not news, while 20% to 60% in a day is.

Spend at most two searches on markets and the rest on news. If markets are unavailable or show nothing notable, rate on the news alone and do not mention the markets.`;

const V3_INSTRUCTIONS = `${V1_INSTRUCTIONS}

${V3_SOURCES}`;

// v4 adds Hacker News, and adds it the same way v3 added markets: as a ranked
// crowd signal rather than another outlet to read. Points and comment count
// measure salience within a domain, which is the same instrument as a market
// price, so the existing "movement over level" logic carries over.
//
// Scoped to technology because that is the only domain on v1's scale where wire
// services reliably miss things — a CVE, an outage, a licensing change — and
// because an unscoped HN check drifts the score toward whatever the front page
// is arguing about that day.
//
// Optional, like markets, and for the same reason: a required source that finds
// nothing still has to be mentioned, and the explanation is 25 words. max_uses
// goes 8 -> 9 to pay for it; each search costs roughly $0.12 all-in, almost all
// of it search results entering the context window rather than the $0.01 fee.
const V4_SOURCES = `${V3_SOURCES}

Also check the Hacker News front page for technology developments the wires
under-report — a widely exploited vulnerability, a major outage, a significant
model or licensing change. Read its ranking the way you read a market: position
and comment volume measure how much the technical community thinks something
matters, and a story climbing fast says more than one sitting high all week.

Spend at most one search there. Most of that front page is product launches,
company gossip and technical curiosities that score 1-2 on the scale above, and
finding something there is not a reason to raise the number. It counts only when
it reaches the bar the scale already sets: a concrete effect on money, career,
technology, safety, travel or daily life. If it shows nothing that clears that
bar, rate on the news alone and do not mention it.`;

const V4_INSTRUCTIONS = `${V1_INSTRUCTIONS}

${V4_SOURCES}`;

const REGISTRY = {
  1: {
    version: 1,
    label: 'harsh-calibration-v1',
    added: '2026-08-23',
    instructions: V1_INSTRUCTIONS,
    outputContract: V1_OUTPUT_CONTRACT,
  },
  2: {
    version: 2,
    label: 'report-not-justify-v2',
    added: '2026-08-24',
    instructions: V1_INSTRUCTIONS,
    outputContract: V2_OUTPUT_CONTRACT,
  },
  3: {
    version: 3,
    label: 'prediction-markets-v3',
    added: '2026-08-24',
    instructions: V3_INSTRUCTIONS,
    outputContract: V2_OUTPUT_CONTRACT,
  },
  4: {
    version: 4,
    label: 'hacker-news-v4',
    added: '2026-08-26',
    instructions: V4_INSTRUCTIONS,
    outputContract: V2_OUTPUT_CONTRACT,
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
