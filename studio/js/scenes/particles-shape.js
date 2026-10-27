// Szene "particles": Zielpunkte der Roboter-Silhouette (Kopf, Visier, Hals, Schultern).
// Erster Weg: Punkte direkt auf der Geometrie des Roboters (robot-geometry.js wird nur gelesen), damit Partikel-Roboter
// und fester Roboter deckungsgleich sind. Rueckfall: eigene analytische Form mit den Massen aus ctx.anchors.
// Wird einmal in create() gerechnet.
//
// Pro Punkt: Position, Normale, Art (KIND), Reihenfolge der Formung (0 unten .. 1 oben),
// Sichtbarkeit (Bueste laeuft unten weich aus), Kopf-Anteil (folgt der Kopfbewegung).

export const KIND = Object.freeze({ surface: 0, line: 1, visor: 2, dust: 3, far: 4 });

// Anteile der Formungs-Partikel (Summe 1)
const SHARE = [
  ['headSurface', 0.29],
  ['visor', 0.075],
  ['visorEdge', 0.022],
  ['faceplate', 0.03],
  ['ears', 0.026],
  ['crest', 0.012],
  ['neck', 0.038],
  ['neckRings', 0.017],
  ['bust', 0.42],
  ['bustLines', 0.07],
];

// Anteile, wenn die Geometrie des Roboters (robot-geometry.js) verfuegbar ist
const SHARE_ROBOT = [
  ['head', 0.27],
  ['band', 0.07],
  ['bezel', 0.03],
  ['ears', 0.025],
  ['neck', 0.06],
  ['tendons', 0.035],
  ['torso', 0.47],
  ['seams', 0.04],
];

/**
 * Zielpunkte der Roboter-Silhouette.
 * Mit `robotGeo` (Modul robot-geometry.js) werden die Punkte direkt auf der Geometrie des Roboters verteilt,
 * damit Partikel-Roboter und fester Roboter genau uebereinander liegen. Fehlt das Modul oder passt etwas nicht,
 * gilt eine eigene, analytische Form mit denselben Massen aus ctx.anchors.
 */
export function sampleRobot(THREE, A, count, rnd, robotGeo = null, Sampler = null) {
  if (robotGeo && Sampler) {
    try {
      const r = sampleFromRobot(THREE, A, count, rnd, robotGeo, Sampler);
      if (valid(r, count)) return r;
    } catch (e) {
      // Rueckfall unten
    }
  }
  return sampleAnalytic(THREE, A, count, rnd);
}

function makeOut(count) {
  return {
    pos: new Float32Array(count * 3),
    nrm: new Float32Array(count * 3),
    kind: new Float32Array(count),
    vis: new Float32Array(count),
    order: new Float32Array(count),
    hw: new Float32Array(count), // 1 = bewegt sich mit dem Kopf
  };
}

function valid(r, count) {
  if (!r) return false;
  for (let i = 0; i < count; i++) {
    const x = r.pos[i * 3];
    const y = r.pos[i * 3 + 1];
    const z = r.pos[i * 3 + 2];
    if (!Number.isFinite(x + y + z + r.nrm[i * 3] + r.nrm[i * 3 + 1] + r.nrm[i * 3 + 2])) return false;
    if (Math.abs(x) > 3.2 || y < -4.2 || y > 1.6 || Math.abs(z) > 2.2) return false;
  }
  return true;
}

