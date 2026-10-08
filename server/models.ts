/**
 * On-demand 3D specimens. The first visit to a species without a model queues one; the worker
 * generates it (about 3 to 4 minutes), stores it in R2 and the page morphs into it.
 * A daily cap bounds fal spend.
 */
import type pg from 'pg';
import type { Species } from '../src/data/types.ts';
import { FAL_COST, download, generateImage, generateModel, generationEnabled, optimizeGlb, specimenPrompt, uploadModel } from './specimens.ts';

const DAILY_CAP = Number(process.env.MODEL_DAILY_CAP ?? 30);
const MAX_ATTEMPTS = 2;

export type ModelState = 'ready' | 'queued' | 'generating' | 'failed' | 'capped' | 'unavailable';

export async function modelState(db: pg.Pool, slug: string): Promise<{ state: ModelState; position?: number }> {
  const sp = await db.query<{ has: boolean }>(`select (model is not null or data->'specimen' ? 'model') as has from species where slug = $1`, [slug]);
  if (!sp.rowCount) return { state: 'unavailable' };
  if (sp.rows[0].has) return { state: 'ready' };
  const job = await db.query<{ status: string; created_at: Date }>(`select status, created_at from jobs where kind = 'model' and key = $1`, [slug]);
  if (!job.rowCount) return { state: 'unavailable' };
  const j = job.rows[0];
  if (j.status === 'queued') {
    const ahead = await db.query<{ n: string }>(
      `select count(*) as n from jobs where kind = 'model' and status in ('queued', 'running') and created_at < $1`,
      [j.created_at],
    );
    return { state: 'queued', position: Number(ahead.rows[0].n) };
  }
  if (j.status === 'running') return { state: 'generating' };
  if (j.status === 'done') return { state: 'ready' };
  return { state: 'failed' };
}

/** Queue a model for a species that has none. Returns the resulting state. */
export async function requestModel(db: pg.Pool, slug: string) {
  const now = await modelState(db, slug);
  if (now.state === 'ready' || now.state === 'queued' || now.state === 'generating') return now;
  if (!generationEnabled()) return { state: 'unavailable' as const };
  const today = await db.query<{ n: string }>(`select count(*) as n from jobs where kind = 'model' and created_at > now() - interval '24 hours'`);
  if (Number(today.rows[0].n) >= DAILY_CAP) return { state: 'capped' as const };
  await db.query(
    `insert into jobs (kind, key) values ('model', $1)
     on conflict (kind, key) do update set status = 'queued', error = null, created_at = now()
       where jobs.status = 'failed' and jobs.attempts < $2`,
    [slug, MAX_ATTEMPTS],
  );
  await db.query(
    `insert into specimen_models (slug, status) values ($1, 'queued')
     on conflict (slug) do update set status = 'queued', error = null, requested_at = now(), updated_at = now()`,
    [slug],
  );
  return modelState(db, slug);
}

/** Store a finished model for a species (used by the worker and the batch script). */
export async function saveModel(db: pg.Pool, slug: string, url: string, costUsd: number) {
  // generated models face different ways; the client turns each side-on (orient: auto)
  await db.query(`update species set model = $2, updated_at = now() where slug = $1`, [slug, { url, orient: 'auto' }]);
  await db.query(
    `insert into specimen_models (slug, status, url, cost_usd) values ($1, 'ready', $2, $3)
     on conflict (slug) do update set status = 'ready', url = $2, cost_usd = specimen_models.cost_usd + $3, error = null, updated_at = now()`,
    [slug, url, costUsd],
  );
}

export async function runModel(db: pg.Pool, slug: string) {
  if (!generationEnabled()) throw new Error('model generation is not configured (FAL_KEY and R2)');
  const r = await db.query<{ data: Species }>(`select data from species where slug = $1`, [slug]);
  if (!r.rowCount) throw new Error('species not found');
  const sp = r.rows[0].data;
  await db.query(`update specimen_models set status = 'generating', updated_at = now() where slug = $1`, [slug]);
  let cost = 0;
  try {
    const prompt = specimenPrompt({ commonName: sp.commonName, scientificName: sp.scientificName, bodyPlan: sp.specimen.bodyPlan, detail: sp.specimen.promptDetail });
    const image = await generateImage(prompt);
    cost += FAL_COST.image;
    const model = await generateModel(image.url);
    cost += FAL_COST.model;
    const glb = await optimizeGlb(await download(model.glbUrl));
    const url = await uploadModel(slug, glb);
    await saveModel(db, slug, url, cost);
    return { costUsd: cost, url, kb: Math.round(glb.byteLength / 1024) };
  } catch (err) {
    await db.query(
      `update specimen_models set status = 'failed', error = $2, cost_usd = cost_usd + $3, updated_at = now() where slug = $1`,
      [slug, (err as Error).message?.slice(0, 500), cost],
    );
    throw err;
  }
}
