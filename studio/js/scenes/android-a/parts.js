// Geometrie von android-a: Flaechen aus der Radial-Karte (Glasschale, innere Schale), Kante am Schnitt,
// Mechanik (Ohrmodule, Halswirbel, Streben). Alles im Objektraum der Ruhepose.
import { RC, dirAB, cutField, mulberry32 } from './shape.js';

/* ------------------------------------------------------------------ Flaeche aus der Radial-Karte */
/**
 * Gitter ueber (a, b), Radius = Karte + off. keep(p) entscheidet je Viereck (Mittelpunkt), ob es gebraucht wird.
 * aUV = (a, b) * Radius (fast laengentreu, fuer Muster).
 */
export function buildRadialSurface(THREE, rmap, o) {
  const { off = 0, na = 160, nb = 80, a0 = 0, a1 = Math.PI * 2, b0 = -1.45, b1 = 1.45, keep = () => true, Ruv = 0.85 } = o;
  const pos = []; const uv = [];
  const d = { x: 0, y: 0, z: 0 };
  const P = (a, b) => {
    dirAB(a, b, d);
    const r = rmap.sample(a, b) + off;
    return [RC[0] + d.x * r, RC[1] + d.y * r, RC[2] + d.z * r];
  };
  for (let j = 0; j <= nb; j++) {
    const b = b0 + ((b1 - b0) * j) / nb;
    for (let i = 0; i <= na; i++) {
      const a = a0 + ((a1 - a0) * i) / na;
      pos.push(...P(a, b));
      uv.push(a * Ruv, b * Ruv);
    }
  }
  const idx = [];
  const W = na + 1;
  for (let j = 0; j < nb; j++) {
    for (let i = 0; i < na; i++) {
      const k = j * W + i;
      const cx = (pos[k * 3] + pos[(k + W + 1) * 3]) / 2;
      const cy = (pos[k * 3 + 1] + pos[(k + W + 1) * 3 + 1]) / 2;
      const cz = (pos[k * 3 + 2] + pos[(k + W + 1) * 3 + 2]) / 2;
      if (!keep(cx, cy, cz)) continue;
      // Orientierung: Normale nach aussen
      idx.push(k, k + 1, k + W + 1, k, k + W + 1, k + W);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Normalen nach aussen ausrichten (vom Zentrum weg)
  const n = g.attributes.normal; const p = g.attributes.position;
  let flip = 0; let cnt = 0;
  for (let i = 0; i < p.count; i += 7) {
    const dx = p.getX(i) - RC[0]; const dy = p.getY(i) - RC[1]; const dz = p.getZ(i) - RC[2];
    const s = dx * n.getX(i) + dy * n.getY(i) + dz * n.getZ(i);
    if (s !== 0) { flip += s < 0 ? 1 : 0; cnt++; }
  }
  if (flip > cnt / 2) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/* ------------------------------------------------------------------ Kante am Schnitt */
/** Iso-Linie cutField = 0 auf dem Netz, als Band von der Oberflaeche nach innen (Materialstaerke). */
export function buildRibbon(THREE, pos, index, nor, th = 0.03, ao = null) {
  const out = []; const rib = []; const nrm = [];
  const f = new Float32Array(pos.length / 3);
  for (let i = 0; i < f.length; i++) f[i] = cutField(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const lerpV = (a, b, t, arr) => [0, 1, 2].map((c) => arr[a * 3 + c] + (arr[b * 3 + c] - arr[a * 3 + c]) * t);
  for (let t = 0; t < index.length; t += 3) {
    const v = [index[t], index[t + 1], index[t + 2]];
    // innere Flaechen (Mund, Nase, Augenhoehlen) auslassen: dort ist die AO klein
    if (ao && ao[v[0]] + ao[v[1]] + ao[v[2]] < 0.3) continue;
    const pts = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e]; const b = v[(e + 1) % 3];
      if ((f[a] > 0) !== (f[b] > 0)) {
        const s = f[a] / (f[a] - f[b]);
        const p = lerpV(a, b, s, pos);
        const n = lerpV(a, b, s, nor);
        const l = Math.hypot(n[0], n[1], n[2]) || 1;
        pts.push({ p, n: [n[0] / l, n[1] / l, n[2] / l] });
      }
    }
    if (pts.length !== 2) continue;
    const [A, B] = pts;
    const Ai = [A.p[0] - A.n[0] * th, A.p[1] - A.n[1] * th, A.p[2] - A.n[2] * th];
    const Bi = [B.p[0] - B.n[0] * th, B.p[1] - B.n[1] * th, B.p[2] - B.n[2] * th];
    // Normale des Bandes: Richtung zur offenen Seite (Gradient von f, numerisch)
    const mx = (A.p[0] + B.p[0]) / 2; const my = (A.p[1] + B.p[1]) / 2; const mz = (A.p[2] + B.p[2]) / 2;
    const e = 0.004;
    let gx = cutField(mx + e, my, mz) - cutField(mx - e, my, mz);
    let gy = cutField(mx, my + e, mz) - cutField(mx, my - e, mz);
    let gz = cutField(mx, my, mz + e) - cutField(mx, my, mz - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl; gy /= gl; gz /= gl;
    out.push(...A.p, ...B.p, ...Bi, ...A.p, ...Bi, ...Ai);
    rib.push(0, 0, 1, 0, 1, 1);
    for (let k = 0; k < 6; k++) nrm.push(gx, gy, gz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aRib', new THREE.Float32BufferAttribute(rib, 1));
  return g;
}

/* ------------------------------------------------------------------ Mechanik-Sammler */
export class Parts {
  constructor(THREE) {
    this.T = THREE;
    this.pos = []; this.nor = []; this.col = []; this.pbr = [];
    this.m3 = new THREE.Matrix3();
    this.v = new THREE.Vector3();
  }
  /** Geometrie mit Matrix und Material { c: Color, m, r, e } uebernehmen */
  add(g, mat4, M) {
    const src = g.index ? g.toNonIndexed() : g;
    if (!src.attributes.normal) src.computeVertexNormals();
    const P = src.attributes.position; const N = src.attributes.normal;
    this.m3.getNormalMatrix(mat4);
    for (let i = 0; i < P.count; i++) {
      this.v.fromBufferAttribute(P, i).applyMatrix4(mat4);
      this.pos.push(this.v.x, this.v.y, this.v.z);
      this.v.fromBufferAttribute(N, i).applyMatrix3(this.m3).normalize();
      this.nor.push(this.v.x, this.v.y, this.v.z);
      this.col.push(M.c.r, M.c.g, M.c.b);
      this.pbr.push(M.m, M.r, M.x ? -1 : (M.e || 0));
    }
    if (src !== g) src.dispose();
    g.dispose();
  }
  geometry() {
    const T = this.T;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPbr', new T.Float32BufferAttribute(this.pbr, 3));
    return g;
  }
}

/** Matrix: Position p, lokale Y-Achse nach dir */
function frame(THREE, p, dir, spin = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
}

export function materialsKit(THREE) {
  const C = (h) => new THREE.Color(h);
  return {
    TI: { c: C(0x8e969e), m: 0.92, r: 0.3 },
    TID: { c: C(0x4c545c), m: 0.9, r: 0.38 },
    GR: { c: C(0x1b2129), m: 0.5, r: 0.48 },
    RB: { c: C(0x0b0d10), m: 0, r: 0.7 },
    CHROME: { c: C(0xc8d0d8), m: 1, r: 0.12 },
    CER: { c: C(0xcfd6dc), m: 0, r: 0.35 },
    GLOW: { c: C(0x0a0f14), m: 0, r: 0.5, e: 1 },
    GLOWS: { c: C(0x0a0f14), m: 0, r: 0.5, e: 0.45 },
  };
}

/* ------------------------------------------------------------------ Hilfen */
// x: im Roentgen-Modus oberhalb der Scan-Linie ausblenden (Kamm, Module, Spangen verdecken sonst das Gehirn)
const X = (m) => ({ ...m, x: true });
function skullPt(THREE, rmap, a, b, off) {
  const d = { x: 0, y: 0, z: 0 };
  dirAB(a, b, d);
  const r = rmap.sample(a, b) + off;
  return new THREE.Vector3(RC[0] + d.x * r, RC[1] + d.y * r, RC[2] + d.z * r);
}
/** Profil (2D, x quer, y radial) entlang Punkten mit Rahmen (t, n, s) extrudieren. Rahmen: n = "oben", s = seitlich. */
function sweep(THREE, P, pts, ups, profile, mat, closed = true) {
  const pos = []; const idx = [];
  const np = profile.length;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const t = (i < pts.length - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])).normalize();
    const n = ups[i].clone().addScaledVector(t, -ups[i].dot(t)).normalize();
    const s = new THREE.Vector3().crossVectors(t, n).normalize();
    for (const [x, y] of profile) pos.push(p.x + s.x * x + n.x * y, p.y + s.y * x + n.y * y, p.z + s.z * x + n.z * y);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < (closed ? np : np - 1); k++) {
      const a = i * np + k; const b = i * np + ((k + 1) % np); const c = a + np; const d = b + np;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Deckel
  for (const i of [0, pts.length - 1]) {
    const base = i * np;
    for (let k = 1; k < np - 1; k++) idx.push(base, base + k + (i ? 1 : 0), base + k + (i ? 0 : 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  P.add(ng, new THREE.Matrix4(), mat);
}
/** Rechteck mit Fasen (b) als Profil, Breite w, Hoehe h, Unterkante bei y0 */
function chamferRect(w, h, b, y0 = 0) {
  const x = w / 2;
  return [[-x, y0], [x, y0], [x, y0 + h - b], [x - b, y0 + h], [-x + b, y0 + h], [-x, y0 + h - b]];
}

/* ------------------------------------------------------------------ Servo hinter dem Ohr (Kiefergelenk, buendig) */
// Kleines, buendig eingelassenes Gelenk aus Titan mit Fase, Nabe und Schrauben. Kein Leuchtring.
// Dazu ein Kolben vom Servo schraeg zur Halsbasis (wie der Kopfwender-Muskel).
export function buildServo(THREE, P, c, side, q = 1) {
  const M = materialsKit(THREE);
  const n = new THREE.Vector3(side, 0.02, -0.06).normalize();
  const S = (k) => Math.max(12, Math.round(k * q));
  const lathe = (pts, mat, seg = 56, off = 0) => {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), S(seg));
    P.add(g, frame(THREE, c.clone().addScaledVector(n, off), n), mat);
  };
  // Schlaefenplatte (deckt den Pol der Radial-Karte): flach, gefast, mit Schraubenkranz
  lathe([[0.0, -0.075], [0.235, -0.075], [0.25, -0.06], [0.25, -0.046], [0.236, -0.036], [0.15, -0.036]], M.TI, 64);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.15;
    const g = new THREE.CylinderGeometry(0.0075, 0.0075, 0.008, 10);
    g.translate(Math.cos(a) * 0.205, -0.034, Math.sin(a) * 0.205);
    P.add(g, frame(THREE, c, n), M.CHROME);
  }
  lathe([[0.0, -0.06], [0.128, -0.06], [0.138, -0.045], [0.138, -0.004], [0.13, 0.004], [0.118, 0.006]], M.TID);
  lathe([[0.118, 0.006], [0.114, 0.013], [0.1, 0.015], [0.088, 0.01]], M.TI);
  lathe([[0.088, 0.01], [0.086, -0.004], [0.0, -0.004]], M.GR);
  // Nabe: zwei Stufen, polierter Deckel
  lathe([[0.0, 0.022], [0.042, 0.022], [0.05, 0.015], [0.05, -0.004]], M.TI, 40);
  lathe([[0.0, 0.029], [0.022, 0.028], [0.03, 0.022]], M.CHROME, 32);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const g = new THREE.CylinderGeometry(0.0065, 0.0065, 0.006, 10);
    g.translate(Math.cos(a) * 0.107, 0.015, Math.sin(a) * 0.107);
    P.add(g, frame(THREE, c, n), M.CHROME);
  }
  // Kolben: Zylinder (Titan) + Stange (Chrom), Augen an beiden Enden
  const A = c.clone().addScaledVector(n, -0.02).add(new THREE.Vector3(-side * 0.04, -0.1, -0.06));
  const B = new THREE.Vector3(side * 0.3, -1.3, -0.36);
  const dir = B.clone().sub(A);
  const L = dir.length(); dir.normalize();
  const cyl = (r0, r1, len, at, mat, seg = 20) => {
    const g = new THREE.CylinderGeometry(r1, r0, len, S(seg));
    g.translate(0, len / 2, 0);
    P.add(g, frame(THREE, at, dir), mat);
  };
  cyl(0.024, 0.024, L * 0.52, A.clone().addScaledVector(dir, 0.03), M.TI);
  cyl(0.027, 0.027, 0.02, A.clone().addScaledVector(dir, 0.03), M.TID);
  cyl(0.027, 0.027, 0.02, A.clone().addScaledVector(dir, 0.03 + L * 0.52 - 0.02), M.TID);
  cyl(0.012, 0.012, L * 0.46, A.clone().addScaledVector(dir, 0.03 + L * 0.52), M.CHROME, 16);
  for (const [at, r] of [[A, 0.03], [B, 0.026]]) {
    const ring = new THREE.TorusGeometry(r, 0.008, S(8), S(20));
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), new THREE.Vector3(side, 0, 0), new THREE.Vector3(0, 1, 0)).setPosition(at);
    P.add(ring, m, M.TID);
  }
  return n;
}

