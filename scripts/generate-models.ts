/**
 * Generates 3D specimens with fal.ai and stores them in R2 (the pipeline lives in server/specimens.ts):
 *   1. Nano Banana Pro draws a clean full-body reference image on white.
 *   2. Hunyuan 3D v3.1 Pro turns that image into a textured GLB.
 *   3. glTF-Transform shrinks it for the web; the result is uploaded under a content-hashed name.
 *
 * Every stage is cached in scripts/.cache/<slug>/, so re-running only pays for missing steps.
 *
 * Curated species (src/data/species/*.json, their subspecies, and the scale references):
 *   npm run models -- [--only tiger,axolotl] [--force image|model|optimize] [--image-only]
 * Open-data species in the database, most popular first, written straight to DATABASE_URL:
 *   npm run models -- --auto --top 200 [--concurrency 6] [--only lion,jaguar]
 *
 * Needs FAL_KEY and the R2_* variables (environment, .env or src/backend/.env).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../server/env.ts';
import { pool } from '../server/db/pool.ts';
import { saveModel } from '../server/models.ts';
import { r2Enabled } from '../server/r2.ts';
import { DEFAULT_YAW, FAL_COST, download, generateImage, generateModel, optimizeGlb, specimenPrompt, uploadModel } from '../server/specimens.ts';

const root = join(import.meta.dirname, '..');
const speciesDir = join(root, 'src', 'data', 'species');
const cacheDir = join(root, 'scripts', '.cache');

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? '') : null;
};
const only = flag('only')?.split(',').filter(Boolean);
const force = new Set(flag('force')?.split(',') ?? []);
const imageOnly = args.includes('--image-only');
const auto = args.includes('--auto');
const top = Number(flag('top') ?? 200);
const concurrency = Math.max(1, Number(flag('concurrency') ?? 6));
if (!process.env.FAL_KEY) throw new Error('FAL_KEY not found. Set it in the environment or in src/backend/.env');
if (!imageOnly && !r2Enabled()) throw new Error('R2 is not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET');

// ---------- prompts ----------
interface Sp {
  slug: string;
  commonName: string;
  scientificName: string;
  specimen: { bodyPlan: string; promptDetail?: string; model?: { url: string; yaw?: number } };
  /** set for subspecies tasks: "<species>--<variant>" lives inside the parent species file */
  parent?: { file: string; variant: string; extinct: boolean };
  /** full prompt for non-animal reference models (scale comparisons) */
  promptOverride?: string;
}

/** Scale references for the "Compare to you" view. Not species: no JSON is wired for these. */
const REFERENCES: Sp[] = [
  {
    slug: 'ref-human',
    commonName: 'person',
    scientificName: 'Homo sapiens',
    specimen: { bodyPlan: 'biped' },
    promptOverride:
      'A single adult person standing upright in a relaxed neutral pose, arms resting at the sides, feet together, wearing simple plain fitted clothes and shoes, short hair, seen from a three-quarter front-left angle. The entire body is fully visible and centered with generous margin, nothing cropped. Isolated on a pure plain white background, soft even studio lighting, no cast shadow, no ground, no props, no text. Photorealistic, sharp focus.',
  },
  {
    slug: 'ref-hand',
    commonName: 'hand',
    scientificName: 'Homo sapiens',
    specimen: { bodyPlan: 'arthropod' },
    promptOverride:
      'A single adult human hand and wrist, open and flat with the palm facing down and fingers slightly spread, seen from above at a three-quarter angle. The whole hand and wrist are fully visible and centered with generous margin, nothing cropped. Isolated on a pure plain white background, soft even studio lighting, no cast shadow, no props, no text. Photorealistic, sharp focus.',
  },
];

interface VariantJson {
  slug: string;
  name: string;
  trinomial: string;
  alive: boolean;
  specimen?: { promptDetail?: string; model?: { url: string; yaw?: number } };
}

