import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { getSpecies } from '../../data';
import { loadRange } from '../../lib/gbif';
import { palette } from '../palette';
import { globeFragment, globeVertex } from './globeShader';

const emptyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
emptyTex.needsUpdate = true;

export const globeUniforms = {
  uLand: { value: emptyTex as THREE.Texture },
  uRange: { value: emptyTex as THREE.Texture },
  uHasRange: { value: 0 },
  uOpacity: { value: 0 },
  uReveal: { value: 0 },
  uBbox: { value: new THREE.Vector4(-180, -90, 180, 90) },
  uCentroid: { value: new THREE.Vector2() },
  uPins: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
  uPinCount: { value: 0 },
  uPinActive: { value: -1 },
  uPinOpacity: { value: 0 },
  uTime: palette.uTime,
  uInk: palette.uInk,
  uBg: palette.uBg,
};

new THREE.TextureLoader().load('/textures/land-mask.png', (t) => {
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  globeUniforms.uLand.value = t;
});

export const Globe = forwardRef<THREE.Group>(function Globe(_, ref) {
  const slug = useStore((s) => s.slug);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: globeVertex,
        fragmentShader: globeFragment,
        uniforms: globeUniforms,
        transparent: true,
        depthWrite: true,
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 128, 64), []);

  useEffect(() => {
    const sp = getSpecies(slug ?? undefined);
    if (!sp) return;
    let cancelled = false;
    const [w, s, e, n] = sp.range.bbox;
    globeUniforms.uBbox.value.set(w, s, e, n);
    globeUniforms.uCentroid.value.set(sp.range.centroid.lon, sp.range.centroid.lat);
    const places = sp.sightings.places.slice(0, 6);
    places.forEach((p, i) => globeUniforms.uPins.value[i].set(p.lon, p.lat));
    globeUniforms.uPinCount.value = places.length;
    globeUniforms.uHasRange.value = 0;
    useStore.setState({ rangeSource: null });

    loadRange(sp.gbifTaxonKey, sp.range.bbox).then(({ canvas, source }) => {
      if (cancelled) return;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const old = globeUniforms.uRange.value;
      globeUniforms.uRange.value = tex;
      globeUniforms.uHasRange.value = 1;
      if (old !== emptyTex) old.dispose();
      useStore.setState({ rangeSource: source });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <group ref={ref}>
      <mesh geometry={geometry} material={material} renderOrder={1} />
    </group>
  );
});
