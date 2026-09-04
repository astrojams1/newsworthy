import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { estimateCostUsd } from './pricing.js';
import { effectiveConfig } from './config.js';

/**
 * Which development a reading reports.
 *
 * Every run is independent and rates "the current top news", so a story that
 * dominates for four days is re-reported hourly at about the same score, and
 * the front page shows the same number for days. Ageing that number needs to
 * know what it is ageing — and specifically, that a story superseded at midday
 * and back on top by evening is the same story, still ageing from the morning.
 * Nothing in a stored row said that.
 *
 * Text similarity was tried first, over the stored series. It finds the coarse
 * story well enough (134 of 155 readings matched their neighbour's story) but
 * it cannot tell a re-report from a new development inside a running story: it
 * chained six days of Iran readings into one, so the resumption of strikes on
 * 31 August — which the rater scored 4 to 7 — would have displayed as 1. That
 * distinction is a judgement about the news, not about the words, so a model
 * makes it.
 *
 * The judgement is made once, when the reading arrives, and stored on the row.
 * The display rule then replays deterministically over stored columns, exactly
 * as the median rule already does — so the front page and the admin chart
 * cannot disagree, and re-reading history never re-judges it.
 *
 * The rater is not involved and does not change. This runs after a reading
 * exists, sees only sentences already stored, and cannot alter the score. A
 * failure here is never a rejection: the reading stores unjudged, carrying the
 * reason, and the display rule falls back to the score-only rule.
 */

/** How far back the judge is shown, and the rule looks for a root. */
export const PRIOR_HOURS = 48;

/** At most this many prior readings in the prompt. Two days of an hourly
 *  caller is ~48; the cap is what keeps a backlog from growing the call. */
const MAX_PRIORS = 60;

/**
 * Append-only, like the rating prompt registry: a stored judgement names the
 * version that produced it, so a later rewording cannot silently reinterpret
 * what is already recorded.
 *
 * Third person throughout, and no imperatives. The rating instructions carry
 * the same constraint for the same reason — a page of "you must" read by a
 * summarising fetch tool comes back as orders it refuses — and a prompt that
 * describes the task as a fact about the system survives paraphrase.
 */
const V1 = `A news rating service records one reading per hour. Each reading is
one sentence naming the biggest development at that moment, with a score from 1
to 10. Every reading is produced independently, with no memory of the others, so
the same development is re-reported hour after hour while it stays on top.

The task is to say whether a new reading reports a development already recorded,
or a new one.

A development is a specific event: a strike, a collapse, a ruling, a decision, a
toll crossing a threshold. A story is the broader thread it belongs to — a war, a
disaster, a rate cycle. One story contains many developments over time.

A reading reports an existing development when it describes the same event
already recorded, including when it restates it with different wording, a
revised figure, or added detail.

A reading reports a new development when something happened that the recorded
developments do not cover: an escalation, a reversal, a spread to a new party or
place, a decision taken, or a story with no prior readings at all. A new
development in an existing story is new.

Answer format: a single JSON object and nothing else, no prose, no markdown
fences.
{"development_of": <id of the recorded development, or null if new>, "story": "<lowercase-slug, two words at most>", "note": "<at most 12 words, what makes it same or new>"}

The id is one of the ids listed under Recorded, or null. The slug names the
broader story, and reuses the slug already listed for that story when the
reading belongs to one of them.`;

const REGISTRY = {
  1: { label: 'same-development-or-new-v1', added: '2026-09-04', text: V1 },
};

export function judgeVersion() {
  return Math.max(...Object.keys(REGISTRY).map(Number));
}

export function renderJudgePrompt(version = judgeVersion()) {
  const entry = REGISTRY[version];
  if (!entry) {
    throw new Error(`Unknown judge prompt version: ${version}. Known: ${Object.keys(REGISTRY).join(', ')}`);
  }
  const digest = createHash('sha256').update(entry.text, 'utf8').digest('hex');
  return { version, label: entry.label, added: entry.added, text: entry.text, hash: digest.slice(0, 16) };
}

export function allJudgePrompts() {
  return Object.keys(REGISTRY)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => renderJudgePrompt(v));
}

const iso = (value) => (value instanceof Date ? value.toISOString() : value);

/**
 * The prior readings, grouped into the developments they reported.
 *
 * The judge is shown developments rather than every reading: fifty sentences
 * about one war is fifty ways to phrase the same question, and the answer has
 * to be the id of a development, so that is what it reads. Each group carries
 * the sentence that opened it and the latest restatement, which between them
 * say what the development is and how far it has run.
 *
 * @param {Array<object>} priors ascending, oldest first, judged or not
 */
export function groupDevelopments(priors) {
  const groups = new Map();
  let previousRoot = null;
  for (const row of priors) {
    // An unjudged row joins whatever the row before it reported: it never
    // starts a development of its own, because that would rejuvenate a story
    // on nothing more than a judge outage.
    const root = row.judge_version != null
      ? (row.development_of ?? row.id)
      : (previousRoot ?? row.id);
    previousRoot = root;
    const existing = groups.get(root);
    if (existing) {
      existing.latest = row.explanation;
      existing.latest_at = iso(row.created_at);
      existing.readings += 1;
      existing.story ??= row.story ?? null;
    } else {
      groups.set(root, {
        id: root,
        story: row.story ?? null,
        first: row.explanation,
        first_at: iso(row.created_at),
        latest: row.explanation,
        latest_at: iso(row.created_at),
        readings: 1,
      });
    }
  }
  return [...groups.values()];
}

