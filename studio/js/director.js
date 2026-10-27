// Director: Scrollposition -> globaler Fortschritt 0..1 -> Beats, Module, Kamera.
// Laeuft mit ScrollTrigger (index.html) oder ohne DOM (dev.html, setTarget()).
import * as THREE from 'three';
import {
  BEATS, BEAT_FADE, MODULES, MODULE_FADE, CAMERA_KEYS, CUT_FADE, PORTRAIT, nominalBeatWindows,
} from './config.js';

/* ------------------------------------------------------------ Helfer */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
// Bildrate-unabhaengiges Daempfen: lambda ~ 1/Sekunden (hoeher = straffer)
export const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export function parseAt(str) {
  const [beat, p] = String(str).split('@');
  return { beat, p: p === undefined ? 0 : parseFloat(p) };
}

export function resolveAt(str, beatWindows) {
  const { beat, p } = parseAt(str);
  const w = beatWindows[beat];
  if (!w) throw new Error(`Director: unbekannter Beat "${beat}" in "${str}"`);
  return w.start + (w.end - w.start) * clamp01(p);
}

// Gewicht 0..1 mit weicher Ueberblendung an beiden Enden (Raender 0 und 1 ohne Rampe)
export function windowWeight(g, start, end, fade) {
  const a = start <= 1e-4 ? 1 : smoothstep(start - fade, start + fade, g);
  const b = end >= 1 - 1e-4 ? 1 : 1 - smoothstep(end - fade, end + fade, g);
  return a * b;
}

// Monotone kubische Interpolation (Fritsch-Carlson): stetige Geschwindigkeit ueber Keyframes
function monotone(xs, ys) {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d = new Array(n - 1);
  const m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-9) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
      + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// Bogenlaengen-Anteil der Kurve an jedem Kontrollpunkt (CatmullRom laeuft durch alle Punkte)
function arcFractions(curve, count) {
  if (count < 2) return [0];
  const per = 48;
  const lengths = curve.getLengths((count - 1) * per);
  const total = lengths[lengths.length - 1] || 1;
  const out = [];
  for (let i = 0; i < count; i++) out.push(lengths[i * per] / total);
  return out;
}

function buildShots(keys, beatWindows, portrait) {
  const resolved = keys.map((k, i) => ({
    i,
    t: resolveAt(k.at, beatWindows),
    cut: !!k.cut,
    pos: new THREE.Vector3().fromArray(portrait && k.posM ? k.posM : k.pos),
    look: new THREE.Vector3().fromArray(portrait && k.lookM ? k.lookM : k.look),
    fov: k.fov ?? 35,
    roll: k.roll ?? 0,
  }));
  // Keine Sortierung: CAMERA_KEYS steht chronologisch. Innerhalb eines Shots wird die Zeit streng steigend erzwungen.
  const groups = [];
  for (const k of resolved) {
    if (!groups.length || k.cut) groups.push([]);
    const g = groups[groups.length - 1];
    if (g.length && k.t <= g[g.length - 1].t) k.t = g[g.length - 1].t + 1e-4;
    g.push(k);
  }
  return groups.map((ks) => {
    const shot = { keys: ks, t0: ks[0].t, t1: ks[ks.length - 1].t };
    const ts = ks.map((k) => k.t);
    if (ks.length > 1) {
      shot.posCurve = new THREE.CatmullRomCurve3(ks.map((k) => k.pos), false, 'centripetal');
      shot.lookCurve = new THREE.CatmullRomCurve3(ks.map((k) => k.look), false, 'centripetal');
      shot.sPos = monotone(ts, arcFractions(shot.posCurve, ks.length));
      shot.sLook = monotone(ts, arcFractions(shot.lookCurve, ks.length));
    }
    shot.fov = monotone(ts, ks.map((k) => k.fov));
    shot.roll = monotone(ts, ks.map((k) => k.roll));
    return shot;
  });
}

/* ---------------------------------------------------------- Director */
export class Director {
  /**
   * @param {object} o
   * @param {HTMLElement} [o.story]  Wrapper der Szenen-Abschnitte (ohne: Nominalwerte, dev.html)
   * @param {number} [o.lambda]      Daempfung des Fortschritts (hoeher = direkter)
   */
  constructor({ story = null, lambda = 4.2 } = {}) {
    this.story = story;
    this.lambda = lambda;
    this.target = 0;     // roher Fortschritt aus dem Scroll
    this.global = 0;     // gedaempfter Fortschritt (fuer 3D)
    this.velocity = 0;   // d(global)/dt
    this.portrait = false;
    this.aspect = 16 / 9;
    this.cutFade = 0;
    this.current = BEATS[0].name; // Beat mit hoechstem Gewicht
    this.beats = {};
    this.modules = {};
    this.sections = {};
    this.listeners = new Set();
    this.panelListeners = new Set();
    this._dom = new Map();
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._fov = 35;
    this._roll = 0;
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    for (const b of BEATS) this.beats[b.name] = { name: b.name, label: b.label, len: b.len, start: 0, end: 1, p: 0, w: 0, tp: 0 };
    for (const name of Object.keys(MODULES)) this.modules[name] = { name, local: 0, weight: 0, active: false, windows: [] };
    if (story) {
      for (const b of BEATS) {
        const el = story.querySelector(`[data-scene="${b.name}"]`);
        if (el) {
          el.style.setProperty('--len', b.len);
          this.sections[b.name] = el;
        }
      }
    }
    this.refresh();
  }

