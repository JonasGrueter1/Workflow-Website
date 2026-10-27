// Prozedurale Geometrie fuer die Szene "robot": Kopf, Visier, Ohrmodule, Hals, Schultern.
// Alles wird einmal in create() gebaut (keine Arbeit pro Frame). Masse kommen aus ANCHORS.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ Kopf */
// Form des Kopfes: Superellipsoid (etwas eckiger in der Draufsicht, wirkt gestaltet statt eiförmig)
// plus weiche Verformungen: Kiefer verjuengt, Hinterkopf gewoelbt, Gesicht leicht flach, Kinn vor.
export function makeHeadShape(radii) {
  const rx = radii.x;
  const ry = radii.y;
  const rz = radii.z;
  const n = 2.7;
  return function shape(x, y, z, out) {
    const ax = Math.pow(Math.abs(x / rx), n);
    const az = Math.pow(Math.abs(z / rz), n);
    // unten eckiger (Kiefer), oben rund (Schaedel)
    const m = 2 + 0.75 * smoothstep(0.05, -0.6, y);
    const t = Math.pow(Math.pow(ax + az, m / n) + Math.pow(Math.abs(y / ry), m), -1 / m);
    let X = x * t;
    let Y = y * t;
    let Z = z * t;
    const yn = Y / ry;
    const front = smoothstep(-0.15, 0.95, z);
    const back = smoothstep(0.15, -0.95, z);
    const jaw = smoothstep(-0.12, -0.96, yn);
    const crown = smoothstep(0.3, 1.0, yn);
    const temple = smoothstep(-0.15, 0.25, yn) * (1 - crown);
    // Breite: Kiefer schmaler, Schlaefen minimal voller, Scheitel etwas schmaler
    X *= 1 - 0.15 * jaw - 0.07 * crown + 0.02 * temple;
    // Tiefe: Hinterkopf gewoelbt, unten hinten zum Hals eingezogen, Gesicht etwas flacher
    const skull = back * smoothstep(-0.4, 0.4, yn);
    Z *= 1 + 0.06 * skull - 0.3 * jaw * back - 0.05 * jaw * front - 0.03 * front * (1 - jaw) * (1 - crown);
    Z += 0.02 * jaw * front;
    // Scheitel flacher, Kinn minimal tiefer
    Y *= 1 - 0.03 * crown;
    Y -= 0.02 * jaw * front;
    out.x = X;
    out.y = Y;
    out.z = Z;
    return out;
  };
}

// Richtung aus Winkeln: theta 0 = vorne (+Z), positiv nach +X. phi = Hoehe (-pi/2 .. pi/2)
function dirFromAngles(theta, phi, out) {
  const c = Math.cos(phi);
  out.x = Math.sin(theta) * c;
  out.y = Math.sin(phi);
  out.z = Math.cos(theta) * c;
  return out;
}

// Punkt und Normale der Kopfoberflaeche bei (theta, phi), Normale ueber Differenzen
function headSample(THREE, shape, theta, phi) {
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = 1e-3;
  const ph = Math.max(-Math.PI / 2 + 2e-3, Math.min(Math.PI / 2 - 2e-3, phi));
  shape(...dirFromAngles(theta, ph, d).toArray(), p);
  const a = shape(...dirFromAngles(theta + e, ph, d).toArray(), new THREE.Vector3());
  const b = shape(...dirFromAngles(theta - e, ph, d).toArray(), new THREE.Vector3());
  const c = shape(...dirFromAngles(theta, ph + e, d).toArray(), new THREE.Vector3());
  const f = shape(...dirFromAngles(theta, ph - e, d).toArray(), new THREE.Vector3());
  const tT = a.sub(b);
  const tP = c.sub(f);
  const nrm = new THREE.Vector3().crossVectors(tT, tP).normalize();
  if (nrm.dot(p) < 0) nrm.negate();
  if (!Number.isFinite(nrm.x)) nrm.copy(p).normalize();
  return { p, n: nrm };
}

