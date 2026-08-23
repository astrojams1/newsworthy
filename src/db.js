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

function shape(row) {
  if (!row) return undefined;
  return {
    ...row,
    id: num(row.id),
    created_at: iso(row.created_at),
    slot: iso(row.slot),
    score: num(row.score),
    prompt_version: num(row.prompt_version),
    latency_ms: num(row.latency_ms),
    input_tokens: num(row.input_tokens),
    output_tokens: num(row.output_tokens),
  };
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
      input_tokens, output_tokens
    ) VALUES (
      ${row.created_at ?? new Date().toISOString()}, ${row.slot ?? null}, ${row.status},
      ${row.score ?? null}, ${row.explanation ?? null}, ${row.prompt_version},
      ${row.prompt_hash}, ${row.prompt_text}, ${row.model}, ${row.served_by ?? null},
      ${row.raw_output ?? null}, ${row.error ?? null}, ${row.latency_ms ?? null},
      ${row.input_tokens ?? null}, ${row.output_tokens ?? null}
    )
    ON CONFLICT DO NOTHING
    RETURNING *`;

  if (rows.length > 0) return shape(rows[0]);
  return { ...(await ratingForSlot(row.slot)), deduped: true };
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
    SELECT id, created_at, score, explanation, prompt_version, prompt_hash, model, served_by
      FROM ratings
     WHERE status = 'ok' AND created_at >= ${since}
     ORDER BY created_at ASC
     LIMIT ${limit}`;
  return rows.map(shape);
}

export async function recentAttempts(limit = 25) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, created_at, status, score, explanation, prompt_version, prompt_hash,
           model, served_by, error, latency_ms
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
           MIN(score) FILTER (WHERE status = 'ok')           AS min_score
      FROM ratings WHERE created_at >= ${since}`;
  const r = rows[0] ?? {};
  return {
    total: num(r.total) ?? 0,
    ok: num(r.ok) ?? 0,
    errors: num(r.errors) ?? 0,
    avg_score: r.avg_score === null ? null : num(r.avg_score),
    max_score: num(r.max_score),
    min_score: num(r.min_score),
  };
}
