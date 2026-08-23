import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = resolve(process.env.NEWSWORTHY_DB || './data/newsworthy.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     TEXT    NOT NULL,           -- ISO-8601 UTC
    status         TEXT    NOT NULL,           -- 'ok' | 'error'
    score          INTEGER,                    -- 1-10, null when status='error'
    explanation    TEXT,
    prompt_version INTEGER NOT NULL,
    prompt_hash    TEXT    NOT NULL,           -- sha256 of the exact text sent
    prompt_text    TEXT    NOT NULL,           -- the exact text sent
    model          TEXT    NOT NULL,           -- model we asked for
    served_by      TEXT,                       -- model that actually answered
    raw_output     TEXT,                       -- verbatim final text block
    error          TEXT,
    latency_ms     INTEGER,
    input_tokens   INTEGER,
    output_tokens  INTEGER
  );
  CREATE INDEX IF NOT EXISTS ratings_created_at ON ratings (created_at);
  CREATE INDEX IF NOT EXISTS ratings_status_created_at ON ratings (status, created_at);
`);

const insertStmt = db.prepare(`
  INSERT INTO ratings (
    created_at, status, score, explanation, prompt_version, prompt_hash,
    prompt_text, model, served_by, raw_output, error, latency_ms,
    input_tokens, output_tokens
  ) VALUES (
    @created_at, @status, @score, @explanation, @prompt_version, @prompt_hash,
    @prompt_text, @model, @served_by, @raw_output, @error, @latency_ms,
    @input_tokens, @output_tokens
  )
`);

export function insertRating(row) {
  const info = insertStmt.run({
    created_at: row.created_at ?? new Date().toISOString(),
    status: row.status,
    score: row.score ?? null,
    explanation: row.explanation ?? null,
    prompt_version: row.prompt_version,
    prompt_hash: row.prompt_hash,
    prompt_text: row.prompt_text,
    model: row.model,
    served_by: row.served_by ?? null,
    raw_output: row.raw_output ?? null,
    error: row.error ?? null,
    latency_ms: row.latency_ms ?? null,
    input_tokens: row.input_tokens ?? null,
    output_tokens: row.output_tokens ?? null,
  });
  return getRating(info.lastInsertRowid);
}

export function getRating(id) {
  return db.prepare('SELECT * FROM ratings WHERE id = ?').get(id);
}

/** The number the front page shows. */
export function latestRating() {
  return db
    .prepare("SELECT * FROM ratings WHERE status = 'ok' ORDER BY created_at DESC, id DESC LIMIT 1")
    .get();
}

export function latestAttempt() {
  return db.prepare('SELECT * FROM ratings ORDER BY created_at DESC, id DESC LIMIT 1').get();
}

/** Timeseries for the admin view. */
export function history({ hours = 24 * 7, limit = 2000 } = {}) {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  return db
    .prepare(
      `SELECT id, created_at, score, explanation, prompt_version, prompt_hash, model, served_by
         FROM ratings
        WHERE status = 'ok' AND created_at >= ?
        ORDER BY created_at ASC
        LIMIT ?`,
    )
    .all(since, limit);
}

export function recentAttempts(limit = 25) {
  return db
    .prepare(
      `SELECT id, created_at, status, score, explanation, prompt_version, prompt_hash,
              model, served_by, error, latency_ms
         FROM ratings ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(limit);
}

export function stats({ hours = 24 * 7 } = {}) {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  return db
    .prepare(
      `SELECT COUNT(*)                                     AS total,
              SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END)    AS ok,
              SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
              AVG(CASE WHEN status = 'ok' THEN score END)       AS avg_score,
              MAX(CASE WHEN status = 'ok' THEN score END)       AS max_score,
              MIN(CASE WHEN status = 'ok' THEN score END)       AS min_score
         FROM ratings WHERE created_at >= ?`,
    )
    .get(since);
}
