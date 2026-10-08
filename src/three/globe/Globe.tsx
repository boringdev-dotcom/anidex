import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { live, useStore } from '../../store/useStore';
import { getSpecies } from '../../data';
import { regionState } from '../../data/rangeState';
import { loadRange } from '../../lib/gbif';
import { palette, paletteTargets } from '../palette';
import { readLossColor } from '../../theme/tokens';
import { globeFragment, globeVertex, haloFragment, haloVertex, MAX_REGIONS } from './globeShader';
import { clamp, damp } from '../../lib/math';

const emptyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
emptyTex.needsUpdate = true;

/** The rotating inner group (the director aims it at the focus point). */
export const globeSpin: { current: THREE.Group | null } = { current: null };

export const globeUniforms = {
  uLand: { value: emptyTex as THREE.Texture },
  uRange: { value: emptyTex as THREE.Texture },
  uHasRange: { value: 0 },
  /** compare page: the second species' range, drawn as rings */
  uRange2: { value: emptyTex as THREE.Texture },
  uHasRange2: { value: 0 },
  uBbox2: { value: new THREE.Vector4(-180, -90, 180, 90) },
  uCentroid2: { value: new THREE.Vector2() },
  uPair: { value: 0 },
  uOpacity: { value: 0 },
  uReveal: { value: 0 },
  uRipple: { value: 0 },
  uBbox: { value: new THREE.Vector4(-180, -90, 180, 90) },
  uCentroid: { value: new THREE.Vector2() },
  uPins: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
  uPinCount: { value: 0 },
  uPinActive: { value: -1 },
  uPinOpacity: { value: 0 },
  uReg: { value: Array.from({ length: MAX_REGIONS }, () => new THREE.Vector4()) },
  uRegAnim: { value: new Array(MAX_REGIONS).fill(1) },
  uRegFocus: { value: new Array(MAX_REGIONS).fill(0) },
  uRegCount: { value: 0 },
  uHistory: { value: 0 },
  /** halftone cell size in degrees; the director coarsens it for small globes */
  uStep: { value: 1.4 },
  uTime: palette.uTime,
  uInk: palette.uInk,
  uBg: palette.uBg,
  uAccent: palette.uAccent,
};

new THREE.TextureLoader().load('/textures/land-mask.png', (t) => {
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  globeUniforms.uLand.value = t;
});

function globeMaterial(back: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader: globeVertex,
    fragmentShader: globeFragment,
    uniforms: { ...globeUniforms, uBack: { value: back ? 1 : 0 } },
    transparent: true,
    depthWrite: false,
    side: back ? THREE.BackSide : THREE.FrontSide,
  });
}

const haloUniforms = { uInk: palette.uInk, uOpacity: { value: 0 } };
const orbitUniforms = { uInk: palette.uInk, uOpacity: { value: 0 } };

function orbitGeometry() {
  const pts: number[] = [];
  const R = 1.2;
  const N = 220;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 0.55) / N) * Math.PI * 2; // dashed
    pts.push(Math.cos(a0) * R, 0, Math.sin(a0) * R, Math.cos(a1) * R, 0, Math.sin(a1) * R);
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const l = i % 6 === 0 ? 0.06 : 0.025;
    pts.push(Math.cos(a) * R, 0, Math.sin(a) * R, Math.cos(a) * (R + l), 0, Math.sin(a) * (R + l));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

