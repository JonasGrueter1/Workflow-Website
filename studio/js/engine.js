// Engine: Renderer, Licht, Umgebung, Postprocessing, Groesse, Maus, Qualitaetsstufen.
// Wird von main.js (Seite) und dev.js (Testseite) gleich verwendet.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FxPass } from './fx/FxPass.js';
import { PALETTE, QUALITY, BASE_LOOK, LOOK_KEYS } from './config.js';

const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

/** Qualitaetsstufe waehlen. ?q=high|medium|low erzwingt eine Stufe (ohne automatische Anpassung). */
export function pickQuality(search = window.location.search) {
  const forced = new URLSearchParams(search).get('q');
  if (forced && QUALITY[forced]) return { quality: forced, forced: true };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  let quality = coarse || small ? 'medium' : 'high';
  if (mem <= 2 || cores <= 2) quality = 'low';
  return { quality, forced: false };
}

export function isMobileDevice() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
}

/** Mischt BASE_LOOK mit den Looks der Module nach Gewicht. entries: [{ look, weight }] */
export function blendLook(entries, base = BASE_LOOK, out = {}) {
  for (const key of LOOK_KEYS) {
    let acc = 0;
    let ws = 0;
    for (const e of entries) {
      const v = e.look ? e.look[key] : undefined;
      if (v === undefined || v === null || !(e.weight > 0)) continue;
      acc += v * e.weight;
      ws += e.weight;
    }
    out[key] = ws > 1 ? acc / ws : acc + (1 - ws) * base[key];
  }
  return out;
}

export class Engine {
  constructor(canvas, { quality = 'high', forced = false, isMobile = false } = {}) {
    this.canvas = canvas;
    this.quality = quality;
    this.tier = QUALITY[quality];
    this.forced = forced;
    this.isMobile = isMobile;
    this.dprScale = 1;
    this.size = { width: 1, height: 1, dpr: 1 };
    this.listeners = new Set();
    this.stats = { fps: 60, frameMs: 16.7, calls: 0, triangles: 0, dpr: 1 };
    this._adapt = { acc: 0, frames: 0, elapsed: 0, done: forced };

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = BASE_LOOK.exposure;
    renderer.setClearColor(PALETTE.void, 1);
    renderer.info.autoReset = false; // Statistik ueber alle Passes eines Frames
    this.renderer = renderer;

    /* Szene, Kamera, Nebel */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(PALETTE.void.clone(), BASE_LOOK.fogDensity);
    this.camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.01, 220);
    this.camera.position.set(0, 0.35, 15.5);
    this.scene.add(this.camera);

    /* Licht: feste Anzahl (sonst kompilieren Shader neu). Module aendern nur Intensitaeten ueber `look`. */
    const key = new THREE.DirectionalLight(0xffd9b0, BASE_LOOK.key);
    key.position.set(4, 3.5, 5);
    const rim = new THREE.DirectionalLight(PALETTE.signal.clone(), BASE_LOOK.rim);
    rim.position.set(-5, 2.2, -4);
    const amb = new THREE.HemisphereLight(0x8fb8d8, 0x05070a, BASE_LOOK.amb);
    this.lights = { key, rim, amb };
    this.scene.add(key, rim, amb);

    /* Umgebung fuer Spiegelungen (prozedural, kein Download) */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.envMap = pmrem.fromScene(room, 0.04).texture;
    room.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = BASE_LOOK.env;

