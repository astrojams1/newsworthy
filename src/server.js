import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';

import { correctUsage, failures, history, insertRating, latestAttempt, latestRating, pingDatabase, postgresEnvKeys, recentAttempts, recentRatings, stats, usageBaseline, voidRating } from './db.js';
import { currentReading, displayedSeries } from './current.js';
import { allPrompts, latestVersion, renderPrompt } from './prompts.js';
import { SubmissionError, submissionFromQuery, validateSubmission } from './ingest.js';
import { callerInstructions } from './caller.js';
import { openapiDocument } from './openapi.js';
import { INTERVAL_CHOICES, effectiveConfig, intervalLabel, updateConfig } from './config.js';
import { estimateCostUsd, modelCatalogue, projectMonthlyUsd } from './pricing.js';
import { isRunning, start, tick } from './scheduler.js';
import { slotFor } from './rate.js';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const CALLER_TOKEN = process.env.CALLER_TOKEN || '';
const ON_VERCEL = Boolean(process.env.VERCEL);
// vercel.json fires /api/cron on this cadence; the configured interval is
// enforced by the slot on top of it.
const CRON_TICK_MINUTES = 15;
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

/**
 * A rejection a body-blind client can read. A caller agent's fetch tool
 * surfaces the response body only on 2xx: on a 422 it returns the status code
 * and nothing else, so the message naming the field at fault — the whole point
 * of a 422 here — never reaches the caller. One run burned four attempts
 * against that wall and settled for a worse explanation than the one it had.
 * The reason goes in a header as well as the body, and headers survive where
 * bodies do not.
 */
const because = (message) => ({ 'x-newsworthy-error': message });

/**
 * A rejection some clients can actually read.
 *
 * The header above was the first attempt and it failed: the caller it was built
 * for cannot see headers either. Its fetch tool collapses every non-2xx into
 * one envelope — `{"error_type":"CLIENT_ERROR","message":"The page returned a
 * 422 client error"}` — with no headers, no body and no status text. For that
 * client the only readable channel is a 2xx.
 *
 * So `soft_errors=1` is opt-in: a caller that sets it gets 200 with the real
 * status in the body, and every other client keeps ordinary status codes. The
 * body always carries `ok` and `stored`, because a 200 that means "rejected" is
 * a trap for anything that reads only the status line — a caller asking for
 * this has to be told plainly that nothing was written.
 */
function rejection(res, url, status, message) {
  console.warn(`reading rejected ${status}: ${message}`);
  if (url.searchParams.get('soft_errors') === '1') {
    return json(res, 200, { ok: false, stored: false, status, error: message }, because(message));
  }
  return json(res, status, { error: message }, because(message));
}