/* ------------------------------------------------------------------ Halswirbel bis in die Schaedelbasis */
export function buildSpine(THREE, P, q = 1) {
  const M = materialsKit(THREE);
  const S = (k) => Math.max(10, Math.round(k * q));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.42, -0.34), new THREE.Vector3(0, -0.8, -0.37), new THREE.Vector3(0, -1.15, -0.38),
    new THREE.Vector3(0, -1.45, -0.45), new THREE.Vector3(0, -1.7, -0.56),
  ]);
  const N = 9;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const p = curve.getPointAt(t);
    const tg = curve.getTangentAt(t).negate();
    const sc = 0.9 + 0.25 * t;
    // Wirbelkoerper mit gefasten Kanten, polierte Deckplatte
    const body = new THREE.LatheGeometry([[0, -0.034], [0.07, -0.034], [0.078, -0.026], [0.078, 0.026], [0.07, 0.034], [0, 0.034]]
      .map(([r, y]) => new THREE.Vector2(r * sc, y)), S(28));
    P.add(body, frame(THREE, p, tg), M.TI);
    const cap = new THREE.CylinderGeometry(0.05 * sc, 0.05 * sc, 0.072, S(20));
    P.add(cap, frame(THREE, p, tg), M.CHROME);
    const disc = new THREE.CylinderGeometry(0.062 * sc, 0.062 * sc, 0.03, S(24));
    P.add(disc, frame(THREE, p.clone().addScaledVector(tg, -0.052), tg), M.RB);
    // Dornfortsatz nach hinten, Querfortsaetze
    const sp = new THREE.BoxGeometry(0.036, 0.03, 0.12 * sc);
    sp.translate(0, 0, -0.085 * sc);
    P.add(sp, frame(THREE, p, tg), M.TID);
    const tr = new THREE.BoxGeometry(0.22 * sc, 0.024, 0.04);
    P.add(tr, frame(THREE, p.clone().add(new THREE.Vector3(0, 0, 0.01)), tg), M.TID);
  }
  // Atlas-Flansch an der Schaedelbasis, Ring mit Schrauben
  const top = new THREE.Vector3(0, -0.4, -0.335);
  const up = new THREE.Vector3(0, 1, 0.12).normalize();
  const fl = new THREE.LatheGeometry([[0.06, -0.02], [0.16, -0.02], [0.17, -0.01], [0.17, 0.01], [0.15, 0.02], [0.06, 0.02]]
    .map(([r, y]) => new THREE.Vector2(r, y)), S(40));
  P.add(fl, frame(THREE, top, up), M.TID);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10);
    g.translate(Math.cos(a) * 0.135, 0.022, Math.sin(a) * 0.135);
    P.add(g, frame(THREE, top, up), M.CHROME);
  }
  return curve;
}