export function buildHead(THREE, shape, segW, segH) {
  const cols = segW + 1;
  const rows = segH + 1;
  const pos = new Float32Array(cols * rows * 3);
  const nor = new Float32Array(cols * rows * 3);
  const dir = new Float32Array(cols * rows * 3);
  const d = new THREE.Vector3();
  let k = 0;
  for (let iy = 0; iy < rows; iy++) {
    const phi = Math.PI / 2 - (iy / segH) * Math.PI;
    for (let ix = 0; ix < cols; ix++) {
      const theta = -Math.PI + (ix / segW) * Math.PI * 2;
      const s = headSample(THREE, shape, theta, phi);
      dirFromAngles(theta, Math.max(-Math.PI / 2 + 2e-3, Math.min(Math.PI / 2 - 2e-3, phi)), d);
      pos[k] = s.p.x; pos[k + 1] = s.p.y; pos[k + 2] = s.p.z;
      nor[k] = s.n.x; nor[k + 1] = s.n.y; nor[k + 2] = s.n.z;
      dir[k] = d.x; dir[k + 1] = d.y; dir[k + 2] = d.z;
      k += 3;
    }
  }
  const idx = [];
  for (let iy = 0; iy < segH; iy++) {
    for (let ix = 0; ix < segW; ix++) {
      const a = iy * cols + ix;
      const b = a + cols;
      if (iy !== 0) idx.push(a, b, a + 1);
      if (iy !== segH - 1) idx.push(a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  g.computeBoundingSphere();
  return g;
}

/* ---------------------------------------------------------------- Visier */
// Schild auf dem Gesicht, der Kopfform folgend. Ringe von der Mittellinie nach aussen (Inset),
// der aeusserste Ring taucht leicht in die Schale ein (keine Spalte bei flachem Blick).
// halfW/halfH/corner in Bogen-Einheiten, taper: Verjuengung zum Kinn, lift: Enden heben sich,
// off: Abstand zur Schale, bandPhi: Hoehe des Lichtbands (aUv.y = 0 dort).
export function buildVisor(THREE, shape, o) {
  const { halfW, halfH, centerPhi, lift = 0, off, bevel, perim, rings, rh, corner, taper = 0, bandPhi = centerPhi } = o;
  const segs = [0.3, 0.075, 0.025, 0.075, 0.3, 0.075, 0.025, 0.075];
  function edge(s, A, B, r, out) {
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      const len = segs[i];
      if (s <= acc + len || i === segs.length - 1) {
        const f = clamp01((s - acc) / len);
        const ax = A - r;
        const by = B - r;
        switch (i) {
          case 0: out.x = -ax + 2 * ax * f; out.y = B; break;
          case 1: { const a = Math.PI / 2 - f * Math.PI / 2; out.x = ax + Math.cos(a) * r; out.y = by + Math.sin(a) * r; break; }
          case 2: out.x = A; out.y = by - 2 * by * f; break;
          case 3: { const a = -f * Math.PI / 2; out.x = ax + Math.cos(a) * r; out.y = -by + Math.sin(a) * r; break; }
          case 4: out.x = ax - 2 * ax * f; out.y = -B; break;
          case 5: { const a = -Math.PI / 2 - f * Math.PI / 2; out.x = -ax + Math.cos(a) * r; out.y = -by + Math.sin(a) * r; break; }
          case 6: out.x = -A; out.y = -by + 2 * by * f; break;
          default: { const a = Math.PI - f * Math.PI / 2; out.x = -ax + Math.cos(a) * r; out.y = by + Math.sin(a) * r; }
        }
        return out;
      }
      acc += len;
    }
    return out;
  }
  const minHalf = Math.min(halfW, halfH);
  const ts = [];
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    ts.push(1 - (1 - u) * (1 - u) * (1 - u));
  }
  ts.push(1.0001);
  const nR = ts.length;
  const pos = new Float32Array(nR * perim * 3);
  const uv = new Float32Array(nR * perim * 2);
  const ring = new Float32Array(nR * perim);
  const e2 = { x: 0, y: 0 };
  let k = 0;
  for (let r = 0; r < nR; r++) {
    const t = ts[r];
    const inset = (1 - Math.min(1, t)) * minHalf;
    const A = Math.max(1e-4, halfW - inset);
    const B = Math.max(1e-4, halfH - inset);
    const rr = Math.max(1e-4, Math.min(A, B, corner - inset));
    let h = off * Math.sqrt(clamp01(inset / bevel) * (2 - clamp01(inset / bevel)));
    if (t > 1) h = -0.006;
    for (let i = 0; i < perim; i++) {
      edge(i / perim, A, B, rr, e2);
      const yn = e2.y / halfH; // -1 unten .. 1 oben
      const wsc = 1 - taper * smoothstep(0.35, -1.0, yn);
      const xa = e2.x * wsc;
      const theta = xa / rh;
      const phi = centerPhi + e2.y + lift * (e2.x / halfW) * (e2.x / halfW);
      const s = headSample(THREE, shape, theta, phi);
      pos[k * 3] = s.p.x + s.n.x * h;
      pos[k * 3 + 1] = s.p.y + s.n.y * h;
      pos[k * 3 + 2] = s.p.z + s.n.z * h;
      uv[k * 2] = xa;
      uv[k * 2 + 1] = phi - bandPhi;
      ring[k] = Math.min(1, t);
      k++;
    }
  }
  const idx = [];
  for (let r = 0; r < nR - 1; r++) {
    for (let i = 0; i < perim; i++) {
      const a = r * perim + i;
      const b = r * perim + ((i + 1) % perim);
      const c = (r + 1) * perim + i;
      const e = (r + 1) * perim + ((i + 1) % perim);
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aRing', new THREE.BufferAttribute(ring, 1));
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  let dot = 0;
  for (let i = 0; i < nrm.count; i += 7) dot += nrm.getX(i) * pos[i * 3] + nrm.getY(i) * pos[i * 3 + 1] + nrm.getZ(i) * pos[i * 3 + 2];
  if (dot < 0) {
    for (let i = 0; i < idx.length; i += 3) { const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------ Ohrmodule */
// Flache Scheibe mit Ringkanal (leuchtet im Shader), sitzt buendig auf der Seite des Kopfes.
export function buildEars(THREE, shape, seg) {
  const prof = [
    [0.0, 0.034], [0.05, 0.033], [0.1, 0.03], [0.128, 0.027], [0.134, 0.02], [0.138, 0.012],
    [0.146, 0.01], [0.152, 0.012], [0.157, 0.024], [0.163, 0.03], [0.178, 0.031], [0.19, 0.027],
    [0.198, 0.016], [0.203, 0.0], [0.205, -0.03],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const parts = [];
  for (const side of [-1, 1]) {
    const lathe = new THREE.LatheGeometry(prof, seg);
    const n = lathe.getAttribute('position').count;
    const rad = new Float32Array(n);
    const lp = lathe.getAttribute('position');
    for (let i = 0; i < n; i++) rad[i] = Math.hypot(lp.getX(i), lp.getZ(i));
    lathe.setAttribute('aRad', new THREE.BufferAttribute(rad, 1));
    lathe.deleteAttribute('uv');
    const theta = side * (Math.PI / 2 + 0.1);
    const s = headSample(THREE, shape, theta, 0.02);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.n);
    const m = new THREE.Matrix4().compose(s.p.clone().addScaledVector(s.n, -0.004), q, new THREE.Vector3(1, 1, 1));
    lathe.applyMatrix4(m);
    parts.push(lathe);
  }
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ Hals */
// Metallteile: Wirbelsaeule, Wirbelringe, Kragenring. Sehnen: Rohre entlang Kurven.
export function buildNeckMetal(THREE, A, seg) {
  const top = A.neck.top;
  const bot = A.neck.bottom;
  const parts = [];
  // Wirbelsaeule
  const spineProf = [];
  const ys = [-0.6, -0.68, -1.2, -1.66, -1.72];
  const rs = [0.0, 0.22, 0.2, 0.23, 0.0];
  for (let i = 0; i < ys.length; i++) spineProf.push(new THREE.Vector2(rs[i] + (i === 0 || i === ys.length - 1 ? 0.001 : 0), ys[i]));
  const spine = new THREE.LatheGeometry(spineProf, seg);
  spine.translate(0, 0, (top.z + bot.z) / 2);
  parts.push(spine);
  // Wirbelringe: abgerundete Scheiben
  const ringProf = [
    [0.18, -0.034], [0.27, -0.034], [0.3, -0.025], [0.313, 0.0], [0.3, 0.025], [0.27, 0.034], [0.18, 0.034],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = THREE.MathUtils.lerp(top.y - 0.14, bot.y + 0.12, t);
    const z = THREE.MathUtils.lerp(top.z, bot.z, t);
    const s = 1 - 0.06 * Math.sin(t * Math.PI);
    const r = new THREE.LatheGeometry(ringProf, seg);
    r.scale(s, 1, s);
    r.translate(0, y, z);
    parts.push(r);
  }
  // Kragen: Ring, in dem der Hals in den Rumpf steckt
  const collarProf = [
    [0.34, -0.07], [0.42, -0.05], [0.46, -0.018], [0.475, 0.02], [0.46, 0.05], [0.4, 0.06], [0.34, 0.05],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const collar = new THREE.LatheGeometry(collarProf, seg);
  collar.scale(1.06, 1, 0.96);
  collar.translate(0, bot.y + 0.1, bot.z + 0.02);
  parts.push(collar);
  parts.forEach((p) => p.deleteAttribute('uv'));
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

export function buildTendons(THREE, A, tubular, radial) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const top = A.neck.top;
  const bot = A.neck.bottom;
  // [Kurvenpunkte, Radius, Puls (Datenleitung)]
  const defs = [];
  for (const s of [-1, 1]) {
    // grosse diagonale Sehne (wie der Kopfwender-Muskel): hinter dem Ohr zum Kragen vorne
    defs.push([[V(0.38 * s, -0.58, -0.26), V(0.375 * s, -0.95, -0.1), V(0.3 * s, -1.25, 0.11), V(0.21 * s, bot.y + 0.1, 0.29)], 0.07, 0]);
    // hintere Sehne
    defs.push([[V(0.21 * s, -0.62, -0.4), V(0.27 * s, -1.0, -0.38), V(0.33 * s, -1.3, -0.38), V(0.41 * s, bot.y + 0.08, -0.4)], 0.058, 0]);
    // seitliches Kabel
    defs.push([[V(0.34 * s, -0.64, -0.04), V(0.36 * s, -1.05, -0.07), V(0.385 * s, -1.3, -0.09), V(0.45 * s, bot.y + 0.1, -0.1)], 0.032, 1]);
    // vordere Datenleitungen
    defs.push([[V(0.075 * s, -0.7, 0.13), V(0.085 * s, -1.0, 0.22), V(0.095 * s, -1.28, 0.25), V(0.11 * s, bot.y + 0.1, 0.3)], 0.022, 1]);
    defs.push([[V(0.17 * s, -0.68, 0.09), V(0.19 * s, -1.0, 0.17), V(0.21 * s, -1.28, 0.2), V(0.25 * s, bot.y + 0.1, 0.25)], 0.02, 1]);
  }
  const parts = [];
  defs.forEach(([pts, r, pulse], i) => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.TubeGeometry(curve, tubular, r, radial, false);
    const n = tube.getAttribute('position').count;
    const uv = tube.getAttribute('uv');
    const at = new Float32Array(n);
    const ap = new Float32Array(n * 2);
    for (let k = 0; k < n; k++) {
      at[k] = uv.getX(k);
      ap[k * 2] = pulse;
      ap[k * 2 + 1] = (i * 0.618) % 1;
    }
    tube.setAttribute('aT', new THREE.BufferAttribute(at, 1));
    tube.setAttribute('aPulse', new THREE.BufferAttribute(ap, 2));
    tube.deleteAttribute('uv');
    parts.push(tube);
  });
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------ Schultern */
// Rumpf als Profil-Sweep: Querschnitt Superellipse, Profil von der Halsoeffnung bis unter den Bildrand.
export function buildTorso(THREE, A, segU, segV) {
  const bot = A.neck.bottom;
  const half = A.bust.shoulderWidth / 2;
  const bottomY = A.bust.bottomY;
  const cz = A.bust.center.z;
  // [halbe Breite, y, halbe Tiefe, Mitte z, Exponent]
  const prof = [
    [0.47, bot.y + 0.13, 0.42, bot.z + 0.02, 2.0],
    [0.6, bot.y + 0.08, 0.5, bot.z, 2.05],
    [0.95, bot.y - 0.04, 0.55, bot.z - 0.02, 2.1],
    [1.36, bot.y - 0.22, 0.58, cz, 2.2],
    [1.7, bot.y - 0.42, 0.6, cz, 2.25],
    [0.915 * half, bot.y - 0.66, 0.62, cz, 2.3],
    [0.96 * half, bot.y - 0.96, 0.68, cz, 2.35],
    [0.95 * half, bot.y - 1.32, 0.74, cz, 2.35],
    [0.92 * half, bottomY - 0.1, 0.78, cz, 2.35],
    [0.9 * half, bottomY - 0.5, 0.78, cz, 2.35],
  ];
  const cW = new THREE.CatmullRomCurve3(prof.map((p) => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal');
  const lens = cW.getLengths(400);
  const total = lens[lens.length - 1];
  // Parameter je Profilpunkt (Bogenlaenge) fuer die Interpolation von Tiefe, Mitte, Exponent
  const knots = [];
  const pts = cW.points;
  {
    let acc = 0;
    knots.push(0);
    for (let i = 1; i < pts.length; i++) { acc += pts[i].distanceTo(pts[i - 1]); knots.push(acc); }
    for (let i = 0; i < knots.length; i++) knots[i] /= acc;
  }
  const interp = (col, u) => {
    let i = 0;
    while (i < knots.length - 2 && u > knots[i + 1]) i++;
    const f = smoothstep(0, 1, clamp01((u - knots[i]) / (knots[i + 1] - knots[i])));
    return prof[i][col] + (prof[i + 1][col] - prof[i][col]) * f;
  };
  const cols = segU;
  const rows = segV + 1;
  const pos = new Float32Array(cols * rows * 3);
  const par = new Float32Array(cols * rows * 2);
  const tmp = new THREE.Vector3();
  let k = 0;
  for (let j = 0; j < rows; j++) {
    const v = j / segV;
    cW.getPointAt(v, tmp);
    const w = tmp.x;
    const y = tmp.y;
    const d = interp(2, v);
    const zc = interp(3, v);
    const n = interp(4, v);
    for (let i = 0; i < cols; i++) {
      const a = -Math.PI + (i / cols) * Math.PI * 2; // 0 = vorne
      const s = Math.sin(a);
      const c = Math.cos(a);
      const x = w * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      const z = d * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      // Brust vorne etwas voller, Ruecken flacher
      const chest = smoothstep(0.15, 0.6, v) * Math.max(0, c) * 0.06;
      pos[k * 3] = x;
      pos[k * 3 + 1] = y + 0.04 * Math.max(0, -c) * smoothstep(0.0, 0.3, v);
      pos[k * 3 + 2] = z + zc + chest;
      par[k * 2] = a;
      par[k * 2 + 1] = v * total;
      k++;
    }
  }
  const idx = [];
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * cols + i;
      const b = j * cols + ((i + 1) % cols);
      const c = a + cols;
      const e = b + cols;
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aParam', new THREE.BufferAttribute(par, 2));
  g.computeVertexNormals();
  // nach aussen?
  const nrm = g.getAttribute('normal');
  const mid = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
  if (nrm.getZ(mid) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------- Zufall */
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
