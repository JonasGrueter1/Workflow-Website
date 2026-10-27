// Einstieg der Seite: Fallback-Entscheid, Preloader, Engine + Director + Szenen, Render-Loop.
// three.js wird nur geladen, wenn 3D wirklich laeuft (der Fallback bleibt leicht).
import { UI } from './ui.js';

const root = document.documentElement;
const ui = new UI();
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

const useGL = root.classList.contains('gl');
// Sicherheitsnetz: Preloader verschwindet spaetestens nach 15 s
const safety = setTimeout(() => ui.finish().then(() => ui.introReveal()), 15000);

if (useGL) {
  boot().catch((err) => {
    console.error('3D konnte nicht starten, Fallback aktiv:', err);
    toFallback();
  });
} else {
  clearTimeout(safety);
  ui.hidePreloader();
  ui.introReveal();
}

function toFallback() {
  root.classList.remove('gl');
  root.classList.add('no-gl');
  clearTimeout(safety);
  ui.hidePreloader();
  ui.introReveal();
  if (ScrollTrigger) ScrollTrigger.refresh();
}

async function boot() {
  const canvas = document.getElementById('gl');
  const story = document.getElementById('story');
  ui.progress(0.04);

  const [engineMod, directorMod, runnerMod, config] = await Promise.all([
    import('./engine.js'),
    import('./director.js'),
    import('./runner.js'),
    import('./config.js'),
  ]);
  ui.progress(0.22);
  const { Engine, pickQuality, isMobileDevice } = engineMod;
  const { Director, damp } = directorMod;
  const { makeContext, loadScenes, Runner } = runnerMod;
  const { MODULES, BEATS } = config;

  const { quality, forced } = pickQuality();
  const engine = new Engine(canvas, { quality, forced, isMobile: isMobileDevice() });
  const { camera } = engine;
  root.dataset.quality = quality;

  // Schriften abwarten (Masse der Abschnitte, Glyphen fuer Code-Texturen), hoechstens 2.5 s
  if (document.fonts && document.fonts.ready) {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  }
  ui.progress(0.3);

  const director = new Director({ story });
  if (gsap && ScrollTrigger) director.bindScroll(gsap, ScrollTrigger);
  director.setAspect(camera.aspect);
  engine.onResize((w, h) => director.setAspect(w / h));

  const ctx = makeContext(engine, director);
  const mods = await loadScenes(Object.keys(MODULES), ctx, (f) => ui.progress(0.3 + 0.45 * f));
  const runner = new Runner({ director, mods });

  // Alle Shader vorab kompilieren, damit Uebergaenge nicht ruckeln
  director.update(0);
  director.applyCamera(camera, engine.pointer, { parallax: 0, drift: 0 }, 0);
  runner.showAll();
  await engine.warmup();
  ui.progress(0.95);

  // Inhaltsbereich: 3D tritt in den Hintergrund
  let contentDim = 0;
  let contentTarget = 0;
  if (gsap && ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '#content',
      start: 'top bottom',
      end: 'top 25%',
      onUpdate: (self) => { contentTarget = self.progress; },
      onRefresh: (self) => { contentTarget = self.progress; },
    });
  }

  // HUD und Text-Panels
  const chapter = (name) => {
    const i = BEATS.findIndex((b) => b.name === name);
    ui.setChapter(i, BEATS[i].label);
  };
  chapter(director.current);
  director.onChange((name) => chapter(name));
  director.onPanel((el, on) => ui.panel(el, on));
  for (const el of Object.values(director.sections)) ui.panel(el, el.classList.contains('is-on'));

  let time = 0;
  let last = performance.now();
  let raf = 0;
  let running = false;
  let frameNo = 0;
  let look = runner.look;

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dtRaw = Math.min(Math.max((now - last) / 1000, 0), 0.25);
    last = now;
    const dt = Math.min(dtRaw, 1 / 20);
    time += dt;
    ctx.time = time;
    engine.shared.uTime.value = time;

    engine.updatePointer(dt, time);
    director.pullScroll();
    director.update(dtRaw);
    director.applyCamera(camera, engine.pointer, look, time);
    look = runner.step(time, dt);

    contentDim = damp(contentDim, contentTarget, 6, dtRaw);
    look.dim = Math.max(look.dim, contentDim * 0.62);
    engine.applyLook(look, time);
    const background = contentDim > 0.98;
    ui.setStory(director.global, contentDim > 0.35);

    // Im Inhaltsbereich (3D nur noch abgedunkelter Hintergrund) mit einem Drittel der Bildrate rendern
    frameNo += 1;
    if (!background || frameNo % 3 === 0) engine.render(dt);
    engine.adapt(dtRaw);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    console.warn('WebGL-Kontext verloren, statischer Hintergrund aktiv.');
    toFallback();
  });

  // Zugriff fuer Tests und Szenen-Entwicklung: window.__studio
  window.__studio = { engine, director, runner, ctx };
  if (new URLSearchParams(window.location.search).has('debug')) mountStats(engine, director);

  start();
  clearTimeout(safety);
  if (ScrollTrigger) ScrollTrigger.refresh();
  await ui.finish();
  ui.introReveal();
}

function mountStats(engine, director) {
  const el = document.createElement('pre');
  el.className = 'debug-stats';
  document.body.appendChild(el);
  setInterval(() => {
    const s = engine.stats;
    const mods = Object.values(director.modules).filter((m) => m.active)
      .map((m) => `${m.name} local ${m.local.toFixed(2)} w ${m.weight.toFixed(2)}`).join('\n');
    el.textContent = `${s.fps} fps  ${s.frameMs.toFixed(1)} ms\ndpr ${s.dpr.toFixed(2)}  q ${engine.quality}\ncalls ${s.calls}  tris ${s.triangles}\nglobal ${director.global.toFixed(3)}  ${director.current}\n${mods}`;
  }, 250);
}