    /* Gemeinsame Uniforms fuer eigene Shader (ein Objekt, ueberall referenzieren, nicht kopieren) */
    this.shared = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }, // in Pixeln (inkl. DPR)
      uPixelRatio: { value: 1 },
    };

    /* Postprocessing: Render -> Bloom -> Output (ACES + sRGB) -> Fx (Aberration, Vignette, Korn) */
    const floatOk = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    this._msaa = floatOk ? this.tier.msaa : 0;
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 0 });
    rt.texture.name = 'Studio.rt1';
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BASE_LOOK.bloom, BASE_LOOK.bloomRadius, BASE_LOOK.bloomThreshold);
    const bloomSetSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w, h) => {
      const s = this.tier.bloomScale;
      bloomSetSize(Math.max(4, Math.round(w * s)), Math.max(4, Math.round(h * s)));
    };
    this.output = new OutputPass();
    this.fx = new FxPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.fx);

    /* Maus: x/y roh (-1..1, y oben), sx/sy geglaettet, vx/vy Geschwindigkeit */
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, inside: false, touch: isMobile };
    this._onPointer = (e) => {
      if (e.pointerType === 'touch') return;
      this.pointer.touch = false;
      this.pointer.inside = true;
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    this._onLeave = () => { this.pointer.inside = false; };
    window.addEventListener('pointermove', this._onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', this._onLeave);

    /* Groesse */
    this._resizeQueued = false;
    this._onResize = () => {
      if (this._resizeQueued) return;
      this._resizeQueued = true;
      requestAnimationFrame(() => { this._resizeQueued = false; this.resize(); });
    };
    window.addEventListener('resize', this._onResize);
    this.resize(true);
  }

  get dpr() {
    const base = Math.min(window.devicePixelRatio || 1, this.tier.dprMax);
    return Math.max(0.6, Math.max(this.tier.dprMin, base) * this.dprScale);
  }

  resize(force = false) {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = this.dpr;
    if (!force && w === this.size.width && h === this.size.height && dpr === this.size.dpr) return;
    this.size.width = w;
    this.size.height = h;
    this.size.dpr = dpr;
    this.stats.dpr = dpr;
    const samples = dpr < 1.5 ? this._msaa : 0;
    for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (t.samples !== samples) { t.samples = samples; t.dispose(); }
    }
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.shared.uResolution.value.set(w * dpr, h * dpr);
    this.shared.uPixelRatio.value = dpr;
    for (const fn of this.listeners) fn(w, h, dpr);
  }

  onResize(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  updatePointer(dt, time) {
    const p = this.pointer;
    let tx = p.x;
    let ty = p.y;
    if (p.touch) { // Touch: sanftes Eigenleben statt Maus
      tx = Math.sin(time * 0.23) * 0.35;
      ty = Math.sin(time * 0.19 + 1.1) * 0.2;
    } else if (!p.inside) { tx *= 0.5; ty *= 0.5; }
    const ox = p.sx;
    const oy = p.sy;
    p.sx = damp(p.sx, tx, 3.2, dt);
    p.sy = damp(p.sy, ty, 3.2, dt);
    p.vx = dt > 0 ? (p.sx - ox) / dt : 0;
    p.vy = dt > 0 ? (p.sy - oy) / dt : 0;
  }

  /** Look anwenden (Werte aus blendLook) */
  applyLook(look, time) {
    const r = this.renderer;
    r.toneMappingExposure = look.exposure;
    this.bloom.strength = look.bloom;
    this.bloom.radius = look.bloomRadius;
    this.bloom.threshold = look.bloomThreshold;
    this.bloom.enabled = look.bloom > 0.005;
    const u = this.fx.uniforms;
    u.uTime.value = time;
    u.uAberration.value = this.tier.aberration ? look.aberration : 0;
    u.uVignette.value = look.vignette;
    u.uGrain.value = look.grain;
    u.uFlash.value = look.flash;
    u.uFade.value = look.fade;
    u.uDim.value = look.dim;
    this.scene.fog.density = look.fogDensity;
    this.scene.environmentIntensity = look.env;
    this.lights.key.intensity = look.key;
    this.lights.rim.intensity = look.rim;
    this.lights.amb.intensity = look.amb;
  }

  /** Alle Shader vorab kompilieren (alle Gruppen muessen dafuer sichtbar sein) */
  async warmup() {
    try {
      // compileAsync nur mit KHR_parallel_shader_compile, sonst warnt three.js (z. B. SwiftShader)
      const parallel = this.renderer.extensions.has('KHR_parallel_shader_compile');
      if (parallel && this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
    } catch (e) {
      console.warn('Shader-Vorkompilierung uebersprungen:', e && e.message);
    }
    this.composer.render(0);
  }

  render(dt) {
    this.renderer.info.reset();
    this.composer.render(dt);
    const info = this.renderer.info.render;
    this.stats.calls = info.calls;
    this.stats.triangles = info.triangles;
  }

  /** Automatisch Aufloesung senken, wenn das Geraet nicht mitkommt (nur in den ersten 25 s) */
  adapt(dtRaw) {
    const a = this._adapt;
    this.stats.frameMs = this.stats.frameMs * 0.92 + dtRaw * 1000 * 0.08;
    this.stats.fps = Math.round(1000 / Math.max(1, this.stats.frameMs));
    if (a.done) return;
    a.acc += dtRaw;
    a.frames += 1;
    a.elapsed += dtRaw;
    if (a.acc < 1.5) return;
    const avg = a.acc / a.frames;
    a.acc = 0;
    a.frames = 0;
    if (avg > 1 / 34) {
      if (this._msaa) { this._msaa = 0; this.resize(true); return; }
      const next = Math.max(0.5, this.dprScale - (avg > 1 / 20 ? 0.25 : 0.12));
      if (next < this.dprScale) { this.dprScale = next; this.resize(true); }
    }
    if (a.elapsed > 25) a.done = true;
  }

  dispose() {
    window.removeEventListener('pointermove', this._onPointer);
    window.removeEventListener('resize', this._onResize);
    document.documentElement.removeEventListener('pointerleave', this._onLeave);
    this.composer.passes.forEach((p) => p.dispose && p.dispose());
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.envMap.dispose();
    this.renderer.dispose();
  }
}
