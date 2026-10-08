import { useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { live, useStore } from '../store/useStore';
import { getSpecies } from '../data';
import { clamp, damp, lerp, smoothstep } from '../lib/math';
import { stippleUniforms } from './stipple/StipplePoints';
import { globeSpin, globeUniforms } from './globe/Globe';
import { plinthUniforms } from './Plinth';
import { facingQuaternion, latLonToVec3, meanLatLon } from './globe/geo';
import { palette } from './palette';
import { prefersReducedMotion } from '../hooks/useMediaQuery';

/**
 * Poses per chapter. x/y are fractions of the viewport, scales are fractions of viewport height.
 *  sx sy ss so : specimen x, y, scale, opacity
 *  coll        : specimen collapses into a single point on the globe
 *  gx gy gs go : globe x, y, diameter, opacity
 *  reveal pins : globe range bloom, sighting pins
 *  spin        : specimen yaw speed (rad/s)
 *  hist ripple : globe range-history layer, ripple from the range centre
 */
interface Pose {
  sx: number; sy: number; ss: number; so: number; coll: number;
  gx: number; gy: number; gs: number; go: number; reveal: number; pins: number; spin: number;
  hist: number; ripple: number;
}

const P = (p: Partial<Pose>): Pose => ({
  sx: 0, sy: 0, ss: 0.6, so: 1, coll: 0, gx: 0.2, gy: 0, gs: 0.72, go: 0, reveal: 0, pins: 0, spin: 0.16, hist: 0, ripple: 0, ...p,
});

const LANDING: Pose[] = [
  P({ sx: 0, sy: 0.02, ss: 0.8, so: 1, spin: 0.09 }),
  P({ sx: 0.3, sy: 0.04, ss: 0.6, so: 0.28, spin: 0.06 }),
];

const SPECIES: Pose[] = [
  /* 0 hero        */ P({ sx: 0, sy: 0.05, ss: 0.64, so: 1, gx: 0.2 }),
  /* 1 range       */ P({ sx: 0, sy: 0.05, ss: 0.64, so: 0, coll: 1, gx: 0.17, gs: 0.68, go: 1, reveal: 1, ripple: 1 }),
  /* 2 population  */ P({ sx: 0.24, sy: 0.1, ss: 0.46, so: 0, coll: 1, gx: 0.26, gy: 0.14, gs: 0.5, go: 1, reveal: 1, hist: 1 }),
  /* 3 status      */ P({ sx: 0.3, sy: 0.03, ss: 0.4, so: 0.95, gx: 0.21 }),
  /* 4 sightings   */ P({ sx: 0.3, sy: 0.03, ss: 0.4, so: 0, coll: 1, gx: 0.2, gs: 0.66, go: 1, reveal: 1, pins: 1 }),
  /* 5 help        */ P({ sx: 0.25, sy: 0.0, ss: 0.56, so: 0.55, spin: 0.1 }),
  /* 6 next        */ P({ sx: 0, sy: 0.14, ss: 0.4, so: 0.85, spin: 0.22 }),
];

const MOBILE_SPECIES: Pose[] = SPECIES.map((p, i) =>
  i === 0
    ? { ...p, sy: 0.15, ss: 0.62 }
    : { ...p, sx: 0, gx: 0, sy: 0.27, gy: 0.26, ss: p.ss * 0.9, gs: 0.5, so: p.so * (i === 5 ? 0.6 : 1) },
);
const MOBILE_LANDING: Pose[] = [{ ...LANDING[0], sy: 0.12, ss: 0.6 }, { ...LANDING[1], sx: 0, sy: 0.3, ss: 0.4, so: 0.35 }];

const KEYS: (keyof Pose)[] = ['sx', 'sy', 'ss', 'so', 'coll', 'gx', 'gy', 'gs', 'go', 'reveal', 'pins', 'spin', 'hist', 'ripple'];

function samplePoses(poses: Pose[], pos: number, out: Pose) {
  const i = clamp(Math.floor(pos), 0, poses.length - 1);
  const j = Math.min(i + 1, poses.length - 1);
  const t = pos - i;
  const a = poses[i];
  const b = poses[j];
  for (const k of KEYS) {
    // collapse leads, opacity trails, so points converge before they fade
    const e = k === 'coll' ? smoothstep(0, 0.75, t) : k === 'so' || k === 'go' ? smoothstep(0.15, 0.95, t) : smoothstep(0, 1, t);
    out[k] = lerp(a[k], b[k], e);
  }
}

interface Props {
  specimen: RefObject<THREE.Group | null>;
  globe: RefObject<THREE.Group | null>;
  root: RefObject<THREE.Group | null>;
}

export function SceneDirector({ specimen, globe, root }: Props) {
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);
  const cur = useRef<Pose>(P({ so: 0, ss: 0.4 }));
  const tgt = useRef<Pose>(P({}));
  const qTarget = useRef(new THREE.Quaternion());
  const v = useRef(new THREE.Vector3());
  const started = useRef(false);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const reduced = prefersReducedMotion();
    palette.uTime.value = state.clock.elapsedTime;
    const { page, slug, activePlace, transitioning } = useStore.getState();
    const mobile = size.width < 768 || size.width / size.height < 0.8;
    const poses = page === 'species' ? (mobile ? MOBILE_SPECIES : SPECIES) : mobile ? MOBILE_LANDING : LANDING;
    samplePoses(poses, live.pos, tgt.current);
    const T = tgt.current;
    if (transitioning) T.so *= 1; // specimen stays visible through a morph

    // damp everything toward the target pose
    const c = cur.current;
    const fast = reduced ? 60 : 5.5;
    for (const k of KEYS) c[k] = damp(c[k], T[k], k === 'reveal' ? (T.reveal > c.reveal ? 1.1 : 4) : k === 'pins' ? 3 : fast, dt);
    if (!started.current) {
      // fade in on first frames
      started.current = true;
    }

    const vh = viewport.height;
    const vw = viewport.width;
    const sp = specimen.current;
    const gl = globe.current;
    const spin = globeSpin.current;
    if (!sp || !gl || !spin) return;

    // specimen transform: fit by the smaller of height-based and width-based scale
    const sScale = Math.min(c.ss * vh, c.ss * vw * 0.95);
    sp.position.set(c.sx * vw, c.sy * vh, 0);
    sp.scale.setScalar(sScale);
    if (!reduced) sp.rotation.y += dt * c.spin;
    const { previewShape, shape } = useStore.getState();
    const shown = getSpecies(previewShape ?? shape);
    sp.rotation.x = damp(sp.rotation.x, shown?.specimen.tilt ?? 0.08, 3, dt);

    // globe transform
    const gScale = Math.min(c.gs * vh, c.gs * vw * 0.9) / 2;
    gl.position.set(c.gx * vw, c.gy * vh, -0.2);
    gl.scale.setScalar(gScale * (0.92 + 0.08 * c.go));
    gl.visible = c.go > 0.002;

    // where should the globe face?
    const species = getSpecies(slug ?? undefined);
    let focus = { lat: 20, lon: 0 };
    if (species) {
      focus = species.range.centroid;
      const regions = species.rangeHistory?.regions;
      if (c.hist > 0.5 && regions?.length) {
        focus = live.historyFocus >= 0 && regions[live.historyFocus] ? regions[live.historyFocus] : meanLatLon(regions);
      }
      if (c.pins > 0.5 && species.sightings.places.length) {
        focus = activePlace >= 0 ? species.sightings.places[activePlace] : meanLatLon(species.sightings.places);
      }
    }
    facingQuaternion(focus.lat - 8, focus.lon, qTarget.current);
    // gentle idle sway
    const sway = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.sin(state.clock.elapsedTime * 0.25) * 0.12, 0));
    qTarget.current.premultiply(sway);
    spin.quaternion.slerp(qTarget.current, 1 - Math.exp(-dt * (reduced ? 60 : 2.4)));

    // parallax on the whole rig
    if (root.current && !reduced) {
      root.current.rotation.y = damp(root.current.rotation.y, live.pointer.x * 0.07, 3, dt);
      root.current.rotation.x = damp(root.current.rotation.x, -live.pointer.y * 0.045, 3, dt);
    }

    // collapse target: the focus point on the globe surface, in specimen-local space
    root.current?.updateMatrixWorld(true);
    latLonToVec3(focus.lat, focus.lon, 1.0, v.current);
    spin.localToWorld(v.current);
    sp.worldToLocal(v.current);
    stippleUniforms.uTarget.value.copy(v.current);

    // uniforms
    stippleUniforms.uAlive.value = 1;
    stippleUniforms.uCollapse.value = c.coll;
    stippleUniforms.uOpacity.value = c.so;
    stippleUniforms.uDpr.value = state.viewport.dpr;
    stippleUniforms.uSize.value = clamp(size.height / 900, 0.75, 1.3) * (mobile ? 1.35 : 1.35);
    stippleUniforms.uDrift.value = reduced ? 0 : 1;
    const invert = useStore.getState().theme === 'light' ? 1 : 0;
    stippleUniforms.uToneInvert.value = damp(stippleUniforms.uToneInvert.value, invert, reduced ? 60 : 5, dt);
    plinthUniforms.uOpacity.value = c.so * (1 - c.coll) * (page === 'species' ? 0.28 : 0);

    globeUniforms.uOpacity.value = c.go;
    globeUniforms.uReveal.value = c.reveal;
    globeUniforms.uPinOpacity.value = c.pins;
    globeUniforms.uPinActive.value = activePlace;
    globeUniforms.uHistory.value = page === 'species' ? c.hist : 0;
    globeUniforms.uRipple.value = page === 'species' ? c.ripple * c.go : 0;
  });

  return null;
}
