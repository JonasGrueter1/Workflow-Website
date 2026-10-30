// Grundformen und Masse des Roboters (Version 2).
// Diese Datei liefert die HUELLEN (lueckenlose Flaechen ohne Fugen): Kopf, Hals, Kabel, Rumpf. Sie werden vom
// Roboter als Grundlage der Platten genutzt und von particles-shape.js gelesen (gleiche Signaturen wie V1, damit der
// Partikel-Roboter deckungsgleich bleibt). Dazu die gemeinsamen Masse: VISOR, EAR, NECK, PANELS.
// Alles wird einmal in create() gebaut (keine Arbeit pro Frame). Grundmasse kommen aus ANCHORS.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/* --------------------------------------------------------------- Masse V2 */
// Visier: Umrisse in Bogen-Einheiten (x = Bogen ab Gesichtsmitte, y = Hoehe phi). taper verjuengt zum Kinn.
// glass = Glas, frame = Aussenkante des Titanrahmens. Die LED-Matrix liegt auf ANCHORS.visor (Augenzeile).
export const VISOR = Object.freeze({
  glass: Object.freeze({ halfW: 0.74, halfH: 0.56, corner: 0.3, taper: 0.4, centerPhi: -0.14, rh: 0.84 }),
  frame: Object.freeze({ halfW: 0.775, halfH: 0.595, corner: 0.335, taper: 0.37, centerPhi: -0.14, rh: 0.84 }),
  glassOff: 0.012,   // Glas vor der Huelle
  boardOff: -0.022,  // LED-Platine hinter der Huelle (Abstand zum Glas 0.034: echte Parallaxe)
  frameTop: 0.017,   // Oberseite des Rahmens
  led: Object.freeze({ pitch: 0.0185, cols: 64, rows: 15, eyeX: 13.5, dot: 0.55 }),
});

// Ohrmodule (Sensor und Audio): Mitte auf der Huelle bei theta = +-EAR.theta, phi = EAR.phi
export const EAR = Object.freeze({
  theta: Math.PI / 2 + 0.1, phi: 0.02,
  outer: 0.21, inner: 0.17, hole: 0.235, rise: 0.045,
  lamella: Object.freeze([0.065, 0.15]), lens: 0.045, iris: 0.05, ring: 0.15,
});

// Kieferscharnier: Walze unter dem Ohr (Richtung auf der Huelle), Aussparung in den Platten
export const HINGE = Object.freeze({ theta: Math.PI / 2 + 0.06, phi: -0.37, hole: 0.08, r: 0.055 });

// Hals: Wirbel, Kolben, Kabelbuendel, Kragen (Welt, Kopf in Ruhelage). Drehpunkt des Kopfes wie V1.
export const NECK = Object.freeze({
  pivot: Object.freeze([0, -0.62, -0.08]),
  vertebra: Object.freeze({ count: 6, w: 0.36, d: 0.3, h: 0.055, n: 4 }),
  ring: Object.freeze({ r: 0.12, h: 0.03 }),
  // Kolben je Seite (x wird gespiegelt): oberes Gelenk am Kopf, unteres auf dem Kragen
  pistons: Object.freeze([
    Object.freeze({ top: [0.2, -0.8, 0.16], bot: [0.26, -1.39, 0.22] }),
    Object.freeze({ top: [0.22, -0.78, -0.32], bot: [0.3, -1.39, -0.36] }),
  ]),
  cylinder: Object.freeze({ r: 0.032, len: 0.34 }),
  rod: Object.freeze({ r: 0.016, len: 0.38 }),
  // Kabelbuendel je Seite: aus dem Kopf (unter dem Ohr) zum Kragen
  bundle: Object.freeze([[0.47, -0.58, -0.13], [0.47, -0.86, -0.12], [0.45, -1.14, -0.1], [0.42, -1.4, -0.1]]),
  collar: Object.freeze({ dy: 0.1, dz: 0.02, sx: 1.06, sz: 0.96 }),
});

