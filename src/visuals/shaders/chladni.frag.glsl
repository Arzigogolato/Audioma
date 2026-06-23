uniform float uTime;
uniform vec2  uResolution;
uniform float uSpeed;
uniform float uModeX;
uniform float uModeY;
uniform float uSharpness;
uniform float uColorShift;
uniform float uPalette;
uniform float uSymmetry;
uniform float uPhase;
uniform float uInvert;

const float PI = 3.14159265359;

// ── shared palette ────────────────────────────────────────────────────────────

vec3 palette(float t) {
  vec3 a = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 1.0, 0.5) * t + vec3(0.0, 0.10, 0.20) + uColorShift));
  vec3 b = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 0.7, 0.4) * t + vec3(0.00, 0.15, 0.20) + uColorShift));
  return mix(a, b, uPalette);
}

// ── Chladni standing-wave function ───────────────────────────────────────────
// For mode (m,n) the nodal lines are where f ≈ 0.
// sym = 0  → antisymmetric:  cos(m·π·x)·cos(n·π·y) - cos(n·π·x)·cos(m·π·y)
// sym = 1  → symmetric:      cos(m·π·x)·cos(n·π·y) + cos(n·π·x)·cos(m·π·y)
// Fractional m,n morph smoothly between named modes.

float chladni(vec2 p, float m, float n, float sym, float phase) {
  float a = cos(m * PI * p.x + phase) * cos(n * PI * p.y);
  float b = cos(n * PI * p.x)         * cos(m * PI * p.y + phase);
  return mix(a - b, a + b, sym);
}

// ── main ─────────────────────────────────────────────────────────────────────

void main() {
  // p in [-1,1]^2 — slight stretch on 16:9 is intentional (fills screen)
  vec2 p = gl_FragCoord.xy / uResolution * 2.0 - 1.0;

  float t = uTime * uSpeed;

  // Slow drift around the controlled mode centre — makes it feel alive
  float m  = uModeX + sin(t * 0.17) * 0.38;
  float n  = uModeY + cos(t * 0.23) * 0.38;
  float ph = sin(t * 0.41) * uPhase * PI * 0.5;

  // Primary mode
  float f1 = chladni(p, m, n, uSymmetry, ph);

  // Secondary mode (m+1, n) at lower intensity — creates interference richness
  float f2 = chladni(p, m + 1.0, n, 1.0 - uSymmetry, -ph * 0.7);

  // Nodal-line glow: sharp exp falloff around zero
  float sharp = uSharpness * 14.0;
  float line1 = exp(-abs(f1) * sharp);
  float line2 = exp(-abs(f2) * sharp * 0.65) * 0.45;
  float lines = max(line1, line2);

  // Faint amplitude fill — the "sand accumulation" look
  float fill = (1.0 - abs(f1)) * 0.07;

  // Colour: chromatic shift along the nodal distance
  vec3 col  = palette(abs(f1) * 0.4 + uColorShift) * lines;
       col += palette(f1 * 0.5 + 0.5 + uColorShift + 0.3) * fill;

  // Soft outer vignette
  float vig = 1.0 - dot(p * 0.55, p * 0.55);
  col *= clamp(vig, 0.0, 1.0);

  col = clamp(col, 0.0, 1.0);
  if (uInvert > 0.5) col = 1.0 - col;

  gl_FragColor = vec4(col, 1.0);
}
