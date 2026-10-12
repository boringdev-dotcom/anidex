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
    // a failed download is not kept, so the next "Compare to you" tries again
    p.catch(() => refCache.delete(kind));
  }
  return p;
}

/** The visitor's figure for the line-up: the person model, or a procedural biped if it can't load. */
export function loadYouShape(): Promise<Shape> {
  return loadReferenceShape('human').catch(() => procedural({ key: 'you', specimen: { sizeClass: 'm', bodyPlan: 'biped' } }));
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
    p = Promise.all([loadSpecimenShape(A), loadSpecimenShape(B)]).then(([shA, shB]) => {
      const { shape, members } = buildRow([shA, shB], [sa, sb]);
      pairLayouts.set(key, { key, a: members[0], b: members[1] });
      return shape;
    });
    cache.set(id, p);
  }
  return p;
}

// ---------------- several animals in a row (line-up page) ----------------

/** Layout of the current line-up shape: one entry per member in order, and the shared floor, for the name labels. */
export const lineupInfo: { key: string; members: PairSide[]; floor: number } = { key: '', members: [], floor: 0 };
const lineupLayouts = new Map<string, { members: PairSide[]; floor: number }>();

export function activateLineupLayout(key: string) {
  const l = lineupLayouts.get(key);
  if (l) Object.assign(lineupInfo, { key, members: l.members.map((m) => ({ ...m })), floor: l.floor });
}

/** Any number of shapes (animals, or the visitor's own figure) side by side at true scale. */
export function loadLineupShape(key: string, parts: { id: string; shape: Promise<Shape>; size: PairSize }[]): Promise<Shape> {
  const id = `${key}|${parts.map((m) => `${m.id}:${m.size.metres}`).join(',')}`;
  let p = cache.get(id);
  if (!p) {
    p = Promise.all(parts.map((m) => m.shape)).then((shapes) => {
      // a tighter gap than a pair: with a giant in the row, a gap set by its length leaves the rest tiny
      const { shape, members, floor } = buildRow(
        shapes,
        parts.map((m) => m.size),
        0.06,
      );
      lineupLayouts.set(key, { members, floor });
      return shape;
    });
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

/**
 * Point shares by visible area, but none below a floor (0.15 each for a pair), so no member is a
 * smudge: members under the floor get it, and the rest split what is left in proportion.
 */
function shares(areas: number[]): number[] {
  const floor = 0.3 / areas.length;
  const out = new Array<number>(areas.length).fill(0);
  let free = areas.map((_, i) => i);
  let budget = 1;
  for (;;) {
    const sum = free.reduce((t, i) => t + areas[i], 0) || 1;
    const low = free.filter((i) => (areas[i] / sum) * budget < floor);
    if (!low.length) {
      for (const i of free) out[i] = (areas[i] / sum) * budget;
      return out;
    }
    for (const i of low) out[i] = floor;
    budget -= floor * low.length;
    free = free.filter((i) => !low.includes(i));
  }
}

/** `gapK`: the space between members, as a share of the longest one. */
function buildRow(srcs: Shape[], sizes: PairSize[], gapK = 0.16): { shape: Shape; members: PairSide[]; floor: number } {
  const prep = (s: Shape, size: PairSize) => {
    const e = extents(s);
    // lay each animal's long axis along X so the row is seen side-on together
    const swap = e.maxZ - e.minZ > (e.maxX - e.minX) * 1.05;
    const aw = swap ? e.maxZ - e.minZ : e.maxX - e.minX;
    const ah = e.maxY - e.minY;
    // apes are modelled on all fours but measured standing: posed height is about 3/4 of it
    const crouched = size.standing && ah < aw * 1.1;
    const k = size.by === 'height' ? (size.metres * (crouched ? 0.75 : 1)) / ah : size.metres / aw;
    return { s, e, swap, aw, ah, k, grow: 1 };
  };
  const ps = srcs.map((s, i) => prep(s, sizes[i]));
  // tiny animals next to giants stay visible: at least 4% of the largest one's length
  const big = Math.max(...ps.flatMap((p) => [p.aw * p.k, p.ah * p.k]));
  for (const p of ps) {
    p.grow = Math.max(1, (big * 0.04) / (p.aw * p.k));
    p.k *= p.grow;
  }
  const ws = ps.map((p) => p.aw * p.k);
  const hs = ps.map((p) => p.ah * p.k);
  const gap = gapK * Math.max(...ws) + 0.02 * big;
  const W = ws.reduce((t, w) => t + w, 0) + gap * (ps.length - 1);
  const H = Math.max(...hs);
  // fit roughly the box a single specimen fills
  const norm = 1.3 / Math.max(W, H * 1.5);
  const cxs: number[] = [];
  let x = -W / 2;
  for (const w of ws) {
    cxs.push(x + w / 2);
    x += w + gap;
  }

  const N = POINT_COUNT;
  const share = shares(ws.map((w, i) => w * hs[i]));
  const counts = share.map((f) => Math.round(N * f));
  counts[counts.length - 1] = N - counts.slice(0, -1).reduce((t, c) => t + c, 0);
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const tones = new Float32Array(N);
  const place = (p: (typeof ps)[number], cx: number, from: number, count: number) => {
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
  let from = 0;
  ps.forEach((p, i) => {
    place(p, cxs[i], from, counts[i]);
    from += counts[i];
  });
  const members = ps.map((p, i) => ({ x: cxs[i] * norm, top: (hs[i] - H / 2) * norm, w: ws[i] * norm, enlarged: p.grow }));
  const toneMid = srcs.reduce((t, s, i) => t + s.toneMid * counts[i], 0) / N;
  return { shape: { positions, normals, tones, toneMid }, members, floor: (-H / 2) * norm };
}
