import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useStore } from '../../store/useStore';
import { fetchSpecies, getSpecimenSource } from '../../data';
import { getAmbientShape, loadEarthShape, loadSpecimenShape, POINT_COUNT } from '../specimen/Specimen';
import type { Shape } from './sample';
import { palette } from '../palette';
import { stippleFragment, stippleVertex } from './shaders';
import { prefersReducedMotion } from '../../hooks/useMediaQuery';

export const stippleUniforms = {
  uMorph: { value: 1 },
  uAlive: { value: 1 },
  uCollapse: { value: 0 },
  uSize: { value: 2.2 },
  uDpr: { value: 1 },
  uOpacity: { value: 0 },
  uDrift: { value: 1 },
  uTarget: { value: new THREE.Vector3() },
  /** 0 in dark theme (light fur = bright points), 1 in light theme (dark fur = dark points). */
  uToneInvert: { value: 0 },
  /** Median tone of the shape being left and the shape being formed (auto-exposure per animal). */
  uMidFrom: { value: 0.5 },
  uMidTo: { value: 0.5 },
  /** 1 = tone follows the theme (animals), 0 = tone is ink in every theme (the Earth). */
  uInvFrom: { value: 0 },
  uInvTo: { value: 0 },
  /** Per-species, per-theme exposure tweak (specimen.tone in the JSON), damped by the director. */
  uExposure: { value: 0 },
  uTime: palette.uTime,
  uInk: palette.uInk,
};

async function resolveShape(key: string): Promise<Shape> {
  if (key === 'ambient') return loadEarthShape();
  let src = getSpecimenSource(key);
  if (!src) {
    await fetchSpecies(key.split('--')[0]).catch(() => null);
    src = getSpecimenSource(key);
  }
  return src ? loadSpecimenShape(src) : loadEarthShape();
}

/** Bounds of the current target shape, used to seat the plinth ring under the specimen. */
export const specimenInfo = { minY: -0.5, maxY: 0.5, minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5, radius: 0.6, key: '' };

const ease = (t: number) => t * t * (3 - 2 * t);

export function StipplePoints() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const amb = getAmbientShape();
    const seeds = new Float32Array(POINT_COUNT);
    for (let i = 0; i < POINT_COUNT; i++) seeds[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(amb.positions.slice(), 3));
    g.setAttribute('aFrom', new THREE.BufferAttribute(amb.positions.slice(), 3));
    g.setAttribute('aTo', new THREE.BufferAttribute(amb.positions.slice(), 3));
    g.setAttribute('aNFrom', new THREE.BufferAttribute(amb.normals.slice(), 3));
    g.setAttribute('aNTo', new THREE.BufferAttribute(amb.normals.slice(), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    g.setAttribute('aToneFrom', new THREE.BufferAttribute(amb.tones.slice(), 1));
    g.setAttribute('aToneTo', new THREE.BufferAttribute(amb.tones.slice(), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: stippleVertex,
        fragmentShader: stippleFragment,
        uniforms: stippleUniforms,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const shapeKey = useStore((s) => s.previewShape ?? s.shape);

  useEffect(() => {
    let cancelled = false;
    resolveShape(shapeKey).then((shape) => {
      if (cancelled) return;
      const from = geometry.getAttribute('aFrom') as THREE.BufferAttribute;
      const to = geometry.getAttribute('aTo') as THREE.BufferAttribute;
      const nFrom = geometry.getAttribute('aNFrom') as THREE.BufferAttribute;
      const nTo = geometry.getAttribute('aNTo') as THREE.BufferAttribute;
      const seed = geometry.getAttribute('aSeed') as THREE.BufferAttribute;
      const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
      const tFrom = geometry.getAttribute('aToneFrom') as THREE.BufferAttribute;
      const tTo = geometry.getAttribute('aToneTo') as THREE.BufferAttribute;
      const tfa = tFrom.array as Float32Array;
      const tta = tTo.array as Float32Array;
      const m = stippleUniforms.uMorph.value;
      const fa = from.array as Float32Array;
      const ta = to.array as Float32Array;
      const nfa = nFrom.array as Float32Array;
      const nta = nTo.array as Float32Array;
      // freeze the current visual state (replicating the shader's stagger) as the new "from"
      for (let i = 0; i < POINT_COUNT; i++) {
        const st = ease(Math.min(1, Math.max(0, m * 1.6 - seed.getX(i) * 0.6)));
        tfa[i] = tfa[i] + (tta[i] - tfa[i]) * st;
        for (let k = 0; k < 3; k++) {
          const j = i * 3 + k;
          fa[j] = fa[j] + (ta[j] - fa[j]) * st;
          nfa[j] = nfa[j] + (nta[j] - nfa[j]) * st;
        }
      }
      let minY = Infinity;
      let maxY = -Infinity;
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      let maxR = 0;
      for (let i = 0; i < POINT_COUNT; i++) {
        const x = shape.positions[i * 3];
        const y = shape.positions[i * 3 + 1];
        const z = shape.positions[i * 3 + 2];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
        maxR = Math.max(maxR, Math.hypot(x, z));
      }
      Object.assign(specimenInfo, { minY, maxY, minX, maxX, minZ, maxZ, key: shapeKey });
      specimenInfo.radius = maxR;
      ta.set(shape.positions);
      nta.set(shape.normals);
      tta.set(shape.tones);
      (pos.array as Float32Array).set(shape.positions);
      from.needsUpdate = to.needsUpdate = nFrom.needsUpdate = nTo.needsUpdate = pos.needsUpdate = true;
      tFrom.needsUpdate = tTo.needsUpdate = true;

      // carry the median tone across the morph the same way positions are carried
      stippleUniforms.uMidFrom.value += (stippleUniforms.uMidTo.value - stippleUniforms.uMidFrom.value) * ease(Math.min(1, m));
      stippleUniforms.uMidTo.value = shape.toneMid;
      stippleUniforms.uInvFrom.value += (stippleUniforms.uInvTo.value - stippleUniforms.uInvFrom.value) * ease(Math.min(1, m));
      stippleUniforms.uInvTo.value = shape.fixedInk ? 0 : 1;
      gsap.killTweensOf(stippleUniforms.uMorph);
      stippleUniforms.uMorph.value = 0;
      gsap.to(stippleUniforms.uMorph, {
        value: 1,
        duration: prefersReducedMotion() ? 0 : shapeKey === 'ambient' ? 1.4 : 1.8,
        ease: 'power2.inOut',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [shapeKey, geometry]);

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
