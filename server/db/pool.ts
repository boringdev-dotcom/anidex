import pg from 'pg';

const url = process.env.DATABASE_URL;

/**
 * TLS: Render's internal URLs (host "dpg-…-a") and local databases need none; Render's external
 * URLs and most hosted databases require it. An explicit `sslmode` in the URL or PGSSLMODE wins.
 */
function sslFor(u: string): pg.PoolConfig['ssl'] {
  if (/[?&]sslmode=/.test(u)) return undefined; // let pg read it from the URL
  if (process.env.PGSSLMODE === 'disable') return false;
  const host = new URL(u).hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === 'host.docker.internal' || !host.includes('.');
  return local ? false : { rejectUnauthorized: false };
}

/** null when no database is configured: the API then serves the bundled curated species. */
export const pool: pg.Pool | null = url
  ? new pg.Pool({ connectionString: url, ssl: sslFor(url), max: 8, idleTimeoutMillis: 30_000 })
  : null;

pool?.on('error', (err) => console.error('[db] idle client error', err.message));
