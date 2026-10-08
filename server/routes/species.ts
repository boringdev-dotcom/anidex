import { Router, type Request, type Response } from 'express';
import { repo } from '../repo.ts';
import { pool } from '../db/pool.ts';
import { requestResearch, researchState } from '../jobs.ts';

export const species = Router();

const REDIRECTS: Record<string, string> = { 'bengal-tiger': 'tiger' };

/** Wrap async handlers so errors reach the JSON error handler. */
const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: (e?: unknown) => void) =>
  fn(req, res).catch(next);

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : undefined);

species.get(
  '/search',
  h(async (req, res) => {
    const q = str(req.query.q) ?? '';
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ items: await repo.search(q, Math.min(Number(req.query.limit) || 8, 20)) });
  }),
);

species.get(
  '/stats',
  h(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(await repo.stats());
  }),
);

species.get(
  '/species',
  h(async (req, res) => {
    const status = str(req.query.status)?.split(',').filter((s) => /^[A-Z]{2}$/.test(s));
    const sort = str(req.query.sort);
    res.set('Cache-Control', 'public, max-age=120');
    res.json(
      await repo.list({
        q: str(req.query.q),
        class: str(req.query.class),
        order: str(req.query.order),
        family: str(req.query.family),
        status,
        sort: sort === 'name' || sort === 'status' ? sort : 'popular',
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.pageSize) || 48,
      }),
    );
  }),
);

species.get(
  '/species/:slug',
  h(async (req, res) => {
    const slug = String(req.params.slug);
    const moved = REDIRECTS[slug];
    if (moved) return res.status(301).json({ redirect: moved });
    const sp = await repo.get(slug);
    if (!sp) return res.status(404).json({ error: 'Not found' });
    // pages still waiting for research change soon, so browsers must revalidate them
    res.set('Cache-Control', sp.tier === 'auto' && !sp.research ? 'no-cache' : 'public, max-age=120');
    res.json(sp);
  }),
);

species.get(
  '/species/:slug/related',
  h(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ items: await repo.related(String(req.params.slug), Math.min(Number(req.query.limit) || 6, 24)) });
  }),
);

// ---- on-demand research ----

// a light per-IP limit on research requests (the daily cap is the real cost guard)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

species.get(
  '/species/:slug/research',
  h(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!pool) return res.json({ state: 'unavailable' });
    res.json(await researchState(pool, String(req.params.slug)));
  }),
);

species.post(
  '/species/:slug/research',
  h(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!pool) return res.json({ state: 'unavailable' });
    if (limited(req.ip ?? 'unknown')) return res.status(429).json({ state: 'capped' });
    res.json(await requestResearch(pool, String(req.params.slug)));
  }),
);
