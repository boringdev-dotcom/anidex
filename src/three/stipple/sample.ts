import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export interface Shape {
  positions: Float32Array; // N * 3
  normals: Float32Array; // N * 3
  /** Surface brightness 0..1 per point (0.5 = neutral). Drives halftone point size and alpha. */
  tones: Float32Array; // N
  /** Median tone of the whole shape, so each theme can expose the animal around its own typical brightness. */
  toneMid: number;
  /** When true, tone already means "how much ink" and is not inverted for the light theme (maps, diagrams). */
  fixedInk?: boolean;
}

export interface TexturedPart {
  geometry: THREE.BufferGeometry;
  pixels?: { data: Uint8ClampedArray; width: number; height: number };
}

function area(g: THREE.BufferGeometry): number {
  const pos = g.getAttribute('position');
  const idx = g.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tri = new THREE.Triangle();
  let total = 0;
  const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const i0 = idx ? idx.getX(i) : i;
    const i1 = idx ? idx.getX(i + 1) : i + 1;
    const i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    tri.set(a, b, c);
    total += tri.getArea();
  }
  return total;
}

/** Deterministic PRNG so the same species always produces the same specimen. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Sample N points over a set of part geometries. Counts are proportional to area^0.8 so
 * thin limbs, ears and antennae still read, then the cloud is centred and scaled to fit a unit box.
 */
export function sampleParts(parts: THREE.BufferGeometry[], N: number, seed = 1): Shape {
  const random = rng(seed);
  const weights = parts.map((g) => Math.pow(Math.max(area(g), 1e-6), 0.8));
  const total = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.max(12, Math.floor((w / total) * N)));
  let sum = counts.reduce((a, b) => a + b, 0);
  // trim/pad the largest part so the total is exactly N
  const largest = weights.indexOf(Math.max(...weights));
  counts[largest] += N - sum;
  sum = N;

  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  let k = 0;
  const material = new THREE.MeshBasicMaterial();
  parts.forEach((g, i) => {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(g, material));
    // setRandomGenerator exists at runtime but is missing from @types/three 0.180
    (sampler as unknown as { setRandomGenerator: (f: () => number) => void }).setRandomGenerator(random);
    sampler.build();
    for (let j = 0; j < counts[i] && k < N; j++, k++) {
      sampler.sample(p, n);
      positions.set([p.x, p.y, p.z], k * 3);
      normals.set([n.x, n.y, n.z], k * 3);
    }
    g.dispose();
  });
  material.dispose();
  normalize(positions);
  return { positions, normals, tones: new Float32Array(N).fill(0.5), toneMid: 0.5 };
}

function luminanceAt(px: NonNullable<TexturedPart['pixels']>, u: number, v: number): number {
  // glTF UVs: (0,0) is the top-left of the image
  const x = Math.min(px.width - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * px.width)));
  const y = Math.min(px.height - 1, Math.max(0, Math.floor((((v % 1) + 1) % 1) * px.height)));
  const i = (y * px.width + x) * 4;
  const d = px.data;
  return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
}

/**
 * Sample a textured model. Points favour strongly light and strongly dark areas, so stripes,
 * patches and wing veins come through as density as well as tone.
 */
