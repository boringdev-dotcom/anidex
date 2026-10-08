import * as THREE from 'three';
import type { SpecimenSource } from '../../data';
import { buildBody, type Proportions } from './bodyPlans';
import { ambientShape, earthShape, hashString, sampleParts, sampleTextured, type Shape, type TexturedPart } from '../stipple/sample';

/**
 * The specimen boundary. Everything in the scene asks for a species' Shape through here.
 *
 * A species with `specimen.model` is sampled from its GLB; any other gets the procedural body plan.
 * Models live in Cloudflare R2 (see scripts/generate-models.ts and server/specimens.ts); data refers
 * to them by path ("/models/<slug>-<hash>.glb") and they load from the models domain.
 * The GLB is sampled into the same stipple point cloud, so the look and every animation stay the same.
 */

const MODEL_BASE = (import.meta.env.VITE_MODEL_BASE as string | undefined) ?? 'https://models.anidex.fyi';
/** Resolve a model path from the data to the URL it is served from. */
export const modelUrl = (path: string) => (path.startsWith('/models/') ? MODEL_BASE + path : path);

const cache = new Map<string, Promise<Shape>>();

export const POINT_COUNT = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 16000 : 36000;

const DEFAULTS: Proportions = { length: 0.6, height: 0.5, bulk: 0.5, neck: 0.3, tail: 0.5 };

function procedural(sp: SpecimenSource): Shape {
  const p = { ...DEFAULTS, ...sp.specimen.proportions };
  const parts = buildBody(sp.specimen.bodyPlan, p, sp.specimen.features);
  return sampleParts(parts, POINT_COUNT, hashString(sp.key));
}

/** Copy an attribute into a plain Float32 one (GLB attributes are often quantized int16). */
function floatAttr(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): THREE.BufferAttribute {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) {
    out[i * a.itemSize] = a.getX(i);
    if (a.itemSize > 1) out[i * a.itemSize + 1] = a.getY(i);
    if (a.itemSize > 2) out[i * a.itemSize + 2] = a.getZ(i);
  }
  return new THREE.BufferAttribute(out, a.itemSize);
}

function readPixels(tex: THREE.Texture | null | undefined): TexturedPart['pixels'] {
  const img = tex?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img || !img.width) return undefined;
  const scale = Math.min(1, 512 / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const ctx = Object.assign(document.createElement('canvas'), { width, height }).getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  ctx.drawImage(img, 0, 0, width, height);
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

async function fromModel(sp: SpecimenSource): Promise<Shape> {
  const m = sp.specimen.model!;
  return loadModelShape(m.url, m.orient === 'auto' ? 'auto' : (m.yaw ?? 0), POINT_COUNT, hashString(sp.key));
}

/**
 * Yaw that turns a model's longest horizontal axis onto X, so it is seen side-on (generated models
 * come out of image-to-3D facing different ways). Area-weighted, so dense heads don't dominate.
 */
function sideOnYaw(geoms: THREE.BufferGeometry[]): number {
  let w = 0, mx = 0, mz = 0, xx = 0, zz = 0, xz = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = new THREE.Triangle();
  for (const g of geoms) {
    const pos = g.getAttribute('position');
    const idx = g.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1);
      c.fromBufferAttribute(pos, i2);
      const area = tri.set(a, b, c).getArea();
      const x = (a.x + b.x + c.x) / 3;
      const z = (a.z + b.z + c.z) / 3;
      w += area;
      mx += area * x;
      mz += area * z;
      xx += area * x * x;
      zz += area * z * z;
      xz += area * x * z;
    }
  }
  if (!w) return 0;
  mx /= w;
  mz /= w;
  const cxx = xx / w - mx * mx;
  const czz = zz / w - mz * mz;
  const cxz = xz / w - mx * mz;
  // principal axis angle in the XZ plane; rotateY by it lays that axis on X
  return 0.5 * Math.atan2(2 * cxz, cxx - czz);
}

/** Load any GLB and sample it into a stipple shape with N points. yaw "auto" turns it side-on. */
export async function loadModelShape(url: string, yawRad: number | 'auto', N: number, seed: number): Promise<Shape> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl(url));
  gltf.scene.updateMatrixWorld(true);
  const parts: TexturedPart[] = [];
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const src = m.geometry;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', floatAttr(src.getAttribute('position')));
    if (src.getAttribute('normal')) g.setAttribute('normal', floatAttr(src.getAttribute('normal')));
    if (src.getAttribute('uv')) g.setAttribute('uv', floatAttr(src.getAttribute('uv')));
    if (src.index) g.setIndex(src.index.clone());
    g.applyMatrix4(m.matrixWorld);
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    parts.push({ geometry: g, pixels: readPixels(mat?.map) });
  });
  if (!parts.length) throw new Error('GLB has no meshes');
  const yaw = new THREE.Matrix4().makeRotationY(yawRad === 'auto' ? sideOnYaw(parts.map((p) => p.geometry)) : yawRad);
  for (const p of parts) p.geometry.applyMatrix4(yaw);
  return sampleTextured(parts, N, seed);
}

/** Scale references for "Compare to you": real size in metres along the model's largest dimension. */
export const REFERENCES = {
  human: { url: '/models/ref-human-8782aceef6.glb', yaw: 0, sizeM: 1.7, label: '1.7 m person' },
  hand: { url: '/models/ref-hand-056dca29e8.glb', yaw: 0, sizeM: 0.19, label: 'Adult hand, 19 cm' },
} as const;
export type ReferenceKind = keyof typeof REFERENCES;

const refCache = new Map<ReferenceKind, Promise<Shape>>();
export function loadReferenceShape(kind: ReferenceKind): Promise<Shape> {
  let p = refCache.get(kind);
  if (!p) {
    const r = REFERENCES[kind];
    p = loadModelShape(r.url, r.yaw, POINT_COUNT > 20000 ? 9000 : 5000, hashString(kind));
    refCache.set(kind, p);
  }
  return p;
}

export function loadSpecimenShape(sp: SpecimenSource): Promise<Shape> {
  // keyed by model too: a species whose model arrives later gets its new shape
  const id = `${sp.key}|${sp.specimen.model?.url ?? ''}`;
  let p = cache.get(id);
  if (!p) {
    p = sp.specimen.model
      ? fromModel(sp).catch((err) => {
          console.warn(`[anidex] model for ${sp.key} failed, using procedural specimen`, err);
          return procedural(sp);
        })
      : Promise.resolve(procedural(sp));
    cache.set(id, p);
  }
  return p;
}

let ambient: Shape | null = null;
/** Synchronous placeholder sphere, used only until the Earth is ready. */
export function getAmbientShape(): Shape {
  return (ambient ??= ambientShape(POINT_COUNT));
}

let earth: Promise<Shape> | null = null;
/** The landing Earth, built from the same land mask as the globe. */
export function loadEarthShape(): Promise<Shape> {
  return (earth ??= new Promise<Shape>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = 720;
      const h = 360;
      const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(getAmbientShape());
      ctx.drawImage(img, 0, 0, w, h);
      resolve(earthShape(POINT_COUNT, { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h }));
    };
    img.onerror = () => resolve(getAmbientShape());
    img.src = '/textures/land-mask.png';
  }));
}
