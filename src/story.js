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

/** How many story names the judge is shown. Enough to cover a fortnight of a
 *  news cycle without turning the vocabulary into a wall to skim past. */
const MAX_STORIES = 20;

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

/**
 * v2 adds the story vocabulary, and nothing else.
 *
 * v1 named the slug rule in one clause at the end — "reuses the slug already
 * listed for that story" — and left the slugs themselves scattered inline, one
 * per recorded development. Judged over 231 real readings that produced four
 * names for one story: `hormuz-threat` (40 readings), then `iran-war` (87),
 * then `iran-nuclear`, then `hormuz-conflict`. The reading that coined
 * `iran-war` had `hormuz-threat` developments in front of it at the time, so a
 * slug seen in passing is demonstrably not enough to get it reused.
 *
 * So the names are lifted out into a list of their own and the rule about them
 * is stated where the list is. Everything above it is byte-identical to v1:
 * only the naming changed, so which development a reading reports is judged by
 * the same text and the two versions stay comparable.
 */
const V2 = V1.replace(
  `The id is one of the ids listed under Recorded, or null. The slug names the
broader story, and reuses the slug already listed for that story when the
reading belongs to one of them.`,
  `The id is one of the ids listed under Recorded, or null.

The slug names the broader story the development belongs to. A reading whose
story appears under "Stories on record" takes that story's slug back verbatim,
character for character, however differently the new sentence is worded — a war
reported through a strait one hour and a capital the next is one story with one
name. A new slug is for a story with nothing on record.`);

/**
 * v3 lets the judge say that two names on record are one story, and nothing
 * else changes: everything in v2 is kept byte-identical and one paragraph is
 * appended, so which development a reading reports is judged by the same text.
 *
 * v2 got a story named once, when it was coined, and never again: a name coined
 * twice stayed two stories for as long as either was used, and a dormant one
 * could come back — `hormuz-conflict` returned on 18 September after two weeks
 * unused and split the Iran war for five days. A merge is recorded as a row and
 * resolved wherever names are read (src/merges.js), so every run is a chance to
 * mend a split rather than only the run that made it.
 */
const V3 = `${V2}

Two names under "Stories on record" can be one story coined twice — the same
war, disaster or rate cycle recorded under both. When they are, the answer adds
"same_story": ["<one name>", "<the other>"], both copied from the list. It is
for one story under two names, never for two stories that are related, share a
cause or affect each other. At most one pair per answer; otherwise the key is
left out.`;

