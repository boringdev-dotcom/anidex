export const stippleVertex = /* glsl */ `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec3 aNFrom;
attribute vec3 aNTo;
attribute float aSeed;
attribute float aToneFrom;
attribute float aToneTo;

uniform float uMorph;
uniform float uAlive;
uniform float uCollapse;
uniform float uTime;
uniform float uSize;
uniform float uDpr;
uniform float uOpacity;
uniform float uDrift;
uniform vec3 uTarget;
uniform float uToneInvert;

varying float vAlpha;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  // staggered morph so the shape re-forms in a wave rather than all at once
  float st = clamp(uMorph * 1.6 - aSeed * 0.6, 0.0, 1.0);
  st = st * st * (3.0 - 2.0 * st);
  vec3 p = mix(aFrom, aTo, st);
  vec3 n = normalize(mix(aNFrom, aNTo, st) + vec3(1e-5));

  // swirl through the middle of a morph
  float mid = sin(st * 3.14159265);
  vec3 swirl = vec3(
    sin(aSeed * 41.0 + uTime * 0.7),
    cos(aSeed * 29.0 + uTime * 0.6),
    sin(aSeed * 17.0 - uTime * 0.5)
  );
  p += swirl * mid * 0.22;

  // breathing
  p += n * sin(uTime * 0.9 + aSeed * 6.2831) * 0.006 * uDrift;

  // population dissolve: dead points drift up and away like ash
  float dead = smoothstep(uAlive, uAlive + 0.05, aSeed);
  vec3 away = n * 0.35 + vec3(hash(aSeed * 7.1) - 0.5, 0.9 + hash(aSeed * 3.3), hash(aSeed * 13.7) - 0.5);
  p += away * dead * (0.25 + aSeed * 0.6);

  // collapse to a single point on the globe
  float cs = clamp(uCollapse * 1.5 - aSeed * 0.5, 0.0, 1.0);
  cs = cs * cs * (3.0 - 2.0 * cs);
  p = mix(p, uTarget, cs);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  // engraving-style shading from the surface normal
  vec3 nv = normalize(normalMatrix * n);
  float lambert = clamp(dot(nv, normalize(vec3(-0.45, 0.65, 0.6))), 0.0, 1.0);
  float rim = 1.0 - abs(nv.z);
  // softer light so surface markings carry the image; rim still traces the silhouette
  float shade = 0.5 + 0.38 * lambert + 0.18 * rim * rim;

  // halftone: the surface's own markings set point size and strength (0.5 is neutral)
  float tone = mix(aToneFrom, aToneTo, st);
  float k = mix(tone, 1.0 - tone, uToneInvert);
  k = smoothstep(0.12, 0.88, k);
  float toneSize = 1.0 + (k - 0.5) * 1.5;
  float toneAlpha = clamp(0.04 + 1.92 * k, 0.0, 1.3);

  gl_PointSize = uSize * uDpr * (0.55 + 0.6 * shade) * toneSize * (6.0 / -mv.z);
  vAlpha = uOpacity * clamp(shade, 0.18, 1.0) * toneAlpha * (1.0 - dead * 0.92) * (1.0 - cs * 0.6);
}
`;

export const stippleFragment = /* glsl */ `
uniform vec3 uInk;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.32, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uInk, a);
  #include <colorspace_fragment>
}
`;
