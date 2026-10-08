export const MAX_REGIONS = 16;

export const globeVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
void main() {
  vUv = uv;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * One shader for both hemispheres. uBack = 1 renders the far side (faint dots seen through the glass),
 * uBack = 0 renders the near side with a translucent fill.
 */
export const globeFragment = /* glsl */ `
#define MAX_REGIONS ${MAX_REGIONS}
uniform sampler2D uLand;
uniform sampler2D uRange;
uniform float uHasRange;
uniform sampler2D uRange2;
uniform float uHasRange2;
uniform vec4 uBbox2;
uniform vec2 uCentroid2;
uniform float uPair;
uniform float uOpacity;
uniform float uReveal;
uniform float uRipple;
uniform float uTime;
uniform float uBack;
uniform vec3 uInk;
uniform vec3 uBg;
uniform vec3 uAccent;
uniform vec4 uBbox;
uniform vec2 uCentroid;
uniform vec2 uPins[6];
uniform int uPinCount;
uniform float uPinActive;
uniform float uPinOpacity;
uniform vec4 uReg[MAX_REGIONS];     // lon, lat, radius, state (1 present, -1 lost, 0 not yet)
uniform float uRegAnim[MAX_REGIONS]; // 0..1 since the last change, drives the pulse
uniform float uRegFocus[MAX_REGIONS];
uniform int uRegCount;
uniform float uHistory;
uniform float uStep;

varying vec2 vUv;
varying vec3 vNormalV;

vec3 toDisplay(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }

float greatCircle(vec2 a, vec2 b) {
  vec2 ra = radians(a);
  vec2 rb = radians(b);
  float c = sin(ra.y) * sin(rb.y) + cos(ra.y) * cos(rb.y) * cos(ra.x - rb.x);
  return degrees(acos(clamp(c, -1.0, 1.0)));
}

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

float disc(float dist, float r, float aa) { return 1.0 - smoothstep(r - aa, r + aa, dist); }

void main() {
  vec2 ll = vec2(vUv.x * 360.0 - 180.0, vUv.y * 180.0 - 90.0);
  vec2 c;
  float stepDeg = uStep;
  float dist = cell(ll, stepDeg, c);
  vec2 cuv = vec2((c.x + 180.0) / 360.0, (c.y + 90.0) / 180.0);
  float aa = fwidth(dist) * 1.1 + 0.015;

  // dots shrink toward the limb so the sphere reads as round
  float facing = uBack > 0.5 ? 0.55 : smoothstep(-0.05, 0.75, vNormalV.z);
  float sizeK = mix(0.5, 1.0, facing);

  float land = texture2D(uLand, cuv).r;
  vec4 rt = texture2D(uRange, cuv);
  float range = rt.a * uHasRange;
  // GBIF classic palette runs yellow (few records) to red (many): green falls as density rises
  float density = clamp(1.0 - rt.g, 0.0, 1.0);

  float m = 5.0;
  float inB = smoothstep(uBbox.x - m, uBbox.x + 1.0, c.x) * (1.0 - smoothstep(uBbox.z - 1.0, uBbox.z + m, c.x))
            * smoothstep(uBbox.y - m, uBbox.y + 1.0, c.y) * (1.0 - smoothstep(uBbox.w - 1.0, uBbox.w + m, c.y));
  range *= inB;
  float gc = greatCircle(c, uCentroid);
  float front = uReveal * 190.0;
  range *= smoothstep(front, front - 25.0, gc);
  float isRange = smoothstep(0.08, 0.3, range) * (1.0 - uHistory * 0.75);

  float ink = disc(dist, stepDeg * 0.2 * sizeK, aa) * land * 0.24;
  float pulse = 0.85 + 0.15 * sin(uTime * 1.6 - gc * 0.25);
  // compare page: the first species' dots shrink to sit inside the second species' rings
  float rr = stepDeg * mix(0.3, 0.46, density) * sizeK * (1.0 - uPair * 0.4);
  ink = max(ink, disc(dist, rr, aa) * isRange * pulse);
  if (uPair > 0.5) {
    vec4 rt2 = texture2D(uRange2, cuv);
    float inB2 = smoothstep(uBbox2.x - m, uBbox2.x + 1.0, c.x) * (1.0 - smoothstep(uBbox2.z - 1.0, uBbox2.z + m, c.x))
               * smoothstep(uBbox2.y - m, uBbox2.y + 1.0, c.y) * (1.0 - smoothstep(uBbox2.w - 1.0, uBbox2.w + m, c.y));
    float gc2 = greatCircle(c, uCentroid2);
    float range2 = rt2.a * uHasRange2 * inB2 * smoothstep(front, front - 25.0, gc2);
    float isRange2 = smoothstep(0.08, 0.3, range2);
    float ring = disc(dist, stepDeg * 0.46 * sizeK, aa) - disc(dist, stepDeg * 0.32 * sizeK, aa);
    ink = max(ink, ring * isRange2 * (0.85 + 0.15 * sin(uTime * 1.6 - gc2 * 0.25)));
  }
  // soft halo around range cells
  ink = max(ink, (1.0 - smoothstep(0.0, stepDeg * 0.9, dist)) * isRange * 0.12);

  // story layers (ripple, history regions, pins) only on the near side; through the glass they read as clutter
  bool nearSide = uBack < 0.5;

  // ripple out from the range centre
  float rip = 0.0;
  for (int k = 0; k < 2; k++) {
    float t = fract(uTime * 0.18 + float(k) * 0.5);
    float rad = t * 26.0;
    float dd = greatCircle(ll, uCentroid);
    rip += (1.0 - smoothstep(0.0, 0.35 + fwidth(dd), abs(dd - rad))) * (1.0 - t) * 0.5;
  }
  if (nearSide) ink = max(ink, rip * uRipple);

  // range history: present regions solid, lost regions as accent rings, new ones pulse in
  float acc = 0.0;
  for (int i = 0; i < MAX_REGIONS; i++) {
    if (i >= uRegCount || !nearSide) break;
    vec4 g = uReg[i];
    float rad = max(g.z, 2.2);
    float d = greatCircle(c, g.xy);
    float inside = 1.0 - smoothstep(rad - 0.4, rad + 0.4, d);
    float an = uRegAnim[i];
    float foc = uRegFocus[i];
    float dl = greatCircle(ll, g.xy);
    float edge = 1.0 - smoothstep(0.0, 0.18 + fwidth(dl), abs(dl - (rad + 0.7)));
    if (g.w > 0.5) {
      ink = max(ink, disc(dist, stepDeg * 0.42 * sizeK, aa) * inside * uHistory);
      ink = max(ink, edge * 0.45 * uHistory);
      // arrival pulse
      float ringR = rad + 1.0 + an * 7.0;
      ink = max(ink, (1.0 - smoothstep(0.0, 0.3 + fwidth(dl), abs(dl - ringR))) * (1.0 - an) * uHistory);
    } else if (g.w < -0.5) {
      float ring = disc(dist, stepDeg * 0.4 * sizeK, aa) - disc(dist, stepDeg * 0.22 * sizeK, aa);
      acc = max(acc, max(ring, disc(dist, stepDeg * 0.12, aa) * 0.7) * inside * uHistory);
      acc = max(acc, edge * 0.85 * uHistory);
      float ringR = rad + 0.8 + an * 5.0;
      acc = max(acc, (1.0 - smoothstep(0.0, 0.3 + fwidth(dl), abs(dl - ringR))) * (1.0 - an) * uHistory);
    }
    // outline the region in focus
    if (foc > 0.01) {
      float o = 1.0 - smoothstep(0.0, 0.22 + fwidth(dl), abs(dl - (rad + 2.2)));
      float dash = step(0.5, fract(atan(ll.y - g.y, (ll.x - g.x) * cos(radians(g.y))) * 6.0));
      ink = max(ink, o * dash * foc * uHistory * 0.8);
    }
  }

  // faint graticule every 30 degrees
  vec2 gq = abs(fract(ll / 30.0 + 0.5) - 0.5) * 30.0;
  vec2 gw = fwidth(ll) * 0.7;
  float grat = max(1.0 - smoothstep(0.0, gw.x, gq.x * cos(radians(ll.y))), 1.0 - smoothstep(0.0, gw.y, gq.y));
  grat *= 1.0 - smoothstep(62.0, 78.0, abs(ll.y));
  ink = max(ink, grat * 0.06);

  for (int i = 0; i < 6; i++) {
    if (i >= uPinCount || !nearSide) break;
    float d = greatCircle(ll, uPins[i]);
    float isActive = 1.0 - min(1.0, abs(float(i) - uPinActive));
    float pr = 2.0 + isActive * (0.8 + 0.5 * sin(uTime * 3.0));
    float ring = 1.0 - smoothstep(0.0, 0.3 + fwidth(d), abs(d - pr));
    float dotC = 1.0 - smoothstep(0.5, 0.5 + fwidth(d) * 1.5, d);
    ink = max(ink, (ring * (0.55 + 0.45 * isActive) + dotC) * uPinOpacity);
  }

  vec3 bg = toDisplay(uBg);
  vec3 fg = toDisplay(uInk);
  vec3 ac = toDisplay(uAccent);

  if (uBack > 0.5) {
    // far hemisphere: only faint dots, seen through the glass
    float a = clamp(ink * 0.32 + acc * 0.25, 0.0, 1.0);
    if (a < 0.003) discard;
    gl_FragColor = vec4(toLinear(fg), a * uOpacity);
  } else {
    float rim = pow(1.0 - clamp(vNormalV.z, 0.0, 1.0), 2.6);
    vec3 col = mix(bg, fg, 0.03);
    col = mix(col, fg, clamp(ink + rim * 0.28, 0.0, 1.0));
    col = mix(col, ac, clamp(acc, 0.0, 1.0));
    float fill = 0.78;
    float a = max(fill, clamp(ink + acc + rim * 0.5, 0.0, 1.0));
    gl_FragColor = vec4(toLinear(col), a * uOpacity);
  }
  #include <colorspace_fragment>
}
`;

export const haloVertex = /* glsl */ `
varying vec3 vNormalV;
void main() {
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragment = /* glsl */ `
uniform vec3 uInk;
uniform float uOpacity;
varying vec3 vNormalV;
void main() {
  // back faces of a sphere 1.15x the globe. |nz| is about 0.49 at the globe's silhouette and 0 at the halo's,
  // so the glow peaks hugging the globe and fades to nothing outward.
  float i = clamp(-vNormalV.z, 0.0, 1.0);
  float a = pow(smoothstep(0.0, 0.5, i), 2.2) * (1.0 - smoothstep(0.5, 0.72, i)) * 0.3;
  gl_FragColor = vec4(uInk, a * uOpacity);
  #include <colorspace_fragment>
}
`;
