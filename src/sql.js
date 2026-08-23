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

async function createDriver() {
  if (process.env.NEWSWORTHY_SQL_DRIVER === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite(process.env.NEWSWORTHY_PGLITE_DIR || undefined);
    await db.waitReady;
    return async (strings, ...values) => (await db.sql(strings, ...values)).rows;
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. On Vercel: Storage → add a Neon Postgres database ' +
        'and it is injected automatically. Locally: `vercel env pull .env`.',
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
