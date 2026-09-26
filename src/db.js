import { postgresEnvKeys, sql } from './sql.js';
import { aliasMap, canonicalStory } from './merges.js';

/**
 * Schema creation is idempotent and cached per process, so a cold-started
 * function self-heals without a separate migration step. `npm run migrate`
 * runs the same thing explicitly.
 */
let schemaPromise;

export function ensureSchema() {
  schemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS ratings (
        id             BIGSERIAL   PRIMARY KEY,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        slot           TIMESTAMPTZ,          -- scheduled slot; NULL for manual runs
        status         TEXT        NOT NULL, -- 'ok' | 'error'
        score          SMALLINT,             -- 1-10, NULL when status='error'
        explanation    TEXT,
        prompt_version INTEGER     NOT NULL,
        prompt_hash    TEXT        NOT NULL, -- sha256 of the exact text sent
        prompt_text    TEXT        NOT NULL, -- the exact text sent
        model          TEXT        NOT NULL, -- model we asked for
        served_by      TEXT,                 -- model that actually answered
        raw_output     TEXT,                 -- verbatim final text block
        error          TEXT,
        latency_ms     INTEGER,
        input_tokens   INTEGER,
        output_tokens  INTEGER
      )`;
    // Added after the first deploy; ALTER ... IF NOT EXISTS keeps this idempotent
    // for databases created before cost tracking existed.
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS web_search_requests INTEGER`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12, 6)`;
    // Who produced this reading: 'cron' (this app's schedule), 'manual' (the
    // admin button) or 'external' (an agent elsewhere that did the rating with
    // its own model and posted the result).
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'cron'`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS caller TEXT`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS caller_meta JSONB`;
    // NULL means the caller returned no digest, false means it returned one
    // that did not match the text we served. The two are different findings.
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS prompt_verified BOOLEAN`;
    // Which development this reading reports, judged once before storage and never
    // recomputed (src/story.js). NULL development_of on a judged row means the
    // reading opened a development; judge_version NULL means no judgement was
    // made at all, which the display rule treats as "inherit", not as "new".
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS story TEXT`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS development_of BIGINT`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS judge_version INTEGER`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS judge_model TEXT`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS judge_note TEXT`;
    await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS judge_cost_usd NUMERIC(12, 6)`;
    // External readings record no model: this app did not run one, and what a
    // caller reported about itself was never verifiable. NULL says "unknown"
    // where the old placeholder string said "unreported" as if it were data.
    await sql`ALTER TABLE ratings ALTER COLUMN model DROP NOT NULL`;
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    // Rejected submissions leave a row, not only a log line: function logs are
    // ephemeral, which is why the 2026-08-28 422s could not be attributed to any
    // of the four rules afterwards. No request payload is stored — each reason
    // names the field at fault, so the reason is the whole finding, and keeping
    // bodies posted to this endpoint would be a junk magnet.
    await sql`
      CREATE TABLE IF NOT EXISTS rejections (
        id          BIGSERIAL   PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        status      SMALLINT    NOT NULL,  -- the status the caller was given
        reason      TEXT        NOT NULL,  -- which rule fired, in its own words
        method      TEXT,                  -- 'GET' or 'POST'
        soft_errors BOOLEAN     NOT NULL DEFAULT false -- was the 200-shaped form on
      )`;
    // The caller's own account of each run, one row per run, whether or not it
    // submitted a reading. A report is not a reading and is not checked: it is
    // what the caller says it searched, weighed and decided, kept so a run can
    // be read afterwards — the Routine's own transcript is not reachable from
    // here, and a run that submitted nothing otherwise leaves no trace at all.
    await sql`
      CREATE TABLE IF NOT EXISTS caller_runs (
        id          BIGSERIAL   PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        reading_id  BIGINT,               -- the reading it submitted, if any
        report      TEXT        NOT NULL
      )`;
    // Each authenticated fetch of the caller's instructions, prompt and record:
    // when, which path, which form, and whose token. A caller run that followed
    // instructions this server no longer serves could otherwise not be told
    // apart from one that fetched them and read them wrongly. No query string
    // is kept, since it can carry the token.
    await sql`
      CREATE TABLE IF NOT EXISTS caller_fetches (
        id          BIGSERIAL   PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        path        TEXT        NOT NULL,
        format      TEXT,                  -- 'text' or 'json' where a route serves both
        token       TEXT        NOT NULL   -- 'caller' or 'admin': whose token, never its value
      )`;
    // One story under two names, and the name it goes by. Rows only: an undo is
    // a row naming the merge it undoes, so the history of what was merged, by
    // whom and why, is never overwritten. Readings are never renamed; names are
    // resolved where they are read. See src/merges.js.
    await sql`
      CREATE TABLE IF NOT EXISTS story_merges (
        id          BIGSERIAL   PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        alias       TEXT        NOT NULL,
        canonical   TEXT        NOT NULL,
        source      TEXT        NOT NULL,  -- 'caller' or 'admin'
        reading_id  BIGINT,                -- the reading whose run proposed it
        note        TEXT,
        undoes      BIGINT                 -- set on an undo row: the merge it undoes
      )`;
    // Whose token a refused request carried: 'caller' or 'admin', never its
    // value. Null on rows from before it was recorded.
    await sql`ALTER TABLE rejections ADD COLUMN IF NOT EXISTS token TEXT`;
    // Devices that asked to be told about a high reading, and the readings they
    // were told about. One row per Expo push token — the token is the whole
    // identity, so re-registering the same device is an update, not a second
    // device. `threshold` is the lowest score the device wants to hear about.
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        token      TEXT        PRIMARY KEY,
        threshold  SMALLINT    NOT NULL,
        platform   TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    // A development is announced once per threshold, however many readings
    // report it. The primary key is the guard: the insert that loses the race
    // is the one that sends nothing.
    // `claimed_at` is a lock, `sent_at` the record. A claim with no `sent_at`
    // is a send in flight or one that failed: the sender releases it on
    // failure, and a claim older than PUSH_CLAIM_STALE_MINUTES — a function
    // frozen mid-send — can be taken over by the next reading.
    // `delivered` is progress: the tokens Expo has already answered for. A
    // send that fails part-way keeps them, so the retry reaches only the rest —
    // a second batch's 503 must not send the first batch's hundred again.
    await sql`
      CREATE TABLE IF NOT EXISTS push_deliveries (
        root       BIGINT      NOT NULL,
        threshold  SMALLINT    NOT NULL,
        reading_id BIGINT      NOT NULL,
        score      SMALLINT    NOT NULL,
        recipients INTEGER     NOT NULL DEFAULT 0,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        released   BOOLEAN     NOT NULL DEFAULT false,
        sent_at    TIMESTAMPTZ,
        delivered  TEXT[]      NOT NULL DEFAULT '{}',
        PRIMARY KEY (root, threshold)
      )`;
    // Tickets are retained only until Expo's downstream delivery receipt is
    // checked. A ticket alone does not establish acceptance by APNs/FCM.
    await sql`CREATE TABLE IF NOT EXISTS push_receipts (
      id TEXT PRIMARY KEY, token TEXT NOT NULL, root BIGINT NOT NULL,
      threshold SMALLINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS ratings_created_at ON ratings (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS rejections_created_at ON rejections (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS ratings_ok_created_at ON ratings (created_at DESC) WHERE status = 'ok'`;
    // Cron delivery can duplicate a scheduled run. One successful reading per
    // slot, enforced by the database rather than by hoping it doesn't happen.
    // Manual runs carry slot = NULL, and Postgres allows many NULLs here.
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS ratings_one_ok_per_slot ON ratings (slot) WHERE status = 'ok'`;
  })().catch((err) => {
    schemaPromise = undefined; // a failed migration must not be cached
    throw err;
  });
  return schemaPromise;
}

