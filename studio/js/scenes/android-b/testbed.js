// Testseite fuer Variante B (test-android-b.html). Wie js/dev.js, laedt aber js/scenes/android-b/index.js als Modul
// "robot" (gleiche Zeitfenster wie robot.js) und auf Wunsch das Gehirn (brain.js) fuer den Roentgen-Zoom.
// Parameter:
//   q=high|medium|low      Qualitaetsstufe
//   local=0.4              Startwert im Hauptfenster von robot (robot@0 bis brain@0.6)
//   at=zoom@0.85           statt local: Punkt in der Story (beat@p)
//   brain=1                Gehirn mitladen (Roentgen)
//   particles=1            Partikel-Szene mitladen (Hero und Aufbau, Form aus android-b/particles-shape.js)
//   cam=path|orbit|fix     Kamera: Pfad der Seite, Orbit (ziehen, Mausrad) oder fest (pos, tgt, fov)
//   pos=x,y,z tgt=x,y,z fov=32   feste Kamera
//   scroll=0               Seite scrollt nicht (nur Regler)
//   post=0                 ohne Postprocessing
//   ab=mech|debug|nobloom|nokey|noenv   Diagnose (ohne Schale, Fugen rot, ohne Bloom, ohne Lichter, ohne Spiegelung)
import * as THREE from 'three';
import { Engine, pickQuality, isMobileDevice } from '../../engine.js';
import { Director, clamp01, parseAt } from '../../director.js';
import { makeContext, Runner } from '../../runner.js';

const params = new URLSearchParams(window.location.search);
const useScroll = params.get('scroll') !== '0';
let local = clamp01(parseFloat(params.get('local') || '0.7') || 0);
const vec = (s, d) => (s ? s.split(',').map(Number) : d);

const $ = (id) => document.getElementById(id);
const ui = {
  root: $('dev-ui'), title: $('dev-title'), scene: $('dev-scene'), local: $('dev-local'), out: $('dev-local-out'),
  play: $('dev-play'), cam: $('dev-cam'), post: $('dev-post'), damp: $('dev-damp'), stats: $('dev-stats'), min: $('dev-min'),
};
ui.title.textContent = 'Android B';
for (const n of ['robot', 'robot+brain']) {
  const o = document.createElement('option');
  o.value = n; o.textContent = n;
  ui.scene.append(o);
}
ui.scene.value = params.get('brain') === '1' ? 'robot+brain' : 'robot';
ui.scene.addEventListener('change', () => {
  params.set('brain', ui.scene.value === 'robot+brain' ? '1' : '0');
  window.location.search = params.toString();
});
const fixOpt = document.createElement('option');
fixOpt.value = 'fix'; fixOpt.textContent = 'Fest (pos/tgt)';
ui.cam.append(fixOpt);
ui.cam.value = ['orbit', 'fix'].includes(params.get('cam')) ? params.get('cam') : 'path';
if (params.get('post') === '0') ui.post.checked = false;
ui.min.addEventListener('click', () => ui.root.classList.toggle('is-min'));
if (!useScroll) document.body.style.minHeight = '0';

async function loadMods(ctx, names) {
  const out = [];
  for (const name of names) {
    const url = name === 'robot' ? './index.js' : `../${name}.js`;
    try {
      const mod = await import(url);
      const inst = await mod.create(ctx);
      inst.group.name = inst.group.name || `scene:${name}`;
      ctx.scene.add(inst.group);
      out.push({ name, inst, active: true, failed: false });
    } catch (e) {
      console.error(`Szene "${name}" konnte nicht geladen werden:`, e);
    }
  }
  return out;
}