const REGISTRY = {
  1: { label: 'same-development-or-new-v1', added: '2026-09-04', text: V1 },
  2: { label: 'story-vocabulary-v2', added: '2026-09-04', text: V2 },
  3: { label: 'same-story-merge-v3', added: '2026-09-25', text: V3 },
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
const day = (value) => new Date(value).toISOString().slice(0, 10);

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

/**
 * The stories already named, newest first, as a vocabulary to reuse.
 *
 * Listed apart from the developments because the two questions are separate:
 * which event this is, and what the thread it belongs to is called. Drawn from
 * a wider window than the developments, so a story quiet for two days keeps its
 * name when it returns rather than being renamed on the way back in.
 */
function renderStories(stories = []) {
  if (stories.length === 0) return 'Stories on record: none yet.';
  // A story with more than one sentence shows how it began as well as where it
  // is, laid out like a development: the latest line alone once made the
  // Trump-Xi trade summit read as the Iran war, because its last reading was
  // about Hormuz.
  const lines = stories.slice(0, MAX_STORIES).map((s) => {
    if (!s.first || s.first === s.latest || !(s.readings > 1)) {
      return `  ${s.story}${s.latest ? ` — ${s.latest}` : ''}`;
    }
    return `  ${s.story} · ${s.readings} readings since ${day(s.first_at)}\n`
      + `      first: ${s.first}\n      latest (${day(s.latest_at)}): ${s.latest}`;
  });
  return `Stories on record:\n${lines.join('\n')}`;
}

/** The message the judge is sent, kept out of the call so a test can read it. */
export function judgeMessage({ score, explanation, created_at, priors = [], stories = [] }) {
  return [
    judgeContext({ priors, stories }),
    '',
    `New reading (${iso(created_at) ?? 'now'}), scored ${score}:`,
    explanation,
  ].join('\n');
}

/** Everything in the judge message but the new reading: the prompt, then the
 *  record — the story names and the recorded developments. */
function judgeContext({ priors = [], stories = [] }) {
  return [renderJudgePrompt().text, '', judgeRecord({ priors, stories }).text].join('\n');
}

/** The ids the answer is allowed to name. */
function knownRoots(priors) {
  return new Set(groupDevelopments(priors).map((g) => g.id));
}

/**
 * What the judge compares a reading against: the story names on record and
 * the developments recorded over `PRIOR_HOURS`. Data only — the judge prompt
 * itself is part of the caller instructions, like the rating prompt — so a
 * caller fetches this after it has scored and written, and the history cannot
 * steer either. `roots` are the ids the text lists, the only ids an answer may
 * name.
 */
export function judgeRecord({ priors = [], stories = [] } = {}) {
  const groups = groupDevelopments(priors).slice(-MAX_PRIORS);
  return {
    text: [renderStories(stories), '', renderPriors(groups)].join('\n'),
    roots: groups.map((g) => g.id),
  };
}

/**
 * The readings a judgement of `reading` is made against: those stored before
 * it, over the `PRIOR_HOURS` before it. The backfill judges a stored reading
 * against the record as it stood when the reading arrived, not as it stands now.
 *
 * @param {Array<object>} rows ascending, oldest first
 */
export function priorsBefore(rows, reading) {
  const at = Date.parse(iso(reading.created_at));
  return rows.filter((row) => {
    if (row.id === reading.id) return false;
    const t = Date.parse(iso(row.created_at));
    return (t < at || (t === at && row.id < reading.id)) && at - t <= PRIOR_HOURS * 3600_000;
  });
}

/** The columns stored when no judgement was made, and why. */
function unjudged(note) {
  return {
    story: null,
    development_of: null,
    judge_version: null,
    judge_model: null,
    judge_note: String(note).slice(0, 120),
    judge_cost_usd: null,
  };
}

/**
 * A caller's answer about its own reading, as the columns to store. Never
 * throws.
 *
 * The version stamped is the server's own. The caller echoes the judge prompt
 * version it read only so that an answer to a retired version is refused: its
 * claim can stop a judgement being stored, never decide what is stored. An id
 * the record did not list is a miss, not a finding, exactly as it is for the
 * server-side judge. `judge_model` says `caller`, because which model answered
 * is the caller's claim and is not recorded.
 */
export function callerJudgement(answer, { version = judgeVersion(), roots = [] } = {}) {
  const task = { version, roots };
  if (answer === undefined || answer === null) return unjudged('no judgement sent');
  let parsed;
  let object;
  try {
    object = typeof answer === 'string' ? JSON.parse(answer) : answer;
    if (Number(object?.judge_version) !== task.version) {
      return unjudged(`judge prompt version ${object?.judge_version ?? 'missing'}, current is ${task.version}`);
    }
    // Required rather than defaulted: a missing id must not read as "new".
    if (!('development_of' in object)) return unjudged('development_of is required: an id, or null for new');
    parsed = normalizeJudgement(object);
  } catch (err) {
    return unjudged(`caller judgement unusable: ${String(err?.message ?? err)}`);
  }
  if (parsed.development_of !== null && !task.roots.includes(parsed.development_of)) {
    return unjudged(`caller named an unknown development ${parsed.development_of}`);
  }
  return {
    story: parsed.story,
    development_of: parsed.development_of,
    judge_version: task.version,
    judge_model: 'caller',
    judge_note: parsed.note,
    judge_cost_usd: null,
    // Not a column: a proposed merge, which the server weighs on its own.
    ...(object.same_story !== undefined ? { same_story: object.same_story } : {}),
  };
}

/**
 * The sentence is labelled new when a judgement placed the reading and it
 * opened a development of its own. An unjudged reading is not new: an outage
 * must not masquerade as a fresh story.
 */
export function opensDevelopment(reading) {
  return reading.judge_version != null && reading.development_of == null;
}

function parseJudgement(text) {
  const match = String(text ?? '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`no JSON object in judge reply: ${String(text ?? '').slice(0, 200)}`);
  return normalizeJudgement(JSON.parse(match[0]));
}

function normalizeJudgement(parsed) {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('judgement must be an object');
  }
  const raw = parsed.development_of;
  // "new" is accepted beside null because a query string cannot carry a null.
  const development_of = raw === null || raw === undefined || raw === '' || raw === 'new' || raw === 'null'
    ? null : Number(raw);
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

export function mockJudgement({ explanation, priors = [], stories = [] }) {
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
    // A new development still takes an existing story's name when it plainly
    // belongs to one — the same rule the real judge is given, so a test can
    // exercise it rather than only the prompt wording.
    const named = stories.find((s) => s.story && similarity(explanation, s.latest) >= MOCK_THRESHOLD);
    const [word] = [...contentWords(explanation)];
    return {
      development_of: null,
      story: named?.story ?? word ?? 'story',
      note: named ? `mock: new development in ${named.story}` : 'mock: no similar prior reading',
    };
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
  stories = [],
  model,
  mock = process.env.NEWSWORTHY_MOCK === '1',
} = {}) {
  if (mock) {
    const answer = mockJudgement({ explanation, priors, stories });
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
  const message = judgeMessage({ score, explanation, created_at, priors, stories });
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
