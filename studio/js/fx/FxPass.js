// Letzter Bild-Pass (nach OutputPass, also im Anzeige-Farbraum sRGB):
// chromatische Aberration, Vignette, Filmkorn, Lichtblitz, Abblende, Abdunkeln.
import { ShaderMaterial, Vector2, Color } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAberration;
uniform float uVignette;
uniform float uGrain;
uniform float uFlash;
uniform float uFade;
uniform float uDim;
uniform vec3 uFlashColor;
uniform vec3 uFadeColor;
varying vec2 vUv;

// Hash ohne Sinus (stabil auf Mobile-GPUs), Dave Hoskins
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);
  vec3 col;
  if (uAberration > 0.0) {
    vec2 off = d * r2 * uAberration * 4.0;
    col.r = texture2D(tDiffuse, uv - off).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv + off).b;
  } else {
    col = texture2D(tDiffuse, uv).rgb;
  }

  // Vignette: elliptisch nach Seitenverhaeltnis, weich
  vec2 dv = d * vec2(mix(1.0, uResolution.x / uResolution.y, 0.5), 1.0);
  float vig = 1.0 - smoothstep(0.25, 0.95, length(dv) * 1.15);
  col *= mix(1.0, vig, uVignette);

  col += uFlashColor * uFlash;
  col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));
  col *= 1.0 - clamp(uDim, 0.0, 1.0);

  // Filmkorn mit 24 Bildern pro Sekunde, staerker in dunklen Bereichen (verhindert auch Banding)
  float frame = floor(uTime * 24.0);
  float n = hash12(gl_FragCoord.xy + frame * vec2(37.0, 17.0)) - 0.5;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * uGrain * (1.0 - 0.6 * luma);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

export class FxPass extends Pass {
  constructor() {
    super();
    this.uniforms = {
      tDiffuse: { value: null },
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uAberration: { value: 0.006 },
      uVignette: { value: 0.75 },
      uGrain: { value: 0.045 },
      uFlash: { value: 0 },
      uFade: { value: 0 },
      uDim: { value: 0 },
      uFlashColor: { value: new Color(0.27, 0.9, 1.0) },
      uFadeColor: { value: new Color(0.0157, 0.0235, 0.039) },
    };
    this.material = new ShaderMaterial({
      name: 'FxPass',
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setSize(width, height) {
    this.uniforms.uResolution.value.set(width, height);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
