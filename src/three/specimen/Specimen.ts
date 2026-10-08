import * as THREE from 'three';
import type { Species } from '../../data/types';
import { buildBody, type Proportions } from './bodyPlans';
import { ambientShape, hashString, normalize, sampleParts, type Shape } from '../stipple/sample';

/**
 * The specimen boundary. Everything in the scene asks for a species' Shape through here.
 *
 * Today every species uses the procedural body plan. To use a real model later:
 *   1. drop public/models/<slug>.glb
 *   2. add "model": { "url": "/models/<slug>.glb" } to the species JSON
 * The GLB is sampled into the same stipple point cloud, so the look and every animation stay the same.
 */

const cache = new Map<string, Promise<Shape>>();

export const POINT_COUNT = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 6000 : 9000;

const DEFAULTS: Proportions = { length: 0.6, height: 0.5, bulk: 0.5, neck: 0.3, tail: 0.5 };

function procedural(sp: Species): Shape {
  const p = { ...DEFAULTS, ...sp.specimen.proportions };
  const parts = buildBody(sp.specimen.bodyPlan, p, sp.specimen.features);
  return sampleParts(parts, POINT_COUNT, hashString(sp.slug));
}

async function fromModel(sp: Species): Promise<Shape> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(sp.specimen.model!.url);
  gltf.scene.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry) {
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      if (sp.specimen.model?.yaw) g.rotateY(sp.specimen.model.yaw);
      parts.push(g);
    }
  });
  if (!parts.length) throw new Error('GLB has no meshes');
  const shape = sampleParts(parts, POINT_COUNT, hashString(sp.slug));
  normalize(shape.positions);
  return shape;
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
