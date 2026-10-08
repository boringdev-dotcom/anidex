/**
 * A small Postgres-backed job queue, run inside the web service. Jobs are keyed (kind, key) so a
 * species is researched at most once at a time; a daily cap bounds API spend.
 */
import type pg from 'pg';
import { researchEnabled, researchSpecies } from './research.ts';

export type ResearchState = 'done' | 'queued' | 'running' | 'failed' | 'capped' | 'unavailable';

const DAILY_CAP = Number(process.env.RESEARCH_DAILY_CAP ?? 30);
const MAX_ATTEMPTS = 2;

export async function researchState(db: pg.Pool, slug: string): Promise<{ state: ResearchState; position?: number; error?: string }> {
  const sp = await db.query<{ tier: string; has: boolean }>(`select tier, data ? 'research' as has from species where slug = $1`, [slug]);
  if (!sp.rowCount) return { state: 'unavailable' };
  if (sp.rows[0].tier === 'deep' || sp.rows[0].has) return { state: 'done' };
  const job = await db.query<{ status: string; error: string | null; created_at: Date }>(`select status, error, created_at from jobs where kind = 'research' and key = $1`, [slug]);
  if (!job.rowCount) return { state: researchEnabled() ? 'unavailable' : 'unavailable' };
  const j = job.rows[0];
  if (j.status === 'queued') {
    const ahead = await db.query<{ n: string }>(`select count(*) as n from jobs where kind = 'research' and status in ('queued','running') and created_at < $1`, [j.created_at]);
    return { state: 'queued', position: Number(ahead.rows[0].n) };
  }
  if (j.status === 'running') return { state: 'running' };
  if (j.status === 'done') return { state: 'done' };
  return { state: 'failed', error: j.error ?? undefined };
}

/** Queue research for a species if it has none. Returns the resulting state. */
export async function requestResearch(db: pg.Pool, slug: string) {
  const now = await researchState(db, slug);
  if (now.state === 'done' || now.state === 'queued' || now.state === 'running') return now;
  if (!researchEnabled()) return { state: 'unavailable' as const };
  const today = await db.query<{ n: string }>(`select count(*) as n from jobs where kind = 'research' and created_at > now() - interval '24 hours'`);
  if (Number(today.rows[0].n) >= DAILY_CAP) return { state: 'capped' as const };
  await db.query(
    `insert into jobs (kind, key) values ('research', $1)
     on conflict (kind, key) do update set status = 'queued', error = null, created_at = now()
       where jobs.status = 'failed' and jobs.attempts < $2`,
    [slug, MAX_ATTEMPTS],
  );
  return researchState(db, slug);
}

async function runResearch(db: pg.Pool, slug: string) {
  const r = await db.query(`select data from species where slug = $1`, [slug]);
  if (!r.rowCount) throw new Error('species not found');
  const result = await researchSpecies(r.rows[0].data);
  await db.query(`update species set data = jsonb_set(data, '{research}', $2::jsonb), needs_review = true, updated_at = now() where slug = $1`, [slug, JSON.stringify(result)]);
  return result;
}

let running = false;

/** Poll for queued jobs, one at a time. Call once at startup. */
export function startWorker(db: pg.Pool) {
  // jobs left "running" by a previous instance (deploy, crash) go back to the queue
  db.query(`update jobs set status = 'queued' where status = 'running'`).catch(() => {});
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const claim = await db.query<{ id: string; kind: string; key: string }>(
        `update jobs set status = 'running', started_at = now(), attempts = attempts + 1
          where id = (select id from jobs where status = 'queued' order by created_at for update skip locked limit 1)
          returning id, kind, key`,
      );
      const job = claim.rows[0];
      if (!job) return;
      const t0 = Date.now();
      try {
        if (job.kind !== 'research') throw new Error(`unknown job kind ${job.kind}`);
        const res = await runResearch(db, job.key);
        await db.query(`update jobs set status = 'done', finished_at = now(), payload = $2 where id = $1`, [job.id, { costUsd: res.costUsd, model: res.model, seconds: Math.round((Date.now() - t0) / 1000) }]);
        console.log(`[jobs] researched ${job.key} in ${Math.round((Date.now() - t0) / 1000)}s for $${res.costUsd}`);
      } catch (err) {
        const msg = (err as Error).message?.slice(0, 500) ?? 'failed';
        await db.query(`update jobs set status = 'failed', finished_at = now(), error = $2 where id = $1`, [job.id, msg]);
        console.error(`[jobs] ${job.kind} ${job.key} failed: ${msg}`);
      }
    } catch (err) {
      console.error('[jobs] worker error', (err as Error).message);
    } finally {
      running = false;
    }
  };
  setInterval(tick, 4000).unref();
  console.log(`[jobs] worker started (research ${researchEnabled() ? `on, cap ${DAILY_CAP}/day` : 'off: ANTHROPIC_API_KEY not set'})`);
}