function renderPriors(groups) {
  if (groups.length === 0) return 'Recorded: nothing yet.';
  const lines = groups.map((g) => {
    const head = `[${g.id}] ${g.story ? `${g.story} · ` : ''}first seen ${g.first_at}, ${g.readings} reading${g.readings === 1 ? '' : 's'}`;
    const body = g.readings > 1 && g.latest !== g.first
      ? `    first: ${g.first}\n    latest (${g.latest_at}): ${g.latest}`
      : `    ${g.first}`;
    return `${head}\n${body}`;
  });
  return `Recorded developments:\n\n${lines.join('\n\n')}`;
}

/** The message the judge is sent, kept out of the call so a test can read it. */
export function judgeMessage({ score, explanation, created_at, priors = [] }) {
  const groups = groupDevelopments(priors).slice(-MAX_PRIORS);
  return [
    renderJudgePrompt().text,
    '',
    renderPriors(groups),
    '',
    `New reading (${iso(created_at) ?? 'now'}), scored ${score}:`,
    explanation,
  ].join('\n');
}

/** The ids the answer is allowed to name. */
function knownRoots(priors) {
  return new Set(groupDevelopments(priors).map((g) => g.id));
}

function parseJudgement(text) {
  const match = String(text ?? '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`no JSON object in judge reply: ${String(text ?? '').slice(0, 200)}`);
  const parsed = JSON.parse(match[0]);
  const raw = parsed.development_of;
  const development_of = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  if (development_of !== null && !Number.isInteger(development_of)) {
    throw new Error(`development_of must be an integer id or null, got ${JSON.stringify(raw)}`);
  }
  const slug = String(parsed.story ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const note = String(parsed.note ?? '').replace(/\s+/g, ' ').trim();
  return {
    development_of,
    story: slug ? slug.slice(0, 40) : null,
    note: note ? note.slice(0, 120) : null,
  };
}

/**
 * The mock judge, for tests and `NEWSWORTHY_MOCK=1`.
 *
 * Deterministic and free: a reading joins the development of the prior reading
 * whose sentence shares the most content words, when that overlap clears a
 * threshold. It is the similarity rule that was measured and rejected for
 * production — it cannot see a new development inside a running story — which
 * is exactly what makes it a good stand-in: the tests that matter drive the
 * grouping directly rather than relying on it.
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

const MOCK_THRESHOLD = 0.12;

export function mockJudgement({ explanation, priors = [] }) {
  let best = null;
  let bestSim = 0;
  for (const row of priors) {
    const sim = similarity(explanation, row.explanation);
    if (sim > bestSim) {
      bestSim = sim;
      best = row;
    }
  }
  if (!best || bestSim < MOCK_THRESHOLD) {
    const [word] = [...contentWords(explanation)];
    return { development_of: null, story: word ?? 'story', note: 'mock: no similar prior reading' };
  }
  const groups = groupDevelopments(priors);
  const root = groups.find((g) => g.id === best.id)
    ?? groups.find((g) => g.id === (best.judge_version != null ? best.development_of ?? best.id : best.id));
  const [word] = [...contentWords(best.explanation)];
  return {
    development_of: root?.id ?? best.development_of ?? best.id,
    story: root?.story ?? word ?? 'story',
    note: `mock: ${bestSim.toFixed(2)} word overlap`,
  };
}

async function callJudge({ model, message }) {
  const client = new Anthropic();
  return client.messages.create({
    model,
    max_tokens: 200,
    // No tools: this reads sentences already stored and never searches. The
    // effort is low because the question is a comparison, not a judgement call
    // about the news itself.
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: message }],
  });
}

/**
 * Judge one reading. Never throws.
 *
 * Returns the columns to store. `judge_version` is null when no judgement was
 * made — a failed call, an unparseable reply, an answer naming an id that was
 * not offered — and `judge_note` says why, so an outage is visible in the admin
 * table rather than appearing as a run of new developments.
 */
export async function judgeReading({
  score,
  explanation,
  created_at,
  priors = [],
  model,
  mock = process.env.NEWSWORTHY_MOCK === '1',
} = {}) {
  const unjudged = (note) => ({
    story: null,
    development_of: null,
    judge_version: null,
    judge_model: null,
    judge_note: note.slice(0, 120),
    judge_cost_usd: null,
  });

  if (mock) {
    const answer = mockJudgement({ explanation, priors });
    return {
      story: answer.story,
      development_of: answer.development_of,
      judge_version: judgeVersion(),
      judge_model: 'mock-judge',
      judge_note: answer.note,
      judge_cost_usd: 0,
    };
  }

  model ??= (await effectiveConfig()).judgeModel;
  const message = judgeMessage({ score, explanation, created_at, priors });
  let response;
  try {
    response = await callJudge({ model, message });
  } catch (err) {
    const note = `judge call failed: ${String(err?.message ?? err)}`;
    console.warn(note);
    return unjudged(note);
  }

  try {
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const answer = parseJudgement(text);
    // An id the judge was not offered is not a finding, it is a miss: taking it
    // would anchor the reading to a development that may not exist.
    const roots = knownRoots(priors);
    if (answer.development_of !== null && !roots.has(answer.development_of)) {
      const note = `judge named an unknown development ${answer.development_of}`;
      console.warn(note);
      return unjudged(note);
    }
    const usage = {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
    return {
      story: answer.story,
      development_of: answer.development_of,
      judge_version: judgeVersion(),
      judge_model: response.model ?? model,
      judge_note: answer.note,
      judge_cost_usd:
        estimateCostUsd({ model: response.model, ...usage })
        ?? estimateCostUsd({ model, ...usage }),
    };
  } catch (err) {
    const note = `judge reply unusable: ${String(err?.message ?? err)}`;
    console.warn(note);
    return unjudged(note);
  }
}