/** Cheap liveness probe for /healthz. */
export async function pingDatabase() {
  await sql`SELECT 1`;
  return true;
}

export { postgresEnvKeys };

const iso = (value) => (value instanceof Date ? value.toISOString() : value);
const num = (value) => (value === null || value === undefined ? null : Number(value));

const NUMERIC = [
  'id', 'score', 'prompt_version', 'latency_ms', 'input_tokens', 'output_tokens',
  'cache_read_tokens', 'cache_write_tokens', 'web_search_requests', 'cost_usd',
  'development_of', 'judge_version', 'judge_cost_usd', 'reading_id', 'undoes',
];

/**
 * Normalise a row, converting only the columns the query actually selected.
 *
 * Emitting a key for an unselected column is worse than omitting it: the value
 * comes back null, which reads as "nothing was recorded" rather than "this
 * query did not ask". `history()` selects no usage columns, so every reading it
 * returned looked like it had lost its token counts and cost — including cron
 * runs whose spend `stats()` was aggregating at the same time. An absent key
 * says "not asked for"; null should mean "asked, and empty".
 */
function shape(row) {
  if (!row) return undefined;
  const out = { ...row };
  for (const key of NUMERIC) if (key in row) out[key] = num(row[key]);
  for (const key of ['created_at', 'slot']) if (key in row) out[key] = iso(row[key]);
  if ('caller_meta' in row) {
    out.caller_meta =
      typeof row.caller_meta === 'string' ? JSON.parse(row.caller_meta) : row.caller_meta;
  }
  return out;
}