function secretMatches(supplied, expected) {
  const a = Buffer.from(String(supplied ?? ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(url, req) {
  if (!ADMIN_TOKEN) return true;
  return secretMatches(url.searchParams.get('token') || req.headers['x-admin-token'], ADMIN_TOKEN);
}

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * set on the project. The admin token is also accepted so /admin's "Rate now"
 * button can reach the same endpoint.
 */
function cronAuthorized(url, req) {
  if (CRON_SECRET && secretMatches(req.headers.authorization, `Bearer ${CRON_SECRET}`)) return true;
  if (ADMIN_TOKEN && authorized(url, req)) return true;
  if (CRON_SECRET || ADMIN_TOKEN) return false;
  // Nothing configured: open locally for convenience, never on a public
  // deployment — an open /api/cron is an open tab on someone's API bill.
  return !ON_VERCEL;
}

/**
 * External callers get their own token, so an agent can submit readings
 * without being handed the admin token. ADMIN_TOKEN also works.
 */
function callerAuthorized(url, req) {
  const supplied =
    url.searchParams.get('token') || req.headers['x-newsworthy-token'] || req.headers['x-admin-token'];
  if (CALLER_TOKEN && secretMatches(supplied, CALLER_TOKEN)) return true;
  if (ADMIN_TOKEN && secretMatches(supplied, ADMIN_TOKEN)) return true;
  if (CALLER_TOKEN || ADMIN_TOKEN) return false;
  return !ON_VERCEL; // open only when self-hosted with nothing configured
}

async function readJsonBody(req, limitBytes = 8_192) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveStatic(res, name) {
  const safe = normalize(name).replace(/^(\.\.[/\\])+/, '');
  const path = join(PUBLIC_DIR, safe);
  if (!path.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
  try {
    const body = await readFile(path);
    const ext = safe.slice(safe.lastIndexOf('.'));
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    // ---- public ----------------------------------------------------------
    if (path === '/' && req.method === 'GET') return serveStatic(res, 'index.html');

    if (path === '/api/current' && req.method === 'GET') {
      // The window is time-bounded, so it comes back empty whenever the newest
      // reading is older than it — a stalled caller, or a cron cadence wider
      // than the window. That is a stale reading, not a missing one, and it is
      // still the best answer available.
      const recent = await recentRatings();
      const fallback = recent.length ? null : await latestRating();
      if (!recent.length && !fallback) {
        const attempt = await latestAttempt();
        return json(res, 503, {
          error: attempt ? 'no successful rating yet' : 'no rating yet',
          detail: attempt?.error ?? null,
        });
      }
      const { row, basis } = recent.length
        ? currentReading(recent)
        : { row: fallback, basis: 'stale' };
      // No countdown: an external caller can post a reading at any moment, so
      // the next update is genuinely not predictable. The page states when the
      // current reading arrived and nothing more.
      // The score is smoothed; the sentence is not. The number answers "how
      // newsworthy is it", which is a level and benefits from a median. The
      // sentence answers "what happened", which is a fact about right now and
      // gets stale — a median row's sentence can be hours behind the news it
      // sits beside. So they come from different rows on purpose, and the page
      // is dated from the sentence's row, which is always the newest reading.
      const newest = recent[0] ?? row;
      return json(res, 200, {
        score: row.score,
        explanation: newest.explanation,
        created_at: newest.created_at,
        // Which row the score came from, when it is not the newest. Never
        // displayed; the first thing wanted when a number looks wrong.
        score_from: row.created_at === newest.created_at ? undefined : row.created_at,
        source: newest.source ?? 'cron',
        // Not displayed. Which rule produced the number is the first thing
        // anyone debugging a surprising front page will want.
        basis,
        window: recent.length,
      });
    }

    if (path === '/healthz' && req.method === 'GET') {
      const db = await pingDatabase().then(() => 'ok', (err) => String(err?.message ?? err));
      return json(res, db === 'ok' ? 200 : 503, {
        ok: db === 'ok',
        database: db,
        running: isRunning(),
        platform: ON_VERCEL ? 'vercel' : 'node',
        anthropic_key: Boolean(process.env.ANTHROPIC_API_KEY),
        cron_secret: Boolean(CRON_SECRET),
        postgres_env_keys: postgresEnvKeys(), // names only, never values
        // Which commit is actually serving. Vercel injects these; locally they
        // are absent. Answers "is my push live yet?" without reading logs.
        git_branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
        git_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null
      });
    }

    // ---- the 15-minute job ----------------------------------------------
    // Vercel Cron issues a GET; the admin button issues a POST.
    if (path === '/api/cron') {
      if (!cronAuthorized(url, req)) {
        const unconfigured = ON_VERCEL && !CRON_SECRET && !ADMIN_TOKEN;
        return json(res, unconfigured ? 503 : 401, {
          error: unconfigured
            ? 'CRON_SECRET is not set — refusing to run an unauthenticated rating on a public deployment'
            : 'unauthorized',
        });
      }
      if (isRunning()) return json(res, 409, { error: 'a rating is already in flight' });
      const force = url.searchParams.get('force') === '1';
      const { intervalMinutes } = await effectiveConfig();
      const row = await tick(req.headers['x-vercel-cron-schedule'] ? 'vercel-cron' : 'manual', {
        slot: slotFor(new Date(), intervalMinutes),
        force,
      });
      if (!row) return json(res, 409, { error: 'busy' });
      if (row.skipped) {
        return json(res, 200, {
          status: 'skipped',
          reason: row.reason,
          age_minutes: row.age_minutes,
          last_source: row.source,
        });
      }
      return json(res, row.status === 'ok' ? 200 : 500, {
        status: row.status,
        score: row.score ?? null,
        explanation: row.explanation ?? null,
        deduped: Boolean(row.deduped),
        cost_usd: row.cost_usd ?? null,
        error: row.error ?? null,
      });
    }

    // ---- external caller agents -----------------------------------------
    // One fetch that tells a caller agent everything, with the rating prompt
    // embedded — so a caller is configured with a URL, not pasted instructions.
    if (path === '/api/instructions' && req.method === 'GET') {
      if (!callerAuthorized(url, req)) return json(res, 401, { error: 'unauthorized' });
      // Always the current prompt. This used to honour ?version=N, which broke
      // the one guarantee the caller surface makes: a caller passing version=7
      // was served v7's text and told "version 7" in the page, while its
      // submission was stamped v9, because ingest always stamps latestVersion().
      // A reading rated on a retired scale then looked, in the database, like a
      // reading rated on the current one. Nothing documented the parameter and
      // nothing used it; it existed only to be got wrong.
      const prompt = renderPrompt(latestVersion());
      const proto = req.headers['x-forwarded-proto'] ?? (ON_VERCEL ? 'https' : 'http');
      const baseUrl = `${proto}://${req.headers.host ?? 'localhost'}`;
      const text = callerInstructions({ baseUrl, prompt });

      // JSON on request, for a client that only accepts JSON.
      const wantsJson =
        url.searchParams.get('format') === 'json' ||
        (req.headers.accept ?? '').includes('application/json');
      if (wantsJson) {
        return json(res, 200, { version: prompt.version, hash: prompt.hash, instructions: text });
      }

      // text/plain, not text/markdown: agent fetch tools reject unfamiliar MIME
      // types before exposing the body, and one did. The content is markdown
      // either way — the header just has to be something every client accepts.
      res.writeHead(200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      });
      return res.end(text);
    }

    // A machine-readable description of the two caller endpoints, for an agent
    // that can only reach the network through a declared tool — a ChatGPT
    // Custom GPT Action being the case that forced this. Unauthenticated on
    // purpose: it describes a token-gated API without containing a token, and
    // the schema importer that fetches it cannot present one. The prompt stays
    // behind /api/instructions.
    if (path === '/api/openapi.json' && req.method === 'GET') {
      const proto = req.headers['x-forwarded-proto'] ?? (ON_VERCEL ? 'https' : 'http');
      const baseUrl = `${proto}://${req.headers.host ?? 'localhost'}`;
      return json(res, 200, openapiDocument({ baseUrl }));
    }

    if (path === '/api/prompt' && req.method === 'GET') {
      if (!callerAuthorized(url, req)) return json(res, 401, { error: 'unauthorized' });
      // Current only, for the same reason as /api/instructions above. The full
      // history stays at /api/admin/prompts, behind the admin token, where
      // reading an old version cannot be mistaken for rating against one.
      try {
        const prompt = renderPrompt(latestVersion());
        return json(res, 200, {
          version: prompt.version,
          label: prompt.label,
          hash: prompt.hash,
          text: prompt.text,
          submit_to: '/api/readings',
        });
      } catch (err) {
        return json(res, 404, { error: String(err?.message ?? err) });
      }
    }

    // GET is accepted alongside POST because some agents can only issue a
    // plain fetch: no custom headers, no request body. Those carry the token
    // and the reading in the query string instead.
    if (path === '/api/readings' && (req.method === 'POST' || req.method === 'GET')) {
      // Auth is softened too. A caller that cannot read a 401 is stuck
      // permanently and silently, which is the worst of the failures here, and
      // nothing is disclosed: this route and its token requirement are
      // published in the instructions.
      if (!callerAuthorized(url, req)) return rejection(res, url, 401, 'unauthorized');
      let body;
      try {
        body = req.method === 'GET' ? submissionFromQuery(url.searchParams) : await readJsonBody(req);
      } catch (err) {
        const message = String(err?.message ?? err);
        return rejection(res, url, err instanceof SubmissionError ? 422 : 400, message);
      }
      try {
        const submission = validateSubmission(body);
        // slot = NULL: an external reading never competes for a cron slot. It
        // suppresses the next cron run by being recent, not by claiming a slot.
        const saved = await insertRating({ ...submission, slot: null });
        console.log(`external reading: ${saved.score}/10 (prompt v${saved.prompt_version})`);
        return json(res, 201, {
          // Paired with the rejection shape, so a soft-error caller branches on
          // one field rather than on a status line it may not be able to read.
          ok: true,
          stored: true,
          id: saved.id,
          created_at: saved.created_at,
          score: saved.score,
          source: saved.source,
          prompt_version: saved.prompt_version,
          prompt_hash: saved.prompt_hash,
          // Name anything the caller sent that was not stored, so a caller
          // working from an older spec learns its model and token counts went
          // nowhere rather than assuming they landed.
          ...(submission.note ? { note: submission.note } : {}),
        });
      } catch (err) {
        // Logged, not just returned. Nothing was recorded about the two 422s
        // that cost a caller its explanation on 2026-08-28, so which of the
        // four rules fired could not be established afterwards from anything.
        if (err instanceof SubmissionError) return rejection(res, url, 422, err.message);
        throw err;
      }
    }

    // ---- admin -----------------------------------------------------------
    const isAdminRoute = path === '/admin' || path.startsWith('/api/admin/');
    if (isAdminRoute && !authorized(url, req)) {
      if (path === '/admin') return serveStatic(res, 'admin.html'); // page prompts for a token
      return json(res, 401, { error: 'unauthorized' });
    }

    if (path === '/admin' && req.method === 'GET') return serveStatic(res, 'admin.html');

    if (path === '/api/admin/history' && req.method === 'GET') {
      const hours = Math.min(Number(url.searchParams.get('hours')) || 168, 24 * 365);
      const [statsRow, points, failedRuns, attempts, config] = await Promise.all([
        stats({ hours }),
        history({ hours }),
        failures({ hours }),
        recentAttempts(25),
        effectiveConfig(),
      ]);
      return json(res, 200, {
        hours,
        // Each point carries what the front page would have shown at that
        // moment, so the chart can draw the displayed value against the raw
        // readings without reimplementing the rule.
        points: displayedSeries(points.map((p) => ({ ...p, t: Date.parse(p.created_at) })))
          .map(({ t, ...rest }) => rest),
        interval_minutes: config.intervalMinutes,
        cadence: intervalLabel(config.intervalMinutes),
        model: config.model,
        projected_monthly_usd: projectMonthlyUsd(statsRow.avg_cost_usd, config.intervalMinutes),
        stats: statsRow,
        failures: failedRuns,
        attempts,
        prompts: allPrompts().map(({ text, ...rest }) => ({ ...rest, chars: text.length })),
      });
    }

    if (path === '/api/admin/settings') {
      if (req.method === 'GET') {
        const [config, baseline] = await Promise.all([effectiveConfig(), usageBaseline()]);
        return json(res, 200, {
          model: config.model,
          interval_minutes: config.intervalMinutes,
          // Priced from this deployment's own recent runs where possible, so
          // the preview reflects reality rather than a one-off measurement.
          usage_basis: baseline,
          models: modelCatalogue(baseline.observed ? baseline : undefined),
          intervals: INTERVAL_CHOICES.map((m) => ({ minutes: m, label: intervalLabel(m) })),
          cron_tick_minutes: 15,
        });
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        try {
          const config = await updateConfig(body);
          console.log(`settings updated: model=${config.model} interval=${config.intervalMinutes}m`);
          return json(res, 200, { model: config.model, interval_minutes: config.intervalMinutes });
        } catch (err) {
          return json(res, 400, { error: String(err?.message ?? err) });
        }
      }
    }

    const voidMatch = path.match(/^\/api\/admin\/readings\/(\d+)\/void$/);
    if (voidMatch && req.method === 'POST') {
      const reason = url.searchParams.get('reason') || 'voided by admin';
      const row = await voidRating(Number(voidMatch[1]), reason);
      if (!row) return json(res, 404, { error: 'no such reading' });
      console.log(`voided reading ${row.id}: ${reason}`);
      return json(res, 200, { id: row.id, status: row.status, error: row.error });
    }

    // Correct a reading whose usage was wrong without discarding the reading.
    // Body fields are optional; anything omitted is cleared. Cost is recomputed
    // from what survives rather than carried over, so a cleared token count
    // cannot leave its price behind.
    const usageMatch = path.match(/^\/api\/admin\/readings\/(\d+)\/usage$/);
    if (usageMatch && req.method === 'POST') {
      let body;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        return json(res, 400, { error: String(err?.message ?? err) });
      }
      const count = (value) => (value === undefined || value === null ? null : Math.round(Number(value)));
      const usage = {
        input_tokens: count(body.input_tokens),
        output_tokens: count(body.output_tokens),
        web_search_requests: count(body.web_search_requests),
      };
      for (const [field, value] of Object.entries(usage)) {
        if (value !== null && (!Number.isFinite(value) || value < 0)) {
          return json(res, 422, { error: `${field} must be a non-negative number or null` });
        }
      }
      const existing = (await recentAttempts(200)).find((r) => r.id === Number(usageMatch[1]));
      if (!existing) return json(res, 404, { error: 'no such reading' });
      const cost = estimateCostUsd({
        model: existing.model,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        webSearchRequests: usage.web_search_requests ?? 0,
      });
      const row = await correctUsage(Number(usageMatch[1]), { ...usage, cost_usd: cost });
      console.log(`corrected usage on reading ${row.id}: cost now ${row.cost_usd}`);
      return json(res, 200, {
        id: row.id,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
        web_search_requests: row.web_search_requests,
        cost_usd: row.cost_usd,
      });
    }

    if (path === '/api/admin/prompts' && req.method === 'GET') {
      return json(res, 200, { prompts: allPrompts() });
    }

    return serveStatic(res, path.slice(1));
  } catch (err) {
    console.error('request failed', err);
    return json(res, 500, { error: 'internal error', detail: String(err?.message ?? err) });
  }
});

// No exports: Vercel's Node runtime validates the entrypoint module's exports
// and captures the listen() call below to serve it. A named-only export is
// rejected outright ("The default export must be a function or server"), and
// exporting the Server instance fails at boot — the documented shape is a
// side-effect-only module.
server.listen(PORT, () => {
  console.log(`Newsworthy on http://localhost:${PORT}  (admin: /admin)`);
  if (!ADMIN_TOKEN) console.warn('ADMIN_TOKEN is unset — the admin view is open to anyone.');

  // On Vercel the process is frozen between requests, so an in-process timer
  // would never fire reliably. Vercel Cron calls /api/cron instead.
  if (ON_VERCEL) {
    console.log('Running on Vercel — ratings come from Vercel Cron hitting /api/cron.');
  } else if (process.env.NEWSWORTHY_NO_SCHEDULER !== '1') {
    start();
  }
});
