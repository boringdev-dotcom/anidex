import * as THREE from 'three';
import type { BodyPlan, SpecimenFeature } from '../../data/types';

/**
 * Procedural "stipple specimen" bodies. Each plan returns a list of simple primitives
 * positioned to read as the animal's silhouette. They are sampled into points, never rendered as meshes.
 * Convention: the animal faces +X, up is +Y.
 */

export interface Proportions {
  length: number;
  height: number;
  bulk: number;
  neck: number;
  tail: number;
}

type Parts = THREE.BufferGeometry[];

const D2R = Math.PI / 180;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

function xf(
  g: THREE.BufferGeometry,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  tmpE.set(rot[0], rot[1], rot[2]);
  tmpQ.setFromEuler(tmpE);
  tmpM.compose(new THREE.Vector3(...pos), tmpQ, new THREE.Vector3(...scale));
  g.applyMatrix4(tmpM);
  return g;
}

const sphere = (r: number) => new THREE.SphereGeometry(r, 24, 16);
const cyl = (rTop: number, rBot: number, h: number) => new THREE.CylinderGeometry(rTop, rBot, h, 14, 4, true);
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 8, 18);
const cone = (r: number, h: number) => new THREE.ConeGeometry(r, h, 14, 3, true);

/** A cylinder from point a to point b. */
function limb(a: THREE.Vector3, b: THREE.Vector3, rA: number, rB: number): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = cyl(rB, rA, len);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

function tube(points: THREE.Vector3[], r: number, segs = 40): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, segs, r, 10, false);
}