/**
 * Insert a reading. Returns the existing row instead when this slot already
 * holds a successful reading, so a duplicate cron delivery is a no-op.
 */
export async function insertRating(row) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO ratings (
      created_at, slot, status, score, explanation, prompt_version, prompt_hash,
      prompt_text, model, served_by, raw_output, error, latency_ms,
      input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
      web_search_requests, cost_usd, source, caller, caller_meta, prompt_verified,
      story, development_of, judge_version, judge_model, judge_note, judge_cost_usd
    ) VALUES (
      ${row.created_at ?? new Date().toISOString()}, ${row.slot ?? null}, ${row.status},
      ${row.score ?? null}, ${row.explanation ?? null}, ${row.prompt_version},
      ${row.prompt_hash}, ${row.prompt_text}, ${row.model}, ${row.served_by ?? null},
      ${row.raw_output ?? null}, ${row.error ?? null}, ${row.latency_ms ?? null},
      ${row.input_tokens ?? null}, ${row.output_tokens ?? null},
      ${row.cache_read_tokens ?? null}, ${row.cache_write_tokens ?? null},
      ${row.web_search_requests ?? null}, ${row.cost_usd ?? null},
      ${row.source ?? 'cron'}, ${row.caller ?? null},
      ${row.caller_meta ? JSON.stringify(row.caller_meta) : null}::jsonb,
      ${row.prompt_verified ?? null},
      ${row.story ?? null}, ${row.development_of ?? null}, ${row.judge_version ?? null},
      ${row.judge_model ?? null}, ${row.judge_note ?? null}, ${row.judge_cost_usd ?? null}
    )
    ON CONFLICT DO NOTHING
    RETURNING *`;

  if (rows.length > 0) return shape(rows[0]);
  return { ...(await ratingForSlot(row.slot)), deduped: true };
}

/**
 * Retire a reading that should never have counted — a probe, or a row written
 * by a bug. Marked rather than deleted: it leaves the series and stops being
 * "latest", but stays visible in the run log as a record of what happened.
 */
export async function voidRating(id, reason = 'voided') {
  await ensureSchema();
  const rows = await sql`
    UPDATE ratings
       SET status = 'error', slot = NULL, error = ${`voided: ${reason}`}
     WHERE id = ${id}
     RETURNING *`;
  return shape(rows[0]);
}

/**
 * Correct or clear a reading's usage, recomputing its cost.
 *
 * A reading can be sound while its usage is not: a caller with no token counter
 * reported 85,000 input tokens and said afterwards the figure was a guess, which
 * priced at Opus rates put $0.48 of invented spend in a real total. Voiding
 * would have thrown away a good rating to remove a bad number. Pass null for a
 * count to clear it; the row keeps everything else.
 */
export async function correctUsage(id, { input_tokens, output_tokens, web_search_requests, cost_usd }) {
  await ensureSchema();
  const rows = await sql`
    UPDATE ratings
       SET input_tokens = ${input_tokens ?? null},
           output_tokens = ${output_tokens ?? null},
           web_search_requests = ${web_search_requests ?? null},
           cost_usd = ${cost_usd ?? null}
     WHERE id = ${id}
     RETURNING *`;
  return shape(rows[0]);
}

export async function ratingForSlot(slot) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM ratings WHERE slot = ${slot} AND status = 'ok' LIMIT 1`;
  return shape(rows[0]);
}

/** The number the front page shows. */
export async function latestRating() {
  await ensureSchema();
  const rows = await sql`
    SELECT * FROM ratings WHERE status = 'ok' ORDER BY created_at DESC, id DESC LIMIT 1`;
  return shape(rows[0]);
}

