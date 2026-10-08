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

// ---------------- two animals side by side (compare page) ----------------

export interface PairSize {
  metres: number;
  by: 'length' | 'height';
  standing: boolean;
}

interface PairSide {
  /** centre x and top y in shape space, and width, for labels */
  x: number;
  top: number;
  w: number;
  /** drawn larger than true scale so it stays visible next to a giant */
  enlarged: number;
}

/** Layout of the current pair shape, for the name labels above each animal. */
export const pairInfo: { key: string; a: PairSide; b: PairSide } = {
  key: '',
  a: { x: 0, top: 0, w: 0, enlarged: 1 },
  b: { x: 0, top: 0, w: 0, enlarged: 1 },
};
const pairLayouts = new Map<string, typeof pairInfo>();

/** Make the layout for a pair key current (when its shape is shown). */
export function activatePairLayout(key: string) {
  const l = pairLayouts.get(key);
  if (l) Object.assign(pairInfo, { key, a: { ...l.a }, b: { ...l.b } });
}

/**
 * Both animals in one point cloud, at true relative scale, standing on a shared floor along X.
 * Each keeps its own sampled surface and tones; points are shared by visible area.
 */
export function loadPairShape(key: string, A: SpecimenSource, B: SpecimenSource, sa: PairSize, sb: PairSize): Promise<Shape> {
  // keyed by size and model too: measurements or a model that arrive later rebuild the pair
  const id = `${key}|${sa.metres}|${sb.metres}|${A.specimen.model?.url ?? ''}|${B.specimen.model?.url ?? ''}`;
  let p = cache.get(id);
  if (!p) {
    p = Promise.all([loadSpecimenShape(A), loadSpecimenShape(B)]).then(([shA, shB]) => buildPair(key, shA, shB, sa, sb));
    cache.set(id, p);
  }
  return p;
}

function extents(s: Shape) {
  const e = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const P = s.positions;
  for (let i = 0; i < P.length; i += 3) {
    e.minX = Math.min(e.minX, P[i]);
    e.maxX = Math.max(e.maxX, P[i]);
    e.minY = Math.min(e.minY, P[i + 1]);
    e.maxY = Math.max(e.maxY, P[i + 1]);
    e.minZ = Math.min(e.minZ, P[i + 2]);
    e.maxZ = Math.max(e.maxZ, P[i + 2]);
  }
  return e;
}

function buildPair(key: string, shA: Shape, shB: Shape, sa: PairSize, sb: PairSize): Shape {
  const prep = (s: Shape, size: PairSize) => {
    const e = extents(s);
    // lay each animal's long axis along X so the pair is seen side-on together
    const swap = e.maxZ - e.minZ > (e.maxX - e.minX) * 1.05;
    const aw = swap ? e.maxZ - e.minZ : e.maxX - e.minX;
    const ah = e.maxY - e.minY;
    // apes are modelled on all fours but measured standing: posed height is about 3/4 of it
    const crouched = size.standing && ah < aw * 1.1;
    const k = size.by === 'height' ? (size.metres * (crouched ? 0.75 : 1)) / ah : size.metres / aw;
    return { s, e, swap, aw, ah, k };
  };
  const pa = prep(shA, sa);
  const pb = prep(shB, sb);
  // tiny animals next to giants stay visible: at least 4% of the larger one's length
  const big = Math.max(pa.aw * pa.k, pb.aw * pb.k, pa.ah * pa.k, pb.ah * pb.k);
  const grow = (p: typeof pa) => Math.max(1, (big * 0.04) / (p.aw * p.k));
  const ga = grow(pa);
  const gb = grow(pb);
  pa.k *= ga;
  pb.k *= gb;
  const wA = pa.aw * pa.k;
  const hA = pa.ah * pa.k;
  const wB = pb.aw * pb.k;
  const hB = pb.ah * pb.k;
  const gap = 0.16 * Math.max(wA, wB) + 0.02 * big;
  const W = wA + gap + wB;
  const H = Math.max(hA, hB);
  // fit roughly the box a single specimen fills
  const norm = 1.3 / Math.max(W, H * 1.5);
  const cxA = -W / 2 + wA / 2;
  const cxB = W / 2 - wB / 2;

  const N = POINT_COUNT;
  // points by visible area, so neither animal is a smudge or a solid blob
  const areaA = wA * hA;
  const areaB = wB * hB;
  const nA = Math.round(N * Math.min(0.85, Math.max(0.15, areaA / (areaA + areaB))));
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const tones = new Float32Array(N);
  const place = (p: typeof pa, cx: number, from: number, count: number) => {
    const { s, e, swap } = p;
    const mx = (e.minX + e.maxX) / 2;
    const mz = (e.minZ + e.maxZ) / 2;
    const total = s.positions.length / 3;
    for (let j = 0; j < count; j++) {
      // stride through the source so every body part is represented (sampling order follows the parts)
      const i = Math.min(total - 1, Math.floor(((j + 0.5) * total) / count));
      let x = s.positions[i * 3] - mx;
      const y = s.positions[i * 3 + 1] - e.minY;
      let z = s.positions[i * 3 + 2] - mz;
      let nx = s.normals[i * 3];
      let nz = s.normals[i * 3 + 2];
      if (swap) {
        [x, z] = [z, -x];
        [nx, nz] = [nz, -nx];
      }
      const o = (from + j) * 3;
      positions[o] = (x * p.k + cx) * norm;
      positions[o + 1] = (y * p.k - H / 2) * norm;
      positions[o + 2] = z * p.k * norm;
      normals[o] = nx;
      normals[o + 1] = s.normals[i * 3 + 1];
      normals[o + 2] = nz;
      tones[from + j] = s.tones[i];
    }
  };
  place(pa, cxA, 0, nA);
  place(pb, cxB, nA, N - nA);
  const layout = {
    key,
    a: { x: cxA * norm, top: (hA - H / 2) * norm, w: wA * norm, enlarged: ga },
    b: { x: cxB * norm, top: (hB - H / 2) * norm, w: wB * norm, enlarged: gb },
  };
  pairLayouts.set(key, layout);
  return { positions, normals, tones, toneMid: (shA.toneMid * nA + shB.toneMid * (N - nA)) / N };
}