/* ------------------------------------------------------------------ Titan-Kamm ueber den Scheitel */
// Lesbare Grossform: gefaster Kamm auf der Mittellinie von der Gesichtskante bis zum Hinterhaupt,
// mit Erleichterungsfenstern und Schrauben am Fuss. Dazu zwei schmalere Seitenrippen.
export function buildCrest(THREE, P, rmap, q = 1) {
  const M = materialsKit(THREE);
  const steps = Math.round(90 * q);
  const make = (b, w, h, lift, a0Search, a1, mat, windows) => {
    let a0 = a0Search;
    for (; a0 < 3.6; a0 += 0.005) { const p = skullPt(THREE, rmap, a0, b, 0); if (cutField(p.x, p.y, p.z) > 0.035) break; }
    const pts = []; const ups = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const p = skullPt(THREE, rmap, a, b, lift);
      const nrm = p.clone().sub(new THREE.Vector3(...RC)).normalize();
      // Ein- und Auslauf: Hoehe weich auf null
      const u = i / steps;
      const k = Math.min(1, u / 0.06, (1 - u) / 0.1);
      pts.push(p); ups.push(nrm);
      pts[i].addScaledVector(nrm, -h * (1 - Math.sqrt(Math.max(0, k))));
    }
    sweep(THREE, P, pts, ups, chamferRect(w, h, Math.min(w, h) * 0.22), mat);
    if (windows) {
      for (let i = 4; i < steps - 4; i += Math.max(3, Math.round(7 * q))) {
        const p = pts[i]; const nrm = ups[i];
        const t = pts[i + 1].clone().sub(p).normalize();
        const s = new THREE.Vector3().crossVectors(t, nrm).normalize();
        for (const sg of [1, -1]) {
          const m = new THREE.Matrix4().makeBasis(s, nrm, t).setPosition(p.clone().addScaledVector(s, sg * (w / 2 + 0.0008)).addScaledVector(nrm, h * 0.55));
          P.add(new THREE.BoxGeometry(0.003, h * 0.42, 0.026), m, X(M.GR));
        }
      }
      for (let i = 2; i < steps - 2; i += Math.max(4, Math.round(9 * q))) {
        const p = pts[i]; const nrm = ups[i];
        const t = pts[i + 1].clone().sub(p).normalize();
        const s = new THREE.Vector3().crossVectors(t, nrm).normalize();
        for (const sg of [1, -1]) {
          const g = new THREE.CylinderGeometry(0.0065, 0.0065, 0.008, 10);
          P.add(g, frame(THREE, p.clone().addScaledVector(s, sg * (w / 2 + 0.011)).addScaledVector(nrm, 0.004), nrm), X(M.CHROME));
        }
      }
    }
    return pts;
  };
  const crest = make(0, 0.06, 0.055, 0.004, 1.3, Math.PI * 1.18, X(M.TI), true);
  for (const b of [-0.43, 0.43]) make(b, 0.03, 0.026, 0.003, 1.3, Math.PI * 1.12, X(M.TID), false);
  return crest;
}