const DETAIL: Record<string, string> = {
  tiger: 'bold black stripes on orange fur, white belly and face markings',
  'snow-leopard': 'smoky grey-white fur with dark rosettes and a very long thick tail',
  'african-savanna-elephant': 'large fan-shaped ears, long trunk reaching the ground, ivory tusks',
  'giant-panda': 'crisp black and white coat with black eye patches, ears, legs and shoulder band',
  'mountain-gorilla': 'adult silverback walking on all fours on its knuckles, long thick black fur, silver back',
  'blue-whale': 'long slender blue-grey mottled body, small dorsal fin near the tail, broad flukes',
  'polar-bear': 'thick cream-white fur, long neck, small rounded ears',
  'bornean-orangutan': 'long shaggy reddish-orange hair, very long arms, adult standing on all fours',
  'black-rhinoceros': 'two horns, pointed prehensile upper lip, grey wrinkled skin',
  'red-panda': 'russet fur, white face markings, long ringed bushy tail',
  'emperor-penguin': 'adult, black back and head, white belly, golden-yellow ear patches',
  axolotl: 'pale pink leucistic skin, three pairs of feathery external gills, wide head, finned tail',
  'monarch-butterfly': 'bright orange wings with black veins and white-spotted black borders',
  'grey-wolf': 'grizzled grey and tan coat, bushy tail, upright pointed ears',
};

function prompt(sp: Sp): string {
  if (sp.promptOverride) return sp.promptOverride;
  // a species can override the built-in detail with specimen.promptDetail in its JSON
  return specimenPrompt({
    commonName: sp.commonName,
    scientificName: sp.scientificName,
    bodyPlan: sp.specimen.bodyPlan,
    detail: sp.specimen.promptDetail ?? DETAIL[sp.slug],
    extinct: sp.parent?.extinct,
  });
}

// ---------- helpers ----------
function readJson<T>(p: string): T | null {
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null;
}

const log = (slug: string, msg: string) => console.log(`${slug.padEnd(26)} ${msg}`);

// ---------- stages (each cached in scripts/.cache/<slug>/) ----------
async function makeImage(sp: Sp, dir: string): Promise<{ url: string; paid: boolean }> {
  const meta = join(dir, 'image.json');
  const cached = readJson<{ url: string }>(meta);
  if (cached && !force.has('image')) return { url: cached.url, paid: false };
  const p = prompt(sp);
  log(sp.slug, 'image: generating');
  const r = await generateImage(p);
  writeFileSync(join(dir, 'reference.png'), await download(r.url));
  writeFileSync(meta, JSON.stringify({ url: r.url, prompt: p, requestId: r.requestId }, null, 2));
  log(sp.slug, 'image: done');
  return { url: r.url, paid: true };
}

async function makeModel(sp: Sp, dir: string, imageUrl: string): Promise<{ raw: string; paid: boolean }> {
  const raw = join(dir, 'raw.glb');
  if (existsSync(raw) && !force.has('model') && !force.has('image')) return { raw, paid: false };
  log(sp.slug, 'model: generating with Hunyuan 3D v3.1 Pro (a few minutes)');
  const r = await generateModel(imageUrl);
  writeFileSync(raw, await download(r.glbUrl));
  if (r.thumbnailUrl) await download(r.thumbnailUrl).then((b) => writeFileSync(join(dir, 'thumbnail.png'), b)).catch(() => {});
  writeFileSync(join(dir, 'model.json'), JSON.stringify({ requestId: r.requestId, glb: r.glbUrl }, null, 2));
  log(sp.slug, 'model: done');
  return { raw, paid: true };
}

/** Optimize and upload; returns the site path of the stored model ("/models/<slug>-<hash>.glb"). */
async function store(sp: Sp, dir: string, raw: string): Promise<string> {
  const meta = join(dir, 'upload.json');
  const cached = readJson<{ url: string }>(meta);
  if (cached && !force.size) return cached.url;
  const glb = await optimizeGlb(readFileSync(raw));
  writeFileSync(join(dir, 'model.glb'), glb);
  const url = await uploadModel(sp.slug, glb);
  writeFileSync(meta, JSON.stringify({ url, bytes: glb.byteLength }, null, 2));
  log(sp.slug, `stored ${url} (${(glb.byteLength / 1024).toFixed(0)} KB)`);
  return url;
}

