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
import { measureLocal, measureUniforms } from './MeasureLines';
import { figureInfo, figureUniforms } from './ScaleFigure';
import { pairInfo, REFERENCES, type ReferenceKind } from './specimen/Specimen';

/** Default camera tilt by body plan: low, flat animals read better seen partly from above. */
const PLAN_TILT: Record<string, number> = { serpentine: 0.62, amphibian: 0.45, arthropod: 0.7, aquatic: 0.3 };

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
  // the Earth sits in the open space right of "Search the", above "living planet"
  'landing-hero': P({ sx: 0.19, sy: 0.085, ss: 0.5, so: 1, spin: 0.07 }),
  'landing-index': P({ sx: 0.3, sy: 0.04, ss: 0.6, so: 0.14, spin: 0.06 }),
};

/** Keyed by chapter, so species with extra chapters (e.g. subspecies) just add a key. */
const SPECIES: Record<string, Pose> = {
  hero: P({ sx: -0.1, sy: 0.1, ss: 0.58, so: 1, gx: 0.2 }),
  family: P({ sx: 0.21, sy: 0.19, ss: 0.5, so: 1, gx: 0.2, spin: 0.2 }),
  range: P({ sx: 0, sy: 0.05, ss: 0.64, so: 0, coll: 1, gx: 0.17, gs: 0.68, go: 1, reveal: 1, ripple: 1 }),
  population: P({ sx: 0.24, sy: 0.1, ss: 0.46, so: 0, coll: 1, gx: 0.26, gy: 0.14, gs: 0.5, go: 1, reveal: 1, hist: 1 }),
  status: P({ sx: 0.3, sy: 0.03, ss: 0.4, so: 0.95, gx: 0.21 }),
  about: P({ sx: 0.27, sy: 0.04, ss: 0.48, so: 0.95, gx: 0.21, spin: 0.12 }),
  sightings: P({ sx: 0.3, sy: 0.03, ss: 0.4, so: 0, coll: 1, gx: 0.2, gs: 0.66, go: 1, reveal: 1, pins: 1 }),
  help: P({ sx: 0.25, sy: 0.0, ss: 0.56, so: 0.55, spin: 0.1 }),
  next: P({ sx: 0, sy: 0.14, ss: 0.4, so: 0.85, spin: 0.22 }),
};

/** Compare page: the pair centre stage, then aside for the stats, then the globe with both ranges. */
const COMPARE: Record<string, Pose> = {
  'cmp-hero': P({ sx: 0.02, sy: 0.1, ss: 0.66, so: 1, spin: 0 }),
  'cmp-stats': P({ sx: 0.29, sy: 0.04, ss: 0.42, so: 0.9, spin: 0 }),
  'cmp-range': P({ sx: 0.25, sy: 0.04, ss: 0.5, so: 0, gx: 0.2, gs: 0.7, go: 1, reveal: 1, spin: 0 }),
  'cmp-more': P({ sx: 0.2, sy: 0.06, ss: 0.5, so: 0.5, spin: 0 }),
};

/** Social cards (1200x630): the animal or the Earth on the right, text on the left. */
const OG: Record<string, Pose> = {
  og: P({ sx: 0.19, sy: 0.02, ss: 0.74, so: 1, spin: 0 }),
  'og-earth': P({ sx: 0.23, sy: -0.05, ss: 0.8, so: 1, spin: 0 }),
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
  'landing-hero': { ...LANDING['landing-hero'], sx: 0, sy: 0.1, ss: 0.31 },
  'landing-index': { ...LANDING['landing-index'], sx: 0, sy: 0.3, ss: 0.24, so: 0.08 },
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
  figure: RefObject<THREE.Group | null>;
}

