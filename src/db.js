import { postgresEnvKeys, sql } from './sql.js';

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
    // Which development this reading reports, judged once on arrival and never
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
  'development_of', 'judge_version', 'judge_cost_usd',
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
  return rows.map(shape);
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
  const rows = await sql`
    UPDATE ratings
       SET story = ${fields.story ?? null},
           development_of = ${fields.development_of ?? null},
           judge_version = ${fields.judge_version ?? null},
           judge_model = ${fields.judge_model ?? null},
           judge_note = ${fields.judge_note ?? null},
           judge_cost_usd = ${fields.judge_cost_usd ?? null}
     WHERE id = ${id}
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
  return rows.map(shape);
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
           output_tokens, web_search_requests, cost_usd, source, caller, caller_meta
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
      INSERT INTO rejections (status, reason, method, soft_errors)
      VALUES (${row.status}, ${row.reason}, ${row.method ?? null}, ${row.soft_errors ?? false})`;
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
    SELECT id, created_at, status, reason, method, soft_errors
      FROM rejections
     WHERE created_at >= ${since}
     ORDER BY created_at DESC, id DESC
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