function sampleFromRobot(THREE, A, count, rnd, G, Sampler) {
  const out = makeOut(count);
  const R = A.head.radii;
  const topY = A.head.center.y + R.y;
  const bottomY = A.bust.bottomY;
  const bot = A.neck.bottom;
  const top = A.neck.top;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const d = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let i = 0;
  const put = (k, v, h) => {
    if (i >= count) return;
    out.pos[i * 3] = p.x; out.pos[i * 3 + 1] = p.y; out.pos[i * 3 + 2] = p.z;
    out.nrm[i * 3] = n.x; out.nrm[i * 3 + 1] = n.y; out.nrm[i * 3 + 2] = n.z;
    out.kind[i] = k;
    out.vis[i] = v;
    out.order[i] = Math.min(1, Math.max(0, (p.y - bottomY) / (topY - bottomY)));
    out.hw[i] = h;
    i++;
  };
  const counts = {};
  let acc = 0;
  for (const [name, share] of SHARE_ROBOT) { counts[name] = Math.floor(count * share); acc += counts[name]; }
  counts.torso += count - acc;

  /* Kopf: Form des Roboters (Superellipsoid mit Kiefer und Hinterkopf) */
  const shape = G.makeHeadShape(R);
  const dir = (theta, phi, o) => o.set(Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi));
  const e = 1e-3;
  const headPoint = (theta, phi, lift) => {
    const ph = Math.max(-1.5688, Math.min(1.5688, phi));
    dir(theta, ph, d); shape(d.x, d.y, d.z, p);
    dir(theta + e, ph, d); shape(d.x, d.y, d.z, a);
    dir(theta - e, ph, d); shape(d.x, d.y, d.z, b);
    a.sub(b);
    dir(theta, ph + e, d); shape(d.x, d.y, d.z, b);
    dir(theta, ph - e, d); shape(d.x, d.y, d.z, d);
    b.sub(d);
    n.crossVectors(a, b).normalize();
    if (n.dot(p) < 0) n.negate();
    if (lift) p.addScaledVector(n, lift);
  };
  const sampler = (geo) => {
    const mesh = new THREE.Mesh(geo);
    const smp = new Sampler(mesh).setRandomGenerator(rnd).build();
    return { smp, done: () => { geo.dispose(); mesh.material.dispose(); } };
  };
  const insideHead = (v, k = 0.97) => (v.x / (R.x * k)) ** 2 + (v.y / (R.y * k)) ** 2 + (v.z / (R.z * k)) ** 2 < 1;

  {
    const { smp, done } = sampler(G.buildHead(THREE, shape, 72, 54));
    for (let c = 0; c < counts.head; c++) {
      smp.sample(p, n);
      if (n.dot(p) < 0) n.negate();
      put(0, 1, 1);
    }
    done();
  }

  // Lichtband im Visier (gleiche Hoehe wie ANCHORS.visor)
  const bandPhi = Math.asin(A.visor.center.y / R.y);
  const bandHalf = Math.asin(Math.min(0.9, (A.visor.width / 2) / R.x));
  for (let c = 0; c < counts.band; c++) {
    const th = (rnd() * 2 - 1) * bandHalf;
    const edge = 1 - Math.pow(Math.abs(th) / bandHalf, 8);
    headPoint(th, bandPhi + (rnd() * 2 - 1) * 0.055 * Math.sqrt(Math.max(0, edge)), 0.024);
    put(2, 1, 1);
  }

  // Rand des Gesichtsschilds (Masse wie der Visier-Rahmen in robot.js)
  {
    const halfW = 0.775;
    const halfH = 0.595;
    const corner = 0.335;
    const taper = 0.37;
    const centerPhi = -0.14;
    const rh = 0.84;
    const pts = [];
    const ax = halfW - corner;
    const by = halfH - corner;
    const arc = (cx, cy, a0) => { for (let k = 0; k <= 12; k++) { const t = a0 + (k / 12) * Math.PI * 0.5; pts.push([cx + Math.cos(t) * corner, cy + Math.sin(t) * corner]); } };
    arc(ax, by, 0); arc(-ax, by, Math.PI * 0.5); arc(-ax, -by, Math.PI); arc(ax, -by, Math.PI * 1.5);
    pts.push(pts[0]);
    const smp = polylineSampler(pts, (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]));
    for (let c = 0; c < counts.bezel; c++) {
      smp(rnd, _pt);
      const yn = _pt[1] / halfH;
      const xa = _pt[0] * (1 - taper * smoothstep(0.35, -1.0, yn));
      headPoint(xa / rh, centerPhi + _pt[1], 0.02);
      jitter3(p, rnd, 0.006);
      put(1, 1, 1);
    }
  }

  // Ohrmodule: zwei Ringe und ein Kern je Seite
  for (let c = 0; c < counts.ears; c++) {
    const side = c % 2 ? 1 : -1;
    headPoint(side * (Math.PI / 2 + 0.1), 0.02, 0.03);
    const cx = p.x; const cy = p.y; const cz = p.z;
    const nx = n.x; const ny = n.y; const nz = n.z;
    a.set(0, 1, 0).cross(n).normalize();
    b.copy(n).cross(a).normalize();
    const pick = rnd();
    const r = pick < 0.45 ? 0.2 : pick < 0.85 ? 0.146 : Math.sqrt(rnd()) * 0.045;
    const t = rnd() * Math.PI * 2;
    p.set(cx, cy, cz).addScaledVector(a, Math.cos(t) * r).addScaledVector(b, Math.sin(t) * r);
    n.set(nx, ny, nz);
    jitter3(p, rnd, 0.004);
    put(1, 1, 1);
  }

  /* Hals: Wirbelringe, Wirbelsaeule, Kragen, Sehnen. Bewegt sich anteilig mit dem Kopf (wie im Roboter-Shader) */
  const skinW = (y) => smoothstep(-1.32, -0.82, y);
  const zAxis = (top.z + bot.z) / 2;
  {
    const { smp, done } = sampler(G.buildNeckMetal(THREE, A, 32));
    for (let c = 0; c < counts.neck;) {
      smp.sample(p, n);
      if (insideHead(p)) continue;
      const rr = Math.hypot(p.x, p.z - zAxis);
      n.set(p.x, 0, p.z - zAxis).normalize();
      put(rr > 0.285 ? 1 : 0, 1, skinW(p.y));
      c++;
    }
    done();
  }
  {
    const { smp, done } = sampler(G.buildTendons(THREE, A, 32, 6));
    for (let c = 0; c < counts.tendons;) {
      smp.sample(p, n);
      if (insideHead(p)) continue;
      put(0, 1, skinW(p.y));
      c++;
    }
    done();
  }

  /* Rumpf: Schultern, Brust; unten weich auslaufend wie im Roboter-Shader */
  {
    const cz = A.bust.center.z;
    const vis = (y) => smoothstep(-3.2, -2.3, y);
    const { smp, done } = sampler(G.buildTorso(THREE, A, 64, 40));
    for (let c = 0; c < counts.torso;) {
      smp.sample(p, n);
      if (p.y < bottomY + 0.05) continue;
      const v = vis(p.y);
      if (rnd() > 0.3 + 0.7 * v) continue;
      if (n.x * p.x + n.z * (p.z - cz) < 0) n.negate();
      put(0, v, 0);
      c++;
    }
    // Fugen der Schulterkappen (wie im Roboter-Shader bei |x| = 1.66): nur auf den Dreiecken, die die Fuge kreuzen
    const torsoGeo = smp.geometry;
    const pa = torsoGeo.getAttribute('position');
    const ix = torsoGeo.index;
    const sub = [];
    if (ix) {
      for (let f = 0; f < ix.count; f += 3) {
        const i0 = ix.getX(f); const i1 = ix.getX(f + 1); const i2 = ix.getX(f + 2);
        const x0 = Math.abs(pa.getX(i0)); const x1 = Math.abs(pa.getX(i1)); const x2 = Math.abs(pa.getX(i2));
        const ymax = Math.max(pa.getY(i0), pa.getY(i1), pa.getY(i2));
        if (ymax < -1.7 && Math.min(x0, x1, x2) <= 1.68 && Math.max(x0, x1, x2) >= 1.64) sub.push(i0, i1, i2);
      }
    }
    if (sub.length) {
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', pa);
      sg.setIndex(sub);
      const sm = new THREE.Mesh(sg);
      const ss = new Sampler(sm).setRandomGenerator(rnd).build();
      let guard = 0;
      for (let c = 0; c < counts.seams && guard < 400000; guard++) {
        ss.sample(p, n);
        if (Math.abs(Math.abs(p.x) - 1.66) > 0.012 || p.y > -1.78 || p.y < bottomY + 0.05) continue;
        if (n.x * p.x + n.z * (p.z - cz) < 0) n.negate();
        p.addScaledVector(n, 0.012);
        put(1, vis(p.y), 0);
        c++;
      }
      sm.material.dispose();
    }
    done();
  }

  // Rest (falls Ablehnungen etwas offen lassen): Kopf
  while (i < count) {
    headPoint(rnd() * Math.PI * 2, Math.asin(rnd() * 2 - 1), 0);
    put(0, 1, 1);
  }
  return out;
}

