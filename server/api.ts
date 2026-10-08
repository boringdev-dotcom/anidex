/**
 * Backend routes, mounted at /api. Add new routers here.
 */
import { Router } from 'express';

export const api = Router();

const startedAt = new Date().toISOString();

api.get('/health', (_req, res) => {
  res.json({
    ok: true,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'local',
    startedAt,
  });
});

api.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
