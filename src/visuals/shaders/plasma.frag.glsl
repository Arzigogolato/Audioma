uniform float uTime;
uniform vec2  uResolution;
uniform float uSpeed;
uniform float uComplexity;
uniform float uColorShift;
uniform float uContrast;
uniform float uZoom;
uniform float uDistortion;
uniform float uPalette;
uniform float uInvert;

// ── utils ────────────────────────────────────────────────────────────────────

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
    u.y
  );
}

// Fractional Brownian Motion — octaves driven by uComplexity
float fbm(vec2 p) {
  float v = 0.0, a = 0.5, total = 0.0;
  mat2 m = rot2(0.5);
  int oct = 2 + int(uComplexity * 6.0);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    v     += a * noise(p);
    total += a;
    p      = m * p * 2.1;
    a     *= 0.48;
  }
  return v / total;
}

// ── palette ──────────────────────────────────────────────────────────────────

// Two cosine palettes blended by uPalette
vec3 palette(float t) {
  // A — cyan / electric blue
  vec3 colA = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 1.0, 0.5) * t + vec3(0.0, 0.10, 0.20) + uColorShift));

  // B — magenta / amber
  vec3 colB = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 0.7, 0.4) * t + vec3(0.00, 0.15, 0.20) + uColorShift));

  return mix(colA, colB, uPalette);
}

// ── main ─────────────────────────────────────────────────────────────────────

void main() {
  // screen-space UVs — centered, aspect-corrected
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * uZoom;

  float t = uTime * uSpeed * 0.15;

  // ── vortex transform — center rotates faster than edges ──────────────────
  float radius = length(uv);
  float vortexAngle = t * 1.8 / (radius * radius + 0.35);
  vec2 uvW = rot2(vortexAngle) * uv;

  // slow organic drift layered on top of the vortex
  float drift = t * 0.12;

  // ── domain warping (two levels) on vortex UV ─────────────────────────────
  vec2 q = vec2(
    fbm(uvW + vec2(0.00, 0.00) + drift),
    fbm(uvW + vec2(5.20, 1.30) + drift * 0.85)
  );

  vec2 r = vec2(
    fbm(uvW + uDistortion * q + vec2(1.70, 9.20) + drift * 0.70),
    fbm(uvW + uDistortion * q + vec2(8.30, 2.80) + drift * 0.55)
  );

  float f = fbm(uvW + uDistortion * r + drift * 0.40);

  // ── colour ────────────────────────────────────────────────────────────────
  vec3 col = palette(length(q) * 0.4 + f * 0.6);
  col = pow(max(col, vec3(0.0)), vec3(uContrast));

  // soft vignette
  float vig = 1.0 - 0.35 * dot(uv / uZoom, uv / uZoom);
  col *= clamp(vig, 0.0, 1.0);

  if (uInvert > 0.5) col = 1.0 - col;

  gl_FragColor = vec4(col, 1.0);
}