function quadruped(p: Proportions, f: Set<SpecimenFeature>): Parts {
  const r = 0.2 + 0.2 * p.bulk;
  const bodyLen = 0.6 + 0.9 * p.length;
  const legLen = 0.28 + 0.6 * p.height;
  const bodyY = legLen + r * 0.75;
  const parts: Parts = [];

  // torso, slightly deeper at the chest
  parts.push(xf(capsule(r, bodyLen), [0, bodyY, 0], [0, 0, 90 * D2R], [1, 1, 0.82]));
  parts.push(xf(sphere(r * 1.02), [bodyLen * 0.32, bodyY + r * 0.05, 0], [0, 0, 0], [1.1, 1.05, 0.86]));
  if (f.has('hump')) parts.push(xf(sphere(r * 0.7), [bodyLen * 0.25, bodyY + r * 0.75, 0], [0, 0, 0], [1.3, 0.8, 0.8]));
  if (f.has('mane')) parts.push(xf(sphere(r * 1.05), [bodyLen * 0.45, bodyY + r * 0.35, 0], [0, 0, 0], [0.9, 1.15, 1.0]));

  // legs
  const legR = r * (0.26 + 0.1 * p.bulk);
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const x = sx * bodyLen * 0.42;
      const top = new THREE.Vector3(x, bodyY - r * 0.2, sz * r * 0.48);
      const knee = new THREE.Vector3(x + (sx > 0 ? 0.02 : -0.04), legLen * 0.5, sz * r * 0.5);
      const foot = new THREE.Vector3(x + (sx > 0 ? 0.03 : 0), 0.02, sz * r * 0.5);
      parts.push(limb(top, knee, legR * 1.15, legR * 0.9));
      parts.push(limb(knee, foot, legR * 0.9, legR * 0.8));
      parts.push(xf(sphere(legR * 0.95), [foot.x + 0.02, 0.03, foot.z], [0, 0, 0], [1.3, 0.55, 1]));
    }
  }

  // neck and head
  const a = (30 + 45 * p.neck) * D2R;
  const neckLen = 0.12 + 0.75 * p.neck;
  const neckBase = new THREE.Vector3(bodyLen / 2 + r * 0.35, bodyY + r * 0.25, 0);
  const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
  const neckEnd = neckBase.clone().addScaledVector(dir, neckLen);
  parts.push(limb(neckBase, neckEnd, r * 0.62, r * 0.42));
  const headR = r * (0.52 + 0.12 * (1 - p.bulk));
  const head = neckEnd.clone().add(new THREE.Vector3(headR * 0.55, headR * 0.1, 0));
  parts.push(xf(sphere(headR), [head.x, head.y, head.z], [0, 0, -12 * D2R], [1.45, 0.92, 0.88]));
  // muzzle
  parts.push(xf(sphere(headR * 0.55), [head.x + headR * 1.05, head.y - headR * 0.25, 0], [0, 0, 0], [1.2, 0.8, 0.85]));

  if (f.has('pointyEars')) {
    for (const sz of [1, -1]) parts.push(xf(cone(headR * 0.24, headR * 0.7), [head.x - headR * 0.35, head.y + headR * 0.95, sz * headR * 0.45], [sz * -10 * D2R, 0, 10 * D2R]));
  }
  if (f.has('roundEars')) {
    for (const sz of [1, -1]) parts.push(xf(sphere(headR * 0.3), [head.x - headR * 0.35, head.y + headR * 0.85, sz * headR * 0.62], [0, 0, 0], [0.6, 1, 1]));
  }
  if (f.has('bigEars')) {
    for (const sz of [1, -1]) parts.push(xf(sphere(headR * 1.25), [head.x - headR * 0.7, head.y - headR * 0.05, sz * headR * 0.95], [0, sz * 25 * D2R, 0], [0.75, 1.05, 0.14]));
  }
  if (f.has('trunk')) {
    const s = new THREE.Vector3(head.x + headR * 1.2, head.y - headR * 0.2, 0);
    parts.push(
      tube(
        [s, s.clone().add(new THREE.Vector3(0.12, -legLen * 0.35, 0)), s.clone().add(new THREE.Vector3(0.12, -legLen * 0.8, 0)), s.clone().add(new THREE.Vector3(0.2, -legLen * 1.02, 0))],
        headR * 0.22,
      ),
    );
    // tusks
    for (const sz of [1, -1]) {
      const t0 = new THREE.Vector3(head.x + headR * 0.9, head.y - headR * 0.55, sz * headR * 0.3);
      parts.push(tube([t0, t0.clone().add(new THREE.Vector3(0.12, -0.12, sz * 0.02)), t0.clone().add(new THREE.Vector3(0.28, -0.08, sz * 0.04))], headR * 0.07, 16));
    }
  }
  if (f.has('horns')) {
    parts.push(xf(cone(headR * 0.28, headR * 1.2), [head.x + headR * 1.35, head.y + headR * 0.35, 0], [0, 0, -18 * D2R]));
    parts.push(xf(cone(headR * 0.2, headR * 0.6), [head.x + headR * 0.7, head.y + headR * 0.6, 0], [0, 0, -10 * D2R]));
  }

  // tail
  if (p.tail > 0.02) {
    const tl = 0.1 + 0.85 * p.tail;
    const t0 = new THREE.Vector3(-bodyLen / 2 - r * 0.55, bodyY + r * 0.2, 0);
    parts.push(
      tube(
        [t0, t0.clone().add(new THREE.Vector3(-tl * 0.35, -tl * 0.35, 0)), t0.clone().add(new THREE.Vector3(-tl * 0.6, -tl * 0.55, 0.03)), t0.clone().add(new THREE.Vector3(-tl * 0.95, -tl * 0.4, 0.05))],
        r * (0.08 + 0.1 * p.tail * (p.tail > 0.7 ? 1 : 0.4)),
      ),
    );
  }
  return parts;
}

