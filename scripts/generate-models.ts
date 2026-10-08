/**
 * Generates a 3D specimen for each species with fal.ai:
 *   1. Nano Banana Pro draws a clean full-body reference image on white.
 *   2. Hunyuan 3D v3.1 Pro turns that image into a textured GLB.
 *   3. glTF-Transform shrinks it for the web (weld, simplify, WebP textures, meshopt).
 *
 * Every stage is cached in scripts/.cache/<slug>/, so re-running only pays for missing steps.
 *
 *   FAL_KEY=... npm run models -- [--only tiger,axolotl] [--force image|model|optimize] [--image-only]
 *
 * The key is read from FAL_KEY, or from .env / src/backend/.env.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fal } from '@fal-ai/client';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const speciesDir = join(root, 'src', 'data', 'species');
const cacheDir = join(root, 'scripts', '.cache');
const outDir = join(root, 'public', 'models');

// ---------- args + key ----------
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? '') : null;
};
const only = flag('only')?.split(',').filter(Boolean);
const force = new Set(flag('force')?.split(',') ?? []);
const imageOnly = args.includes('--image-only');

function loadKey(): string {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  for (const p of [join(root, '.env'), join(root, '.env.local'), join(root, 'src', 'backend', '.env')]) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^FAL_KEY\s*=\s*"?([^"\n]+)"?/m);
    if (m) return m[1].trim();
  }
  throw new Error('FAL_KEY not found. Set it in the environment or in .env');
}
fal.config({ credentials: loadKey() });

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

const POSE: Record<string, string> = {
  quadruped: 'standing on all four legs in a calm natural stance, seen from a three-quarter front-left angle',
  biped: 'standing in a natural relaxed pose, seen from a three-quarter front-left angle',
  aquatic: 'swimming horizontally, seen from the side and slightly above, the whole body from snout to tail flukes visible',
  amphibian: 'resting on its belly with legs spread, seen from a three-quarter angle slightly above',
  arthropod: 'with wings fully spread open flat, seen from slightly above at a three-quarter angle',
  avian: 'standing upright, seen from a three-quarter front-left angle',
  serpentine: 'in a loose S-curve, seen from a three-quarter angle slightly above',
};

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
  const detail = sp.specimen.promptDetail ?? DETAIL[sp.slug];
  return [
    `A single ${sp.commonName} (${sp.scientificName}), ${POSE[sp.specimen.bodyPlan] ?? POSE.quadruped}.`,
    detail ? `${detail[0].toUpperCase()}${detail.slice(1)}.` : '',
    sp.parent?.extinct
      ? 'This subspecies is extinct: show a careful, scientifically plausible reconstruction based on museum specimens and archival photographs.'
      : '',
    'The entire animal is fully visible and centered with generous margin, nothing cropped: every leg, foot, the tail and ears are in frame.',
    'Isolated on a pure plain white background, soft even studio lighting, no cast shadow, no ground, no props, no text.',
    'Photorealistic museum-quality wildlife reference photograph, accurate anatomy, natural coloration and markings, sharp focus.',
  ]
    .filter(Boolean)
    .join(' ');
}

// ---------- helpers ----------
async function download(url: string, path: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

function readJson<T>(p: string): T | null {
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null;
}

const log = (slug: string, msg: string) => console.log(`${slug.padEnd(26)} ${msg}`);

// ---------- stages ----------
async function makeImage(sp: Sp, dir: string): Promise<string> {
  const meta = join(dir, 'image.json');
  const cached = readJson<{ url: string }>(meta);
  if (cached && !force.has('image')) return cached.url;
  const p = prompt(sp);
  log(sp.slug, 'image: generating');
  const r = await fal.subscribe('fal-ai/nano-banana-pro', {
    input: { prompt: p, aspect_ratio: '4:3', resolution: '2K', output_format: 'png', num_images: 1 },
  });
  const url = (r.data as { images: { url: string }[] }).images[0].url;
  await download(url, join(dir, 'reference.png'));
  writeFileSync(meta, JSON.stringify({ url, prompt: p, requestId: r.requestId }, null, 2));
  log(sp.slug, 'image: done');
  return url;
}

async function makeModel(sp: Sp, dir: string, imageUrl: string): Promise<string> {
  const raw = join(dir, 'raw.glb');
  if (existsSync(raw) && !force.has('model') && !force.has('image')) return raw;
  log(sp.slug, 'model: generating with Hunyuan 3D v3.1 Pro (a few minutes)');
  const r = await fal.subscribe('fal-ai/hunyuan-3d/v3.1/pro/image-to-3d', {
    input: { input_image_url: imageUrl, generate_type: 'Normal', enable_pbr: false, face_count: 60000 },
    logs: false,
    onQueueUpdate: (u) => {
      if (u.status === 'IN_PROGRESS') process.stdout.write('.');
    },
  });
  process.stdout.write('\n');
  const data = r.data as { model_glb: { url: string }; thumbnail?: { url: string } };
  await download(data.model_glb.url, raw);
  if (data.thumbnail?.url) await download(data.thumbnail.url, join(dir, 'thumbnail.png')).catch(() => {});
  writeFileSync(join(dir, 'model.json'), JSON.stringify({ requestId: r.requestId, glb: data.model_glb.url }, null, 2));
  log(sp.slug, 'model: done');
  return raw;
}

async function optimize(sp: Sp, raw: string) {
  const out = join(outDir, `${sp.slug}.glb`);
  if (existsSync(out) && !force.has('optimize') && !force.has('model') && !force.has('image')) return out;
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.read(raw);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.6, error: 0.0008 }),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(out, doc);
  const kb = (readFileSync(out).byteLength / 1024).toFixed(0);
  log(sp.slug, `optimized -> public/models/${sp.slug}.glb (${kb} KB)`);
  return out;
}

/** Point the species JSON at its model if it isn't already (keeps any hand-tuned yaw/tilt). */
function wire(sp: Sp) {
  if (sp.promptOverride) return; // reference models are referenced from code, not species JSON
  const file = sp.parent?.file ?? join(speciesDir, `${sp.slug}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const target = sp.parent
    ? ((json.variants as VariantJson[]).find((v) => v.slug === sp.parent!.variant)!.specimen ??= {})
    : json.specimen;
  if (target.model?.url) return;
  target.model = { url: `/models/${sp.slug}.glb`, yaw: Math.PI / 2 };
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  log(sp.slug, `wired model into ${file.replace(root + '/', '')} (yaw pi/2, check orientation)`);
}

// ---------- main ----------
mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
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
all.length = 0;
all.push(...selected);

// a task is done when its GLB exists, or its JSON already points at some other model
const done = (sp: Sp) => existsSync(join(outDir, `${sp.slug}.glb`)) || (!!sp.specimen.model?.url && sp.specimen.model.url !== `/models/${sp.slug}.glb`);
const pending = all.filter((sp) => force.size || !done(sp));
console.log(
  `${all.length} species selected, ${pending.length} need work. ` +
    (imageOnly ? 'Images only (about $0.15 each).' : 'Roughly $0.15 per image and $0.38 per Hunyuan Pro model on fal.'),
);

const results = await Promise.allSettled(
  all.map(async (sp) => {
    if (!force.size && done(sp)) return;
    const dir = join(cacheDir, sp.slug);
    mkdirSync(dir, { recursive: true });
    const img = await makeImage(sp, dir);
    if (imageOnly) return;
    const raw = await makeModel(sp, dir, img);
    await optimize(sp, raw);
    wire(sp);
  }),
);
results.forEach((r, i) => {
  if (r.status === 'rejected') log(all[i].slug, `FAILED: ${(r.reason as Error)?.message ?? r.reason}`);
});