/* ------------------------------------------------------------------ Querspangen unter dem Glas */
export function buildStruts(THREE, P, rmap, q = 1) {
  const M = materialsKit(THREE);
  for (const a of [Math.PI * 0.7, Math.PI * 0.86, Math.PI * 1.0]) {
    const pts = [];
    for (let k = 0; k <= 30; k++) {
      const b = -1.3 + (2.6 * k) / 30;
      const p = skullPt(THREE, rmap, a, b, -0.03);
      if (cutField(p.x, p.y, p.z) > 0.2 || pts.length) pts.push(p);
      if (pts.length && cutField(p.x, p.y, p.z) < 0.2) break;
    }
    if (pts.length < 4) continue;
    const c = new THREE.CatmullRomCurve3(pts);
    P.add(new THREE.TubeGeometry(c, Math.round(48 * q), 0.012, Math.max(6, Math.round(10 * q)), false), new THREE.Matrix4(), X(M.TID));
  }
}

/* ------------------------------------------------------------------ Module unter dem Glas (ohne Leuchtdioden) */
export function buildBoards(THREE, P, rmap, o = {}) {
  const { count = 18, seed = 5, q = 1 } = o;
  const rnd = mulberry32(seed);
  const M = materialsKit(THREE);
  const ALU = X({ c: new THREE.Color(0xa9b3bc), m: 0.9, r: 0.32 });
  const placed = [];
  let made = 0; let guard = 0;
  while (made < count && guard++ < count * 60) {
    const a = Math.PI * (0.62 + 0.6 * rnd());
    const b = (rnd() - 0.5) * 2.2;
    const c0 = skullPt(THREE, rmap, a, b, -0.05);
    if (cutField(c0.x, c0.y, c0.z) < 0.12 || c0.y < -0.6) continue;
    if (Math.abs(c0.x) < 0.06) continue; // Kamm
    const w = 0.09 + rnd() * 0.09; const h = 0.07 + rnd() * 0.07;
    if (placed.some((p) => p.c.distanceTo(c0) < (p.s + Math.max(w, h)) * 0.6)) continue;
    const e = 0.01;
    const ta = skullPt(THREE, rmap, a + e, b, -0.05).sub(c0).normalize();
    const tb = skullPt(THREE, rmap, a, b + e, -0.05).sub(c0).normalize();
    const n = new THREE.Vector3().crossVectors(tb, ta).normalize();
    if (n.dot(c0.clone().sub(new THREE.Vector3(...RC))) < 0) n.negate();
    const x = ta; const z = new THREE.Vector3().crossVectors(x, n).normalize();
    const basis = new THREE.Matrix4().makeBasis(x, n, z);
    const at = (u, v, hgt) => c0.clone().addScaledVector(x, u).addScaledVector(z, v).addScaledVector(n, hgt);
    const box = (sx, sy, sz, p, mat) => P.add(new THREE.BoxGeometry(sx, sy, sz), basis.clone().setPosition(p), mat);
    // Gehaeuse mit Deckel und Kuehlrippen: wenige, klare Formen
    box(w, 0.014, h, at(0, 0, 0.01), ALU);
    box(w * 0.86, 0.004, h * 0.86, at(0, 0, 0.019), X(rnd() < 0.5 ? M.TID : M.GR));
    if (rnd() < 0.55) for (let i = 0; i < 5; i++) box(0.004, 0.016, h * 0.62, at(-w * 0.28 + i * (w * 0.14), 0, 0.026), X(M.TI));
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(0.008, 0.006, 0.008, at(su * (w / 2 - 0.009), sv * (h / 2 - 0.009), 0.019), X(M.CHROME));
    placed.push({ c: c0, s: Math.max(w, h) });
    made++;
  }
  return made;
}