function biped(p: Proportions, f: Set<SpecimenFeature>): Parts {
  const parts: Parts = [];
  const tr = 0.2 + 0.18 * p.bulk;
  const torsoLen = 0.35 + 0.5 * p.height;
  const legLen = f.has('flippers') ? 0.06 : 0.12 + 0.42 * p.height * (1 - 0.55 * p.bulk);
  const torsoY = legLen + tr + torsoLen / 2;
  // facing +X: width along Z
  parts.push(xf(capsule(tr, torsoLen), [0, torsoY, 0], [0, 0, f.has('flippers') ? 0 : -8 * D2R], [0.82, 1, 1]));
  const shoulderY = torsoY + torsoLen / 2 + tr * 0.35;
  const headR = tr * (f.has('flippers') ? 0.62 : 0.55);
  const headY = shoulderY + tr * 0.45 + headR * 0.6 + p.neck * 0.12;
  parts.push(xf(sphere(headR), [tr * 0.12, headY, 0], [0, 0, 0], [1.05, 1, 0.95]));
  if (f.has('beak')) parts.push(xf(cone(headR * 0.22, headR * 1.1), [tr * 0.12 + headR * 1.3, headY - headR * 0.12, 0], [0, 0, -95 * D2R]));
  else parts.push(xf(sphere(headR * 0.55), [tr * 0.12 + headR * 0.8, headY - headR * 0.3, 0], [0, 0, 0], [0.8, 0.75, 1.1]));

  const armLen = 0.2 + 0.85 * p.length;
  const armR = tr * (f.has('flippers') ? 0.36 : 0.28 + 0.1 * p.bulk);
  for (const sz of [1, -1]) {
    const sh = new THREE.Vector3(0, shoulderY - tr * 0.2, sz * (tr * 0.95));
    if (f.has('flippers')) {
      const g = capsule(armR, armLen);
      xf(g, [0, 0, 0], [0, 0, 0], [0.35, 1, 1]);
      parts.push(xf(g, [sh.x, sh.y - armLen / 2, sh.z * 1.05], [sz * 14 * D2R, 0, 0]));
    } else {
      const elbow = sh.clone().add(new THREE.Vector3(0.05, -armLen * 0.5, sz * 0.08));
      const hand = sh.clone().add(new THREE.Vector3(0.12, -armLen, sz * 0.1));
      parts.push(limb(sh, elbow, armR, armR * 0.85));
      parts.push(limb(elbow, hand, armR * 0.85, armR * 0.75));
      parts.push(xf(sphere(armR * 1.05), [hand.x, hand.y, hand.z], [0, 0, 0], [1.2, 0.8, 1]));
    }
    const hip = new THREE.Vector3(0, legLen + tr * 0.6, sz * tr * 0.5);
    const foot = new THREE.Vector3(0.02, 0.03, sz * tr * 0.55);
    parts.push(limb(hip, foot, tr * 0.36, tr * 0.3));
    parts.push(xf(sphere(tr * 0.32), [foot.x + tr * 0.2, 0.03, foot.z], [0, 0, 0], [1.6, 0.45, 1]));
  }
  return parts;
}

function aquatic(p: Proportions): Parts {
  const parts: Parts = [];
  const R = 0.12 + 0.1 * p.bulk;
  const len = 2.0;
  const pts: THREE.Vector2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 = tail, 1 = snout
    let rad: number;
    if (t > 0.78) rad = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.78) / 0.22, 2))) * 0.95 + 0.05;
    else rad = 0.06 + 0.94 * Math.pow(Math.sin((t / 0.78) * Math.PI * 0.5), 1.4);
    pts.push(new THREE.Vector2(Math.max(0.001, rad * R), (t - 0.5) * len));
  }
  const body = new THREE.LatheGeometry(pts, 28);
  parts.push(xf(body, [0, 0, 0], [0, 0, -90 * D2R], [1, 1, 0.9]));
  // flukes (horizontal), pectoral fins, dorsal fin
  for (const sz of [1, -1]) {
    parts.push(xf(sphere(R * 1.4), [-len / 2 - R * 0.5, 0, sz * R * 1.1], [0, sz * -35 * D2R, 0], [0.6, 0.08, 1.2]));
    parts.push(xf(sphere(R * 1.2), [len * 0.22, -R * 0.55, sz * R * 1.05], [sz * 30 * D2R, sz * 25 * D2R, 0], [0.9, 0.08, 0.5]));
  }
  parts.push(xf(cone(R * 0.25, R * 0.5), [-len * 0.32, R * 0.62, 0], [0, 0, 35 * D2R], [1, 1, 0.3]));
  return parts;
}

