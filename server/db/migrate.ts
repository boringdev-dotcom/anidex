import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

/** Apply pending .sql migrations in order, each in its own transaction. Safe to run on every start. */
export async function migrate(pool: pg.Pool) {
  const dir = join(import.meta.dirname, 'migrations');
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock(7140)'); // one migrator at a time across instances
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await client.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name));
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await client.query('begin');
      try {
        await client.query(readFileSync(join(dir, f), 'utf8'));
        await client.query('insert into schema_migrations (name) values ($1)', [f]);
        await client.query('commit');
        console.log(`[db] applied ${f}`);
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock(7140)').catch(() => {});
    client.release();
  }
}
