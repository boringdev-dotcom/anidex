import * as THREE from 'three';
import type { Species } from '../../data/types';
import { buildBody, type Proportions } from './bodyPlans';
import { ambientShape, hashString, sampleParts, sampleTextured, type Shape, type TexturedPart } from '../stipple/sample';

/**
 * The specimen boundary. Everything in the scene asks for a species' Shape through here.
 *
 * Today every species uses the procedural body plan. To use a real model later:
 *   1. drop public/models/<slug>.glb
 *   2. add "model": { "url": "/models/<slug>.glb" } to the species JSON
 * The GLB is sampled into the same stipple point cloud, so the look and every animation stay the same.
 */

const cache = new Map<string, Promise<Shape>>();

export const POINT_COUNT = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 16000 : 36000;

const DEFAULTS: Proportions = { length: 0.6, height: 0.5, bulk: 0.5, neck: 0.3, tail: 0.5 };

function procedural(sp: Species): Shape {
  const p = { ...DEFAULTS, ...sp.specimen.proportions };
  const parts = buildBody(sp.specimen.bodyPlan, p, sp.specimen.features);
  return sampleParts(parts, POINT_COUNT, hashString(sp.slug));
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

async function fromModel(sp: Species): Promise<Shape> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(sp.specimen.model!.url);
  gltf.scene.updateMatrixWorld(true);
  const yaw = new THREE.Matrix4().makeRotationY(sp.specimen.model?.yaw ?? 0);
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
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(yaw, m.matrixWorld));
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    parts.push({ geometry: g, pixels: readPixels(mat?.map) });
  });
  if (!parts.length) throw new Error('GLB has no meshes');
  return sampleTextured(parts, POINT_COUNT, hashString(sp.slug));
}

export function loadSpecimenShape(sp: Species): Promise<Shape> {
  let p = cache.get(sp.slug);
  if (!p) {
    p = sp.specimen.model
      ? fromModel(sp).catch((err) => {
          console.warn(`[anidex] model for ${sp.slug} failed, using procedural specimen`, err);
          return procedural(sp);
        })
      : Promise.resolve(procedural(sp));
    cache.set(sp.slug, p);
  }
  return p;
}

let ambient: Shape | null = null;
export function getAmbientShape(): Shape {
  return (ambient ??= ambientShape(POINT_COUNT));
}
