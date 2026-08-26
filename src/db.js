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
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`CREATE INDEX IF NOT EXISTS ratings_created_at ON ratings (created_at DESC)`;
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
      web_search_requests, cost_usd, source, caller, caller_meta
    ) VALUES (
      ${row.created_at ?? new Date().toISOString()}, ${row.slot ?? null}, ${row.status},
      ${row.score ?? null}, ${row.explanation ?? null}, ${row.prompt_version},
      ${row.prompt_hash}, ${row.prompt_text}, ${row.model}, ${row.served_by ?? null},
      ${row.raw_output ?? null}, ${row.error ?? null}, ${row.latency_ms ?? null},
      ${row.input_tokens ?? null}, ${row.output_tokens ?? null},
      ${row.cache_read_tokens ?? null}, ${row.cache_write_tokens ?? null},
      ${row.web_search_requests ?? null}, ${row.cost_usd ?? null},
      ${row.source ?? 'cron'}, ${row.caller ?? null},
      ${row.caller_meta ? JSON.stringify(row.caller_meta) : null}::jsonb
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

export async function latestAttempt() {
  await ensureSchema();
  const rows = await sql`SELECT * FROM ratings ORDER BY created_at DESC, id DESC LIMIT 1`;
  return shape(rows[0]);
}

/** Timeseries for the admin view. */
export async function history({ hours = 24 * 7, limit = 2000 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT id, created_at, score, explanation, prompt_version, prompt_hash, model, served_by,
           source, caller
      FROM ratings
     WHERE status = 'ok' AND created_at >= ${since}
     ORDER BY created_at ASC
     LIMIT ${limit}`;
  return rows.map(shape);
}

/** Failed runs in the chart window, so the chart can mark them rather than
 *  silently drawing a straight line across the gap. */
export async function failures({ hours = 24 * 7, limit = 500 } = {}) {
  await ensureSchema();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await sql`
    SELECT id, created_at, error
      FROM ratings
     WHERE status = 'error' AND created_at >= ${since}
     ORDER BY created_at ASC
     LIMIT ${limit}`;
  return rows.map(shape);
}

export async function recentAttempts(limit = 25) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, created_at, status, score, explanation, prompt_version, prompt_hash,
           model, served_by, error, latency_ms, input_tokens, output_tokens,
           web_search_requests, cost_usd, source, caller, caller_meta
      FROM ratings ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
  return rows.map(shape);
}

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
           COUNT(*) FILTER (WHERE source = 'external')        AS external_runs
      FROM ratings WHERE created_at >= ${since}`;
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
