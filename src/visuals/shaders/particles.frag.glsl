varying float vLife;
varying vec3  vColor;

void main() {
  vec2  cxy = 2.0 * gl_PointCoord - 1.0;
  float r   = dot(cxy, cxy);
  if (r > 1.0) discard;

  float glow  = exp(-r * 2.5);
  float alpha = glow * vLife * 0.85;

  gl_FragColor = vec4(vColor * glow, alpha);
}
