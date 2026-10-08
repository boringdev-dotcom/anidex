export const globeVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
void main() {
  vUv = uv;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const globeFragment = /* glsl */ `
uniform sampler2D uLand;
uniform sampler2D uRange;
uniform float uHasRange;
uniform float uOpacity;
uniform float uReveal;
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uBg;
uniform vec4 uBbox;
uniform vec2 uCentroid;
uniform vec2 uPins[6];
uniform int uPinCount;
uniform float uPinActive;
uniform float uPinOpacity;

varying vec2 vUv;
varying vec3 vNormalV;

// mix in display (sRGB-ish) space so the same amounts read the same in both themes
vec3 toDisplay(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }

float greatCircle(vec2 a, vec2 b) {
  vec2 ra = radians(a);
  vec2 rb = radians(b);
  float c = sin(ra.y) * sin(rb.y) + cos(ra.y) * cos(rb.y) * cos(ra.x - rb.x);
  return degrees(acos(clamp(c, -1.0, 1.0)));
}

// Halftone grid in lat/lon with roughly equal-area cells; returns distance (deg) to the cell centre.
float cell(vec2 ll, float stepDeg, out vec2 center) {
  float row = floor((ll.y + 90.0) / stepDeg);
  float latc = -90.0 + (row + 0.5) * stepDeg;
  float nLon = max(1.0, floor(360.0 / stepDeg * cos(radians(latc))));
  float w = 360.0 / nLon;
  float col = floor((ll.x + 180.0) / w);
  float lonc = -180.0 + (col + 0.5) * w;
  center = vec2(lonc, latc);
  vec2 d = vec2((ll.x - lonc) * cos(radians(ll.y)), ll.y - latc);
  return length(d);
}

void main() {
  vec2 ll = vec2(vUv.x * 360.0 - 180.0, vUv.y * 180.0 - 90.0);
  vec2 c;
  float stepDeg = 1.5;
  float dist = cell(ll, stepDeg, c);
  vec2 cuv = vec2((c.x + 180.0) / 360.0, (c.y + 90.0) / 180.0);

  float land = texture2D(uLand, cuv).r;
  float range = texture2D(uRange, cuv).a * uHasRange;

  // suppress captive and vagrant records outside the curated wild range
  float m = 5.0;
  float inB = smoothstep(uBbox.x - m, uBbox.x + 1.0, c.x) * (1.0 - smoothstep(uBbox.z - 1.0, uBbox.z + m, c.x))
            * smoothstep(uBbox.y - m, uBbox.y + 1.0, c.y) * (1.0 - smoothstep(uBbox.w - 1.0, uBbox.w + m, c.y));
  range *= inB;

  // bloom outward from the centroid
  float gc = greatCircle(c, uCentroid);
  float front = uReveal * 190.0;
  range *= smoothstep(front, front - 25.0, gc);

  float aa = fwidth(dist) * 1.1 + 0.02;
  float landDot = 1.0 - smoothstep(stepDeg * 0.24 - aa, stepDeg * 0.24 + aa, dist);
  float rangeDot = 1.0 - smoothstep(stepDeg * 0.4 - aa, stepDeg * 0.4 + aa, dist);
  float isRange = smoothstep(0.08, 0.3, range);

  float ink = landDot * land * 0.26;
  float pulse = 0.82 + 0.18 * sin(uTime * 1.6 - gc * 0.25);
  ink = max(ink, rangeDot * isRange * pulse);

  // graticule every 15 degrees
  vec2 g = abs(fract(ll / 15.0 + 0.5) - 0.5) * 15.0;
  vec2 gw = fwidth(ll) * 0.75;
  float grat = max(1.0 - smoothstep(0.0, gw.x, g.x * cos(radians(ll.y)) ), 1.0 - smoothstep(0.0, gw.y, g.y));
  ink = max(ink, grat * 0.08);

  // sighting pins
  for (int i = 0; i < 6; i++) {
    if (i >= uPinCount) break;
    float d = greatCircle(ll, uPins[i]);
    float isActive = 1.0 - min(1.0, abs(float(i) - uPinActive));
    float rr = 2.2 + isActive * (0.9 + 0.5 * sin(uTime * 3.0));
    float ring = 1.0 - smoothstep(0.0, 0.32 + fwidth(d), abs(d - rr));
    float dotC = 1.0 - smoothstep(0.55, 0.55 + fwidth(d) * 1.5, d);
    ink = max(ink, (ring * (0.55 + 0.45 * isActive) + dotC) * uPinOpacity);
  }

  float rim = pow(1.0 - clamp(vNormalV.z, 0.0, 1.0), 3.0);
  vec3 bg = toDisplay(uBg);
  vec3 fg = toDisplay(uInk);
  vec3 base = mix(bg, fg, 0.035);
  vec3 col = toLinear(mix(base, fg, clamp(ink + rim * 0.3, 0.0, 1.0)));
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
`;
