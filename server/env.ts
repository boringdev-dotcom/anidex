/** Local development: load secrets from .env files. On Render, env vars come from the dashboard. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
for (const f of ['.env', '.env.local', join('src', 'backend', '.env')]) {
  const p = join(root, f);
  if (existsSync(p)) {
    try {
      process.loadEnvFile(p);
    } catch {
      /* ignore malformed local env files */
    }
  }
}
