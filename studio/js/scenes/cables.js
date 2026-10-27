// Szene "cables": Aus dem Gehirn werden Glasfaserbuendel gezogen und mit fuenf Werkzeug-Knoten verbunden.
// Fenster: brain@0.7 bis dna@0.3 (siehe config.js MODULES).
//
// Zeitachse u in Beat-Einheiten: -0.3 = brain@0.7, 0 = cables@0, 1 = cables@1 = dna@0, 1.3 = dna@0.3
//   -0.25..0.42  Kabel wachsen aus dem Hirnstamm (gestaffelt), leuchtende Spitze vorne
//   -0.12..0.10  Knoten erscheinen als leise Ziele (Ring schliesst sich, Icon gedimmt)
//    Verbindung  Knoten startet: Schockwelle, Licht in der Kugel, Label-Punkt leuchtet
//    danach      Lichtimpulse laufen zu den Knoten (Takt pro Kabel), jeder Treffer laesst den Knoten
//                aufleuchten. Selten laeuft ein warmer Impuls zurueck zum Gehirn.
//    0.70..1.00  Fokus auf den Website-Knoten, die Kamera fliegt hinein (Portal), danach Helix (dna)
//
// Leistung: 5 Draw Calls (Staub, Fasern + Maentel, Ringe, Knoten, Spitzen). Alles Bewegte im Shader,
// pro Frame nur wenige Uniforms und 5 Labels (nur bei Aenderung ins DOM geschrieben).
import {
  STRANDS, SAMPLES, RING_SEG, MOTES, buildCurves, buildFibreGeometry, buildRingGeometry, buildNodeGeometry,
  buildMoteGeometry, smoothstep,
} from './cables-paths.js';
import { makeMaterials } from './cables-shaders.js';

export const NODE_LABELS = { email: 'E-Mail', website: 'Website', kalender: 'Kalender', dokumente: 'Dokumente', kunden: 'Kunden' };

// Wachstum je Kabel [Start, Ende] in u
const GROW = {
  email: [-0.25, 0.16],
  dokumente: [-0.23, 0.22],
  kalender: [-0.21, 0.28],
  kunden: [-0.19, 0.34],
  website: [-0.17, 0.42],
};
const SPEED = 3.4;        // Impulse in Welt-Einheiten pro Sekunde
const GAP = 4.2;          // Pause zwischen zwei Impulsen (in Laengeneinheiten)
const RET_FACTOR = 2.6;   // Rueck-Impulse sind seltener