/**
 * The newest readings, for the smoothed current score. Time-bounded as well as
 * counted: five readings is five hours while the hourly caller runs, but twenty
 * hours if it stops and the cron takes over at its own cadence, and a median
 * across twenty hours is not a current reading.
 */
export async function recentRatings({ limit = 5, hours = 6 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT id, created_at, score, explanation, source,
           story, development_of, judge_version, judge_note
      FROM ratings
     WHERE status = 'ok' AND created_at >= ${since}
     ORDER BY created_at DESC, id DESC
     LIMIT ${limit}`;
  return rows.map(shape);
}

/**
 * Readings by id, for developments whose first report is older than the replay
 * window. Without this a story running since Tuesday would date from the edge
 * of the window and read as younger than it is.
 */
export async function ratingsByIds(ids = []) {
  if (ids.length === 0) return [];
  await ensureSchema();
  const rows = await sql`
    SELECT id, created_at, score, explanation, story
      FROM ratings
     WHERE id = ANY(${ids})`;
  return withStoryNames(rows.map(shape));
}

/**
 * The stories already named, newest first, as a vocabulary for the judge.
 *
 * Wider than the 48 hours of developments it is shown beside: a story quiet for
 * two days should keep its name when it returns rather than be renamed on the
 * way back in. One row per name, carrying every sentence filed under it in the
 * window, oldest first.
 *
 * One sentence per name was not enough to recognise a story. On 2026-09-26
 * `us-china-trade` — the Trump-Xi summit and trade truce — was listed by its
 * last reading, "no deal to reopen the Strait of Hormuz", beside `iran-war`,
 * and a caller merged the two. Its first and latest sentences were the next
 * cut; every reading is the one that leaves nothing to guess, at about 50,000
 * characters for two weeks, read once per run.
 */
export async function recentStories({ days = 14, limit = 20, before = new Date() } = {}) {
  await ensureSchema();
  const until = new Date(before);
  const since = new Date(until.getTime() - days * 24 * 3600_000);
  const rows = await sql`
    SELECT id, story, explanation, created_at
      FROM ratings
     WHERE status = 'ok' AND story IS NOT NULL AND created_at >= ${since} AND created_at < ${until}
     ORDER BY created_at ASC, id ASC`;
  // Merged names collapse into the one they go by, so a merged-away name is
  // never offered for reuse and its readings sit under the name kept.
  const stories = new Map();
  for (const row of await withStoryNames(rows.map(shape))) {
    const entry = stories.get(row.story) ?? { story: row.story, sentences: [] };
    entry.sentences.push({ at: row.created_at, text: row.explanation });
    stories.set(row.story, entry);
  }
  return [...stories.values()]
    .map((s) => ({
      ...s,
      readings: s.sentences.length,
      first_at: s.sentences[0].at,
      latest_at: s.sentences.at(-1).at,
      latest: s.sentences.at(-1).text,
    }))
    .sort((a, b) => b.latest_at.localeCompare(a.latest_at))
    .slice(0, limit);
}

// ---- story merges ----------------------------------------------------------

/** The merges in force, oldest first: every merge no undo row points at. */
export async function activeMerges() {
  await ensureSchema();
  const rows = await sql`
    SELECT m.id, m.created_at, m.alias, m.canonical, m.source, m.reading_id, m.note
      FROM story_merges m
     WHERE m.undoes IS NULL
       AND NOT EXISTS (SELECT 1 FROM story_merges u WHERE u.undoes = m.id)
     ORDER BY m.created_at ASC, m.id ASC`;
  return rows.map(shape);
}

/** Every merge and undo, newest first, for the admin page. */
export async function allMerges({ limit = 200 } = {}) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, created_at, alias, canonical, source, reading_id, note, undoes
      FROM story_merges ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
  return rows.map(shape);
}

export async function addMerge({ alias, canonical, source, reading_id = null, note = null, undoes = null }) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO story_merges (alias, canonical, source, reading_id, note, undoes)
    VALUES (${alias}, ${canonical}, ${source}, ${reading_id}, ${note}, ${undoes})
    RETURNING id, created_at, alias, canonical, source, reading_id, note, undoes`;
  return shape(rows[0]);
}

/** One merge row, or null. */
export async function mergeById(id) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM story_merges WHERE id = ${id}`;
  return rows[0] ? shape(rows[0]) : null;
}

/** Readings filed under each stored name, and when each was first used. */
export async function storyNameStats() {
  await ensureSchema();
  const rows = await sql`
    SELECT story, COUNT(*) AS readings, MIN(created_at) AS first
      FROM ratings WHERE status = 'ok' AND story IS NOT NULL GROUP BY story`;
  return rows.map((r) => ({ story: r.story, readings: num(r.readings) ?? 0, first: iso(r.first) }));
}

/** Rows with `story` resolved to the name it goes by. The row's own stored
 *  name is what the runs table shows; everything that groups reads this. */
async function withStoryNames(rows) {
  if (!rows.some((r) => r.story)) return rows;
  const map = aliasMap(await activeMerges());
  if (map.size === 0) return rows;
  return rows.map((r) => (r.story ? { ...r, story: canonicalStory(map, r.story) } : r));
}

/**
 * Readings no judgement was ever made for, oldest first — history from before
 * the judge existed, and rows a judge outage left behind. Fed to the admin
 * backfill, which judges them in order so each one sees the developments the
 * ones before it established.
 */
export async function unjudgedRatings({ limit = 20 } = {}) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, created_at, score, explanation
      FROM ratings
     WHERE status = 'ok' AND judge_version IS NULL
     ORDER BY created_at ASC, id ASC
     LIMIT ${limit}`;
  return rows.map(shape);
}

