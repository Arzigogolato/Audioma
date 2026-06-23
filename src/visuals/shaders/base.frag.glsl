uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float glow = (1.0 - d) * uIntensity;
  gl_FragColor = vec4(uColor * glow, glow);
}