// Platten (Reihenfolge = Vorrang: hoehere Platten schneiden tiefere aus). hole = Ausschnitt ohne Platte.
// mat: 0 Keramik, 1 Graphit. Die Umrisse stehen als Abstandsfunktionen in robot-parts.js (JS und GLSL).
export const PANELS = Object.freeze({
  head: Object.freeze([
    'face:hole', 'earL:hole', 'earR:hole', 'hingeL:hole', 'hingeR:hole', 'crest', 'hatch', 'forehead', 'chin',
    'back', 'jawL', 'jawR', 'sideL', 'sideR', 'under',
  ]),
  torso: Object.freeze(['core', 'strapL', 'strapR', 'armL', 'armR', 'capL', 'capR', 'chest', 'backplate', 'trapL', 'trapR', 'body']),
  gap: 0.01,
  bevel: 0.011,
});

// Kragen-Profil (r, h), wie V1
export const COLLAR_PROFILE = Object.freeze([
  [0.34, -0.07], [0.42, -0.05], [0.46, -0.018], [0.475, 0.02], [0.46, 0.05], [0.4, 0.06], [0.34, 0.05],
]);

/* ------------------------------------------------------------------ Kopf */
// Form des Kopfes: Superellipsoid (etwas eckiger in der Draufsicht, wirkt gestaltet statt eifoermig)
// plus weiche Verformungen: Kiefer verjuengt, Hinterkopf gewoelbt, Gesicht leicht flach, Kinn vor.
// Die Funktion nimmt eine beliebige Richtung (x, y, z) und liefert den Punkt der Huelle in dieser Richtung.
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
export function dirFromAngles(theta, phi, out) {
  const c = Math.cos(phi);
  out.x = Math.sin(theta) * c;
  out.y = Math.sin(phi);
  out.z = Math.cos(theta) * c;
  return out;
}

const PH_MAX = Math.PI / 2 - 2e-3;
// Punkt und Normale der Kopfhuelle bei (theta, phi), Normale ueber Differenzen. Ohne Allokation, wenn `o` gegeben ist.
export function headSample(THREE, shape, theta, phi, o = null) {
  const r = o || { p: new THREE.Vector3(), n: new THREE.Vector3(), _d: new THREE.Vector3(), _a: new THREE.Vector3(), _b: new THREE.Vector3(), _c: new THREE.Vector3() };
  if (!r._d) { r._d = new THREE.Vector3(); r._a = new THREE.Vector3(); r._b = new THREE.Vector3(); r._c = new THREE.Vector3(); }
  const d = r._d;
  const e = 1e-3;
  const ph = Math.max(-PH_MAX, Math.min(PH_MAX, phi));
  dirFromAngles(theta, ph, d);
  shape(d.x, d.y, d.z, r.p);
  dirFromAngles(theta + e, ph, d); shape(d.x, d.y, d.z, r._a);
  dirFromAngles(theta - e, ph, d); shape(d.x, d.y, d.z, r._b);
  r._a.sub(r._b);
  dirFromAngles(theta, ph + e, d); shape(d.x, d.y, d.z, r._b);
  dirFromAngles(theta, ph - e, d); shape(d.x, d.y, d.z, r._c);
  r._b.sub(r._c);
  r.n.crossVectors(r._a, r._b).normalize();
  if (r.n.dot(r.p) < 0) r.n.negate();
  if (!Number.isFinite(r.n.x)) r.n.copy(r.p).normalize();
  return r;
}

// Winkel einer Richtung
export const thetaOf = (d) => Math.atan2(d.x, d.z);
export const phiOf = (d) => Math.asin(Math.max(-1, Math.min(1, d.y)));

/**
 * Punkt auf der Huelle unter einem Punkt der Tangentialebene: c + t1 * x1 + t2 * x2, entlang n projiziert.
 * Newton in (theta, phi). So bleiben runde Teile (Ohr, Scharnier) in der Draufsicht exakt rund und folgen trotzdem
 * der Woelbung des Kopfes.
 */
