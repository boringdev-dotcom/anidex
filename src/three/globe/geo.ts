import * as THREE from 'three';

const D2R = Math.PI / 180;

/** Matches THREE.SphereGeometry's UV layout, so u=0 is lon -180 and v=1 is the north pole. */
export function latLonToVec3(lat: number, lon: number, r = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (lon + 180) * D2R;
  const theta = (90 - lat) * D2R;
  return out.set(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}

const e = new THREE.Euler();
/** Rotation that brings (lat, lon) to face +Z (the camera) while keeping north up. */
export function facingQuaternion(lat: number, lon: number, out = new THREE.Quaternion()): THREE.Quaternion {
  const d = latLonToVec3(lat, lon);
  const yaw = Math.atan2(d.x, d.z);
  e.set(lat * D2R, -yaw, 0, 'XYZ');
  return out.setFromEuler(e);
}

/** Average of lat/lon points via 3D mean, safe across the antimeridian. */
export function meanLatLon(points: { lat: number; lon: number }[]): { lat: number; lon: number } {
  const v = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (const p of points) v.add(latLonToVec3(p.lat, p.lon, 1, t));
  v.normalize();
  const lat = Math.asin(v.y) / D2R;
  const phi = Math.atan2(v.z, -v.x);
  let lon = phi / D2R - 180;
  if (lon < -180) lon += 360;
  return { lat, lon };
}
