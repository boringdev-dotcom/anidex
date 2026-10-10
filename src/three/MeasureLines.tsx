import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { getSpecies } from '../data';
import { mid } from '../lib/format';
import { palette } from './palette';
import { specimenInfo } from './stipple/StipplePoints';

/**
 * Hairline measurement lines on the hero specimen, like a scientific plate: a length line under
 * the feet and a height line at the front, each with end ticks. They live in the specimen's own
 * space, so they turn with it. The real-world scale (metres per model unit) comes from the species'
 * measured length, and is shared with the size comparison.
 */
export const measureLocal = {
  /** label anchors in specimen-local space */
  len: new THREE.Vector3(),
  ht: new THREE.Vector3(),
  hasLen: false,
  hasHt: false,
  /** metres per normalised model unit */
  mPerUnit: 1,
  /** model extents in normalised units */
  aw: 1,
  ah: 1,
  ready: false,
};

export const measureUniforms = { uInk: palette.uInk, uOpacity: { value: 0 } };

const MAX_VERTS = 32;
const TICK = 0.028;

export function MeasureLines() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: measureUniforms,
        vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uInk; uniform float uOpacity; void main(){ gl_FragColor = vec4(uInk, uOpacity * 0.75);
          #include <colorspace_fragment>
        }`,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  const cache = useMemo(() => ({ sig: '' }), []);

  useFrame(() => {
    const { slug } = useStore.getState();
    const sp = getSpecies(slug ?? undefined);
    const ph = sp?.physical;
    const e = specimenInfo;
    if (!sp || !ph || e.key !== sp.slug) {
      // forget what was drawn, so coming back to the same animal (after a variant preview or
      // another page) measures it again instead of matching the old signature and staying off
      measureLocal.ready = false;
      cache.sig = '';
      geometry.setDrawRange(0, 0);
      return;
    }
    const sig = `${sp.slug}|${e.minX}|${e.maxY}`;
    if (sig === cache.sig) return;
    cache.sig = sig;

    const ew = e.maxX - e.minX;
    const ed = e.maxZ - e.minZ;
    const axisX = ew >= ed * 0.9;
    const aMin = axisX ? e.minX : e.minZ;
    const aMax = axisX ? e.maxX : e.maxZ;
    const oMid = axisX ? (e.minZ + e.maxZ) / 2 : (e.minX + e.maxX) / 2;
    const aw = aMax - aMin;
    const ah = e.maxY - e.minY;
    const byHeight = ph.lengthLabel === 'standing height';
    // apes are modelled on all fours but measured standing upright: their posed height is roughly
    // three quarters of standing height (approximation), and no height line is drawn for them
    const crouched = byHeight && ph.heightLabel === 'standing' && ah < aw * 1.1;
    const mPerUnit = byHeight ? (mid(ph.heightM ?? ph.lengthM) * (crouched ? 0.75 : 1)) / ah : mid(ph.lengthM) / aw;

    // a point along the length axis (a), at height y, offset o on the other axis
    const P = (a: number, y: number, o = oMid) => (axisX ? [a, y, o] : [o, y, a]);
    const pts: number[] = [];
    const seg = (p: number[], q: number[]) => pts.push(...p, ...q);

    const y0 = e.minY - 0.035;
    measureLocal.hasLen = !byHeight;
    if (!byHeight) {
      seg(P(aMin, y0), P(aMax, y0));
      seg(P(aMin, y0 - TICK), P(aMin, y0 + TICK));
      seg(P(aMax, y0 - TICK), P(aMax, y0 + TICK));
      measureLocal.len.set(...(P((aMin + aMax) / 2, y0 - 0.02) as [number, number, number]));
    }

    // height only where the pose matches the measurement (apes on all fours are measured standing)
    const hu = ph.heightM ? mid(ph.heightM) / mPerUnit : 0;
    measureLocal.hasHt = !crouched && !!ph.heightLabel && hu > 0.05 && hu <= ah * 1.15;
    if (measureLocal.hasHt) {
      const top = e.minY + Math.min(hu, ah);
      const x = aMax + 0.07;
      seg(P(x, e.minY), P(x, top));
      seg(P(x - TICK, e.minY), P(x + TICK, e.minY));
      seg(P(x - TICK, top), P(x + TICK, top));
      measureLocal.ht.set(...(P(x + 0.03, (e.minY + top) / 2) as [number, number, number]));
    }

    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    (attr.array as Float32Array).fill(0).set(pts.slice(0, MAX_VERTS * 3));
    attr.needsUpdate = true;
    geometry.setDrawRange(0, pts.length / 3);
    geometry.computeBoundingSphere();
    Object.assign(measureLocal, { mPerUnit, aw, ah, ready: true });
  });

  return <lineSegments geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />;
}