async function boot() {
  const canvas = $('gl');
  const { quality, forced } = pickQuality();
  const engine = new Engine(canvas, { quality, forced, isMobile: isMobileDevice() });
  const { renderer, scene, camera } = engine;
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);

  const director = new Director();
  director.setAspect(camera.aspect);
  engine.onResize((w, h) => director.setAspect(w / h));
  const ctx = makeContext(engine, director, { dev: true });
  const names = params.get('brain') === '1' ? ['robot', 'brain'] : ['robot'];
  if (params.get('particles') === '1') names.unshift('particles');
  const mods = await loadMods(ctx, names);
  const runner = new Runner({ director, mods });
  runner.force = params.get('particles') === '1' ? null : 'robot';

  const win = director.modules.robot.windows[0];
  const toGlobal = (l) => win.start + l * (win.end - win.start);
  const atGlobal = (str) => {
    const { beat, p } = parseAt(str);
    const b = director.beat(beat);
    return b.start + (b.end - b.start) * clamp01(p);
  };
  let fixedGlobal = params.get('at') ? atGlobal(params.get('at')) : null;

  director.setTarget(fixedGlobal ?? toGlobal(local), true);
  director.update(0);
  director.applyCamera(camera, engine.pointer, { parallax: 0, drift: 0 }, 0);
  runner.showAll();
  await engine.warmup();
  window.__tbMods = mods.map((m) => m.name);

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const setLocal = (v, fromScroll = false) => {
    local = clamp01(v);
    fixedGlobal = null;
    ui.local.value = String(local);
    ui.out.textContent = local.toFixed(3);
    if (useScroll && !fromScroll) window.scrollTo(0, Math.round(local * maxScroll()));
  };
  ui.local.addEventListener('input', () => setLocal(parseFloat(ui.local.value)));
  if (useScroll) window.addEventListener('scroll', () => setLocal(window.scrollY / maxScroll(), true), { passive: true });
  if (fixedGlobal === null) setLocal(local);
  let playing = params.has('play');
  const syncPlay = () => { ui.play.textContent = playing ? 'Pause' : 'Play'; };
  ui.play.addEventListener('click', () => { playing = !playing; syncPlay(); });
  syncPlay();

  /* Kameras */
  const orbit = { target: new THREE.Vector3(0, -0.6, 0), radius: 7.5, theta: 0.5, phi: 1.35 };
  const fix = {
    pos: new THREE.Vector3().fromArray(vec(params.get('pos'), [2.6, 0.2, 6.2])),
    tgt: new THREE.Vector3().fromArray(vec(params.get('tgt'), [0, -0.9, 0])),
    fov: parseFloat(params.get('fov') || '30'),
  };
  const sph = new THREE.Spherical();
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || ui.cam.value !== 'orbit') return;
    orbit.theta -= (e.clientX - drag.x) * 0.006;
    orbit.phi = Math.min(3.0, Math.max(0.15, orbit.phi - (e.clientY - drag.y) * 0.006));
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', (e) => {
    if (ui.cam.value !== 'orbit') return;
    e.preventDefault();
    orbit.radius = Math.min(80, Math.max(0.2, orbit.radius * (1 + e.deltaY * 0.001)));
  }, { passive: false });

  let time = 0;
  let last = performance.now();
  let look = runner.look;
  const step = (dtRaw, draw = true) => {
    const dt = Math.min(dtRaw, 1 / 20);
    time += dt;
    ctx.time = time;
    engine.shared.uTime.value = time;
    if (playing) setLocal((local + dt / 14) % 1);
    engine.updatePointer(dt, time);
    director.setTarget(fixedGlobal ?? toGlobal(local), !ui.damp.checked);
    director.update(dtRaw);
    if (ui.cam.value === 'orbit') {
      sph.set(orbit.radius, orbit.phi, orbit.theta);
      camera.position.setFromSpherical(sph).add(orbit.target);
      camera.up.set(0, 1, 0);
      camera.lookAt(orbit.target);
      const fov = director.fovFor(34, camera.aspect);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    } else if (ui.cam.value === 'fix') {
      camera.position.copy(fix.pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(fix.tgt);
      camera.filmOffset = 0;
      if (camera.fov !== fix.fov) { camera.fov = fix.fov; camera.updateProjectionMatrix(); }
    } else {
      director.applyCamera(camera, engine.pointer, look, time);
    }
    look = runner.step(time, dt);
    engine.applyLook(look, time);
    if (!draw) return;
    if (ui.post.checked) engine.render(dt);
    else { renderer.info.reset(); renderer.setRenderTarget(null); renderer.render(scene, camera); }
  };
  let frozen = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || frozen) { last = now; return; }
    const dtRaw = Math.min(Math.max((now - last) / 1000, 0), 0.25);
    last = now;
    step(dtRaw);
    if (!engine.forced) engine.adapt(dtRaw);
  }
  requestAnimationFrame(frame);

  setInterval(() => {
    const s = engine.stats;
    const info = renderer.info.render;
    const b = director.beat(director.current);
    ui.stats.textContent = `${s.fps} fps  ${s.frameMs.toFixed(1)} ms  dpr ${s.dpr.toFixed(2)}  q ${engine.quality}\n`
      + `calls ${info.calls}  tris ${info.triangles}\n`
      + `global ${director.global.toFixed(3)}  beat ${director.current} p ${b.p.toFixed(3)}\n`
      + `cam ${camera.position.toArray().map((v) => v.toFixed(2)).join(', ')}  fov ${camera.fov.toFixed(1)}`;
  }, 250);

  window.__tb = {
    engine, director, runner, ctx, orbit, fix, setLocal,
    setAt(str) { fixedGlobal = atGlobal(str); },
    setCam(mode) { ui.cam.value = mode; },
    // Fuer Standbilder: Zeit vorspulen (Animationen ausklingen lassen), dann ein Bild rendern
    advance(seconds, fps = 30) { const n = Math.max(1, Math.round(seconds * fps)); for (let i = 0; i < n; i++) step(1 / fps, i === n - 1); },
    freeze(v) { frozen = v; },
    setTime(t) { time = t; },
    get time() { return time; },
    ready: true,
  };
}

boot().catch((e) => console.error('test-android-b.html konnte nicht starten:', e));
