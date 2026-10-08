/**
 * Renders a species' stipple specimen from four angles in both themes and writes one contact sheet.
 *
 *   node .claude/skills/generate-specimen/scripts/preview.mjs <slug> [--url http://localhost:5173] [--out path.png]
 *
 * Needs the dev server running and a local Chrome (set CHROME_PATH if it is not in the default place).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
if (!slug) {
  console.error('usage: preview.mjs <slug> [--url http://localhost:5173] [--out file.png]');
  process.exit(1);
}
const base = opt('url', 'http://localhost:5173');
const out = opt('out', join(process.cwd(), 'scripts', '.cache', slug, 'preview.png'));

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chrome found. Set CHROME_PATH.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const errors = [];
const tiles = [];
const W = 520;
const H = 380;
for (const theme of ['dark', 'light']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 700 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || t.includes('[anidex]')) errors.push(t.slice(0, 240));
  });
  await page.evaluateOnNewDocument((t) => localStorage.setItem('anidex-theme', t), theme);
  const res = await page.goto(`${base}/species/${slug}`, { waitUntil: 'networkidle0' }).catch((e) => {
    console.error(`Could not open ${base}. Is the dev server running (npm run dev)?\n${e.message}`);
    process.exit(1);
  });
  if (!res || res.status() >= 400) errors.push(`HTTP ${res?.status()}`);
  if (!page.url().includes(`/species/${slug}`)) errors.push(`redirected to ${page.url()}: unknown slug?`);
  await page.addStyleTag({ content: '[data-page],.site-header,.grain{display:none!important}' });
  for (let i = 0; i < 4; i++) {
    // the specimen spins about 0.16 rad/s, so 4.5 s apart gives four distinct angles
    await new Promise((r) => setTimeout(r, i === 0 ? 6000 : 4500));
    tiles.push(await page.screenshot({ clip: { x: 150, y: 60, width: 600, height: 420 } }));
  }
  await page.close();
}
await browser.close();

const composites = await Promise.all(
  tiles.map(async (buf, i) => ({
    input: await sharp(buf).resize(W, H).toBuffer(),
    left: (i % 4) * W,
    top: Math.floor(i / 4) * H,
  })),
);
await sharp({ create: { width: W * 4, height: H * 2, channels: 3, background: '#202020' } })
  .composite(composites)
  .png()
  .toFile(out);
console.log(`preview: ${out}`);
console.log(errors.length ? `problems:\n${[...new Set(errors)].join('\n')}` : 'no errors');