function amphibian(p: Proportions, f: Set<SpecimenFeature>): Parts {
  const parts: Parts = [];
  const r = 0.16 + 0.08 * p.bulk;
  const bodyLen = 0.6 + 0.4 * p.length;
  const legLen = 0.12 + 0.12 * p.height;
  const y = legLen + r * 0.5;
  parts.push(xf(capsule(r, bodyLen), [0, y, 0], [0, 0, 90 * D2R], [1, 0.85, 1]));
  const headR = r * 1.3;
  const hx = bodyLen / 2 + r + headR * 0.4;
  parts.push(xf(sphere(headR), [hx, y + 0.02, 0], [0, 0, 0], [1.1, 0.62, 1.15]));
  // tail: flattened, tapering
  const tl = 0.4 + 0.6 * p.tail;
  const t = cyl(r * 0.05, r * 0.95, tl);
  parts.push(xf(t, [-bodyLen / 2 - r * 0.6 - tl / 2, y + 0.02, 0], [0, 0, 90 * D2R], [1, 1, 0.25]));
  parts.push(xf(sphere(r * 0.9), [-bodyLen / 2 - tl * 0.5, y + 0.02, 0], [0, 0, 0], [tl * 2.6, 1.4, 0.08]));
  // splayed legs
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const top = new THREE.Vector3(sx * bodyLen * 0.38, y - r * 0.2, sz * r * 0.6);
      const foot = new THREE.Vector3(sx * bodyLen * 0.45, 0.02, sz * (r + legLen * 1.1));
      parts.push(limb(top, foot, r * 0.22, r * 0.16));
      parts.push(xf(sphere(r * 0.22), [foot.x, 0.02, foot.z], [0, 0, 0], [1.4, 0.4, 1.4]));
    }
  }
  if (f.has('gills')) {
    for (const sz of [1, -1]) {
      for (let i = 0; i < 3; i++) {
        const base = new THREE.Vector3(hx - headR * 0.55, y + headR * 0.15, sz * headR * 0.85);
        const ang = (-30 + i * 35) * D2R;
        const tip = base.clone().add(new THREE.Vector3(-Math.cos(ang) * headR * 0.9, Math.sin(ang) * headR * 0.9 + headR * 0.2, sz * headR * 0.35));
        parts.push(limb(base, tip, headR * 0.08, headR * 0.05));
        for (let k = 1; k <= 4; k++) {
          const q = base.clone().lerp(tip, k / 4.5);
          parts.push(xf(sphere(headR * 0.12), [q.x, q.y, q.z], [0, 0, 0], [0.5, 1.3, 0.5]));
        }
      }
    }
  }
  return parts;
}

function wingShape(pts: [number, number][]): THREE.BufferGeometry {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ShapeGeometry(s, 24);
}

