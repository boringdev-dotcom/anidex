import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export interface Shape {
  positions: Float32Array; // N * 3
  normals: Float32Array; // N * 3
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
  return { positions, normals };
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

/** Landing-page distribution: a dotted planet with a thin tilted orbit ring. */
export function ambientShape(N: number): Shape {
  const random = rng(7);
  const positions = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const sphereN = Math.floor(N * 0.78);
  const tilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.42, 0, -0.32));
  const v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    if (i < sphereN) {
      const y = 1 - (i / (sphereN - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = golden * i;
      const r = 0.36 * (1 + (random() - 0.5) * 0.015);
      v.set(Math.cos(th) * rad, y, Math.sin(th) * rad);
      normals.set([v.x, v.y, v.z], i * 3);
      positions.set([v.x * r, v.y * r, v.z * r], i * 3);
    } else {
      const a = random() * Math.PI * 2;
      const r = 0.52 + Math.pow(random(), 2) * 0.16;
      v.set(Math.cos(a) * r, (random() - 0.5) * 0.008, Math.sin(a) * r).applyMatrix4(tilt);
      positions.set([v.x, v.y, v.z], i * 3);
      normals.set([0, 1, 0], i * 3);
    }
  }
  return { positions, normals };
}