  /** Zeitfenster neu messen (nach Resize, Schriften, ScrollTrigger.refresh) */
  refresh() {
    let windows;
    if (this.story && Object.keys(this.sections).length === BEATS.length) {
      const vh = window.innerHeight;
      const storyTop = this.story.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, this.story.offsetHeight - vh);
      windows = {};
      // Beats liegen lueckenlos aneinander: Ende = Start des naechsten (keine Rundungsfehler an den Grenzen)
      const tops = BEATS.map((b) => this.sections[b.name].getBoundingClientRect().top + window.scrollY - storyTop);
      BEATS.forEach((b, i) => {
        const h = this.sections[b.name].getBoundingClientRect().height;
        const start = clamp01(tops[i] / range);
        const end = i === BEATS.length - 1 ? 1 : clamp01(tops[i + 1] / range);
        windows[b.name] = { start, end, pinOut: clamp01((h - vh) / Math.max(1, h)) };
      });
    } else {
      windows = nominalBeatWindows();
      for (const b of BEATS) windows[b.name].pinOut = clamp01((b.len - 100) / b.len);
    }
    for (const b of BEATS) Object.assign(this.beats[b.name], windows[b.name]);
    for (const [name, def] of Object.entries(MODULES)) {
      this.modules[name].windows = def.windows.map((w) => ({
        start: resolveAt(w.from, windows),
        end: resolveAt(w.to, windows),
      }));
    }
    this._windows = windows;
    this._shotsL = buildShots(CAMERA_KEYS, windows, false);
    this._shotsP = buildShots(CAMERA_KEYS, windows, true);
    this.cuts = this._shotsL.slice(1).map((s) => s.t0);
    this.update(0);
  }

  /**
   * ScrollTrigger mit scrub: ein Proxy-Wert laeuft 0..1 ueber die ganze Story.
   * scrub: true = direkt (die Daempfung macht update()), Zahl = zusaetzliche GSAP-Glaettung in Sekunden.
   */
  bindScroll(gsap, ScrollTrigger, { scrub = true } = {}) {
    if (!this.story) return;
    this._proxy = { p: 0 };
    this._tween = gsap.to(this._proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: { trigger: this.story, start: 'top top', end: 'bottom bottom', scrub, invalidateOnRefresh: true },
    });
    this._onRefresh = () => this.refresh();
    ScrollTrigger.addEventListener('refresh', this._onRefresh);
    this.refresh();
    this.setTarget(this._tween.scrollTrigger.progress, true);
  }

  /** Scroll-Fortschritt uebernehmen (in jedem Frame vor update) */
  pullScroll() {
    if (this._proxy) this.target = clamp01(this._proxy.p);
  }

  dispose() {
    if (this._tween) { this._tween.scrollTrigger.kill(); this._tween.kill(); }
    if (this._onRefresh && window.ScrollTrigger) window.ScrollTrigger.removeEventListener('refresh', this._onRefresh);
    this.listeners.clear();
    this.panelListeners.clear();
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.portrait = aspect < PORTRAIT.below;
  }

  /** Ziel setzen (ScrollTrigger oder dev.html). immediate: ohne Daempfung springen */
  setTarget(p, immediate = false) {
    this.target = clamp01(p);
    if (immediate) this.global = this.target;
  }

  beat(name) { return this.beats[name]; }
  module(name) { return this.modules[name]; }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  /** fn(sectionEl, on, beatName): Text-Panel eines Abschnitts wird sichtbar (on) oder ist ganz ausgeblendet */
  onPanel(fn) { this.panelListeners.add(fn); return () => this.panelListeners.delete(fn); }

  update(dt) {
    const prev = this.global;
    const diff = this.target - this.global;
    if (Math.abs(diff) < 1e-5) this.global = this.target;
    else this.global = damp(this.global, this.target, this.lambda * (Math.abs(diff) > 0.12 ? 1.8 : 1), dt);
    this.velocity = dt > 0 ? (this.global - prev) / dt : 0;
    const g = this.global;

    // Beats
    let best = this.current;
    let bestW = -1;
    for (const b of BEATS) {
      const s = this.beats[b.name];
      const span = Math.max(1e-6, s.end - s.start);
      s.p = clamp01((g - s.start) / span);
      s.tp = clamp01((this.target - s.start) / span);
      s.w = windowWeight(g, s.start, s.end, BEAT_FADE);
      const wt = windowWeight(this.target, s.start, s.end, 1e-4);
      if (wt > bestW) { bestW = wt; best = b.name; }
    }
    if (best !== this.current) {
      this.current = best;
      for (const fn of this.listeners) fn(best, this);
    }

    // Module
    for (const m of Object.values(this.modules)) {
      let weight = 0;
      for (const w of m.windows) weight = Math.max(weight, windowWeight(g, w.start, w.end, MODULE_FADE));
      const w0 = m.windows[0];
      m.local = w0 ? clamp01((g - w0.start) / Math.max(1e-6, w0.end - w0.start)) : 0;
      m.weight = weight;
      m.active = weight > 1e-4;
    }

    // Kamerapfad
    const shots = this.portrait ? this._shotsP : this._shotsL;
    let shot = shots[0];
    for (const s of shots) if (g >= s.t0) shot = s;
    const gc = Math.min(Math.max(g, shot.t0), shot.t1);
    if (shot.posCurve) {
      shot.posCurve.getPointAt(clamp01(shot.sPos(gc)), this._pos);
      shot.lookCurve.getPointAt(clamp01(shot.sLook(gc)), this._look);
    } else {
      this._pos.copy(shot.keys[0].pos);
      this._look.copy(shot.keys[0].look);
    }
    this._fov = shot.fov(gc);
    this._roll = shot.roll(gc);
    let fade = 0;
    for (const t of this.cuts) fade = Math.max(fade, 1 - smoothstep(0, CUT_FADE, Math.abs(g - t)));
    this.cutFade = fade;

    this._writeDom();
    return this;
  }

  /** Effektives vertikales FOV fuer das aktuelle Seitenverhaeltnis */
  fovFor(fov, aspect = this.aspect) {
    if (aspect >= PORTRAIT.refAspect) return fov;
    const k = Math.min(PORTRAIT.maxFactor, Math.pow(PORTRAIT.refAspect / aspect, PORTRAIT.exponent));
    const half = THREE.MathUtils.degToRad(fov / 2);
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * k));
  }

  /** Pfad-Pose (ohne Parallax) */
  getPose() {
    return { pos: this._pos, look: this._look, fov: this._fov, roll: this._roll };
  }

  /**
   * Kamera setzen: Pfad + Maus-Parallax + ruhiges Schweben.
   * @param {THREE.PerspectiveCamera} camera
   * @param {{sx:number, sy:number}} pointer geglaettete Maus (-1..1)
   */
  applyCamera(camera, pointer, { parallax = 0, drift = 0 } = {}, time = 0) {
    const dir = this._v1.subVectors(this._look, this._pos).normalize();
    const right = this._v2.crossVectors(dir, this._up).normalize();
    const up = this._v3.crossVectors(right, dir).normalize();
    const ox = (pointer ? pointer.sx : 0) * parallax + Math.sin(time * 0.21) * drift;
    const oy = (pointer ? pointer.sy : 0) * parallax * 0.6 + Math.sin(time * 0.17 + 1.3) * drift * 0.8;
    camera.position.copy(this._pos).addScaledVector(right, ox).addScaledVector(up, oy);
    camera.up.set(0, 1, 0);
    if (this._roll) camera.up.applyAxisAngle(dir, THREE.MathUtils.degToRad(this._roll));
    camera.lookAt(this._look);
    const fov = this.fovFor(this._fov, camera.aspect);
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  // CSS-Variablen fuer Text-Panels: --p (Fortschritt), --o (Sichtbarkeit des Panels)
  // Sichtbarkeit pro Beat aus BEATS[].text = [ein0, ein1, aus0, aus1] (p im Beat), sonst aus der Klebedauer.
  _writeDom() {
    if (!this.story) return;
    const last = BEATS.length - 1;
    BEATS.forEach((b, i) => {
      const el = this.sections[b.name];
      if (!el) return;
      const s = this.beats[b.name];
      const p = s.tp;
      const t = b.text;
      let fin;
      let fout;
      if (t) {
        fin = i === 0 ? 1 : smoothstep(t[0], t[1], p);
        fout = i === last && t[2] >= 1 ? 1 : 1 - smoothstep(t[2], t[3], p);
      } else {
        fin = i === 0 ? 1 : smoothstep(0.02, 0.12, p);
        fout = i === last ? 1 : 1 - smoothstep(s.pinOut - 0.16, s.pinOut - 0.04, p);
      }
      const o = Math.round(fin * fout * 1000) / 1000;
      const pr = Math.round(p * 1000) / 1000;
      const cache = this._dom.get(el) || {};
      if (cache.o !== o) { el.style.setProperty('--o', o); cache.o = o; }
      if (cache.p !== pr) { el.style.setProperty('--p', pr); cache.p = pr; }
      const on = o > 0.01;
      if (cache.on !== on) {
        el.classList.toggle('is-on', on);
        cache.on = on;
        for (const fn of this.panelListeners) fn(el, on, b.name);
      }
      this._dom.set(el, cache);
    });
  }
}