/** Attach a judgement to a reading already stored. */
export async function setJudgement(id, fields = {}) {
  await ensureSchema();
  // Only ever onto a reading nothing has judged: a stored judgement is never
  // recomputed.
  const rows = await sql`
    UPDATE ratings
       SET story = ${fields.story ?? null},
           development_of = ${fields.development_of ?? null},
           judge_version = ${fields.judge_version ?? null},
           judge_model = ${fields.judge_model ?? null},
           judge_note = ${fields.judge_note ?? null},
           judge_cost_usd = ${fields.judge_cost_usd ?? null}
     WHERE id = ${id} AND judge_version IS NULL
     RETURNING *`;
  return shape(rows[0]);
}

export async function latestAttempt() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM ratings ORDER BY created_at DESC, id DESC LIMIT 1`;
  return shape(rows[0]);
}

/**
 * Timeseries for the admin view.
 *
 * `ORDER BY created_at ASC LIMIT n` keeps the OLDEST n rows of the window, so
 * once a window exceeds the limit the chart silently drops everything recent —
 * and the admin page's right edge, its "Now" tile and its favicon are all
 * `points.at(-1)`. The inner query takes the newest rows; the outer one puts
 * them back ascending, which every consumer depends on. Both carry the `id`
 * tiebreaker, so rows sharing a timestamp neither straddle the cut nor swap.
 */
export async function history({ hours = 24 * 7, limit = 2000 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT * FROM (
      SELECT id, created_at, score, explanation, prompt_version, prompt_hash,
             prompt_verified, model, served_by, source, caller,
             story, development_of, judge_version, judge_model, judge_note
        FROM ratings
       WHERE status = 'ok' AND created_at >= ${since}
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit}
    ) recent
     ORDER BY created_at ASC, id ASC`;
  return withStoryNames(rows.map(shape));
}

/**
 * Failed runs in the chart window, so the chart can mark them rather than
 * silently drawing a straight line across the gap.
 *
 * Windowed like history() above, and for the same reason — worse here, since
 * failures cluster: a bad key on a 15-minute cron writes ~96 rows a day, so the
 * window fills with the start of an outage while the operator looks for its
 * current edge.
 */