export function sampleTextured(parts: TexturedPart[], N: number, seed = 1): Shape {
  const random = rng(seed);
  const areas = parts.map((p) => Math.max(area(p.geometry), 1e-6));
  const total = areas.reduce((a, b) => a + b, 0);
  const counts = areas.map((a) => Math.floor((a / total) * N));
  counts[areas.indexOf(Math.max(...areas))] += N - counts.reduce((a, b) => a + b, 0);

  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const raw = new Float32Array(N);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const uv = new THREE.Vector2();
  const material = new THREE.MeshBasicMaterial();
  let k = 0;
  parts.forEach((part, i) => {
    const g = part.geometry;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(g, material));
    (sampler as unknown as { setRandomGenerator: (f: () => number) => void }).setRandomGenerator(random);
    sampler.build();
    const hasUv = !!part.pixels && !!g.getAttribute('uv');
    for (let j = 0; j < counts[i] && k < N; ) {
      sampler.sample(p, n, undefined, hasUv ? uv : undefined);
      let t = 0.5;
      if (hasUv) {
        t = luminanceAt(part.pixels!, uv.x, uv.y);
        // rejection sampling: keep midtones at ~55%, extremes always
        const keep = 0.55 + 0.45 * Math.min(1, Math.abs(t - 0.5) * 2.2);
        if (random() > keep) continue;
      }
      positions.set([p.x, p.y, p.z], k * 3);
      normals.set([n.x, n.y, n.z], k * 3);
      raw[k] = t;
      j++;
      k++;
    }
    g.dispose();
  });
  material.dispose();
  normalize(positions);

  // stretch tones to the model's own range (5th to 95th percentile)
  const sorted = Array.from(raw).sort((a, b) => a - b);
  const lo = sorted[Math.floor(N * 0.05)];
  const hi = sorted[Math.floor(N * 0.95)];
  const tones = new Float32Array(N);
  for (let i = 0; i < N; i++) tones[i] = hi - lo > 0.05 ? Math.min(1, Math.max(0, (raw[i] - lo) / (hi - lo))) : 0.5;
  const toneMid = Float32Array.from(tones).sort()[Math.floor(N / 2)];
  return { positions, normals, tones, toneMid };
}

/** Centre on the bounding box and scale so the largest dimension is 1. */
export function normalize(positions: Float32Array) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) box.expandByPoint(v.set(positions[i], positions[i + 1], positions[i + 2]));
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - center.x) * s;
    positions[i + 1] = (positions[i + 1] - center.y) * s;
    positions[i + 2] = (positions[i + 2] - center.z) * s;
  }
}

/** Fallback landing shape (an evenly dotted sphere) used until the land mask loads. */
export function ambientShape(N: number): Shape {
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    normals.set([Math.cos(th) * rad, y, Math.sin(th) * rad], i * 3);
    positions.set([Math.cos(th) * rad * EARTH_R, y * EARTH_R, Math.sin(th) * rad * EARTH_R], i * 3);
  }
  return { positions, normals, tones: new Float32Array(N).fill(0.3), toneMid: 0.5, fixedInk: true };
}

const EARTH_R = 0.46;
const D2R = Math.PI / 180;

/**
 * Landing-page Earth: continents in dense, heavy dots, oceans as a sparse faint shell,
 * tilted on Earth's 23.4 degree axis. Uses the same land mask as the globe.
 */
export function earthShape(N: number, mask: { data: Uint8ClampedArray; width: number; height: number }): Shape {
  const random = rng(11);
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const tones = new Float32Array(N);
  // upright axis: the director leans it toward the viewer, so the spin always shows the populated band, never the pole
  const tilt = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const isLand = (lat: number, lon: number) => {
    const x = Math.min(mask.width - 1, Math.floor(((lon + 180) / 360) * mask.width));
    const y = Math.min(mask.height - 1, Math.floor(((90 - lat) / 180) * mask.height));
    return mask.data[(y * mask.width + x) * 4] > 127;
  };
  const landTarget = Math.floor(N * 0.84);
  let land = 0;
  let sea = 0;
  let k = 0;
  let guard = 0;
  while (k < N && guard++ < N * 60) {
    // uniform point on the sphere
    const z = random() * 2 - 1;
    const lon = random() * 360 - 180;
    const lat = Math.asin(z) / D2R;
    const onLand = isLand(lat, lon);
    if (onLand ? land >= landTarget : sea >= N - landTarget) continue;
    if (!onLand && random() > 0.35) continue; // oceans are sparse, so keep them spread evenly
    if (onLand) land++;
    else sea++;
    // same convention as the globe (u = 0 at lon -180, north up)
    const phi = (lon + 180) * D2R;
    const theta = (90 - lat) * D2R;
    v.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).applyMatrix4(tilt);
    normals.set([v.x, v.y, v.z], k * 3);
    const r = EARTH_R * (onLand ? 1.006 : 1);
    positions.set([v.x * r, v.y * r, v.z * r], k * 3);
    tones[k] = onLand ? 0.95 + random() * 0.05 : 0.02 + random() * 0.06;
    k++;
  }
  return { positions, normals, tones, toneMid: 0.62, fixedInk: true };
}
