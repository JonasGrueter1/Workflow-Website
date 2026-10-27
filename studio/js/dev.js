// Testseite fuer Szenen-Entwickler: dev.html?scene=robot&local=0.4&cam=orbit&q=high
// scene: particles|robot|brain|cables|dna|all   local: Startwert 0..1   cam: path|orbit
// scroll=0: Seite scrollt nicht (nur Regler). Sonst steuert das Scrollen local (fuer studio_capture.js).
import * as THREE from 'three';
import { Engine, pickQuality, isMobileDevice } from './engine.js';
import { Director, clamp01 } from './director.js';
import { makeContext, loadScenes, Runner } from './runner.js';
import { MODULES, ANCHORS } from './config.js';

const params = new URLSearchParams(window.location.search);
const names = Object.keys(MODULES);
let sceneName = params.get('scene') || 'robot';
if (sceneName !== 'all' && !names.includes(sceneName)) sceneName = 'robot';
const useScroll = params.get('scroll') !== '0';
let local = clamp01(parseFloat(params.get('local') || '0') || 0);

// Orbit-Zentrum und Abstand je Szene
const FOCUS = {
  particles: { target: [0, -0.5, 0], radius: 14 },
  robot: { target: [0, -0.6, 0], radius: 7.5 },
  brain: { target: ANCHORS.brain.center.toArray(), radius: 2.4 },
  cables: { target: [0, 0.2, -5.5], radius: 13 },
  dna: { target: [0, 0.5, -22], radius: 18 },
  all: { target: [0, 0, -8], radius: 26 },
};

const $ = (id) => document.getElementById(id);
const ui = {
  root: $('dev-ui'), title: $('dev-title'), scene: $('dev-scene'), local: $('dev-local'), out: $('dev-local-out'),
  play: $('dev-play'), cam: $('dev-cam'), post: $('dev-post'), damp: $('dev-damp'), stats: $('dev-stats'), min: $('dev-min'),
};
for (const n of [...names, 'all']) {
  const o = document.createElement('option');
  o.value = n;
  o.textContent = n === 'all' ? 'alle Szenen' : n;
  ui.scene.append(o);
}
ui.scene.value = sceneName;
ui.title.textContent = sceneName;
ui.cam.value = params.get('cam') === 'orbit' ? 'orbit' : 'path';
if (params.get('post') === '0') ui.post.checked = false;
ui.scene.addEventListener('change', () => {
  params.set('scene', ui.scene.value);
  params.set('local', '0');
  window.location.search = params.toString();
});
ui.min.addEventListener('click', () => ui.root.classList.toggle('is-min'));
if (!useScroll) document.body.style.minHeight = '0';

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
  const mods = await loadScenes(sceneName === 'all' ? names : [sceneName], ctx);
  const runner = new Runner({ director, mods });

  const win = sceneName === 'all' ? { start: 0, end: 1 } : director.modules[sceneName].windows[0];
  const toGlobal = (l) => win.start + l * (win.end - win.start);

  director.setTarget(toGlobal(local), true);
  director.update(0);
  director.applyCamera(camera, engine.pointer, { parallax: 0, drift: 0 }, 0);
  runner.showAll();
  await engine.warmup();

  /* local: Regler, Scrollen, Play */
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const setLocal = (v, fromScroll = false) => {
    local = clamp01(v);
    ui.local.value = String(local);
    ui.out.textContent = local.toFixed(3);
    if (useScroll && !fromScroll) window.scrollTo(0, Math.round(local * maxScroll()));
  };
  ui.local.addEventListener('input', () => setLocal(parseFloat(ui.local.value)));
  if (useScroll) window.addEventListener('scroll', () => setLocal(window.scrollY / maxScroll(), true), { passive: true });
  setLocal(local);
  let playing = params.has('play');
  const syncPlay = () => { ui.play.textContent = playing ? 'Pause' : 'Play'; };
  ui.play.addEventListener('click', () => { playing = !playing; syncPlay(); });
  syncPlay();

  /* Orbit-Kamera */
  const focus = FOCUS[sceneName] || FOCUS.all;
  const orbit = { target: new THREE.Vector3().fromArray(focus.target), radius: focus.radius, theta: 0.5, phi: 1.35 };
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
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dtRaw = Math.min(Math.max((now - last) / 1000, 0), 0.25);
    last = now;
    const dt = Math.min(dtRaw, 1 / 20);
    time += dt;
    ctx.time = time;
    engine.shared.uTime.value = time;
    if (playing) setLocal((local + dt / 14) % 1);

    engine.updatePointer(dt, time);
    director.setTarget(toGlobal(local), !ui.damp.checked);
    director.update(dtRaw);
    if (ui.cam.value === 'orbit') {
      sph.set(orbit.radius, orbit.phi, orbit.theta);
      camera.position.setFromSpherical(sph).add(orbit.target);
      camera.up.set(0, 1, 0);
      camera.lookAt(orbit.target);
      const fov = director.fovFor(40, camera.aspect);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    } else {
      director.applyCamera(camera, engine.pointer, look, time);
    }
    look = runner.step(time, dt);
    engine.applyLook(look, time);
    if (ui.post.checked) engine.render(dt);
    else { renderer.info.reset(); renderer.setRenderTarget(null); renderer.render(scene, camera); }
    engine.adapt(dtRaw);
  }
  requestAnimationFrame(frame);

  setInterval(() => {
    const s = engine.stats;
    const info = renderer.info.render;
    const loaded = new Set(runner.mods.map((m) => m.name));
    const act = Object.values(director.modules).filter((m) => m.active && loaded.has(m.name))
      .map((m) => `${m.name.padEnd(9)} local ${m.local.toFixed(3)}  w ${m.weight.toFixed(2)}`).join('\n');
    const b = director.beat(director.current);
    ui.stats.textContent = `${s.fps} fps  ${s.frameMs.toFixed(1)} ms  dpr ${s.dpr.toFixed(2)}  q ${engine.quality}\n`
      + `calls ${info.calls}  tris ${info.triangles}\n`
      + `global ${director.global.toFixed(3)}  beat ${director.current} p ${b.p.toFixed(3)}\n${act}\n`
      + `cam ${camera.position.toArray().map((v) => v.toFixed(2)).join(', ')}  fov ${camera.fov.toFixed(1)}`;
  }, 250);

  window.__dev = { engine, director, runner, ctx, setLocal, orbit };
}

boot().catch((e) => console.error('dev.html konnte nicht starten:', e));
