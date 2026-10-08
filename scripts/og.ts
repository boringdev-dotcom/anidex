/**
 * Renders the social cards (link previews) with the live site and stores them in R2.
 * Each card is the /og/<slug> page (the stipple specimen, name and status), screenshotted at 2x and
 * scaled to 1200x630. The path is saved on the species row; the site-wide card in meta('og_default').
 *
 *   npm run dev            (in another terminal: the cards are drawn by the dev site)
 *   npm run og [-- --only tiger,lion] [--force] [--base http://localhost:5173]
 *
 * Needs DATABASE_URL, the R2_* variables and Google Chrome.
 */
import { createHash } from 'node:crypto';
import puppeteer, { type Page } from 'puppeteer-core';
import sharp from 'sharp';
import '../server/env.ts';
import { pool } from '../server/db/pool.ts';
import { putObject } from '../server/r2.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? '') : null;
};
const only = flag('only')?.split(',').filter(Boolean);
const force = args.includes('--force');
const base = flag('base') ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!pool) throw new Error('DATABASE_URL is not set');
const res = await fetch(`${base}/api/health`).catch(() => null);
if (!res?.ok) throw new Error(`The site isn't running at ${base}. Start it with npm run dev.`);

const rows = await pool.query<{ slug: string }>(
  `select slug from species where ($1::text[] is null or slug = any($1)) and ($2 or og is null) order by popularity desc`,
  [only ?? null, force],
);
const hasDefault = (await pool.query(`select 1 from meta where key = 'og_default'`)).rowCount;
const slugs = [...(!only && (force || !hasDefault) ? ['default'] : only?.includes('default') ? ['default'] : []), ...rows.rows.map((r) => r.slug)];
console.log(`${slugs.length} cards to render`);

// one browser per worker: a tab that isn't in front gets no animation frames, so it would never settle
const launch = () =>
  puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  });

async function render(page: Page, slug: string) {
  await page.goto(`${base}/og${slug === 'default' ? '' : `/${slug}`}`, { waitUntil: 'networkidle0', timeout: 60000 });
  const ready = await page
    .waitForFunction(`document.documentElement.dataset.ogReady === '1'`, { timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!ready) throw new Error('the specimen never settled');
  const shot = await page.screenshot({ type: 'png' });
  const jpg = await sharp(shot).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const hash = createHash('sha256').update(jpg).digest('hex').slice(0, 10);
  const key = `og/${slug}-${hash}.jpg`;
  await putObject(key, jpg, 'image/jpeg', 'public, max-age=31536000, immutable');
  if (slug === 'default') {
    await pool!.query(
      `insert into meta (key, value) values ('og_default', $1) on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [`/${key}`],
    );
  } else {
    await pool!.query(`update species set og = $2 where slug = $1`, [slug, `/${key}`]);
  }
  return Math.round(jpg.byteLength / 1024);
}

let next = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: 2 }, async () => {
    const browser = await launch();
    const page = (await browser.pages())[0] ?? (await browser.newPage());
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
    while (next < slugs.length) {
      const slug = slugs[next++];
      try {
        const kb = await render(page, slug);
        console.log(`${slug.padEnd(28)} ${kb} KB`);
      } catch (err) {
        failed++;
        console.log(`${slug.padEnd(28)} FAILED: ${(err as Error).message}`);
      }
    }
    await browser.close();
  }),
);
console.log(`done: ${slugs.length - failed} cards, ${failed} failed`);
await pool.end();
