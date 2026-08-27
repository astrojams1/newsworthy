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

// v5 is a rewrite rather than another paragraph bolted on. v4 had grown to four
// long sections — v1's calibration, v3's market reasoning, v4's Hacker News
// caveats, v2's output contract — each defensible on its own and collectively a
// wall of prose for a model to hold while it searches.
//
// The scale is also a different instrument. v1 asked whether the news was worth
// the reader's attention across money, career, technology, safety, travel and
// daily life; every rung here is market risk, so a story with no market
// confirmation has no route above roughly 4. That is the point — it pushes
// ratings down — but it is a change in what is measured, not a rewording.
//
// Four sections, no rung of the scale reworded from the author's text.
const V5_SCALE = `1. No credible market-risk signal; news can wait.
2. Weak isolated signal; low expected informational value.
3. Minor corroborated movement; routine monitoring suffices.
4. Noticeable anomaly, but limited market confirmation.
5. Meaningful confirmed change; checking may now pay.
6. Material stress; news likely provides useful context.
7. Sharp repricing; likely market-moving news underway.
8. Severe multi-asset stress or major shock unfolding.
9. Systemic-risk indicators flashing; check news immediately.
10. Extreme global market threat; continuous news warranted.`;

const V5_INSTRUCTIONS = `Summary

Rate how much the current news warrants attention right now, 1-10, on the scale below. Most days sit near the bottom of it.

Sources

Current top news. Liquid prediction markets — Polymarket, Kalshi, Metaculus — read for one-day moves rather than standing levels, since a long-running risk priced at 90% is not news and 20% to 60% in a day is. The Hacker News front page for technology the wires under-report. At most two searches on markets and one on Hacker News; the rest on news. Anything unavailable is skipped without comment.

Scale

${V5_SCALE}`;

// v6 guards the lag in v5's scale. Markets price consequence after it becomes
// legible, and v5 made confirmation the route upward — rung 4 was "noticeable
// anomaly, but limited market confirmation" — so a developing shock was capped
// at 4 precisely while being early was worth most. COVID in January 2020 scores
// 3 on v5; markets did not move until late February. Equities are also shut two
// thirds of the time, and overnight prediction-market liquidity is thin, so a
// 3am event has no confirmation for hours.
//
// The fix is one line in Sources rather than ten reworded rungs: market silence
// stops being evidence of absence. The rungs then say what happened rather than
// what has been confirmed, and stay inside the author's eight-word budget.
const V6_SCALE = `1. No credible risk signal; news can wait.
2. Weak isolated signal; low informational value.
3. Minor corroborated development; routine monitoring suffices.
4. Notable development; consequence not yet clear.
5. Meaningful change, confirmed or credibly reported.
6. Material stress or significant event underway.
7. Sharp repricing, or major shock breaking now.
8. Severe multi-asset stress, or grave shock unfolding.
9. Systemic risk flashing; check news immediately.
10. Extreme global threat; continuous news warranted.`;

const V6_INSTRUCTIONS = `Summary

Rate how much the current news warrants attention right now, 1-10, on the scale below. Most days sit near the bottom of it.

Sources

Current top news. Liquid prediction markets — Polymarket, Kalshi, Metaculus — read for one-day moves rather than standing levels, since a long-running risk priced at 90% is not news and 20% to 60% in a day is. The Hacker News front page for technology the wires under-report. At most two searches on markets and one on Hacker News; the rest on news. Anything unavailable is skipped without comment.

Markets confirm late and are shut two thirds of the time. Their silence is not evidence against an event that is hours old or that broke while they were closed: rate the event, not the tape.

Scale

${V6_SCALE}`;

const V7_SCALE = `1. No credible risk; news can wait.
2. Weak isolated signal; low informational value.
3. Minor corroborated development; routine monitoring sufficient.
4. Notable development; consequences still unclear.
5. Meaningful confirmed change; worth checking.
6. Significant event or material stress underway.
7. Major shock or sharp repricing underway.
8. Severe shock or broad market stress.
9. Systemic risk flashing; check immediately.
10. Extreme global threat; continuous attention warranted.`;

// Spelled out rather than derived from V6_INSTRUCTIONS: published prompts are
// frozen, and a derived one would take its hash from a version it does not own.
const V7_INSTRUCTIONS = `Summary

Rate how much the current news warrants attention right now, 1-10, on the scale below. Most days sit near the bottom of it.

Sources

Current top news. Liquid prediction markets — Polymarket, Kalshi, Metaculus — read for one-day moves rather than standing levels, since a long-running risk priced at 90% is not news and 20% to 60% in a day is. The Hacker News front page for technology the wires under-report. At most two searches on markets and one on Hacker News; the rest on news. Anything unavailable is skipped without comment.

Markets confirm late and are shut two thirds of the time. Their silence is not evidence against an event that is hours old or that broke while they were closed: rate the event, not the tape.

Scale

${V7_SCALE}`;

const V5_OUTPUT_CONTRACT = `Output

Reply with a single JSON object and nothing else — no prose, no markdown fences:
{"score": <integer 1-10>, "explanation": "<one sentence, at most 25 words>"}

The explanation names the single most consequential development and its concrete effect. Report what happened; do not justify the score or characterise the day as a whole.`;

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
  5: {
    version: 5,
    label: 'market-risk-v5',
    added: '2026-08-27',
    instructions: V5_INSTRUCTIONS,
    outputContract: V5_OUTPUT_CONTRACT,
  },
  6: {
    version: 6,
    label: 'lag-guard-v6',
    added: '2026-08-27',
    instructions: V6_INSTRUCTIONS,
    outputContract: V5_OUTPUT_CONTRACT,
  },
  7: {
    version: 7,
    label: 'tightened-scale-v7',
    added: '2026-08-27',
    instructions: V7_INSTRUCTIONS,
    outputContract: V5_OUTPUT_CONTRACT,
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
