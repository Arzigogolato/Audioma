attribute float aLife;
attribute float aSpeed;

uniform float uSize;
uniform float uColorShift;
uniform float uPalette;

varying float vLife;
varying vec3  vColor;

vec3 cospalette(float t) {
  vec3 colA = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 1.0, 0.5) * t + vec3(0.0, 0.10, 0.20) + uColorShift));
  vec3 colB = vec3(0.5) + vec3(0.5) * cos(6.28318 *
    (vec3(1.0, 0.7, 0.4) * t + vec3(0.00, 0.15, 0.20) + uColorShift));
  return mix(colA, colB, uPalette);
}

void main() {
  vLife = aLife;

  // colour: polar angle + speed gives each particle a unique hue along the orbit
  float angle = atan(position.y, position.x) / 6.28318 + 0.5;
  vColor = cospalette(angle + aSpeed * 0.25);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position  = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * aLife * (1.0 + aSpeed) * (280.0 / -mv.z), 0.5, 24.0);
}