/** Point the species JSON at its stored model (keeps any hand-tuned yaw). */
function wire(sp: Sp, url: string) {
  if (sp.promptOverride) {
    log(sp.slug, `reference model: set its url in REFERENCES in src/three/specimen/Specimen.ts to ${url}`);
    return;
  }
  const file = sp.parent?.file ?? join(speciesDir, `${sp.slug}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const target = sp.parent
    ? ((json.variants as VariantJson[]).find((v) => v.slug === sp.parent!.variant)!.specimen ??= {})
    : json.specimen;
  if (target.model?.url === url) return;
  const fresh = !target.model?.url;
  target.model = { ...target.model, url, yaw: target.model?.yaw ?? DEFAULT_YAW };
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  log(sp.slug, `wired ${url} into ${file.replace(root + '/', '')}${fresh ? ' (yaw pi/2, check orientation)' : ''}`);
}

/** Run tasks with at most n in flight. */
async function inPool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

// ---------- main ----------
mkdirSync(cacheDir, { recursive: true });

async function runOne(sp: Sp): Promise<number> {
  const dir = join(cacheDir, sp.slug);
  mkdirSync(dir, { recursive: true });
  const img = await makeImage(sp, dir);
  if (imageOnly) return img.paid ? FAL_COST.image : 0;
  const model = await makeModel(sp, dir, img.url);
  const url = await store(sp, dir, model.raw);
  if (auto) await saveModel(pool!, sp.slug, url, (img.paid ? FAL_COST.image : 0) + (model.paid ? FAL_COST.model : 0));
  else wire(sp, url);
  return (img.paid ? FAL_COST.image : 0) + (model.paid ? FAL_COST.model : 0);
}

let tasks: Sp[] = [];
if (auto) {
  if (!pool) throw new Error('--auto needs DATABASE_URL');
  const rows = await pool.query<{ slug: string; data: { commonName: string; scientificName: string; specimen: Sp['specimen'] } }>(
    `select slug, data from species
      where tier = 'auto' and model is null and ($1::text[] is null or slug = any($1))
      order by popularity desc limit $2`,
    [only ?? null, top],
  );
  tasks = rows.rows.map((r) => ({ slug: r.slug, commonName: r.data.commonName, scientificName: r.data.scientificName, specimen: r.data.specimen }));
} else {
  // one task per species, plus one per subspecies ("tiger--amur"); --only accepts either form,
  // and a species slug selects its subspecies too
  const all: Sp[] = [];
  for (const f of readdirSync(speciesDir).filter((x) => x.endsWith('.json'))) {
    const file = join(speciesDir, f);
    const json = JSON.parse(readFileSync(file, 'utf8')) as Sp & { variants?: VariantJson[] };
    all.push(json);
    for (const v of json.variants ?? []) {
      all.push({
        slug: `${json.slug}--${v.slug}`,
        commonName: v.name,
        scientificName: v.trinomial,
        specimen: { bodyPlan: json.specimen.bodyPlan, promptDetail: v.specimen?.promptDetail, model: v.specimen?.model },
        parent: { file, variant: v.slug, extinct: !v.alive },
      });
    }
  }
  all.push(...REFERENCES);
  const selected = all.filter((s) => !only || only.includes(s.slug) || only.some((o) => s.slug.startsWith(`${o}--`)));
  // a curated task is done once its JSON points at a model, unless forced
  tasks = selected.filter((sp) => force.size || imageOnly || !sp.specimen.model?.url);
  if (!only) tasks = tasks.filter((sp) => !sp.promptOverride || force.size);
}

console.log(
  `${tasks.length} to generate${auto ? ` (open-data species, ${concurrency} at a time)` : ''}. ` +
    (imageOnly ? `Images only, about $${FAL_COST.image} each.` : `About $${(FAL_COST.image + FAL_COST.model).toFixed(2)} each on fal, up to $${(tasks.length * (FAL_COST.image + FAL_COST.model)).toFixed(0)} in total.`),
);

let spent = 0;
let failed = 0;
await inPool(tasks, auto ? concurrency : tasks.length || 1, async (sp) => {
  try {
    const cost = await runOne(sp);
    spent += cost;
  } catch (err) {
    failed++;
    log(sp.slug, `FAILED: ${(err as Error)?.message ?? err}`);
  }
});
console.log(`done: ${tasks.length - failed} ok, ${failed} failed, about $${spent.toFixed(2)} spent`);
await pool?.end();