const lineMaterial = (u: typeof orbitUniforms) =>
  new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uInk; uniform float uOpacity; void main(){ gl_FragColor = vec4(uInk, uOpacity);
      #include <colorspace_fragment>
    }`,
    transparent: true,
    depthWrite: false,
  });

function rangeTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function swapTexture(u: { value: THREE.Texture }, tex: THREE.Texture) {
  const old = u.value;
  u.value = tex;
  if (old !== emptyTex && old !== tex) old.dispose();
}

export const Globe = forwardRef<THREE.Group>(function Globe(_, ref) {
  const slug = useStore((s) => s.slug);
  const pair = useStore((s) => s.pair);
  const theme = useStore((s) => s.theme);
  const spinRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 128, 64), []);
  const front = useMemo(() => globeMaterial(false), []);
  const back = useMemo(() => globeMaterial(true), []);
  const halo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: haloUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [],
  );
  const orbit = useMemo(() => orbitGeometry(), []);
  const orbitMat = useMemo(() => lineMaterial(orbitUniforms), []);

  useEffect(() => {
    globeSpin.current = spinRef.current;
    return () => {
      globeSpin.current = null;
    };
  }, []);

  // "lost" marker colour follows the theme
  useEffect(() => {
    const id = requestAnimationFrame(() => paletteTargets.accent.setStyle(readLossColor()));
    return () => cancelAnimationFrame(id);
  }, [slug, theme]);

  // compare page: both species' ranges, the first as dots and the second as rings
  useEffect(() => {
    if (!pair) {
      globeUniforms.uPair.value = 0;
      globeUniforms.uHasRange2.value = 0;
      return;
    }
    const [a, b] = pair.map((s) => getSpecies(s));
    if (!a || !b) return;
    let cancelled = false;
    globeUniforms.uPair.value = 1;
    globeUniforms.uHasRange.value = 0;
    globeUniforms.uHasRange2.value = 0;
    globeUniforms.uPinCount.value = 0;
    globeUniforms.uRegCount.value = 0;
    globeUniforms.uBbox.value.set(...a.range.bbox);
    globeUniforms.uBbox2.value.set(...b.range.bbox);
    globeUniforms.uCentroid.value.set(a.range.centroid.lon, a.range.centroid.lat);
    globeUniforms.uCentroid2.value.set(b.range.centroid.lon, b.range.centroid.lat);
    loadRange(a.gbifTaxonKey, a.range.bbox).then(({ canvas }) => {
      if (cancelled) return;
      swapTexture(globeUniforms.uRange, rangeTexture(canvas));
      globeUniforms.uHasRange.value = 1;
    });
    loadRange(b.gbifTaxonKey, b.range.bbox).then(({ canvas }) => {
      if (cancelled) return;
      swapTexture(globeUniforms.uRange2, rangeTexture(canvas));
      globeUniforms.uHasRange2.value = 1;
    });
    return () => {
      cancelled = true;
    };
  }, [pair]);

  useEffect(() => {
    const sp = getSpecies(slug ?? undefined);
    if (!sp) return;
    let cancelled = false;
    const [w, s, e, n] = sp.range.bbox;
    globeUniforms.uBbox.value.set(w, s, e, n);
    globeUniforms.uCentroid.value.set(sp.range.centroid.lon, sp.range.centroid.lat);
    const places = (sp.sightings?.places ?? []).slice(0, 6);
    places.forEach((p, i) => globeUniforms.uPins.value[i].set(p.lon, p.lat));
    globeUniforms.uPinCount.value = places.length;
    const regions = sp.rangeHistory?.regions.slice(0, MAX_REGIONS) ?? [];
    regions.forEach((r, i) => globeUniforms.uReg.value[i].set(r.lon, r.lat, r.radius, 1));
    globeUniforms.uRegCount.value = regions.length;
    globeUniforms.uHasRange.value = 0;
    useStore.setState({ rangeSource: null });

    loadRange(sp.gbifTaxonKey, sp.range.bbox).then(({ canvas, source }) => {
      if (cancelled) return;
      swapTexture(globeUniforms.uRange, rangeTexture(canvas));
      globeUniforms.uHasRange.value = 1;
      useStore.setState({ rangeSource: source });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const lastStates = useRef<number[]>([]);
  const changedAt = useRef<number[]>([]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const o = globeUniforms.uOpacity.value;
    const light = useStore.getState().theme === 'light';
    haloUniforms.uOpacity.value = o * (light ? 0.45 : 0.8);
    // the orbit ring spills past the phone's 3D stage, so it only shows on wider screens
    orbitUniforms.uOpacity.value = state.size.width <= 768 ? 0 : o * 0.2;
    if (orbitRef.current) {
      orbitRef.current.rotation.y = t * 0.05;
    }

    // range history states from the scrubbed year
    const sp = getSpecies(useStore.getState().slug ?? undefined);
    const regions = sp?.rangeHistory?.regions ?? [];
    const year = live.year ?? Infinity;
    for (let i = 0; i < Math.min(regions.length, MAX_REGIONS); i++) {
      const r = regions[i];
      const st = regionState(r, year);
      if (lastStates.current[i] !== st) {
        // only animate changes that happen while the reader is watching
        changedAt.current[i] = lastStates.current[i] === undefined ? -10 : t;
        lastStates.current[i] = st;
      }
      globeUniforms.uReg.value[i].w = st;
      globeUniforms.uRegAnim.value[i] = clamp((t - (changedAt.current[i] ?? -10)) / 1.6);
      const target = live.historyFocus === i ? 1 : 0;
      globeUniforms.uRegFocus.value[i] = damp(globeUniforms.uRegFocus.value[i], target, 6, dt);
    }
  });

  return (
    <group ref={ref}>
      <group ref={spinRef}>
        <mesh geometry={geometry} material={back} renderOrder={1} />
        <mesh geometry={geometry} material={front} renderOrder={3} />
      </group>
      <mesh geometry={geometry} material={halo} scale={1.15} renderOrder={0} />
      <group rotation={[1.36, 0, 0.3]}>
        <group ref={orbitRef}>
          <lineSegments geometry={orbit} material={orbitMat} renderOrder={4} />
        </group>
      </group>
    </group>
  );
});
