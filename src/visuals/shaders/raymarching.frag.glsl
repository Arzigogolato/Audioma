uniform float uTime;
uniform vec2  uResolution;
uniform float uSpeed;
uniform float uMorph;
uniform float uColorShift;
uniform float uPalette;
uniform float uGlow;
uniform float uRepeat;
uniform float uZoom;
uniform float uInvert;

const int   MAX_STEPS = 90;
const float MAX_DIST  = 18.0;
const float SURF_DIST = 0.001;

// ── SDF primitives ────────────────────────────────────────────────────────────

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Smooth minimum — merges shapes into metaballs
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// ── scene SDF ─────────────────────────────────────────────────────────────────

float scene(vec3 p) {
  float t     = uTime * uSpeed;
  float m     = uMorph;
  float blend = 0.18 + m * 0.28;
  float size  = 0.26 + m * 0.08;

  // 4 elements orbiting on different axes/phases
  vec3 p1 = vec3(sin(t * 0.70)         * 0.55, cos(t * 0.50)         * 0.40, sin(t * 0.30) * 0.30);
  vec3 p2 = vec3(sin(t * 0.50 + 2.09) * 0.40, cos(t * 0.70 + 2.09) * 0.55, cos(t * 0.40) * 0.30);
  vec3 p3 = vec3(sin(t * 0.60 + 4.19) * 0.45, cos(t * 0.40 + 4.19) * 0.45, sin(t * 0.50 + 1.0) * 0.25);
  vec3 p4 = vec3(cos(t * 0.40 + 1.00) * 0.35, sin(t * 0.60 + 1.00) * 0.35, cos(t * 0.30 + 2.0) * 0.20);

  // Each element morphs between sphere and box
  float d1 = mix(sdSphere(p - p1, size),       sdBox(p - p1, vec3(size * 0.80)), m);
  float d2 = sdSphere(p - p2, size * 0.90);
  float d3 = mix(sdBox(p - p3, vec3(size * 0.70)), sdSphere(p - p3, size * 0.90), m * 0.5);
  float d4 = sdSphere(p - p4, size * 0.80);

  // Torus that phases in with morph
  float torus = sdTorus(p, vec2(0.62, 0.07 + m * 0.14));

  float d = smin(smin(smin(d1, d2, blend), d3, blend), d4, blend);
  d = smin(d, torus, blend * 0.8);

  // Domain repetition — fades in as uRepeat rises above 0
  if (uRepeat > 0.05) {
    vec3 pr  = p;
    pr.xy    = mod(pr.xy + uRepeat * 0.5, uRepeat) - uRepeat * 0.5;
    float rep = sdSphere(pr, 0.12);
    d = smin(d, rep, 0.18);
  }

  return d;
}

// ── raymarching ───────────────────────────────────────────────────────────────

float rayMarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float ds = scene(ro + rd * d);
    d += ds;
    if (d > MAX_DIST || abs(ds) < SURF_DIST) break;
  }
  return d;
}

vec3 getNormal(vec3 p) {
  float d = scene(p);
  vec2  e = vec2(0.0015, 0.0);
  return normalize(d - vec3(
    scene(p - e.xyy),
    scene(p - e.yxy),
    scene(p - e.yyx)
  ));
}

// ── colour palette (shared with plasma / particles) ───────────────────────────

vec3 palette(float t) {
  vec3 colA = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 1.0, 0.5) * t + vec3(0.0, 0.10, 0.20) + uColorShift));
  vec3 colB = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 0.7, 0.4) * t + vec3(0.00, 0.15, 0.20) + uColorShift));
  return mix(colA, colB, uPalette);
}

// ── main ─────────────────────────────────────────────────────────────────────

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y * uZoom;

  float t = uTime * uSpeed * 0.15;

  // Camera slow orbit around origin
  vec3 ro = vec3(sin(t) * 2.8, 0.6 + sin(t * 0.5) * 0.5, cos(t) * 2.8);

  vec3 forward = normalize(-ro);
  vec3 right   = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up      = cross(forward, right);
  vec3 rd      = normalize(uv.x * right + uv.y * up + forward * 1.5);

  float d = rayMarch(ro, rd);

  vec3 col = vec3(0.0);

  if (d < MAX_DIST) {
    vec3  p   = ro + rd * d;
    vec3  n   = getNormal(p);

    // Normal → palette colour
    float nDot = dot(n, normalize(vec3(1.0, 0.8, 0.6))) * 0.5 + 0.5;
    float depthT = 1.0 - d / MAX_DIST;
    col = palette(nDot * 0.6 + depthT * 0.4);

    // Rim / fresnel highlight
    float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
    col += rim * palette(nDot + 0.5) * 0.5;

    // AO: darken by distance
    col *= depthT * 1.3;
  }

  // Volumetric glow from near-miss rays
  float nearGlow = exp(-d * 0.4) * uGlow;
  col += palette(uColorShift + 0.1) * nearGlow * 0.4;

  col = clamp(col, 0.0, 1.0);
  if (uInvert > 0.5) col = 1.0 - col;

  gl_FragColor = vec4(col, 1.0);
}