export function SceneDirector({ specimen, globe, root, figure }: Props) {
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
  /** hero measurement lines and "Compare to you" blend */
  const meas = useRef({ opacity: 0, cmp: 0 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const reduced = prefersReducedMotion();
    palette.uTime.value = state.clock.elapsedTime;
    const { page, slug, activePlace } = useStore.getState();
    const mobile = size.width <= 768; // matches the CSS breakpoint for the phone stage band
    const poseMap = page === 'species' ? (mobile ? MOBILE_SPECIES : SPECIES) : page === 'compare' ? COMPARE : page === 'og' ? OG : mobile ? MOBILE_LANDING : LANDING;
    samplePoses(posesFor(poseMap, live.chapterKeys), live.pos, tgt.current);
    // subspecies chapter: the specimen is scaled to the selected tiger's real size, extinct ones fade to a ghost
    const familyIdx = live.chapterKeys.indexOf('family');
    const wFamily = page === 'species' && familyIdx >= 0 ? clamp(1 - Math.abs(live.pos - familyIdx)) : 0;
    tgt.current.ss *= lerp(1, live.variantScale, wFamily);
    tgt.current.so *= 1 - 0.68 * live.variantGhost * wFamily;
    const T = tgt.current;
    // browse pages keep the planet faint behind the list; a hovered row's animal comes forward
    if (page === 'landing' && useStore.getState().previewShape) T.so = Math.max(T.so, mobile ? 0.5 : 0.9);

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
    const slotMode = (page === 'species' || page === 'compare') && mobile;
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
    // ---- hero measurements and "Compare to you" ----
    const heroSpecies = getSpecies(slug ?? undefined);
    const phys = heroSpecies?.physical;
    const { previewShape: pv, shape: shapeNow, compare } = useStore.getState();
    const heroW = page !== 'species' ? 0 : slotMode ? (sSlot?.slot.chapter === 'hero' ? sSlot.visible : 0) : clamp(1 - live.pos * 1.6);
    const onOwnShape = !pv && shapeNow === slug && measureLocal.ready && stippleUniforms.uMorph.value > 0.92;
    const M = meas.current;
    M.opacity = damp(M.opacity, onOwnShape ? heroW : 0, reduced ? 60 : 5, dt);
    const refKind = (phys?.compare ?? 'human') as ReferenceKind;
    const cmpOn = compare && !!phys && onOwnShape && figureInfo.ready && figureInfo.kind === refKind;
    M.cmp = damp(M.cmp, cmpOn ? heroW : 0, reduced ? 60 : 3.2, dt);
    const cmp = M.cmp;
    // composition in the animal's normalised units: animal, gap, then the reference at true scale
    const ref = REFERENCES[refKind];
    const refSizeM = refKind === 'human' ? useStore.getState().userHeightM : ref.sizeM;
    const refU = refSizeM / Math.max(measureLocal.mPerUnit, 1e-4); // reference's largest dimension, in animal units
    const rw = figureInfo.w * refU;
    const rh = figureInfo.h * refU;
    const aw = measureLocal.aw;
    const ah = measureLocal.ah;
    const gap = 0.14 * Math.max(Math.min(aw, 1), Math.min(rw, 1)) + 0.04;
    const tw = aw + gap + rw;
    const th = Math.max(ah, rh);
    const shrink = lerp(1, Math.max(tw, th, 1) * 1.1, cmp);

    let sScale = (mobile ? Math.min(c.ss * vh, c.ss * vw * 2.5) : Math.min(c.ss * vh, c.ss * vw * 0.95)) / shrink;
    if (slotMode) {
      if (sSlot) {
        // fit the specimen inside its slot: by width, or by height using the shape's own proportions
        const shapeH = Math.max(0.3, specimenInfo.maxY - specimenInfo.minY);
        // leave room at the front for the height line and its label
        // the animal spins, so fit the whole circle its body sweeps (it can never cross the screen edge),
        // with a little extra room for the measurement line at whichever end it is
        const sweep = Math.max(0.3, 2 * specimenInfo.radius);
        const fill = measureLocal.hasHt ? lerp(0.8, 0.6, cmp) : 0.88;
        let px = Math.min((sSlot.w * fill) / lerp(sweep, Math.max(tw, 1), cmp), (sSlot.h * 0.8) / lerp(shapeH, th, cmp));
        // the compare page's pair is wider than one animal: fit its actual width
        if (page === 'compare') px = Math.min((sSlot.w * 0.9) / Math.max(0.3, specimenInfo.maxX - specimenInfo.minX), (sSlot.h * 0.72) / shapeH);
        if (sSlot.slot.chapter === 'family') px *= live.variantScale;
        sScale = px * pxToWorld;
        sp.position.set((sSlot.x / size.width - 0.5) * vw, (0.5 - sSlot.y / size.height) * vh, 0);
      }
    } else {
      sp.position.set(c.sx * vw, c.sy * vh, 0);
    }
    // make room for the reference on the left (the tail end; the height line sits at the front)
    sp.position.x += ((gap + rw) / 2) * sScale * cmp;
    // desktop hero: keep the whole composition (animal, height label, reference) left of the text column
    if (!slotMode && heroW > 0.01) {
      const meta = document.querySelector('.hero__meta');
      const safeRight = meta ? meta.getBoundingClientRect().left - 28 : size.width;
      const toPx = (wx: number) => (wx / vw + 0.5) * size.width;
      const labelPx = measureLocal.hasHt ? 96 : 24;
      const rightPx = toPx(sp.position.x + (aw / 2 + 0.07) * sScale) + labelPx;
      const leftWorld = sp.position.x - (aw / 2 + (gap + rw) * cmp) * sScale;
      const leftPx = toPx(leftWorld);
      const over = rightPx - safeRight;
      if (over > 0) {
        const room = leftPx - 32; // how far we can slide left before leaving the screen
        const slide = Math.min(over, Math.max(0, room));
        sp.position.x -= (slide / size.width) * vw * heroW;
        const still = over - slide;
        if (still > 0) {
          // shrink about the left edge so the right side clears the text column
          const widthPx = rightPx - labelPx - leftPx;
          const k = clamp(1 - still / Math.max(widthPx, 1), 0.6, 1);
          const kk = lerp(1, k, heroW);
          const lw = sp.position.x - (aw / 2 + (gap + rw) * cmp) * sScale;
          sScale *= kk;
          sp.scale.setScalar(sScale);
          sp.position.x = lw + (aw / 2 + (gap + rw) * cmp) * sScale;
        }
      }
    }
    // (phones keep the animal centred on its spin axis; the height label is kept on screen by the overlay)
    // a reference taller than the animal grows upward from the shared floor: recentre vertically
    if (refKind !== 'hand') {
      const top = Math.max(specimenInfo.maxY, specimenInfo.minY + rh);
      const centreShift = (top + specimenInfo.minY) / 2 - (specimenInfo.minY + specimenInfo.maxY) / 2;
      sp.position.y -= centreShift * sScale * cmp;
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
      if (!reduced && settled) sp.rotation.y += dt * c.spin * clamp((now - si.last - 600) / 1200) * (1 - cmp);
      // the compare page's pair is laid out along X: settle back to a slight three-quarter view
      if (page === 'compare' && now - si.last > 1500) {
        const diff = wrap(-0.28 - sp.rotation.y);
        sp.rotation.y += diff * (1 - Math.exp(-2.5 * dt));
      }
      // social cards: a fixed three-quarter view, the same for every animal (the Earth shows Africa and Europe)
      // (every model faces side-on at rotation 0: curated ones by their yaw, generated ones by orient: auto)
      if (page === 'og') sp.rotation.y = shapeNow === 'ambient' ? -1.75 : -0.5;
      // compare: turn to a near-profile view so the sizes read side by side
      if (cmp > 0.02 && now - si.last > 1500) {
        const axisX = specimenInfo.maxX - specimenInfo.minX >= (specimenInfo.maxZ - specimenInfo.minZ) * 0.9;
        const profile = axisX ? -0.32 : Math.PI / 2 - 0.32;
        const diff = wrap(profile - sp.rotation.y);
        sp.rotation.y += diff * (1 - Math.exp(-3 * dt * cmp));
      }
      if (now - si.last > 1200) si.pitch = damp(si.pitch, 0, 1.6, dt);
    }
    si.dYaw = si.dPitch = 0;
    const { previewShape, shape } = useStore.getState();
    const shown = getSpecimenSource(previewShape ?? shape);
    const handCompare = refKind === 'hand';
    // the landing Earth leans its north toward the viewer (most land is in the northern hemisphere)
    const baseT = shown ? (shown.specimen.tilt ?? PLAN_TILT[shown.specimen.bodyPlan] ?? 0.08) : (previewShape ?? shape) === 'ambient' ? 0.32 : 0.08;
    const tiltTarget = lerp(baseT, handCompare ? baseT : 0.03, cmp);
    baseTilt.current = damp(baseTilt.current, tiltTarget, 3, dt);
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
    const pair = page === 'compare' ? useStore.getState().pair : null;
    if (pair) {
      const pa = getSpecies(pair[0]);
      const pb = getSpecies(pair[1]);
      if (pa && pb) focus = meanLatLon([pa.range.centroid, pb.range.centroid]);
    } else if (species) {
      focus = species.range.centroid;
      const regions = species.rangeHistory?.regions;
      if (eff.hist > 0.5 && regions?.length) {
        focus = live.historyFocus >= 0 && regions[live.historyFocus] ? regions[live.historyFocus] : meanLatLon(regions);
      }
      const places = species.sightings?.places ?? [];
      if (eff.pins > 0.5 && places.length) {
        focus = activePlace >= 0 && places[activePlace] ? places[activePlace] : meanLatLon(places);
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

    // reference figure, at true scale to the right of the animal
    const fig = figure.current;
    if (fig) {
      fig.visible = cmp > 0.01;
      const fs = sScale * refU;
      fig.scale.setScalar(fs);
      const figX = sp.position.x - (aw / 2 + gap + rw / 2) * sScale;
      // stand on the same floor as the animal; flat references (hand) sit level with its centre
      const figY = handCompare ? sp.position.y : sp.position.y + specimenInfo.minY * sScale - figureInfo.minY * fs;
      fig.position.set(figX, figY, 0);
      fig.rotation.set(handCompare ? baseTilt.current : 0, handCompare ? -0.3 : 0.5, 0);
      figureUniforms.uOpacity.value = cmp * 0.92;
      figureUniforms.uSize.value = stippleUniforms.uSize.value;
      figureUniforms.uDpr.value = stippleUniforms.uDpr.value;
      figureUniforms.uDrift.value = stippleUniforms.uDrift.value;
      figureUniforms.uToneInvert.value = stippleUniforms.uToneInvert.value;
    }
    measureUniforms.uOpacity.value = M.opacity * 0.6;

    // screen anchors for the HTML labels
    root.current?.updateMatrixWorld(true);
    const lm = live.measure;
    const project = (wp: THREE.Vector3, out: { x: number; y: number; on: boolean }) => {
      wp.project(state.camera);
      out.x = (wp.x * 0.5 + 0.5) * size.width;
      out.y = (-wp.y * 0.5 + 0.5) * size.height;
      out.on = wp.z < 1;
    };
    lm.opacity = M.opacity;
    lm.compare = cmp;
    if (measureLocal.hasLen) project(sp.localToWorld(tmpV.copy(measureLocal.len)), lm.len);
    else lm.len.on = false;
    if (measureLocal.hasHt) project(sp.localToWorld(tmpV.copy(measureLocal.ht)), lm.ht);
    else lm.ht.on = false;
    if (fig && cmp > 0.01) {
      const top = handCompare ? fig.position.y - (figureInfo.h / 2 + 0.12) * fig.scale.y : fig.position.y + (figureInfo.maxY + 0.06) * fig.scale.y;
      project(tmpV.set(fig.position.x, top, 0).applyMatrix4(root.current!.matrixWorld), lm.ref);
    } else lm.ref.on = false;

    // compare page: name labels above each animal, while the pair is in front
    const pl = live.pairLabels;
    const pairShown = page === 'compare' && !pv && pairInfo.key === shapeNow && stippleUniforms.uMorph.value > 0.85;
    const pairW = slotMode ? (sSlot?.slot.chapter === 'cmp-hero' ? sSlot.visible : 0) : clamp(1 - live.pos * 1.4);
    pl.opacity = damp(pl.opacity, pairShown ? pairW * eff.so : 0, reduced ? 60 : 5, dt);
    if (pl.opacity > 0.01) {
      project(sp.localToWorld(tmpV.set(pairInfo.a.x, pairInfo.a.top + 0.06, 0)), pl.a);
      project(sp.localToWorld(tmpV.set(pairInfo.b.x, pairInfo.b.top + 0.06, 0)), pl.b);
    }

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
    plinthUniforms.uOpacity.value = eff.so * (1 - eff.coll) * (page === 'species' || page === 'compare' || page === 'og' ? 0.28 : 0) * (1 - 0.7 * meas.current.cmp);

    globeUniforms.uOpacity.value = eff.go;
    globeUniforms.uReveal.value = eff.reveal;
    globeUniforms.uPinOpacity.value = eff.pins;
    globeUniforms.uPinActive.value = activePlace;
    globeUniforms.uHistory.value = page === 'species' ? eff.hist : 0;
    globeUniforms.uRipple.value = page === 'species' ? eff.ripple * eff.go : 0;
  });

  return null;
}
