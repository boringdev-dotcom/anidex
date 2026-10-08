import * as THREE from 'three';

/** Uniforms shared by every material so a theme change is one lerp, not a material registry. */
export const palette = {
  uInk: { value: new THREE.Color('#ede6d6') },
  uBg: { value: new THREE.Color('#0b0b0c') },
  uTime: { value: 0 },
};

export const paletteTargets = {
  ink: new THREE.Color('#ede6d6'),
  bg: new THREE.Color('#0b0b0c'),
};
