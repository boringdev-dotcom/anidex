import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useStore } from '../../store/useStore';
import { getSpecies } from '../../data';
import { getAmbientShape, loadSpecimenShape, POINT_COUNT } from '../specimen/Specimen';
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
  uTime: palette.uTime,
  uInk: palette.uInk,
};

function resolveShape(key: string): Promise<Shape> {
  if (key === 'ambient') return Promise.resolve(getAmbientShape());
  const sp = getSpecies(key);
  return sp ? loadSpecimenShape(sp) : Promise.resolve(getAmbientShape());
}

/** Bounds of the current target shape, used to seat the plinth ring under the specimen. */
export const specimenInfo = { minY: -0.5, radius: 0.6 };

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
      let maxR = 0;
      for (let i = 0; i < POINT_COUNT; i++) {
        const x = shape.positions[i * 3];
        const y = shape.positions[i * 3 + 1];
        const z = shape.positions[i * 3 + 2];
        if (y < minY) minY = y;
        maxR = Math.max(maxR, Math.hypot(x, z));
      }
      specimenInfo.minY = minY;
      specimenInfo.radius = maxR;
      ta.set(shape.positions);
      nta.set(shape.normals);
      tta.set(shape.tones);
      (pos.array as Float32Array).set(shape.positions);
      from.needsUpdate = to.needsUpdate = nFrom.needsUpdate = nTo.needsUpdate = pos.needsUpdate = true;
      tFrom.needsUpdate = tTo.needsUpdate = true;

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
