/**
 * AniDex web server.
 *
 * Serves the built single-page app from dist/ and is the home for backend routes under /api.
 * Runs directly with Node's built-in TypeScript support (Node 23.6+): `node server/index.ts`.
 */
import express, { type Request, type Response } from 'express';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { api } from './api.ts';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT ?? 3000);

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(compression());
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---- backend ----
app.use('/api', express.json({ limit: '1mb' }), api);

// ---- static site ----
// hashed build output never changes, so cache it for a year
app.use('/assets', express.static(join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
// models and textures change rarely; revalidate monthly
app.use('/models', express.static(join(dist, 'models'), { maxAge: '30d', index: false }));
app.use('/textures', express.static(join(dist, 'textures'), { maxAge: '30d', index: false }));
app.use(express.static(dist, { index: false, maxAge: '1h' }));

// SPA fallback: client-side routes like /species/tiger get index.html; missing files 404
app.use((req: Request, res: Response) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  if (/\.[a-z0-9]{2,5}$/i.test(req.path)) return res.status(404).type('text/plain').send('Not found');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(join(dist, 'index.html'));
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`AniDex listening on http://0.0.0.0:${port}`);
});

// Render sends SIGTERM on deploys; finish in-flight requests first
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
