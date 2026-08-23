import { neon } from '@neondatabase/serverless';

/**
 * One tagged-template `sql` function for the whole app.
 *
 * Production uses Neon's HTTP driver: no connection pool to exhaust, which is
 * what makes it safe in a serverless function that may cold-start on any
 * request. Tests swap in PGlite (real Postgres, in-process) so the SQL is
 * exercised for real rather than mocked.
 *
 * The driver is built lazily on first query, never at import. A missing
 * DATABASE_URL then surfaces as a readable error on the API routes instead of
 * killing the whole function at cold start — the front page still renders.
 */
let driverPromise;

// Vercel's Postgres integrations inject under several different names
// depending on the store and whether a custom prefix was chosen.
const URL_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
];

export function connectionUrl() {
  for (const name of URL_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

/** Names only, never values — safe to surface on /healthz. */
export function postgresEnvKeys() {
  return Object.keys(process.env)
    .filter((k) => /^(.*_)?(DATABASE_URL|POSTGRES_)/.test(k) || /^PG(HOST|USER|DATABASE)$/.test(k))
    .sort();
}

async function createDriver() {
  if (process.env.NEWSWORTHY_SQL_DRIVER === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite(process.env.NEWSWORTHY_PGLITE_DIR || undefined);
    await db.waitReady;
    return async (strings, ...values) => (await db.sql(strings, ...values)).rows;
  }

  const url = connectionUrl();
  if (!url) {
    const seen = postgresEnvKeys();
    throw new Error(
      'No Postgres connection string in the environment. On Vercel: Storage → ' +
        'create a Neon database and connect it to this project, then redeploy. ' +
        (seen.length
          ? `Postgres-looking variables present: ${seen.join(', ')} — if the store used a ` +
            'custom prefix, add DATABASE_URL pointing at the same value.'
          : 'No Postgres-looking variables are present at all.'),
    );
  }
  return neon(url);
}

export async function sql(strings, ...values) {
  driverPromise ??= createDriver();
  try {
    const driver = await driverPromise;
    return await driver(strings, ...values);
  } catch (err) {
    driverPromise = undefined; // let the next request retry a failed connection
    throw err;
  }
}
