import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { getSpecies } from '../data';
import { loadReferenceShape, type ReferenceKind } from './specimen/Specimen';
import { stippleFragment, stippleVertex } from './stipple/shaders';
import { stippleUniforms } from './stipple/StipplePoints';
import { palette } from './palette';

/** Bounds of the loaded reference figure in its normalised units. */
export const figureInfo = { kind: '' as ReferenceKind | '', minY: -0.5, maxY: 0.5, w: 0.3, h: 1, ready: false };

/** Own uniforms (opacity), sharing size, theme and time with the specimen so both read as one plate. */
export const figureUniforms = {
  ...stippleUniforms,
  uMorph: { value: 1 },
  uAlive: { value: 1 },
  uCollapse: { value: 0 },
  uOpacity: { value: 0 },
  uMidFrom: { value: 0.5 },
  uMidTo: { value: 0.5 },
  uInvFrom: { value: 1 },
  uInvTo: { value: 1 },
  uExposure: { value: 0 },
  uTarget: { value: new THREE.Vector3() },
  uTime: palette.uTime,
  uInk: palette.uInk,
};

/** A stippled person (or hand) at true scale beside the specimen, for "Compare to you". */
export const ScaleFigure = forwardRef<THREE.Group>(function ScaleFigure(_, ref) {
  const slug = useStore((s) => s.slug);
  const compare = useStore((s) => s.compare);
  const kind = (getSpecies(slug ?? undefined)?.physical?.compare ?? 'human') as ReferenceKind;
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: stippleVertex,
        fragmentShader: stippleFragment,
        uniforms: figureUniforms,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    if (!compare) return;
    let cancelled = false;
    loadReferenceShape(kind)
      .then((shape) => {
        if (cancelled) return;
        const N = shape.tones.length;
        const seeds = new Float32Array(N).map(() => Math.random());
        geometry.setAttribute('position', new THREE.BufferAttribute(shape.positions, 3));
        geometry.setAttribute('aFrom', new THREE.BufferAttribute(shape.positions, 3));
        geometry.setAttribute('aTo', new THREE.BufferAttribute(shape.positions, 3));
        geometry.setAttribute('aNFrom', new THREE.BufferAttribute(shape.normals, 3));
        geometry.setAttribute('aNTo', new THREE.BufferAttribute(shape.normals, 3));
        geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
        geometry.setAttribute('aToneFrom', new THREE.BufferAttribute(shape.tones, 1));
        geometry.setAttribute('aToneTo', new THREE.BufferAttribute(shape.tones, 1));
        geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
        figureUniforms.uMidFrom.value = figureUniforms.uMidTo.value = shape.toneMid;
        let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < N; i++) {
          const x = shape.positions[i * 3], y = shape.positions[i * 3 + 1], z = shape.positions[i * 3 + 2];
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }
        Object.assign(figureInfo, { kind, minY, maxY, w: Math.max(maxX - minX, maxZ - minZ), h: maxY - minY, ready: true });
      })
      .catch((err) => {
        console.warn('[anidex] reference figure failed to load', err);
        figureInfo.ready = false;
      });
    return () => {
      cancelled = true;
    };
  }, [compare, kind, geometry]);

  return (
    <group ref={ref} visible={false}>
      <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
    </group>
  );
});