function jitter3(v, rnd, amt) {
  v.x += (rnd() - 0.5) * amt;
  v.y += (rnd() - 0.5) * amt;
  v.z += (rnd() - 0.5) * amt;
}

/**
 * @param {object} THREE
 * @param {object} A       ctx.anchors
 * @param {number} count   Anzahl Punkte
 * @param {() => number} rnd deterministischer Zufall 0..1
 */
function sampleAnalytic(THREE, A, count, rnd) {
  const out = makeOut(count);
  const { pos, nrm, kind, vis, order, hw } = out;

  const R = A.head.radii;
  const HC = A.head.center;
  const visor = A.visor;
  const neck = A.neck;
  const bust = A.bust;
  const topY = HC.y + R.y;
  const bottomY = bust.bottomY;

  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  let i = 0;

  const put = (k, v = 1) => {
    if (i >= count) return;
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    nrm[i * 3] = n.x; nrm[i * 3 + 1] = n.y; nrm[i * 3 + 2] = n.z;
    kind[i] = k;
    vis[i] = v;
    order[i] = Math.min(1, Math.max(0, (p.y - bottomY) / (topY - bottomY)));
    hw[i] = smoothstep(-1.05, -0.85, p.y);
    i++;
  };

  /* ---------------------------------------------------------------- Kopf */
  // Punkt auf dem Kopf-Ellipsoid aus Hoehe y (absolut) und Azimut phi (0 = vorne, +Z)
  const headAt = (y, phi, lift = 0) => {
    const ty = (y - HC.y) / R.y;
    const k = Math.sqrt(Math.max(0, 1 - ty * ty));
    p.set(HC.x + R.x * k * Math.sin(phi), y, HC.z + R.z * k * Math.cos(phi));
    headNormal();
    if (lift) p.addScaledVector(n, lift);
  };
  const headNormal = () => {
    n.set((p.x - HC.x) / (R.x * R.x), (p.y - HC.y) / (R.y * R.y), (p.z - HC.z) / (R.z * R.z)).normalize();
  };
  // Seitenpunkt (Ohr): Kreis in der y/z-Ebene, auf das Ellipsoid projiziert
  const sideAt = (sx, y, z) => {
    const q = 1 - ((y - HC.y) / R.y) ** 2 - ((z - HC.z) / R.z) ** 2;
    p.set(HC.x + sx * R.x * Math.sqrt(Math.max(0, q)), y, z);
    headNormal();
  };
  const jitter = (amt) => {
    p.x += (rnd() - 0.5) * amt; p.y += (rnd() - 0.5) * amt; p.z += (rnd() - 0.5) * amt;
  };

  // Visier: Band auf der Vorderseite. Halbe Breite als Azimut, halbe Hoehe mit runden Enden.
  const vHalfW = visor.width / 2;
  const vPhi = Math.asin(Math.min(0.99, vHalfW / R.x));
  const vHalfH = visor.height / 2;
  const vHalfAt = (phi) => vHalfH * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(phi) / vPhi, 6)), 0.35);

  // Gesichtsplatte: Fuge um das Gesicht (Stirnbogen, Schlaefen, Kinnbogen) als geschlossene Kurve (Azimut, Hoehe)
  const facePhi = vPhi + 0.32;
  const faceTop = 0.62;
  const faceBottom = -0.7;
  const faceCurve = [];
  for (let k = 0; k <= 240; k++) {
    const th = (k / 240) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    // Superellipse: eckig mit runden Ecken
    const ph = facePhi * Math.sign(c) * Math.pow(Math.abs(c), 0.42);
    const yy = (s >= 0 ? faceTop : -faceBottom) * Math.sign(s) * Math.pow(Math.abs(s), 0.42);
    faceCurve.push([ph, yy]);
  }
  const faceSampler = polylineSampler(faceCurve, (a, b) => Math.hypot((a[0] - b[0]) * R.x, a[1] - b[1]));

  const visorEdge = [];
  for (let k = 0; k <= 200; k++) {
    const th = (k / 200) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const ph = (vPhi + 0.035) * Math.sign(c) * Math.pow(Math.abs(c), 0.22);
    const yy = visor.center.y + (vHalfH + 0.03) * Math.sign(s) * Math.pow(Math.abs(s), 0.5);
    visorEdge.push([ph, yy]);
  }
  const visorSampler = polylineSampler(visorEdge, (a, b) => Math.hypot((a[0] - b[0]) * R.x, a[1] - b[1]));

  const counts = {};
  let acc = 0;
  for (const [name, share] of SHARE) { counts[name] = Math.floor(count * share); acc += counts[name]; }
  counts.bust += count - acc;

  // Kopf-Flaeche: gleichmaessig nach Flaeche (Ablehnung ueber Flaechenelement)
  const minR = Math.min(R.x, R.y, R.z);
  for (let c = 0; c < counts.headSurface;) {
    randomDir(rnd, n);
    const dA = Math.hypot(n.x / R.x, n.y / R.y, n.z / R.z) * minR;
    if (rnd() > dA) continue;
    p.set(HC.x + R.x * n.x, HC.y + R.y * n.y, HC.z + R.z * n.z);
    // unter dem Kinn (Hals-Ansatz) duenner
    if (p.y < HC.y - 0.86 * R.y && rnd() < 0.7) continue;
    headNormal();
    put(KIND.surface);
    c++;
  }

  // Visier-Flaeche
  for (let c = 0; c < counts.visor; c++) {
    const phi = (rnd() * 2 - 1) * vPhi;
    const h = vHalfAt(phi);
    const y = visor.center.y + (rnd() * 2 - 1) * h;
    headAt(y, phi, 0.012);
    put(KIND.visor);
  }

  // Visier-Rand
  for (let c = 0; c < counts.visorEdge; c++) {
    visorSampler(rnd, _pt);
    headAt(_pt[1], _pt[0], 0.008);
    jitter(0.006);
    put(KIND.line);
  }

  // Fuge der Gesichtsplatte
  for (let c = 0; c < counts.faceplate; c++) {
    faceSampler(rnd, _pt);
    headAt(_pt[1], _pt[0], 0.006);
    jitter(0.006);
    put(KIND.line);
  }

  // Ohren: zwei Ringe und ein heller Kern je Seite
  const earY = visor.center.y - 0.08;
  const earZ = HC.z - 0.06;
  for (let c = 0; c < counts.ears; c++) {
    const sx = c % 2 ? 1 : -1;
    const pick = rnd();
    const th = rnd() * Math.PI * 2;
    let r;
    if (pick < 0.46) r = 0.25;
    else if (pick < 0.86) r = 0.155;
    else r = Math.sqrt(rnd()) * 0.06;
    sideAt(sx, earY + Math.cos(th) * r, earZ + Math.sin(th) * r);
    p.addScaledVector(n, 0.01);
    jitter(0.005);
    put(KIND.line);
  }

  // Scheitel: zwei feine parallele Linien von der Stirn ueber den Kopf nach hinten
  for (let c = 0; c < counts.crest; c++) {
    const a = THREE.MathUtils.lerp(-0.25, -2.25, rnd()); // Winkel in der y/z-Ebene (0 = oben), negativ = nach hinten
    const off = (c % 2 ? 1 : -1) * 0.055;
    const y = HC.y + R.y * Math.cos(a);
    const z = HC.z + R.z * Math.sin(a);
    // auf dem Ellipsoid bleiben: kleinen x-Versatz einrechnen
    const k = Math.sqrt(Math.max(0.0001, 1 - (off / R.x) ** 2));
    p.set(off, HC.y + (y - HC.y) * k, HC.z + (z - HC.z) * k);
    headNormal();
    p.addScaledVector(n, 0.006);
    jitter(0.004);
    put(KIND.line);
  }

  /* ---------------------------------------------------------------- Hals */
  const neckLen = neck.top.y - neck.bottom.y;
  const insideHead = (v) => ((v.x - HC.x) / R.x) ** 2 + ((v.y - HC.y) / R.y) ** 2 + ((v.z - HC.z) / R.z) ** 2 < 1.0;
  for (let c = 0; c < counts.neck;) {
    const t = rnd();
    const a = rnd() * Math.PI * 2;
    const y = neck.bottom.y + t * neckLen;
    const z0 = THREE.MathUtils.lerp(neck.bottom.z, neck.top.z, t);
    const r = neck.radius * (0.92 + 0.08 * t);
    p.set(Math.sin(a) * r, y, z0 + Math.cos(a) * r);
    if (insideHead(p)) continue;
    n.set(Math.sin(a), 0, Math.cos(a));
    put(KIND.surface);
    c++;
  }
  const ringYs = [0.24, 0.47, 0.7].map((f) => neck.bottom.y + f * neckLen);
  for (let c = 0; c < counts.neckRings;) {
    const y = ringYs[c % ringYs.length];
    const t = (y - neck.bottom.y) / neckLen;
    const a = rnd() * Math.PI * 2;
    const r = neck.radius * (0.92 + 0.08 * t) + 0.012;
    const z0 = THREE.MathUtils.lerp(neck.bottom.z, neck.top.z, t);
    p.set(Math.sin(a) * r, y + (rnd() - 0.5) * 0.008, z0 + Math.cos(a) * r);
    if (insideHead(p)) { c++; continue; }
    n.set(Math.sin(a), 0, Math.cos(a));
    put(KIND.line);
    c++;
  }

  /* ------------------------------------------------------- Schultern */
  // Querschnitt pro Hoehe: Superellipse mit halber Breite A(s) und halber Tiefe B(s); s = Abstand unter der Oberkante
  const bTop = neck.bottom.y + 0.05;
  const bSpan = bTop - bottomY;
  const halfW = bust.shoulderWidth / 2;
  const zc0 = neck.bottom.z;
  const zc1 = bust.center.z;
  const ex = 2 / 2.6;
  const bustAt = (s, phi, out) => {
    const u = Math.min(s / 0.82, 1);
    const Aw = 0.36 + (halfW - 0.36) * (1 - Math.pow(1 - u, 2.3)) - Math.max(0, s - 0.9) * 0.1;
    const v = Math.min(s / 0.95, 1);
    const Bd = 0.32 + 0.56 * (1 - Math.pow(1 - v, 2.0));
    const zc = THREE.MathUtils.lerp(zc0, zc1, Math.min(1, s / 0.9));
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    out.set(
      Aw * Math.sign(sn) * Math.pow(Math.abs(sn), ex),
      bTop - s,
      zc + Bd * Math.sign(c) * Math.pow(Math.abs(c), ex)
    );
    return out;
  };
  const e = 1e-3;
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const bustNormal = (s, phi) => {
    bustAt(s + e, phi, _a).sub(bustAt(Math.max(0, s - e), phi, _b));
    bustAt(s, phi + e, _c).sub(bustAt(s, phi - e, _d));
    n.crossVectors(_c, _a).normalize();
    const zc = THREE.MathUtils.lerp(zc0, zc1, Math.min(1, s / 0.9));
    if (n.x * p.x + n.z * (p.z - zc) < 0) n.negate();
    return n;
  };
  const areaAt = (s, phi) => {
    bustAt(s + e, phi, _a).sub(bustAt(Math.max(0, s - e), phi, _b));
    bustAt(s, phi + e, _c).sub(bustAt(s, phi - e, _d));
    return _c.cross(_a).length();
  };
  let maxArea = 0;
  for (let k = 0; k < 400; k++) maxArea = Math.max(maxArea, areaAt(rnd() * bSpan, rnd() * Math.PI * 2));
  maxArea *= 1.15;
  const bustVis = (s) => 1 - smoothstep(bSpan * 0.6, bSpan * 0.98, s);
  for (let c = 0; c < counts.bust;) {
    const s = rnd() * bSpan;
    const phi = rnd() * Math.PI * 2;
    if (rnd() * maxArea > areaAt(s, phi)) continue;
    const vv = bustVis(s);
    // unten duenner (weicher Auslauf statt harter Kante)
    if (rnd() > 0.35 + 0.65 * vv) continue;
    bustAt(s, phi, p);
    if (insideHead(p)) continue;
    bustNormal(s, phi);
    put(KIND.surface, vv);
    c++;
  }

  // Linien der Schultern: Kragen, Schulterkamm, Gelenkringe an den Schultern (dort sitzen die Arme)
  const jointS = 0.78;
  const jointR = 0.36;
  for (let c = 0; c < counts.bustLines; c++) {
    const pick = rnd();
    let s;
    let phi;
    if (pick < 0.28) { // Kragen
      s = 0.06; phi = rnd() * Math.PI * 2;
    } else if (pick < 0.56) { // Schulterkamm links/rechts (oben ueber die Schulter)
      s = 0.08 + rnd() * 0.5; phi = (rnd() < 0.5 ? 1 : -1) * Math.PI * 0.5;
    } else { // Gelenkring: Kreis in der y/z-Ebene, auf die Seite der Schulter gelegt
      const side = rnd() < 0.5 ? 1 : -1;
      const psi = rnd() * Math.PI * 2;
      const ring = rnd() < 0.62 ? jointR : jointR * 0.62;
      s = jointS - Math.cos(psi) * ring;
      const dz = Math.sin(psi) * ring;
      const u = Math.min(s / 0.95, 1);
      const Bd = 0.32 + 0.56 * (1 - Math.pow(1 - u, 2.0));
      const cphi = Math.pow(Math.min(1, Math.abs(dz) / Bd), 1 / ex);
      const del = Math.asin(Math.min(1, cphi));
      phi = side * (Math.PI * 0.5 - Math.sign(dz) * del);
    }
    bustAt(s, phi, p);
    if (insideHead(p)) continue;
    bustNormal(s, phi);
    p.addScaledVector(n, 0.012);
    jitter(0.007);
    put(KIND.line, bustVis(s));
  }

  // Falls Ablehnungen Luecken lassen: mit Kopf-Flaeche auffuellen
  while (i < count) {
    randomDir(rnd, n);
    p.set(HC.x + R.x * n.x, HC.y + R.y * n.y, HC.z + R.z * n.z);
    headNormal();
    put(KIND.surface);
  }

  return out;
}

const _pt = [0, 0];

// Zufaelliger Punkt auf einer Polylinie, gleichmaessig nach Laenge
function polylineSampler(pts, dist) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist(pts[k - 1], pts[k]));
  const total = cum[cum.length - 1];
  return (rnd, out) => {
    const d = rnd() * total;
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid; else hi = mid; }
    const t = (d - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    out[0] = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t;
    out[1] = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t;
    return out;
  };
}

function randomDir(rnd, out) {
  const u = rnd() * 2 - 1;
  const a = rnd() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(a) * s, u, Math.sin(a) * s);
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Deterministischer Zufall (gleiches Bild bei jedem Laden)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