export function create(ctx) {
  const { THREE, palette, anchors: A, director, shared, quality, camera } = ctx;
  const group = new THREE.Group();
  group.name = 'scene:cables';

  const strands = STRANDS[quality] ?? STRANDS.high;
  const samples = SAMPLES[quality] ?? SAMPLES.high;
  const curves = buildCurves(THREE, A, samples);
  const names = curves.map((c) => c.name);
  const count = curves.length;

  /* ------------------------------------------------------------ Uniforms */
  const vec4s = () => Array.from({ length: count }, () => new THREE.Vector4());
  const U = {
    uTime: shared.uTime,
    uResolution: shared.uResolution,
    uPixelRatio: shared.uPixelRatio,
    uAlpha: { value: 1 },
    uFog: { value: 0.03 },
    uR: { value: A.nodeRadius },
    uCab: { value: vec4s() },
    uCab2: { value: vec4s() },
    uNodePos: { value: curves.map((c) => c.node.clone()) },
    uNodeA: { value: vec4s() },
    uNodeB: { value: vec4s() },
    uNodeIn: { value: curves.map((c) => c.inDir.clone()) },
    uTip: { value: vec4s() },
    // Helligkeiten bewusst moderat: kleine, sehr helle Flecken wirken im Bloom eckig
    uBase: { value: palette.signal.clone().multiplyScalar(0.2) },
    uPulse: { value: palette.ice.clone().multiplyScalar(2.3) },
    uPulseTail: { value: palette.signal.clone().multiplyScalar(1.05) },
    uEmber: { value: palette.ember.clone().multiplyScalar(2.0) },
    uTipCol: { value: palette.ice.clone().multiplyScalar(2.4) },
    uSheath: { value: palette.signal.clone().lerp(palette.mist, 0.35).multiplyScalar(0.34) },
    uSig: { value: palette.signal.clone() },
    uIce: { value: palette.ice.clone() },
    uDeep: { value: palette.deep.clone().lerp(palette.ink, 0.6) },
    uMist: { value: palette.mist.clone() },
    uWhite: { value: palette.white.clone() },
    uMotes: { value: 0 },
    uMoteCol: { value: palette.signal.clone().lerp(palette.ice, 0.4).multiplyScalar(0.9) },
  };
  for (let i = 0; i < count; i++) U.uCab2.value[i].w = curves[i].length;

  /* ------------------------------------------------------------ Objekte */
  const mats = makeMaterials(THREE, U);
  const fibreGeo = buildFibreGeometry(THREE, curves, strands);
  const ringGeo = buildRingGeometry(THREE, count, RING_SEG[quality] ?? RING_SEG.high);
  const nodeGeo = buildNodeGeometry(THREE, curves);
  const moteGeo = buildMoteGeometry(THREE, curves, MOTES[quality] ?? MOTES.high);
  const tipGeo = new THREE.BufferGeometry();
  tipGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  tipGeo.setAttribute('aIdx', new THREE.BufferAttribute(new Float32Array(curves.map((_, i) => i)), 1));

  const fibres = new THREE.Mesh(fibreGeo, mats.fibre);
  const rings = new THREE.Mesh(ringGeo, mats.ring);
  const nodes = new THREE.Mesh(nodeGeo.geometry, mats.node);
  const tips = new THREE.Points(tipGeo, mats.tip);
  const motes = new THREE.Points(moteGeo, mats.mote);
  motes.renderOrder = 19;
  fibres.renderOrder = 20;
  tips.renderOrder = 21;
  nodes.renderOrder = 22;
  rings.renderOrder = 23;
  for (const o of [motes, fibres, rings, nodes, tips]) {
    o.frustumCulled = false;
    group.add(o);
  }

  /* ------------------------------------------------------------ Labels */
  const overlay = ctx.overlay;
  const labels = curves.map((c) => {
    const el = document.createElement('div');
    el.className = 'gl-label';
    el.setAttribute('aria-hidden', 'true');
    // Label seitlich der Kugel (die Kabel kommen von unten): [Linie][Punkt][Name], links gespiegelt
    el.style.cssText = 'opacity:0;display:flex;align-items:center;gap:8px;'
      + 'text-shadow:0 0 14px rgba(4,6,10,0.95),0 0 3px rgba(4,6,10,0.9);pointer-events:none;';
    const line = document.createElement('span');
    line.style.cssText = 'display:block;width:18px;height:1px;flex:none;'
      + 'background:linear-gradient(to right,rgba(70,230,255,0),rgba(70,230,255,0.6));';
    const dot = document.createElement('span');
    dot.style.cssText = 'display:block;flex:none;width:5px;height:5px;border-radius:50%;box-sizing:border-box;'
      + 'border:1px solid var(--c-muted);background:transparent;transition:background .35s,border-color .35s;';
    const txt = document.createElement('span');
    txt.textContent = NODE_LABELS[c.name] || c.name;
    el.append(line, dot, txt);
    if (overlay) overlay.appendChild(el);
    // Breite grob aus der Textlaenge (Mono-Schrift, Grossbuchstaben, Laufweite) plus Linie und Punkt
    const w = (txt.textContent.length * 8.6) + 39;
    return {
      el, line, dot, w, x: -1, y: -1, o: -1, on: null, glow: -1, hidden: true, side: 1, sideSet: 0,
      vis: 0, occ: 1, depth: 0, cx: 0, cy: 0, r: 0, nx: 0, ny: 0, on1: 0, flash: 0,
    };
  });

  /* ------------------------------------------------------------ Zustand */
  const state = curves.map((c, i) => ({
    growWin: GROW[c.name] || [-0.2, 0.4],
    grow: 0,
    on: 0,
    connected: false,
    bootAt: -100,
    // Impulse: Takt pro Kabel, gleiche Geschwindigkeit in der Welt
    period: (c.length + GAP) / SPEED,
    offset: i * 1.37 + 0.4,
    retPeriod: ((c.length + GAP) / SPEED) * RET_FACTOR,
    retOffset: i * 2.11 + 1.3,
  }));
  const tmpV = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const nodePos = U.uNodePos.value;
  // Knoten werden von hinten nach vorne gezeichnet (ein Draw Call, vormultipliziertes Alpha)
  const idxAttr = nodeGeo.geometry.getAttribute('aIdx');
  const order = Array.from({ length: count }, (_, i) => i);
  const viewZ = new Float32Array(count);

  function sortNodes() {
    for (let i = 0; i < count; i++) {
      tmpV.copy(nodePos[i]).applyMatrix4(camera.matrixWorldInverse);
      viewZ[i] = tmpV.z; // negativ = vor der Kamera, kleiner = weiter weg
    }
    for (let i = 1; i < count; i++) { // Einfuegesortierung, 5 Elemente, ohne Speicher
      const v = order[i];
      let j = i - 1;
      while (j >= 0 && viewZ[order[j]] > viewZ[v]) { order[j + 1] = order[j]; j--; }
      order[j + 1] = v;
    }
    let changed = false;
    for (let i = 0; i < count; i++) {
      if (idxAttr.array[i] !== order[i]) { idxAttr.array[i] = order[i]; changed = true; }
    }
    if (changed) idxAttr.needsUpdate = true;
  }

  function timeline(global) {
    const bb = director.beat('brain');
    const bc = director.beat('cables');
    const bd = director.beat('dna');
    if (global < bc.start) return (global - bc.start) / Math.max(1e-6, bb.end - bb.start);
    if (global < bd.start) return (global - bc.start) / Math.max(1e-6, bc.end - bc.start);
    return 1 + (global - bd.start) / Math.max(1e-6, bd.end - bd.start);
  }

  // Punkt auf der Mittellinie bei Bogenlaenge s (inkl. Schweben/Schwingen wie im Shader)
  function pointAt(cv, s, time, out) {
    const { pts, s: S, count: n, length: L, index: c } = cv;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] < s) lo = mid; else hi = mid;
    }
    const f = Math.min(1, Math.max(0, (s - S[lo]) / Math.max(1e-6, S[hi] - S[lo])));
    out.set(
      pts[lo * 3] + (pts[hi * 3] - pts[lo * 3]) * f,
      pts[lo * 3 + 1] + (pts[hi * 3 + 1] - pts[lo * 3 + 1]) * f,
      pts[lo * 3 + 2] + (pts[hi * 3 + 2] - pts[lo * 3 + 2]) * f,
    );
    const bob = U.uCab2.value[c];
    const k = smoothstep(L * 0.5, L, s);
    out.x += bob.x * k;
    out.y += bob.y * k;
    out.z += bob.z * k;
    const sway = smoothstep(1.6, 3.6, s) * (1 - smoothstep(L - 3.0, L - 0.6, s));
    out.x += Math.sin(time * 0.55 + s * 0.8 + c * 1.7) * 0.05 * sway;
    out.y += 0.8 * Math.sin(time * 0.47 + s * 0.63 + c * 2.3) * 0.05 * sway;
    return out;
  }

  function hideLabels() {
    for (const lb of labels) {
      if (!lb.hidden) { lb.el.style.opacity = '0'; lb.o = 0; lb.hidden = true; }
    }
  }

  const api = {
    group,
    look: { bloom: 1.0, bloomRadius: 0.4, parallax: 0.12, drift: 0.018, fogDensity: 0.026 },

    update(time, dt, local, global, weight = 1) {
      const u = timeline(global);
      U.uAlpha.value = weight;
      U.uFog.value = ctx.scene.fog ? ctx.scene.fog.density : 0.03;
      camera.updateMatrixWorld();
      camPos.setFromMatrixPosition(camera.matrixWorld);

      const focus = smoothstep(0.62, 0.95, u);
      U.uMotes.value = smoothstep(-0.25, 0.5, u) * 1.15;
      for (let i = 0; i < count; i++) {
        const cv = curves[i];
        const st = state[i];
        const L = cv.length;
        const name = cv.name;

        // Schweben des Knotens
        const bob = U.uCab2.value[i];
        bob.set(
          Math.sin(time * 0.61 + i * 1.3) * 0.05,
          Math.sin(time * 0.83 + i * 2.1) * 0.07,
          Math.cos(time * 0.52 + i) * 0.04,
          L,
        );
        nodePos[i].copy(cv.node).add(tmpV.set(bob.x, bob.y, bob.z));

        // Wachstum: schnell heraus, weich ins Ziel
        const gw = st.growWin;
        const gx = Math.min(1, Math.max(0, (u - gw[0]) / (gw[1] - gw[0])));
        const ge = 1 - Math.pow(1 - gx, 2.4);
        st.grow = ge * L;
        const connected = gx >= 1;
        if (connected && !st.connected) st.bootAt = time;
        st.connected = connected;
        st.on = connected ? Math.min(1, st.on + dt * 2.5) : Math.max(0, st.on - dt * 4);
        if (dt === 0) st.on = connected ? 1 : 0;

        // Impulse (CPU rechnet die Koepfe, der Shader zeichnet: Treffer und Aufleuchten sind synchron)
        const ph = ((time + st.offset) % st.period + st.period) % st.period;
        const P = ph * SPEED - 1.0;
        const arrive = L - 0.12;
        const pulseAge = P >= arrive ? (P - arrive) / SPEED : 99;
        const rph = ((time + st.retOffset) % st.retPeriod + st.retPeriod) % st.retPeriod;
        const Q = L + 0.4 - rph * SPEED * 0.85;

        const cab = U.uCab.value[i];
        cab.set(st.grow + 0.002, P, Q, st.on);

        // Knoten
        const appear = smoothstep(-0.14 + i * 0.015, 0.1 + i * 0.015, u);
        const bootAge = time - st.bootAt;
        let shockAge = 99;
        let shockAmp = 0;
        if (st.on > 0.01 && pulseAge < 1.8) { shockAge = pulseAge; shockAmp = 0.75; }
        if (connected && bootAge < 1.8 && bootAge < shockAge) { shockAge = bootAge; shockAmp = 1.35; }
        const flash = connected
          ? Math.max(Math.exp(-pulseAge * 3.4) * st.on, Math.exp(-Math.max(0, bootAge) * 2.2) * 1.2)
          : 0;
        // Portal: Kamera fliegt in den Website-Knoten
        const dist = camPos.distanceTo(nodePos[i]);
        const portal = name === 'website' ? 1 - smoothstep(0.7, 3.2, dist) : 0;
        const inside = smoothstep(0.32, 0.6, dist);
        const fc = name === 'website' ? focus : 0;
        U.uNodeA.value[i].set(appear * inside, st.on, Math.min(1.4, flash), fc);
        U.uNodeB.value[i].set(shockAge, shockAmp, portal, name === 'website' ? 0 : focus);

        // Spitze
        const tipI = gx > 0 && gx < 1 ? smoothstep(0, 0.04, gx) * (1 - smoothstep(0.9, 1, gx)) : 0;
        const tip = U.uTip.value[i];
        pointAt(cv, st.grow, time, tmpV);
        tip.set(tmpV.x, tmpV.y, tmpV.z, tipI);

        // Label (Position hier, Schreiben ins DOM nach der Verdeckungspruefung)
        placeLabel(i, appear * inside * weight * (1 - portal) * (1 - (name === 'website' ? 0 : focus * 0.6)), st.on, flash);
      }
      sortNodes();
      resolveLabels(dt);
    },

    setActive(active) {
      if (!active) hideLabels();
    },

    dispose() {
      fibreGeo.dispose();
      ringGeo.dispose();
      nodeGeo.dispose();
      tipGeo.dispose();
      moteGeo.dispose();
      for (const m of Object.values(mats)) m.dispose();
      for (const lb of labels) lb.el.remove();
      group.clear();
    },
  };

  // Pass 1: Bildschirmposition, Grundsichtbarkeit, Tiefe
  function placeLabel(i, vis, on, flash) {
    const lb = labels[i];
    lb.on1 = on;
    lb.flash = flash;
    lb.vis = 0;
    if (!overlay) return;
    const p = nodePos[i];
    tmpV.copy(p).applyMatrix4(camera.matrixWorldInverse);
    const depth = -tmpV.z;
    lb.depth = depth;
    if (depth < 0.4 || vis < 0.01) return;
    tmpV.copy(p).project(camera);
    const W = ctx.size.width;
    const H = ctx.size.height;
    const rPx = (A.nodeRadius * camera.projectionMatrix.elements[5] * H * 0.5) / depth;
    lb.cx = (tmpV.x * 0.5 + 0.5) * W;
    lb.cy = (-tmpV.y * 0.5 + 0.5) * H;
    lb.r = rPx;
    // Seite mit Hysterese: rechts der Kugel, nahe am rechten Rand links davon
    const room = W - (lb.cx + rPx * 1.2 + lb.w + 16);
    if (lb.side > 0 && room < 0) lb.side = -1;
    else if (lb.side < 0 && room > 40) lb.side = 1;
    lb.nx = lb.cx + lb.side * (rPx * 1.18 + 2);
    lb.ny = lb.cy;
    // Knoten muss im Bild sein, Label ganz lesbar
    const x0 = lb.side > 0 ? lb.nx : lb.nx - lb.w;
    if (lb.cx < 8 || lb.cx > W - 8 || lb.cy < 12 || lb.cy > H - 12 || x0 < 4 || x0 + lb.w > W - 4 || rPx < 5) return;
    lb.vis = vis * smoothstep(5, 12, rPx) * (1 - smoothstep(Math.min(W, H) * 0.22, Math.min(W, H) * 0.36, rPx));
  }

  // Pass 2: Labels, die von einem naeheren Knoten oder Label verdeckt werden, weich ausblenden
  function resolveLabels(dt) {
    for (let i = 0; i < count; i++) {
      const a = labels[i];
      let occ = 0;
      if (a.vis > 0) {
        const ax = a.side > 0 ? a.nx + a.w * 0.5 : a.nx - a.w * 0.5; // Mitte des Labels
        const hw = a.w * 0.5 + 6;
        for (let j = 0; j < count; j++) {
          const b = labels[j];
          if (j === i || !(b.vis > 0.05) || b.depth >= a.depth) continue;
          // naeherer Knoten (Kugel mit Halo) ueber dem Label?
          const dx = Math.max(Math.abs(ax - b.cx) - hw, 0);
          const dy = Math.max(Math.abs(a.ny - b.cy) - 10, 0);
          if (dx * dx + dy * dy < (b.r * 1.35) ** 2) occ = 1;
          // naeheres Label im Weg?
          const bx = b.side > 0 ? b.nx + b.w * 0.5 : b.nx - b.w * 0.5;
          if (Math.abs(ax - bx) < (a.w + b.w) * 0.5 + 10 && Math.abs(a.ny - b.ny) < 24) occ = 1;
          // eigene Kugel hinter einer naeheren Kugel?
          const dc = Math.hypot(a.cx - b.cx, a.cy - b.cy);
          if (dc < b.r * 1.1 + a.r * 0.6) occ = 1;
        }
      }
      a.occ += ((occ ? 0 : 1) - a.occ) * (1 - Math.exp(-10 * Math.max(dt, 1 / 60)));
      writeLabel(a, a.vis * a.occ);
    }
  }

  function writeLabel(lb, vis) {
    let o = Math.round(vis * 100) / 100;
    if (o <= 0.01) {
      if (!lb.hidden) { lb.el.style.opacity = '0'; lb.o = 0; lb.hidden = true; }
      return;
    }
    lb.hidden = false;
    const rx = Math.round(lb.nx * 2) / 2;
    const ry = Math.round(lb.ny * 2) / 2;
    if (lb.side !== lb.sideSet) {
      lb.el.style.flexDirection = lb.side > 0 ? 'row' : 'row-reverse';
      lb.line.style.transform = lb.side > 0 ? 'none' : 'scaleX(-1)';
      lb.sideSet = lb.side;
      lb.x = -1;
    }
    if (rx !== lb.x || ry !== lb.y) {
      lb.el.style.transform = lb.side > 0
        ? `translate3d(${rx}px, ${ry}px, 0) translateY(-50%)`
        : `translate3d(${rx}px, ${ry}px, 0) translate(-100%, -50%)`;
      lb.x = rx;
      lb.y = ry;
    }
    if (o !== lb.o) { lb.el.style.opacity = String(o); lb.o = o; }
    const isOn = lb.on1 > 0.5;
    if (isOn !== lb.on) {
      lb.dot.style.background = isOn ? 'var(--c-signal)' : 'transparent';
      lb.dot.style.borderColor = isOn ? 'var(--c-signal)' : 'var(--c-muted)';
      lb.on = isOn;
    }
    const glow = isOn ? Math.round(Math.min(1, lb.flash) * 6) : 0;
    if (glow !== lb.glow) {
      lb.dot.style.boxShadow = glow ? `0 0 ${4 + glow * 2}px rgba(70,230,255,${(0.35 + glow * 0.1).toFixed(2)})` : 'none';
      lb.glow = glow;
    }
  }

  return api;
}
