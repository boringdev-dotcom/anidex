/** Polite, cached HTTP for the ingestion scripts. Every response is cached on disk, so reruns are free. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE = join(import.meta.dirname, '..', '.cache', 'ingest');
const UA = 'AniDex/1.0 (https://github.com/boringdev-dotcom/anidex; wildlife encyclopedia)';

export async function getJSON<T = unknown>(url: string, opts: { source: string; ttlDays?: number; accept?: string } = { source: 'misc' }): Promise<T | null> {
  const dir = join(CACHE, opts.source);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, createHash('sha1').update(url).digest('hex') + '.json');
  if (existsSync(file)) {
    const c = JSON.parse(readFileSync(file, 'utf8')) as { at: number; status: number; body: T | null };
    if (Date.now() - c.at < (opts.ttlDays ?? 30) * 864e5) return c.body;
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: opts.accept ?? 'application/json' } }).catch(() => null);
    if (r && (r.status === 429 || r.status >= 500)) {
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1) ** 2));
      continue;
    }
    if (!r) {
      await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
      continue;
    }
    const body = r.ok && r.status !== 204 ? ((await r.json().catch(() => null)) as T | null) : null;
    writeFileSync(file, JSON.stringify({ at: Date.now(), status: r.status, body }));
    return body;
  }
  return null;
}

/** Run fn over items with limited concurrency, reporting progress. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>, label = ''): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if (++done % 100 === 0 || done === items.length) process.stdout.write(`\r${label} ${done}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (label) process.stdout.write('\n');
  return out;
}