export function projectToHull(THREE, shape, frame, x1, x2, out) {
  const { c, n, t1, t2 } = frame;
  const tmp = out._tmp || (out._tmp = { p: new THREE.Vector3(), n: new THREE.Vector3() });
  const q = out._q || (out._q = new THREE.Vector3());
  const d = out._dd || (out._dd = new THREE.Vector3());
  q.copy(c).addScaledVector(t1, x1).addScaledVector(t2, x2);
  d.copy(q).normalize();
  let th = Math.atan2(d.x, d.z);
  let ph = Math.asin(Math.max(-1, Math.min(1, d.y)));
  const e = 1e-4;
  const f = (a, b, res) => {
    headSample(THREE, shape, a, b, tmp);
    const vx = tmp.p.x - c.x; const vy = tmp.p.y - c.y; const vz = tmp.p.z - c.z;
    res[0] = vx * t1.x + vy * t1.y + vz * t1.z - x1;
    res[1] = vx * t2.x + vy * t2.y + vz * t2.z - x2;
    return res;
  };
  const r0 = [0, 0]; const ra = [0, 0]; const rb = [0, 0];
  for (let it = 0; it < 6; it++) {
    f(th, ph, r0);
    if (Math.abs(r0[0]) + Math.abs(r0[1]) < 1e-6) break;
    f(th + e, ph, ra);
    f(th, ph + e, rb);
    const j00 = (ra[0] - r0[0]) / e; const j10 = (ra[1] - r0[1]) / e;
    const j01 = (rb[0] - r0[0]) / e; const j11 = (rb[1] - r0[1]) / e;
    const det = j00 * j11 - j01 * j10;
    if (Math.abs(det) < 1e-9) break;
    th -= (j11 * r0[0] - j01 * r0[1]) / det;
    ph -= (-j10 * r0[0] + j00 * r0[1]) / det;
  }
  headSample(THREE, shape, th, ph, tmp);
  out.p.copy(tmp.p);
  out.n.copy(tmp.n);
  out.theta = th;
  out.phi = ph;
  out.h = (tmp.p.x - c.x) * n.x + (tmp.p.y - c.y) * n.y + (tmp.p.z - c.z) * n.z;
  return out;
}

/** Tangentialrahmen auf der Huelle bei (theta, phi): c Punkt, n Normale, t1 waagrecht (nach +theta), t2 nach oben */
export function hullFrame(THREE, shape, theta, phi) {
  const s = headSample(THREE, shape, theta, phi);
  const n = s.n.clone();
  const up = new THREE.Vector3(0, 1, 0);
  const t1 = new THREE.Vector3().crossVectors(up, n);
  if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(n, t1).normalize();
  return { c: s.p.clone(), n, t1, t2, theta, phi };
}