export async function failures({ hours = 24 * 7, limit = 500 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT * FROM (
      SELECT id, created_at, error
        FROM ratings
       WHERE status = 'error' AND created_at >= ${since}
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit}
    ) recent
     ORDER BY created_at ASC, id ASC`;
  return rows.map(shape);
}

export async function recentAttempts(limit = 25) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, created_at, status, score, explanation, prompt_version, prompt_hash,
           prompt_verified, model, served_by, error, latency_ms, input_tokens,
           output_tokens, web_search_requests, cost_usd, source, caller, caller_meta,
           story, development_of, judge_version, judge_note
      FROM ratings ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
  return rows.map(shape);
}

/**
 * Aggregates for the admin tiles.
 *
 * Voided rows are excluded throughout: a voided reading is by definition one
 * that should never have counted, so leaving it in the run counts and the spend
 * totals reports probes and bug-written rows as real work. A genuine failure
 * stays in — it cost money and it happened.
 */
export async function stats({ hours = 24 * 7 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT COUNT(*)                                          AS total,
           COUNT(*) FILTER (WHERE status = 'ok')             AS ok,
           COUNT(*) FILTER (WHERE status = 'error')          AS errors,
           AVG(score) FILTER (WHERE status = 'ok')           AS avg_score,
           MAX(score) FILTER (WHERE status = 'ok')           AS max_score,
           MIN(score) FILTER (WHERE status = 'ok')           AS min_score,
           COALESCE(SUM(cost_usd) FILTER (WHERE source <> 'external'), 0) AS spend_usd,
           COALESCE(SUM(cost_usd) FILTER (WHERE source = 'external'), 0)  AS external_spend_usd,
           AVG(cost_usd) FILTER (WHERE source <> 'external')  AS avg_cost_usd,
           COUNT(*) FILTER (WHERE source = 'external')        AS external_runs,
           COALESCE(SUM(judge_cost_usd), 0)                   AS judge_spend_usd
      FROM ratings
     WHERE created_at >= ${since}
       AND (error IS NULL OR error NOT LIKE 'voided:%')`;
  const r = rows[0] ?? {};
  return {
    total: num(r.total) ?? 0,
    ok: num(r.ok) ?? 0,
    errors: num(r.errors) ?? 0,
    avg_score: r.avg_score === null ? null : num(r.avg_score),
    max_score: num(r.max_score),
    min_score: num(r.min_score),
    spend_usd: num(r.spend_usd) ?? 0,
    external_spend_usd: num(r.external_spend_usd) ?? 0,
    external_runs: num(r.external_runs) ?? 0,
    // The judge is not a run: it makes no reading and does no search. Its spend
    // is counted apart so a glance at "spend" stays a glance at rating cost.
    judge_spend_usd: num(r.judge_spend_usd) ?? 0,
    avg_cost_usd: r.avg_cost_usd === null ? null : num(r.avg_cost_usd),
  };
}

/**
 * Average real usage over recent successful runs, for cost estimates.
 *
 * The static fallback was measured once and proved optimistic — the first
 * production run used 65k input tokens and 8 searches, not the 40k/4 assumed.
 * Estimates now correct themselves as runs accumulate.
 */
export async function usageBaseline({ limit = 20 } = {}) {
  await ensureSchema();
  const rows = await sql`
    SELECT AVG(input_tokens)        AS input_tokens,
           AVG(output_tokens)       AS output_tokens,
           AVG(web_search_requests) AS web_search_requests,
           COUNT(*)                 AS runs
      FROM (
        SELECT input_tokens, output_tokens, web_search_requests
          FROM ratings
         WHERE status = 'ok' AND input_tokens IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ${limit}
      ) recent`;
  const r = rows[0] ?? {};
  const runs = num(r.runs) ?? 0;
  if (runs === 0) return { runs: 0, observed: false };
  return {
    runs,
    observed: true,
    inputTokens: Math.round(num(r.input_tokens) ?? 0),
    outputTokens: Math.round(num(r.output_tokens) ?? 0),
    webSearchRequests: Math.round(num(r.web_search_requests) ?? 0),
  };
}

// ---- rejections -----------------------------------------------------------
// What was refused and why, so the next 422 incident is answerable from stored
// data rather than from logs that have since expired.

/**
 * Record one rejection. Never throws, and the promise it returns never rejects.
 *
 * Never throws: a failure writing the audit row must not replace the answer
 * naming the field at fault. That is what makes it safe for the handler to
 * await it, which it must — a serverless function may be frozen the moment its
 * response ends, dropping an insert still in flight.
 */
export async function logRejection(row) {
  try {
    await ensureSchema();
    await sql`
      INSERT INTO rejections (status, reason, method, soft_errors, token)
      VALUES (${row.status}, ${row.reason}, ${row.method ?? null}, ${row.soft_errors ?? false}, ${row.token ?? null})`;
  } catch (err) {
    // Deliberately console.error and nothing else: a rejection that could not
    // be recorded is still a rejection the caller has to be told about.
    console.error('could not record rejection', err);
  }
}

