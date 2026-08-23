import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';

import { history, latestAttempt, latestRating, pingDatabase, recentAttempts, stats } from './db.js';
import { allPrompts } from './prompts.js';
import { isRunning, start, tick } from './scheduler.js';
import { DEFAULT_MODEL, INTERVAL_MINUTES, slotFor } from './rate.js';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const ON_VERCEL = Boolean(process.env.VERCEL);
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
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
  if (ADMIN_TOKEN) return authorized(url, req);
  return !CRON_SECRET;
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
      const row = await latestRating();
      if (!row) {
        const attempt = await latestAttempt();
        return json(res, 503, {
          error: attempt ? 'no successful rating yet' : 'no rating yet',
          detail: attempt?.error ?? null,
        });
      }
      return json(res, 200, {
        score: row.score,
        explanation: row.explanation,
        created_at: row.created_at,
        next_update_minutes: INTERVAL_MINUTES,
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
      });
    }

    // ---- the 15-minute job ----------------------------------------------
    // Vercel Cron issues a GET; the admin button issues a POST.
    if (path === '/api/cron') {
      if (!cronAuthorized(url, req)) return json(res, 401, { error: 'unauthorized' });
      if (isRunning()) return json(res, 409, { error: 'a rating is already in flight' });
      const force = url.searchParams.get('force') === '1';
      const row = await tick(req.headers['x-vercel-cron-schedule'] ? 'vercel-cron' : 'manual', {
        slot: slotFor(),
        force,
      });
      if (!row) return json(res, 409, { error: 'busy' });
      return json(res, row.status === 'ok' ? 200 : 500, {
        status: row.status,
        score: row.score ?? null,
        explanation: row.explanation ?? null,
        deduped: Boolean(row.deduped),
        error: row.error ?? null,
      });
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
      const [statsRow, points, attempts] = await Promise.all([
        stats({ hours }),
        history({ hours }),
        recentAttempts(25),
      ]);
      return json(res, 200, {
        hours,
        interval_minutes: INTERVAL_MINUTES,
        model: DEFAULT_MODEL,
        stats: statsRow,
        points,
        attempts,
        prompts: allPrompts().map(({ text, ...rest }) => ({ ...rest, chars: text.length })),
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