export function buildHead(THREE, shape, segW, segH) {
  const cols = segW + 1;
  const rows = segH + 1;
  const pos = new Float32Array(cols * rows * 3);
  const nor = new Float32Array(cols * rows * 3);
  const dir = new Float32Array(cols * rows * 3);
  const d = new THREE.Vector3();
  const s = { p: new THREE.Vector3(), n: new THREE.Vector3() };
  let k = 0;
  for (let iy = 0; iy < rows; iy++) {
    const phi = Math.PI / 2 - (iy / segH) * Math.PI;
    for (let ix = 0; ix < cols; ix++) {
      const theta = -Math.PI + (ix / segW) * Math.PI * 2;
      headSample(THREE, shape, theta, phi, s);
      dirFromAngles(theta, Math.max(-PH_MAX, Math.min(PH_MAX, phi)), d);
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
// Umriss: Rechteck mit runden Ecken, Umfangs-Parameter s 0..1 (fester Anteil je Seite, damit Ringe zueinander passen)
const OUTLINE_SEGS = [0.3, 0.075, 0.025, 0.075, 0.3, 0.075, 0.025, 0.075];
export function outlinePoint(s, A, B, r, out) {
  let acc = 0;
  for (let i = 0; i < OUTLINE_SEGS.length; i++) {
    const len = OUTLINE_SEGS[i];
    if (s <= acc + len || i === OUTLINE_SEGS.length - 1) {
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

// Schild auf dem Gesicht, der Kopfform folgend (V1, fuer Partikel und als Rueckfall). Ringe von der Mittellinie
// nach aussen, der aeusserste Ring taucht leicht in die Schale ein.
export function buildVisor(THREE, shape, o) {
  const { halfW, halfH, centerPhi, lift = 0, off, bevel, perim, rings, rh, corner, taper = 0, bandPhi = centerPhi } = o;
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
  const s = { p: new THREE.Vector3(), n: new THREE.Vector3() };
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
      outlinePoint(i / perim, A, B, rr, e2);
      const yn = e2.y / halfH;
      const wsc = 1 - taper * smoothstep(0.35, -1.0, yn);
      const xa = e2.x * wsc;
      const theta = xa / rh;
      const phi = centerPhi + e2.y + lift * (e2.x / halfW) * (e2.x / halfW);
      headSample(THREE, shape, theta, phi, s);
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
  orientOutward(THREE, g, pos, idx);
  return g;
}

// Normalen berechnen und Dreiecke so drehen, dass die Normalen vom Kopfzentrum weg zeigen
export function orientOutward(THREE, g, pos, idx, center = null) {
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  let dot = 0;
  const cx = center ? center.x : 0; const cy = center ? center.y : 0; const cz = center ? center.z : 0;
  for (let i = 0; i < nrm.count; i += 7) {
    dot += nrm.getX(i) * (pos[i * 3] - cx) + nrm.getY(i) * (pos[i * 3 + 1] - cy) + nrm.getZ(i) * (pos[i * 3 + 2] - cz);
  }
  if (dot < 0) {
    for (let i = 0; i < idx.length; i += 3) { const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------ Ohrmodule */
// V1-Form (flache Scheibe), nur noch fuer Rueckfaelle exportiert. V2 baut die Ohren in robot-parts.js.
export function buildEars(THREE, shape, seg) {
  const prof = [
    [0.0, 0.034], [0.05, 0.033], [0.1, 0.03], [0.128, 0.027], [0.134, 0.02], [0.138, 0.012],
    [0.146, 0.01], [0.152, 0.012], [0.157, 0.024], [0.163, 0.03], [0.178, 0.031], [0.19, 0.027],
    [0.198, 0.016], [0.203, 0.0], [0.205, -0.03],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const parts = [];
  for (const side of [-1, 1]) {
    const lathe = new THREE.LatheGeometry(prof, seg);
    lathe.deleteAttribute('uv');
    const s = headSample(THREE, shape, side * EAR.theta, EAR.phi);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.n);
    lathe.applyMatrix4(new THREE.Matrix4().compose(s.p.clone().addScaledVector(s.n, -0.004), q, new THREE.Vector3(1, 1, 1)));
    parts.push(lathe);
  }
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ Hals */
// Superellipse als Shape (fuer Wirbel)
export function superellipseShape(THREE, a, b, n, seg) {
  const sh = new THREE.Shape();
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  sh.closePath();
  return sh;
}

/** Ruhelage der Wirbel: [{ y, z }] von oben nach unten */
export function vertebraLayout(A) {
  const top = A.neck.top;
  const bot = A.neck.bottom;
  const out = [];
  const n = NECK.vertebra.count;
  const y0 = top.y - 0.09;
  const y1 = bot.y + 0.165;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push({ y: y0 + (y1 - y0) * t, z: top.z + (bot.z - top.z) * (0.15 + 0.7 * t) - 0.01 });
  }
  return out;
}

/** Ein Wirbel (Superellipse, gefaste Kanten), Mitte im Ursprung, Hoehe entlang Y */
export function buildVertebraGeometry(THREE, seg) {
  const V = NECK.vertebra;
  const bev = 0.009;
  const sh = superellipseShape(THREE, V.w / 2 - bev, V.d / 2 - bev, V.n, seg);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: V.h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1,
  });
  g.translate(0, 0, -(V.h - 2 * bev) / 2);
  g.rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

// Huelle des Halses fuer die Partikel: Wirbel, Gummiringe, Kragen (Ruhelage)
export function buildNeckMetal(THREE, A, seg) {
  const bot = A.neck.bottom;
  const parts = [];
  const vseg = Math.max(16, Math.round(seg * 0.75));
  const layout = vertebraLayout(A);
  layout.forEach((L, i) => {
    const v = buildVertebraGeometry(THREE, vseg);
    v.translate(0, L.y, L.z);
    parts.push(v);
    if (i < layout.length - 1) {
      const nx = layout[i + 1];
      const r = new THREE.CylinderGeometry(NECK.ring.r, NECK.ring.r, Math.abs(nx.y - L.y), Math.max(12, seg >> 1), 1, true);
      r.translate(0, (L.y + nx.y) / 2, (L.z + nx.z) / 2);
      r.deleteAttribute('uv');
      parts.push(r);
    }
  });
  const collar = new THREE.LatheGeometry(COLLAR_PROFILE.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  collar.scale(NECK.collar.sx, 1, NECK.collar.sz);
  collar.translate(0, bot.y + NECK.collar.dy, bot.z + NECK.collar.dz);
  collar.deleteAttribute('uv');
  parts.push(collar);
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

/** Kolben je Seite (gespiegelt): [{ top, bot }] als Vector3, Ruhelage */
export function pistonDefs(THREE) {
  const out = [];
  for (const s of [-1, 1]) {
    for (const P of NECK.pistons) {
      out.push({
        side: s,
        top: new THREE.Vector3(P.top[0] * s, P.top[1], P.top[2]),
        bot: new THREE.Vector3(P.bot[0] * s, P.bot[1], P.bot[2]),
      });
    }
  }
  return out;
}

/** Kabel der Buendel: je Seite 5 Kabel als Kurvenpunkte, Radius, Puls (1 = Datenleitung mit Lichtimpulsen) */
export function cableDefs(THREE) {
  const defs = [];
  const offs = [[0, 0], [0.032, 0.018], [-0.03, 0.02], [0.022, -0.028], [-0.024, -0.026]];
  const radii = [0.02, 0.014, 0.016, 0.012, 0.015];
  for (const s of [-1, 1]) {
    offs.forEach(([ox, oz], k) => {
      const pts = NECK.bundle.map(([x, y, z], i) => {
        // leicht verdrillt: der Versatz dreht entlang des Buendels
        const a = i * 0.55 * s;
        const c = Math.cos(a); const sn = Math.sin(a);
        const dx = ox * c - oz * sn;
        const dz = ox * sn + oz * c;
        return new THREE.Vector3((x + dx) * s, y, z + dz);
      });
      defs.push({ pts, r: radii[k], pulse: k === 1 || k === 3 ? 1 : 0, side: s });
    });
  }
  // Rueckenmark: Kabelbuendel durch die Wirbel, oben im Kopf sichtbar (Roentgen)
  defs.push({
    pts: [new THREE.Vector3(0, -0.5, -0.08), new THREE.Vector3(0, -0.8, -0.07), new THREE.Vector3(0, -1.15, -0.08), new THREE.Vector3(0, -1.5, -0.1)],
    r: 0.05, pulse: 1, side: 0, spine: true,
  });
  return defs;
}

// Huelle der Halsmechanik fuer die Partikel (Kolben und Kabel als Rohre), Attribute aT (0..1) und aPulse wie V1
export function buildTendons(THREE, A, tubular, radial) {
  const defs = [];
  for (const P of pistonDefs(THREE)) {
    const mid = P.top.clone().lerp(P.bot, 0.5);
    defs.push([[P.top, mid, P.bot], NECK.cylinder.r, 0]);
  }
  for (const C of cableDefs(THREE)) if (!C.spine) defs.push([C.pts, C.r, C.pulse]);
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
