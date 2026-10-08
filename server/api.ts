/**
 * Backend routes, mounted at /api. Add new routers here.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { species } from './routes/species.ts';
import { repo } from './repo.ts';

export const api = Router();

const startedAt = new Date().toISOString();

api.get('/health', (_req, res) => {
  res.json({
    ok: true,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'local',
    store: repo.kind,
    startedAt,
  });
});

api.use(species);

api.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
api.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api]', err);
  res.status(500).json({ error: 'Server error' });
});
