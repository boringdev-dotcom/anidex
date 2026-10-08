/**
 * The 3D specimen pipeline, shared by the generate-models script and the on-demand worker:
 *   1. Nano Banana Pro draws a clean full-body reference image on white.
 *   2. Hunyuan 3D v3.1 Pro turns that image into a textured GLB.
 *   3. glTF-Transform shrinks it for the web (weld, simplify, WebP textures, meshopt).
 *   4. The GLB goes to R2 under a content-hashed name, so it can be cached forever.
 */
import { createHash } from 'node:crypto';
import { putObject, r2Enabled } from './r2.ts';

// the heavy libraries (fal client, glTF-Transform, meshoptimizer, sharp's native binary) load only
// when a model is actually generated, so the web server starts even if one of them can't
const lazy = <T>(load: () => Promise<T>) => {
  let p: Promise<T> | null = null;
  return () => (p ??= load());
};
const falLib = lazy(() => import('@fal-ai/client'));
const gltfLibs = lazy(async () => {
  const [core, ext, fns, mo, sharp] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
    import('meshoptimizer'),
    import('sharp'),
  ]);
  return { ...core, ...ext, ...fns, ...mo, sharp: sharp.default };
});

/** fal list prices per call, for cost logs. */
export const FAL_COST = { image: 0.15, model: 0.375 };
export const generationEnabled = () => !!process.env.FAL_KEY && r2Enabled();
/** Default model orientation: Hunyuan models face +X after the three-quarter reference shot. */
export const DEFAULT_YAW = Math.PI / 2;

// ---------- prompt ----------

export interface PromptInput {
  commonName: string;
  scientificName: string;
  bodyPlan: string;
  /** colours, markings and defining features */
  detail?: string;
  /** extinct subspecies get a reconstruction line */
  extinct?: boolean;
}

export const POSE: Record<string, string> = {
  quadruped: 'standing on all four legs in a calm natural stance, seen from a three-quarter front-left angle',
  biped: 'standing in a natural relaxed pose, seen from a three-quarter front-left angle',
  aquatic: 'swimming horizontally, seen from the side and slightly above, the whole body from snout to tail fin or flukes visible',
  amphibian: 'resting on its belly with legs spread, seen from a three-quarter angle slightly above',
  arthropod: 'seen from slightly above at a three-quarter angle with every leg and antenna visible; if it has large wings, they are spread open flat',
  avian: 'standing upright, seen from a three-quarter front-left angle',
  serpentine: 'in a loose S-curve, seen from a three-quarter angle slightly above',
};

export function specimenPrompt(p: PromptInput): string {
  return [
    `A single adult ${p.commonName} (${p.scientificName}), ${POSE[p.bodyPlan] ?? POSE.quadruped}.`,
    p.detail ? `${p.detail[0].toUpperCase()}${p.detail.slice(1)}.` : '',
    p.extinct ? 'This animal is extinct: show a careful, scientifically plausible reconstruction based on museum specimens and archival photographs.' : '',
    'The entire animal is fully visible and centered with generous margin, nothing cropped: every leg, foot, the tail and ears are in frame.',
    'Isolated on a pure plain white background, soft even studio lighting, no cast shadow, no ground, no props, no text.',
    'Photorealistic museum-quality wildlife reference photograph, accurate anatomy, natural coloration and markings, sharp focus.',
  ]
    .filter(Boolean)
    .join(' ');
}

// ---------- fal ----------

let configured = false;
async function client() {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set');
  const { fal } = await falLib();
  if (!configured) fal.config({ credentials: process.env.FAL_KEY });
  configured = true;
  return fal;
}

export async function generateImage(prompt: string): Promise<{ url: string; requestId: string }> {
  const r = await (await client()).subscribe('fal-ai/nano-banana-pro', {
    input: { prompt, aspect_ratio: '4:3', resolution: '2K', output_format: 'png', num_images: 1 },
  });
  return { url: (r.data as { images: { url: string }[] }).images[0].url, requestId: r.requestId };
}

export async function generateModel(imageUrl: string, onProgress?: () => void): Promise<{ glbUrl: string; thumbnailUrl?: string; requestId: string }> {
  const r = await (await client()).subscribe('fal-ai/hunyuan-3d/v3.1/pro/image-to-3d', {
    input: { input_image_url: imageUrl, generate_type: 'Normal', enable_pbr: false, face_count: 60000 },
    logs: false,
    onQueueUpdate: (u: { status: string }) => {
      if (u.status === 'IN_PROGRESS') onProgress?.();
    },
  });
  const data = r.data as { model_glb: { url: string }; thumbnail?: { url: string } };
  return { glbUrl: data.model_glb.url, thumbnailUrl: data.thumbnail?.url, requestId: r.requestId };
}

export async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

// ---------- optimize + store ----------

export async function optimizeGlb(raw: Uint8Array): Promise<Uint8Array> {
  const { NodeIO, ALL_EXTENSIONS, dedup, meshopt, prune, simplify, textureCompress, weld, MeshoptEncoder, MeshoptSimplifier, sharp } = await gltfLibs();
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.readBinary(raw);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.6, error: 0.0008 }),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  return io.writeBinary(doc);
}

/** Upload a GLB under a content-hashed name. Returns the site path ("/models/<name>-<hash>.glb"). */
export async function uploadModel(name: string, glb: Uint8Array): Promise<string> {
  const hash = createHash('sha256').update(glb).digest('hex').slice(0, 10);
  const key = `models/${name}-${hash}.glb`;
  await putObject(key, glb, 'model/gltf-binary', 'public, max-age=31536000, immutable');
  return `/${key}`;
}