/* ------------------------------------------------------------------ Anschluesse, Manschetten und Buchsen der Kabelbuendel */
export function buildBundleHardware(THREE, P, guides, q = 1) {
  const M = materialsKit(THREE);
  const S = (k) => Math.max(10, Math.round(k * q));
  for (const G of guides) {
    const c = G.curve; const R = G.radius;
    const lat = (pts, t, mat, seg = 24, dirSign = 1) => {
      const p = c.getPointAt(t); const tg = c.getTangentAt(t).multiplyScalar(dirSign);
      P.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), S(seg)), frame(THREE, p, tg), mat);
    };
    // Anschluss am Schaedel: Sockel mit Fase und Ueberwurfmutter
    lat([[0, -0.03], [R + 0.022, -0.03], [R + 0.026, -0.022], [R + 0.026, 0.0], [R + 0.016, 0.012], [R + 0.016, 0.03], [R + 0.01, 0.04], [0, 0.04]], 0.0, M.TID, 28);
    lat([[R + 0.017, 0.0], [R + 0.019, 0.004], [R + 0.019, 0.016], [R + 0.017, 0.02]], 0.0, M.CHROME, 6);
    // Manschetten (Titan, dunkler Gummiring)
    for (const t of G.cuffs) {
      lat([[R + 0.004, -0.02], [R + 0.011, -0.016], [R + 0.011, 0.016], [R + 0.004, 0.02]], t, M.TI, 24);
      lat([[R + 0.012, -0.004], [R + 0.014, 0.0], [R + 0.012, 0.004]], t, M.RB, 24);
    }
    // Buchse im Ruecken
    lat([[R + 0.004, -0.03], [R + 0.03, -0.03], [R + 0.038, -0.022], [R + 0.038, -0.01], [R + 0.022, 0.0], [R + 0.012, 0.012]], 1.0, M.TID, 28);
  }
}
