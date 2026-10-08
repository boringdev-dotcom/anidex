import * as THREE from 'three';

/** Uniforms shared by every material so a theme change is one lerp, not a material registry. */
export const palette = {
  uInk: { value: new THREE.Color('#ede6d6') },
  uBg: { value: new THREE.Color('#0b0b0c') },
  uAccent: { value: new THREE.Color('#e8875a') },
  uTime: { value: 0 },
};

export const paletteTargets = {
  ink: new THREE.Color('#ede6d6'),
  bg: new THREE.Color('#0b0b0c'),
  accent: new THREE.Color('#e8875a'),
};