function arthropod(): Parts {
  const parts: Parts = [];
  parts.push(xf(capsule(0.035, 0.5), [0, 0.3, 0], [0, 0, 90 * D2R]));
  parts.push(xf(sphere(0.05), [0.3, 0.31, 0]));
  const fore = wingShape([
    [0.06, 0.02], [0.22, 0.32], [0.3, 0.62], [0.26, 0.88], [0.12, 0.98], [-0.04, 0.86], [-0.1, 0.5], [-0.05, 0.08],
  ]);
  const hind = wingShape([
    [-0.04, 0.03], [-0.08, 0.38], [-0.2, 0.66], [-0.38, 0.64], [-0.5, 0.42], [-0.46, 0.18], [-0.28, 0.04],
  ]);
  for (const sz of [1, -1]) {
    for (const g of [fore.clone(), hind.clone()]) {
      // shape is in XY; lay it in XZ, mirror for the other side, lift into a shallow V
      g.rotateX(-Math.PI / 2);
      if (sz < 0) g.scale(1, 1, -1);
      g.rotateX(sz * -42 * D2R);
      g.scale(1.1, 1, 1.1);
      g.translate(0.03, 0.31, sz * 0.02);
      parts.push(g);
    }
    const a0 = new THREE.Vector3(0.33, 0.33, sz * 0.015);
    const a1 = new THREE.Vector3(0.55, 0.48, sz * 0.12);
    parts.push(limb(a0, a1, 0.006, 0.006));
    parts.push(xf(sphere(0.014), [a1.x, a1.y, a1.z]));
    for (let i = 0; i < 3; i++) {
      const lx = 0.12 - i * 0.08;
      parts.push(limb(new THREE.Vector3(lx, 0.28, sz * 0.02), new THREE.Vector3(lx + 0.04, 0.12, sz * 0.12), 0.006, 0.005));
    }
  }
  return parts;
}

function avian(p: Proportions, f: Set<SpecimenFeature>): Parts {
  const parts: Parts = [];
  const r = 0.18 + 0.1 * p.bulk;
  const y = 0.3 + 0.3 * p.height;
  parts.push(xf(sphere(r), [0, y, 0], [0, 0, 15 * D2R], [1.6, 1, 1]));
  const hy = y + r * 0.9 + p.neck * 0.3;
  parts.push(limb(new THREE.Vector3(r * 1.1, y + r * 0.4, 0), new THREE.Vector3(r * 1.4, hy, 0), r * 0.35, r * 0.28));
  parts.push(xf(sphere(r * 0.5), [r * 1.5, hy, 0]));
  parts.push(xf(cone(r * 0.12, r * (f.has('beak') ? 0.9 : 0.5)), [r * 2.1, hy - r * 0.05, 0], [0, 0, -90 * D2R]));
  const span = 0.3 + 0.7 * p.length;
  for (const sz of [1, -1]) {
    parts.push(xf(sphere(r), [-r * 0.1, y + r * 0.4, sz * (r + span * 0.5)], [sz * -12 * D2R, 0, 0], [0.9, 0.1, span * 2.2]));
    parts.push(limb(new THREE.Vector3(0, y - r * 0.6, sz * r * 0.35), new THREE.Vector3(0.03, 0.02, sz * r * 0.4), r * 0.07, r * 0.05));
  }
  parts.push(xf(sphere(r * 0.8), [-r * 1.8, y + r * 0.1, 0], [0, 0, 10 * D2R], [1.2, 0.12, 0.7]));
  return parts;
}

function serpentine(p: Proportions): Parts {
  const pts: THREE.Vector3[] = [];
  const L = 1.6 + p.length;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector3((t - 0.5) * L, 0.08, Math.sin(t * Math.PI * 3) * 0.25));
  }
  const r = 0.05 + 0.06 * p.bulk;
  return [tube(pts, r, 120), xf(sphere(r * 1.6), [L / 2 + r, 0.08, 0], [0, 0, 0], [1.5, 0.8, 1.1])];
}

export function buildBody(plan: BodyPlan, p: Proportions, features: SpecimenFeature[] = []): Parts {
  const f = new Set(features);
  switch (plan) {
    case 'quadruped':
      return quadruped(p, f);
    case 'biped':
      return biped(p, f);
    case 'aquatic':
      return aquatic(p);
    case 'amphibian':
      return amphibian(p, f);
    case 'arthropod':
      return arthropod();
    case 'avian':
      return avian(p, f);
    case 'serpentine':
      return serpentine(p);
  }
}
