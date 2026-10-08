import { useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { live, useStore } from '../store/useStore';
import { getSpecies, getSpecimenSource } from '../data';
import { clamp, damp, lerp, smoothstep } from '../lib/math';
import { stippleUniforms } from './stipple/StipplePoints';
import { globeSpin, globeUniforms } from './globe/Globe';
import { plinthUniforms } from './Plinth';
import { facingQuaternion, latLonToVec3, meanLatLon } from './globe/geo';
import { palette } from './palette';
import { prefersReducedMotion } from '../hooks/useMediaQuery';
import { interaction } from './interaction';
import { bestSlot } from './slots';
import { specimenInfo } from './stipple/StipplePoints';

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const tmpV = new THREE.Vector3();
const tmpE = new THREE.Euler();

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

const LANDING: Record<string, Pose> = {
  'landing-hero': P({ sx: 0.03, sy: 0.02, ss: 0.7, so: 1, spin: 0.09 }),
  'landing-index': P({ sx: 0.3, sy: 0.04, ss: 0.6, so: 0.28, spin: 0.06 }),
};

/** Keyed by chapter, so species with extra chapters (e.g. subspecies) just add a key. */
const SPECIES: Record<string, Pose> = {
  hero: P({ sx: 0, sy: 0.05, ss: 0.64, so: 1, gx: 0.2 }),
  family: P({ sx: 0.21, sy: 0.19, ss: 0.5, so: 1, gx: 0.2, spin: 0.2 }),
  range: P({ sx: 0, sy: 0.05, ss: 0.64, so: 0, coll: 1, gx: 0.17, gs: 0.68, go: 1, reveal: 1, ripple: 1 }),
  population: P({ sx: 0.24, sy: 0.1, ss: 0.46, so: 0, coll: 1, gx: 0.26, gy: 0.14, gs: 0.5, go: 1, reveal: 1, hist: 1 }),
  status: P({ sx: 0.3, sy: 0.03, ss: 0.4, so: 0.95, gx: 0.21 }),
  sightings: P({ sx: 0.3, sy: 0.03, ss: 0.4, so: 0, coll: 1, gx: 0.2, gs: 0.66, go: 1, reveal: 1, pins: 1 }),
  help: P({ sx: 0.25, sy: 0.0, ss: 0.56, so: 0.55, spin: 0.1 }),
  next: P({ sx: 0, sy: 0.14, ss: 0.4, so: 0.85, spin: 0.22 }),
};

/**
 * Phones use a split layout: the top ~46% of the screen is a fixed 3D stage (see .stage-band),
 * so everything is centred in that band and sized to fill it. ss/gs here are fractions of the
 * viewport height; the director also caps them by width.
 */
const BAND_Y = 0.235; // band centre, as a fraction of viewport height above screen centre
const mobileSpecies = (key: string, p: Pose): Pose => ({
  ...p,
  sx: 0,
  gx: 0,
  sy: BAND_Y,
  gy: BAND_Y,
  ss: key === 'next' ? 0.3 : 0.36,
  gs: 0.35,
  so: p.so * (key === 'help' ? 0.7 : 1),
});
const MOBILE_SPECIES: Record<string, Pose> = Object.fromEntries(Object.entries(SPECIES).map(([k, p]) => [k, mobileSpecies(k, p)]));
const MOBILE_LANDING: Record<string, Pose> = {
  'landing-hero': { ...LANDING['landing-hero'], sy: 0.1, ss: 0.31 },
  'landing-index': { ...LANDING['landing-index'], sx: 0, sy: 0.3, ss: 0.24, so: 0.3 },
};

/** Ordered poses for the chapters on the current page. */
function posesFor(map: Record<string, Pose>, keys: string[]): Pose[] {
  const list = keys.map((k) => map[k]).filter(Boolean);
  return list.length ? list : [Object.values(map)[0]];
}

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
  const baseTilt = useRef(0.08);
  const focusQ = useRef(new THREE.Quaternion());
  const userQ = useRef(new THREE.Quaternion());
  /** phone slot mode: damped visibility and globe layers, in place of the pose table */
  const slotState = useRef({ so: 0, go: 0, reveal: 0, hist: 0, pins: 0, ripple: 0 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const reduced = prefersReducedMotion();
    palette.uTime.value = state.clock.elapsedTime;
    const { page, slug, activePlace, transitioning } = useStore.getState();
    const mobile = size.width <= 768; // matches the CSS breakpoint for the phone stage band
    const poseMap = page === 'species' ? (mobile ? MOBILE_SPECIES : SPECIES) : mobile ? MOBILE_LANDING : LANDING;
    samplePoses(posesFor(poseMap, live.chapterKeys), live.pos, tgt.current);
    // subspecies chapter: the specimen is scaled to the selected tiger's real size, extinct ones fade to a ghost
    const familyIdx = live.chapterKeys.indexOf('family');
    const wFamily = page === 'species' && familyIdx >= 0 ? clamp(1 - Math.abs(live.pos - familyIdx)) : 0;
    tgt.current.ss *= lerp(1, live.variantScale, wFamily);
    tgt.current.so *= 1 - 0.68 * live.variantGhost * wFamily;
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

    // Phones: the 3D lives in per-chapter slots in the page (see three/slots.ts) instead of poses.
    const slotMode = page === 'species' && mobile;
    const sSlot = slotMode ? bestSlot('specimen', size.height, 60) : null;
    const gSlot = slotMode ? bestSlot('globe', size.height, 60) : null;
    const eff = { so: c.so, coll: c.coll, go: c.go, reveal: c.reveal, pins: c.pins, hist: c.hist, ripple: c.ripple };
    if (slotMode) {
      const st = slotState.current;
      const k = reduced ? 60 : 9;
      const ghost = sSlot?.slot.chapter === 'family' ? 1 - 0.68 * live.variantGhost : 1;
      st.so = damp(st.so, sSlot ? smoothstep(0.1, 0.5, sSlot.visible) * ghost : 0, k, dt);
      st.go = damp(st.go, gSlot ? smoothstep(0.1, 0.5, gSlot.visible) : 0, k, dt);
      const gCh = gSlot?.slot.chapter;
      st.reveal = damp(st.reveal, gSlot ? 1 : 0, gSlot && st.reveal < 1 ? 1.1 : 4, dt);
      st.hist = damp(st.hist, gCh === 'population' ? 1 : 0, 6, dt);
      st.pins = damp(st.pins, gCh === 'sightings' ? 1 : 0, 6, dt);
      st.ripple = damp(st.ripple, gCh === 'range' ? 1 : 0, 6, dt);
      Object.assign(eff, { so: st.so, coll: 0, go: st.go, reveal: st.reveal, pins: st.pins, hist: st.hist, ripple: st.ripple });
    }
    const pxToWorld = vh / size.height;

    // specimen transform: fit by the smaller of height-based and width-based scale
    // desktop: fit by height, or by width on narrow windows. phones: fill ~90% of the width
    let sScale = mobile ? Math.min(c.ss * vh, c.ss * vw * 2.5) : Math.min(c.ss * vh, c.ss * vw * 0.95);
    if (slotMode) {
      if (sSlot) {
        // fit the specimen inside its slot: by width, or by height using the shape's own proportions
        const shapeH = Math.max(0.3, specimenInfo.maxY - specimenInfo.minY);
        let px = Math.min(sSlot.w * 0.84, (sSlot.h * 0.82) / shapeH);
        if (sSlot.slot.chapter === 'family') px *= live.variantScale;
        sScale = px * pxToWorld;
        sp.position.set((sSlot.x / size.width - 0.5) * vw, (0.5 - sSlot.y / size.height) * vh, 0);
      }
    } else {
      sp.position.set(c.sx * vw, c.sy * vh, 0);
    }
    sp.scale.setScalar(sScale);
    // specimen rotation: user drag with momentum, then the slow auto-spin takes over again
    const si = interaction.specimen;
    const now = performance.now();
    if (interaction.active === 'specimen') {
      sp.rotation.y += si.dYaw;
      si.pitch = clamp(si.pitch + si.dPitch, -0.55, 0.9);
    } else {
      if (!reduced) {
        sp.rotation.y += si.vYaw * dt;
        si.pitch = clamp(si.pitch + si.vPitch * dt, -0.55, 0.9);
      }
      si.vYaw *= Math.exp(-2.4 * dt);
      si.vPitch *= Math.exp(-5 * dt);
      const settled = Math.abs(si.vYaw) < 0.25;
      if (!reduced && settled) sp.rotation.y += dt * c.spin * clamp((now - si.last - 600) / 1200);
      if (now - si.last > 1200) si.pitch = damp(si.pitch, 0, 1.6, dt);
    }
    si.dYaw = si.dPitch = 0;
    const { previewShape, shape } = useStore.getState();
    const shown = getSpecimenSource(previewShape ?? shape);
    baseTilt.current = damp(baseTilt.current, shown?.specimen.tilt ?? 0.08, 3, dt);
    sp.rotation.x = baseTilt.current + si.pitch;

    // globe transform
    let gScale = (mobile ? Math.min(c.gs * vh, c.gs * vw * 2.3) : Math.min(c.gs * vh, c.gs * vw * 0.9)) / 2;
    if (slotMode && gSlot) gScale = Math.min(gSlot.w, gSlot.h) * 0.44 * pxToWorld;
    // globe dot grid: keep cells ~6.5 css px apart so small globes stay crisp instead of grainy
    const globePx = (gScale / vh) * size.height;
    globeUniforms.uStep.value = clamp((360 * 6.5) / (2 * Math.PI * Math.max(globePx, 1)), 1.4, 3.2);
    if (slotMode) {
      if (gSlot) gl.position.set((gSlot.x / size.width - 0.5) * vw, (0.5 - gSlot.y / size.height) * vh, 0);
    } else {
      gl.position.set(c.gx * vw, c.gy * vh, -0.2);
    }
    gl.scale.setScalar(gScale * (0.92 + 0.08 * eff.go));
    gl.visible = eff.go > 0.002;

    // where should the globe face?
    const species = getSpecies(slug ?? undefined);
    let focus = { lat: 20, lon: 0 };
    if (species) {
      focus = species.range.centroid;
      const regions = species.rangeHistory?.regions;
      if (eff.hist > 0.5 && regions?.length) {
        focus = live.historyFocus >= 0 && regions[live.historyFocus] ? regions[live.historyFocus] : meanLatLon(regions);
      }
      if (eff.pins > 0.5 && species.sightings.places.length) {
        focus = activePlace >= 0 ? species.sightings.places[activePlace] : meanLatLon(species.sightings.places);
      }
    }
    facingQuaternion(focus.lat - 8, focus.lon, qTarget.current);
    // gentle idle sway
    const sway = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.sin(state.clock.elapsedTime * 0.25) * 0.12, 0));
    qTarget.current.premultiply(sway);
    focusQ.current.slerp(qTarget.current, 1 - Math.exp(-dt * (reduced ? 60 : 2.4)));

    // globe: the reader's drag rotates on top of the story focus, then eases back after a pause
    const gi = interaction.globe;
    if (interaction.active === 'globe') {
      gi.yaw += gi.dYaw;
      gi.pitch = clamp(gi.pitch + gi.dPitch, -1.2, 1.2);
    } else {
      if (!reduced) {
        gi.yaw += gi.vYaw * dt;
        gi.pitch = clamp(gi.pitch + gi.vPitch * dt, -1.2, 1.2);
      }
      gi.vYaw *= Math.exp(-2.2 * dt);
      gi.vPitch *= Math.exp(-2.2 * dt);
      if (now - gi.last > 2600) {
        gi.yaw = damp(wrap(gi.yaw), 0, 1.1, dt);
        gi.pitch = damp(gi.pitch, 0, 1.1, dt);
      }
    }
    gi.dYaw = gi.dPitch = 0;
    userQ.current.setFromEuler(tmpE.set(gi.pitch, gi.yaw, 0, 'XYZ'));
    spin.quaternion.copy(userQ.current).multiply(focusQ.current);

    // parallax on the whole rig
    if (root.current && !reduced) {
      // no parallax in slot mode: the 3D must stay registered to its slot in the page
      const px = slotMode ? 0 : live.pointer.x * 0.07;
      const py = slotMode ? 0 : -live.pointer.y * 0.045;
      root.current.rotation.y = damp(root.current.rotation.y, px, slotMode ? 12 : 3, dt);
      root.current.rotation.x = damp(root.current.rotation.x, py, slotMode ? 12 : 3, dt);
    }

    // publish on-screen hit circles for drag-to-rotate (CSS px)
    const toScreen = (obj: THREE.Object3D, rWorld: number, out: { x: number; y: number; r: number }) => {
      obj.getWorldPosition(tmpV).project(state.camera);
      out.x = (tmpV.x * 0.5 + 0.5) * size.width;
      out.y = (-tmpV.y * 0.5 + 0.5) * size.height;
      out.r = (rWorld / vh) * size.height;
    };
    const hs = interaction.hit.specimen;
    const hg = interaction.hit.globe;
    hs.on = eff.so > 0.35 && eff.coll < 0.4;
    hg.on = eff.go > 0.6;
    if (hs.on) toScreen(sp, sScale * 0.48, hs);
    if (hg.on) toScreen(gl, gScale * 1.02, hg);

    // collapse target: the focus point on the globe surface, in specimen-local space
    root.current?.updateMatrixWorld(true);
    latLonToVec3(focus.lat, focus.lon, 1.0, v.current);
    spin.localToWorld(v.current);
    sp.worldToLocal(v.current);
    stippleUniforms.uTarget.value.copy(v.current);

    // uniforms
    stippleUniforms.uAlive.value = 1;
    stippleUniforms.uCollapse.value = eff.coll;
    stippleUniforms.uOpacity.value = eff.so;
    stippleUniforms.uDpr.value = state.viewport.dpr;
    stippleUniforms.uSize.value = clamp(size.height / 900, 0.75, 1.3) * (mobile ? 1.35 : 1.35);
    stippleUniforms.uDrift.value = reduced ? 0 : 1;
    const themeNow = useStore.getState().theme;
    const invert = themeNow === 'light' ? 1 : 0;
    stippleUniforms.uExposure.value = damp(stippleUniforms.uExposure.value, shown?.specimen.tone?.[themeNow] ?? 0, 4, dt);
    stippleUniforms.uToneInvert.value = damp(stippleUniforms.uToneInvert.value, invert, reduced ? 60 : 5, dt);
    plinthUniforms.uOpacity.value = eff.so * (1 - eff.coll) * (page === 'species' ? 0.28 : 0);

    globeUniforms.uOpacity.value = eff.go;
    globeUniforms.uReveal.value = eff.reveal;
    globeUniforms.uPinOpacity.value = eff.pins;
    globeUniforms.uPinActive.value = activePlace;
    globeUniforms.uHistory.value = page === 'species' ? eff.hist : 0;
    globeUniforms.uRipple.value = page === 'species' ? eff.ripple * eff.go : 0;
  });

  return null;
}