/**
 * The recorded rejections, newest first, within the window the admin page asked
 * for — an incident is diagnosed by widening the range to reach it, so a fixed
 * newest-25 would put the rows the table exists for out of reach of every
 * endpoint as soon as 25 newer ones arrived.
 *
 * `status` needs no NUMERIC entry: it is a SMALLINT, which both drivers parse
 * natively, and that list is for types returned as strings.
 */
export async function recentRejections({ hours = 24 * 7, limit = 100 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT id, created_at, status, reason, method, soft_errors, token
      FROM rejections
     WHERE created_at >= ${since}
     ORDER BY created_at DESC, id DESC
     LIMIT ${limit}`;
  return rows.map(shape);
}

/** Record one authenticated fetch. Never throws: a fetch must be served even
 *  when its record cannot be written. Rows older than 30 days are pruned here,
 *  so the table stays a working window rather than an archive. */
export async function logCallerFetch({ path, format = null, token }) {
  try {
    await ensureSchema();
    await sql`DELETE FROM caller_fetches WHERE created_at < now() - interval '30 days'`;
    await sql`INSERT INTO caller_fetches (path, format, token) VALUES (${path}, ${format}, ${token})`;
  } catch (err) {
    console.error('could not record caller fetch', err);
  }
}

export async function recentCallerFetches({ hours = 24 * 7, limit = 1000 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT id, created_at, path, format, token FROM caller_fetches
     WHERE created_at >= ${since} ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
  return rows.map(shape);
}

/** Store one caller run report. */
export async function logCallerRun({ reading_id = null, report }) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO caller_runs (reading_id, report) VALUES (${reading_id}, ${report})
    RETURNING id, created_at, reading_id`;
  return shape(rows[0]);
}

/**
 * Run reports within the window the admin page asked for, newest first, each
 * with the score and sentence of the reading it submitted, if any.
 */
export async function recentCallerRuns({ hours = 24 * 7, limit = 200 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT c.id, c.created_at, c.reading_id, c.report, r.score, r.explanation
      FROM caller_runs c
      LEFT JOIN ratings r ON r.id = c.reading_id
     WHERE c.created_at >= ${since}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ${limit}`;
  return rows.map(shape);
}

// ---- settings -------------------------------------------------------------
// Runtime configuration the admin page can change without a redeploy.

export async function getSettings() {
  await ensureSchema();
  const rows = await sql`SELECT key, value FROM settings`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key, value) {
  await ensureSchema();
  await sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${String(value)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

// ---- push subscriptions ---------------------------------------------------
// Which devices want to hear about a high reading, and what has been sent.

/** The number of devices registered, for the cap on a public write route. */
export async function countPushSubscriptions() {
  await ensureSchema();
  const rows = await sql`SELECT COUNT(*) AS n FROM push_subscriptions`;
  return num(rows[0]?.n) ?? 0;
}

/** Register a device, or move an existing one to a new threshold. */
export async function upsertPushSubscription({ token, threshold, platform }) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO push_subscriptions (token, threshold, platform, created_at, updated_at)
    VALUES (${token}, ${threshold}, ${platform ?? null}, now(), now())
    ON CONFLICT (token) DO UPDATE
      SET threshold = EXCLUDED.threshold, platform = EXCLUDED.platform, updated_at = now()
    RETURNING token, threshold, platform, created_at, updated_at`;
  return shape(rows[0]);
}

/** Remove devices — the one that turned notifications off, or the ones Expo
 *  reported as no longer registered. Unknown tokens are a no-op. */
export async function deletePushSubscriptions(tokens = []) {
  if (tokens.length === 0) return 0;
  await ensureSchema();
  const rows = await sql`DELETE FROM push_subscriptions WHERE token = ANY(${tokens}) RETURNING token`;
  await sql`DELETE FROM push_receipts WHERE token = ANY(${tokens})`;
  for (const token of tokens) {
    await sql`UPDATE push_deliveries SET delivered = array_remove(delivered, ${token})
      WHERE ${token} = ANY(delivered)`;
  }
  return rows.length;
}

export async function savePushReceipt({ id, token, root, threshold }) {
  await ensureSchema();
  await sql`INSERT INTO push_receipts (id, token, root, threshold)
    VALUES (${id}, ${token}, ${root}, ${threshold}) ON CONFLICT (id) DO NOTHING`;
}

export async function duePushReceipts() {
  await ensureSchema();
  return await sql`SELECT * FROM push_receipts
    WHERE created_at <= now() - interval '15 minutes' ORDER BY created_at LIMIT 1000`;
}

/** An explicit provider rejection permits retry; unknown delivery does not. */
export async function finishPushReceipt(receipt, { retry = false } = {}) {
  await ensureSchema();
  // Delete and release atomically; duplicate receipt checks cannot undo a
  // later successful retry. Never re-create a registration after opt-out.
  await sql`WITH removed AS (
    DELETE FROM push_receipts WHERE id = ${receipt.id} RETURNING token, root, threshold
  ) UPDATE push_deliveries AS d
    SET delivered = array_remove(d.delivered, r.token), sent_at = NULL, released = true
    FROM removed AS r
    WHERE ${retry} AND d.root = r.root AND d.threshold = r.threshold
      AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.token = r.token)`;
}

/** Every device whose threshold this score meets. */
export async function pushSubscriptionsFor(score) {
  await ensureSchema();
  const rows = await sql`
    SELECT token, threshold, platform FROM push_subscriptions
     WHERE threshold <= ${score}
     ORDER BY threshold ASC, created_at ASC`;
  return rows.map(shape);
}

/** How long a claim with no send recorded is trusted before it is taken over. */
export const PUSH_CLAIM_STALE_MINUTES = 10;

/**
 * Claim a (development, threshold) pair for this reading. Returns null when
 * the pair was already announced, or is being announced right now — which is
 * what makes a re-report of a development that is still loud a silent one,
 * and two functions storing readings at once send once between them. A claim
 * its sender gave back, or one so old its sender cannot still be running, is
 * taken over rather than honoured, and comes with the tokens already reached
 * so the retry finishes the job instead of repeating it.
 *
 * @returns {Promise<{delivered: string[]} | null>}
 */
export async function claimPushDelivery({ root, threshold, readingId, score }) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO push_deliveries (root, threshold, reading_id, score, claimed_at, released, sent_at)
    VALUES (${root}, ${threshold}, ${readingId}, ${score}, now(), false, NULL)
    ON CONFLICT (root, threshold) DO UPDATE
      SET reading_id = EXCLUDED.reading_id, score = EXCLUDED.score, claimed_at = now(), released = false
      WHERE push_deliveries.sent_at IS NULL
        AND (push_deliveries.released
             OR push_deliveries.claimed_at < now() - make_interval(mins => ${PUSH_CLAIM_STALE_MINUTES}))
    RETURNING delivered`;
  if (rows.length === 0) return null;
  return { delivered: Array.isArray(rows[0].delivered) ? rows[0].delivered : [] };
}

/** Every recipient answered for: the pair is announced for good. */
export async function completePushDelivery({ root, threshold, delivered = [] }) {
  await ensureSchema();
  await sql`
    UPDATE push_deliveries
       SET sent_at = now(), delivered = array_cat(delivered, ${delivered}::text[]),
           recipients = cardinality(array_cat(delivered, ${delivered}::text[]))
     WHERE root = ${root} AND threshold = ${threshold}`;
}

/**
 * The send failed part-way: keep what was reached and give the pair back, so
 * the next reading of the development finishes with the rest.
 */
export async function releasePushDeliveries(claims = []) {
  await ensureSchema();
  for (const { root, threshold, delivered = [] } of claims) {
    await sql`
      UPDATE push_deliveries
         SET released = true, delivered = array_cat(delivered, ${delivered}::text[])
       WHERE root = ${root} AND threshold = ${threshold} AND sent_at IS NULL`;
  }
}

/**
 * First-report times for developments whose opening reading is older than the
 * replay window. A story running since Tuesday would otherwise date from the
 * edge of the window and read as younger than it is. Shared by /api/current
 * and the push announcer, which has to see the page's number, not its own.
 */
export async function rootTimes(ascending) {
  const present = new Set(ascending.map((r) => r.id));
  const missing = [...new Set(
    ascending
      .filter((r) => r.judge_version != null && r.development_of != null)
      .map((r) => r.development_of)
      .filter((id) => !present.has(id)),
  )];
  const rows = await ratingsByIds(missing);
  return new Map(rows.map((r) => [r.id, { t: Date.parse(r.created_at), story: r.story }]));
}
