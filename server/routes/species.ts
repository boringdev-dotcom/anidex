import { Router, type Request, type Response } from 'express';
import { repo } from '../repo.ts';
import { pool } from '../db/pool.ts';
import { requestResearch, researchState } from '../jobs.ts';
import { modelState, requestModel } from '../models.ts';

export const species = Router();

const REDIRECTS: Record<string, string> = { 'bengal-tiger': 'tiger' };

/** Wrap async handlers so errors reach the JSON error handler. */
const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: (e?: unknown) => void) =>
  fn(req, res).catch(next);

/** A whole number in [min, max], or the fallback for anything malformed. */
const int = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : fallback;
};

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
        page: int(req.query.page, 1, 1, 10_000),
        pageSize: int(req.query.pageSize, 48, 1, 100),
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

// ---- on-demand research and 3D specimens ----

/**
 * The visitor's address. Requests reach us through Cloudflare (Render's edge), which sets
 * CF-Connecting-IP itself, unlike X-Forwarded-For which a client can pre-fill.
 */
let logged = false;
function clientIp(req: Request) {
  const cf = req.get('cf-connecting-ip');
  if (!logged) {
    logged = true;
    console.log(`[limits] visitor address from ${cf ? 'CF-Connecting-IP' : 'X-Forwarded-For'} (${req.ips.length} forwarded hops)`);
  }
  return cf ?? req.ip ?? 'unknown';
}

// a light per-visitor limit on paid requests (the daily caps are the real cost guard)
const hits = new Map<string, number[]>();
function limited(kind: string, req: Request, perHour: number) {
  const id = `${kind}:${clientIp(req)}`;
  const now = Date.now();
  const list = (hits.get(id) ?? []).filter((t) => now - t < 3600_000);
  list.push(now);
  hits.set(id, list);
  if (hits.size > 50_000) hits.clear();
  return list.length > perHour;
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
    if (limited('research', req, 20)) return res.status(429).json({ state: 'capped' });
    res.json(await requestResearch(pool, String(req.params.slug)));
  }),
);

species.get(
  '/species/:slug/specimen',
  h(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!pool) return res.json({ state: 'unavailable' });
    res.json(await modelState(pool, String(req.params.slug)));
  }),
);

species.post(
  '/species/:slug/specimen',
  h(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!pool) return res.json({ state: 'unavailable' });
    if (limited('model', req, 10)) return res.status(429).json({ state: 'capped' });
    res.json(await requestModel(pool, String(req.params.slug)));
  }),
);
