// Bauteile des Roboters (Version 2): Platten mit echtem Spaltmass, Visier mit Tiefe, Ohrmodule, Scharniere,
// Hals-Mechanik (Wirbel, Kolben, Kabelbuendel), Kragen, Schulter-Streben, Schrauben.
//
// Platten: Jede Platte ist ein Ausschnitt aus einem feinen Gitter auf der Huelle. Ihr Umriss ist eine
// Abstandsfunktion (SDF), die hier zweimal steht: in JS (Dreiecke den Platten zuordnen, Hoehen) und als GLSL
// (pixelgenaue Fuge, Fase, Gravuren). Dreiecke an einer Fuge gehoeren zu beiden Nachbarplatten, jede verwirft im
// Fragment-Shader, was nicht zu ihr gehoert. So sind Fugen scharf, unabhaengig von der Gitterdichte, und jede Platte
// laesst sich einzeln bewegen (Montage, Entriegeln, Explosionszeichnung im Roentgen). Unter den Platten liegt eine
// Innenschale aus Graphit: durch die Fugen sieht man dunkle Tiefe (und im Zoom das Fugenlicht).
//
// Alle Bauteile ausser den Platten nutzen dasselbe Material (robot-shaders.js makePartMaterial) mit Attributen:
//   aCol (Farbe linear), aRM (Rauheit, Metall), aPart (Code, a, b, c), aBr (Buerstung: entlang, quer), aCls
//   (1 = Schale: verschwindet im Roentgen-Scan, 0 = Mechanik: bleibt sichtbar, wird nur dunkler).
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  smoothstep, clamp01, VISOR, EAR, HINGE, NECK, PANELS, COLLAR_PROFILE,
  headSample, hullFrame, projectToHull, dirFromAngles, outlinePoint, orientOutward, buildHead, buildTorso,
  buildVertebraGeometry, vertebraLayout, pistonDefs, cableDefs,
} from './robot-geometry.js';

/* ---------------------------------------------------------------- Codes */
export const PART = Object.freeze({
  plain: 0, frame: 1, hood: 2, ear: 3, lamella: 5, lens: 6, can: 7, hinge: 8, vertebra: 9, ring: 10,
  piston: 11, rod: 12, clevis: 13, cable: 14, clamp: 15, collar: 16, strut: 17, screw: 18, mount: 20, cap: 21,
});

export const GAP = PANELS.gap;
export const BEVEL = PANELS.bevel;
const KSUB = 0.012; // Rundung an T-Stoessen der Fugen

/* ------------------------------------------------------------ Helfer */
export const gf = (v) => {
  const s = (+v).toPrecision(7);
  return /[.e]/.test(s) ? s : `${s}.0`;
};
export const gv3 = (v) => `vec3(${gf(v.x)}, ${gf(v.y)}, ${gf(v.z)})`;
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
const rbox = (x, y, hx, hy, r) => {
  const dx = Math.abs(x) - hx + r;
  const dy = Math.abs(y) - hy + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};
const ell = (x, y, rx, ry) => {
  const k0 = Math.hypot(x / rx, y / ry);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry));
  return k1 < 1e-6 ? -Math.min(rx, ry) : (k0 * (k0 - 1)) / k1;
};
const diskSdf = (p, f, r) => {
  const vx = p.x - f.c.x; const vy = p.y - f.c.y; const vz = p.z - f.c.z;
  const vn = vx * f.n.x + vy * f.n.y + vz * f.n.z;
  const tx = vx - f.n.x * vn; const ty = vy - f.n.y * vn; const tz = vz - f.n.z * vn;
  return Math.max(Math.hypot(tx, ty, tz) - r, -(vn + 0.2));
};

// GLSL-Grundfunktionen (gleiche Formeln wie oben)
export const SDF_GLSL = /* glsl */ `
float rbSmax(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
float rbRBox(vec2 q, vec2 hb, float r) { vec2 d = abs(q) - hb + r; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
float rbEll(vec2 q, vec2 r) { float k0 = length(q / r); float k1 = length(q / (r * r)); return k1 < 1e-6 ? -min(r.x, r.y) : k0 * (k0 - 1.0) / k1; }
float rbDisk(vec3 p, vec3 c, vec3 n, float r) { vec3 v = p - c; float vn = dot(v, n); return max(length(v - n * vn) - r, -(vn + 0.2)); }
`;

/* -------------------------------------------------------- Kopf-Platten */
// Visier-Ausschnitt: Rechteck mit runden Ecken im Visier-Raum (wie die Geometrie von Rahmen und Glas), Abstand
// naeherungsweise in Welt-Einheiten.
function faceSdf(theta, phi, F = VISOR.frame) {
  const ey = phi - F.centerPhi;
  const yn = ey / F.halfH;
  const wsc = 1 - F.taper * (1 - smoothstep(-1.0, 0.35, yn));
  const ex = (theta * F.rh) / wsc;
  const qx = Math.abs(ex) - (F.halfW - F.corner);
  const qy = Math.abs(ey) - (F.halfH - F.corner);
  const mx = Math.max(qx, 0);
  const my = Math.max(qy, 0);
  const L = Math.hypot(mx, my);
  const s = L + Math.min(Math.max(qx, qy), 0) - F.corner;
  const gx = L > 1e-6 ? mx / L : (qx > qy ? 1 : 0);
  return s * (0.95 + (wsc - 0.95) * gx);
}

// Kenngroessen der Kopfplatten (auch im GLSL verwendet)
const HC = Object.freeze({
  crestW: 0.085, crestA0: 0.62, crestA1: 2.75,
  hatchY: -0.21, hatchW: 0.11, hatchH: 0.07,
  foreTh: 0.62, foreTop: 0.8, foreBot: 0.2,
  chinW: 0.36, chinTop: -0.6, chinBot: -0.98,
  backTh: 2.2, backTop: 0.55, backBot: -0.65,
  jawTop: -0.35, jawTh: 2.35, jawBot: -1.0,
});

export function makeHeadPanels(THREE, shape) {
  const names = PANELS.head.map((n) => n.split(':')[0]);
  const holes = PANELS.head.map((n) => n.endsWith(':hole'));
  const NB = names.length;
  const id = Object.fromEntries(names.map((n, i) => [n, i]));
  const frames = {
    earL: hullFrame(THREE, shape, -EAR.theta, EAR.phi),
    earR: hullFrame(THREE, shape, EAR.theta, EAR.phi),
    hingeL: hullFrame(THREE, shape, -HINGE.theta, HINGE.phi),
    hingeR: hullFrame(THREE, shape, HINGE.theta, HINGE.phi),
  };
  const c0 = Math.cos(HC.crestA0); const s0 = Math.sin(HC.crestA0);
  const c1 = Math.cos(HC.crestA1); const s1 = Math.sin(HC.crestA1);
  const cf = Math.cos(HC.foreTh); const sf = Math.sin(HC.foreTh);
  const cb = Math.cos(HC.backTh); const sb = Math.sin(HC.backTh);
  const cj = Math.cos(HC.jawTh); const sj = Math.sin(HC.jawTh);

  /** Grundformen aller Platten an einem Punkt p der Huelle mit Richtung d. out: Float32Array(NB) */
  function bases(p, d, out) {
    const rad = Math.hypot(p.x, p.y, p.z);
    const th = Math.atan2(d.x, d.z);
    const ph = Math.asin(Math.max(-1, Math.min(1, d.y)));
    const ax = Math.abs(p.x);
    out[0] = faceSdf(th, ph);
    out[1] = diskSdf(p, frames.earL, EAR.hole);
    out[2] = diskSdf(p, frames.earR, EAR.hole);
    out[3] = diskSdf(p, frames.hingeL, HINGE.hole);
    out[4] = diskSdf(p, frames.hingeR, HINGE.hole);
    out[5] = smax(smax(ax - HC.crestW, p.z * s0 - p.y * c0, 0.03), p.y * c1 - p.z * s1, 0.03);
    out[6] = Math.max(rbox(p.x, p.y - HC.hatchY, HC.hatchW, HC.hatchH, 0.022), p.z + 0.5);
    out[7] = smax(smax(ax * cf - p.z * sf, (ph - HC.foreTop) * rad, 0.05), (HC.foreBot - ph) * rad, 0.02);
    out[8] = smax(smax(smax(ax - HC.chinW, (ph - HC.chinTop) * rad, 0.03), (HC.chinBot - ph) * rad, 0.04), 0.25 - p.z, 0.03);
    out[9] = smax(smax(p.z * sb - ax * cb, (ph - HC.backTop) * rad, 0.05), (HC.backBot - ph) * rad, 0.05);
    const jl = ax * cj - p.z * sj; // < 0: vor theta = jawTh
    out[10] = smax(smax(smax(p.x, (ph - HC.jawTop) * rad, 0.04), jl, 0.05), (HC.jawBot - ph) * rad, 0.05);
    out[11] = smax(smax(smax(-p.x, (ph - HC.jawTop) * rad, 0.04), jl, 0.05), (HC.jawBot - ph) * rad, 0.05);
    out[12] = smax(p.x, (HC.jawTop - ph) * rad, 0.04);
    out[13] = smax(-p.x, (HC.jawTop - ph) * rad, 0.04);
    out[14] = -1;
    return out;
  }
  /** Abstand zur Platte k (negativ innen), aus den Grundformen b */
  function region(b, k) {
    let r = b[k];
    for (let j = 0; j < k; j++) r = smax(r, -b[j], KSUB);
    return r;
  }
  /** Statische Hoehe der Platte k ueber der Huelle (Brauenkante, erhabener Kamm, vertieftes Kinn) */
  function height(k, b) {
    switch (names[k]) {
      case 'crest': return 0.012;
      case 'hatch': return 0.004;
      case 'forehead': return 0.004 + 0.022 * (1 - smoothstep(0.0, 0.15, b[0]));
      case 'chin': return -0.004;
      case 'back': return 0.003;
      case 'under': return -0.012;
      default: return 0;
    }
  }
  // Graphit: Kinn und Unterseite, sonst Keramik
  const mat = names.map((n) => (n === 'chin' || n === 'under' ? 1 : 0));

  const F = VISOR.frame;
  const fr = (f) => `${gv3(f.c)}, ${gv3(f.n)}`;
  const glsl = /* glsl */ `
#define RB_NHEAD ${NB}
float rbFace(float th, float ph) {
  float ey = ph - (${gf(F.centerPhi)});
  float yn = ey / ${gf(F.halfH)};
  float wsc = 1.0 - ${gf(F.taper)} * (1.0 - smoothstep(-1.0, 0.35, yn));
  float ex = th * ${gf(F.rh)} / wsc;
  vec2 q = abs(vec2(ex, ey)) - vec2(${gf(F.halfW - F.corner)}, ${gf(F.halfH - F.corner)});
  vec2 m = max(q, 0.0);
  float L = length(m);
  float s = L + min(max(q.x, q.y), 0.0) - ${gf(F.corner)};
  float gx = L > 1e-6 ? m.x / L : (q.x > q.y ? 1.0 : 0.0);
  return s * mix(0.95, wsc, gx);
}
float rbHeadBase(int j, vec3 p, float rad, float th, float ph) {
  float ax = abs(p.x);
  if (j == 0) return rbFace(th, ph);
  if (j == 1) return rbDisk(p, ${fr(frames.earL)}, ${gf(EAR.hole)});
  if (j == 2) return rbDisk(p, ${fr(frames.earR)}, ${gf(EAR.hole)});
  if (j == 3) return rbDisk(p, ${fr(frames.hingeL)}, ${gf(HINGE.hole)});
  if (j == 4) return rbDisk(p, ${fr(frames.hingeR)}, ${gf(HINGE.hole)});
  if (j == 5) return rbSmax(rbSmax(ax - ${gf(HC.crestW)}, p.z * ${gf(s0)} - p.y * ${gf(c0)}, 0.03), p.y * ${gf(c1)} - p.z * ${gf(s1)}, 0.03);
  if (j == 6) return max(rbRBox(vec2(p.x, p.y - (${gf(HC.hatchY)})), vec2(${gf(HC.hatchW)}, ${gf(HC.hatchH)}), 0.022), p.z + 0.5);
  if (j == 7) return rbSmax(rbSmax(ax * ${gf(cf)} - p.z * ${gf(sf)}, (ph - ${gf(HC.foreTop)}) * rad, 0.05), (${gf(HC.foreBot)} - ph) * rad, 0.02);
  if (j == 8) return rbSmax(rbSmax(rbSmax(ax - ${gf(HC.chinW)}, (ph - (${gf(HC.chinTop)})) * rad, 0.03), (${gf(HC.chinBot)} - ph) * rad, 0.04), 0.25 - p.z, 0.03);
  if (j == 9) return rbSmax(rbSmax(p.z * ${gf(sb)} - ax * (${gf(cb)}), (ph - ${gf(HC.backTop)}) * rad, 0.05), (${gf(HC.backBot)} - ph) * rad, 0.05);
  float jl = ax * (${gf(cj)}) - p.z * ${gf(sj)};
  if (j == 10) return rbSmax(rbSmax(rbSmax(p.x, (ph - (${gf(HC.jawTop)})) * rad, 0.04), jl, 0.05), (${gf(HC.jawBot)} - ph) * rad, 0.05);
  if (j == 11) return rbSmax(rbSmax(rbSmax(-p.x, (ph - (${gf(HC.jawTop)})) * rad, 0.04), jl, 0.05), (${gf(HC.jawBot)} - ph) * rad, 0.05);
  if (j == 12) return rbSmax(p.x, (${gf(HC.jawTop)} - ph) * rad, 0.04);
  if (j == 13) return rbSmax(-p.x, (${gf(HC.jawTop)} - ph) * rad, 0.04);
  return -1.0;
}
// Abstand zur eigenen Platte (negativ innen). d: Richtung (aDir), p: Punkt der Huelle
float rbHeadRegion(int id, vec3 p, vec3 d) {
  float rad = length(p);
  float th = atan(d.x, d.z);
  float ph = asin(clamp(d.y, -1.0, 1.0));
  float r = rbHeadBase(id, p, rad, th, ph);
  for (int j = 0; j < RB_NHEAD; j++) {
    if (j >= id) break;
    r = rbSmax(r, -rbHeadBase(j, p, rad, th, ph), ${gf(KSUB)});
  }
  return r;
}
float rbHeadFace(vec3 d) { return rbFace(atan(d.x, d.z), asin(clamp(d.y, -1.0, 1.0))); }
`;
  return { names, holes, NB, id, frames, bases, region, height, mat, glsl, HC };
}

/* -------------------------------------------------------- Rumpf-Platten */
const TC = Object.freeze({
  coreY: -2.0, coreW: 0.17, coreH: 0.11,
  armX: 1.68, armY: -2.02, capX: 1.3, capY: -2.6,
  trapIn: 0.56, trapOut: 1.32, trapY: -1.98,
  // Schluesselbein-Streben als Titan-Bänder: Gerade in der x/z-Ebene vom Kragen zur Schulterkappe, Breite 2 * strapW
  strapX0: 0.57, strapZ0: 0.26, strapX1: 1.25, strapZ1: 0.12, strapW: 0.034,
});
function strapLine(s) {
  const dx = (TC.strapX1 - TC.strapX0) * s;
  const dz = TC.strapZ1 - TC.strapZ0;
  const L = Math.hypot(dx, dz);
  return { x0: TC.strapX0 * s, z0: TC.strapZ0, ux: dx / L, uz: dz / L, L };
}
const strapSdf = (p, S) => {
  const qx = p.x - S.x0; const qz = p.z - S.z0;
  const t = qx * S.ux + qz * S.uz;
  const w = Math.abs(-qx * S.uz + qz * S.ux) - TC.strapW;
  return smax(smax(smax(w, Math.max(-t, t - S.L), 0.02), -2.15 - p.y, 0.02), -0.1 - p.z, 0.02);
};

export function makeTorsoPanels() {
  const names = PANELS.torso.slice();
  const NB = names.length;
  const id = Object.fromEntries(names.map((n, i) => [n, i]));
  const SL = strapLine(-1);
  const SR = strapLine(1);
  function bases(p, out) {
    const ax = Math.abs(p.x);
    out[0] = Math.max(rbox(p.x, p.y - TC.coreY, TC.coreW, TC.coreH, 0.025), 0.2 - p.z);
    out[1] = strapSdf(p, SL);
    out[2] = strapSdf(p, SR);
    out[3] = smax(p.x + TC.armX, p.y - TC.armY, 0.06);
    out[4] = smax(TC.armX - p.x, p.y - TC.armY, 0.06);
    out[5] = smax(p.x + TC.capX, TC.capY - p.y, 0.08);
    out[6] = smax(TC.capX - p.x, TC.capY - p.y, 0.08);
    out[7] = smax(smax(ell(p.x, p.y + 2.16, 1.25, 0.74), 0.05 - p.z, 0.05), -ell(p.x, p.y + 1.45, 0.66, 0.24), 0.04);
    out[8] = smax(smax(smax(ax - 1.1, p.y + 1.84, 0.1), -2.95 - p.y, 0.1), p.z + 0.35, 0.05);
    out[9] = smax(smax(p.x + TC.trapIn, -TC.trapOut - p.x, 0.04), TC.trapY - p.y, 0.06);
    out[10] = smax(smax(TC.trapIn - p.x, p.x - TC.trapOut, 0.04), TC.trapY - p.y, 0.06);
    out[11] = -1;
    return out;
  }
  function region(b, k) {
    let r = b[k];
    for (let j = 0; j < k; j++) r = smax(r, -b[j], KSUB);
    return r;
  }
  function height(k) {
    switch (names[k]) {
      case 'core': return -0.012;
      case 'strapL': case 'strapR': return 0.009;
      case 'armL': case 'armR': return 0.008;
      case 'capL': case 'capR': return 0.018;
      case 'chest': return 0.006;
      case 'backplate': return 0.004;
      case 'trapL': case 'trapR': return -0.002;
      default: return 0;
    }
  }
  const mat = names.map((n) => (n === 'core' || n.startsWith('trap') ? 1 : 0));
  const sg = (S) => `${gf(S.x0)}, ${gf(S.z0)}, ${gf(S.ux)}, ${gf(S.uz)}, ${gf(S.L)}`;
  const glsl = /* glsl */ `
#define RB_NTORSO ${NB}
float rbStrap(vec3 p, float x0, float z0, float ux, float uz, float L) {
  float qx = p.x - x0; float qz = p.z - z0;
  float t = qx * ux + qz * uz;
  float w = abs(-qx * uz + qz * ux) - ${gf(TC.strapW)};
  return rbSmax(rbSmax(rbSmax(w, max(-t, t - L), 0.02), -2.15 - p.y, 0.02), -0.1 - p.z, 0.02);
}
float rbTorsoBase(int j, vec3 p) {
  float ax = abs(p.x);
  if (j == 0) return max(rbRBox(vec2(p.x, p.y - (${gf(TC.coreY)})), vec2(${gf(TC.coreW)}, ${gf(TC.coreH)}), 0.025), 0.2 - p.z);
  if (j == 1) return rbStrap(p, ${sg(SL)});
  if (j == 2) return rbStrap(p, ${sg(SR)});
  if (j == 3) return rbSmax(p.x + ${gf(TC.armX)}, p.y - (${gf(TC.armY)}), 0.06);
  if (j == 4) return rbSmax(${gf(TC.armX)} - p.x, p.y - (${gf(TC.armY)}), 0.06);
  if (j == 5) return rbSmax(p.x + ${gf(TC.capX)}, ${gf(TC.capY)} - p.y, 0.08);
  if (j == 6) return rbSmax(${gf(TC.capX)} - p.x, ${gf(TC.capY)} - p.y, 0.08);
  if (j == 7) return rbSmax(rbSmax(rbEll(vec2(p.x, p.y + 2.16), vec2(1.25, 0.74)), 0.05 - p.z, 0.05), -rbEll(vec2(p.x, p.y + 1.45), vec2(0.66, 0.24)), 0.04);
  if (j == 8) return rbSmax(rbSmax(rbSmax(ax - 1.1, p.y + 1.84, 0.1), -2.95 - p.y, 0.1), p.z + 0.35, 0.05);
  if (j == 9) return rbSmax(rbSmax(p.x + ${gf(TC.trapIn)}, -${gf(TC.trapOut)} - p.x, 0.04), ${gf(TC.trapY)} - p.y, 0.06);
  if (j == 10) return rbSmax(rbSmax(${gf(TC.trapIn)} - p.x, p.x - ${gf(TC.trapOut)}, 0.04), ${gf(TC.trapY)} - p.y, 0.06);
  return -1.0;
}
float rbTorsoRegion(int id, vec3 p) {
  float r = rbTorsoBase(id, p);
  for (int j = 0; j < RB_NTORSO; j++) {
    if (j >= id) break;
    r = rbSmax(r, -rbTorsoBase(j, p), ${gf(KSUB)});
  }
  return r;
}
`;
  return { names, NB, id, bases, region, height, mat, glsl, TC, straps: [SL, SR] };
}

/* ------------------------------------------------------ Platten-Gitter */
/**
 * Zerlegt ein Gitter in Platten. src: { pos, nor, dir?, idx }. kit: Plattenbeschreibung (bases/region/height).
 * Jede Platte bekommt die Dreiecke, die ihren Bereich beruehren (an Fugen doppelt). Liefert die Geometrie mit
 * aPanel (Plattennummer) und aH (statische Hoehe), dazu je Platte mittlere Normale, Mitte und tiefsten Punkt.
 */
export function buildPanelGeometry(THREE, src, kit, { useDir = true, skip = null } = {}) {
  const { pos, nor, dir, idx } = src;
  const NB = kit.NB;
  const nV = pos.length / 3;
  const B = new Float32Array(NB);
  const R = new Float32Array(nV * NB);
  const H = new Float32Array(nV * NB);
  const p = { x: 0, y: 0, z: 0 };
  const d = { x: 0, y: 0, z: 0 };
  for (let v = 0; v < nV; v++) {
    p.x = pos[v * 3]; p.y = pos[v * 3 + 1]; p.z = pos[v * 3 + 2];
    if (useDir) { d.x = dir[v * 3]; d.y = dir[v * 3 + 1]; d.z = dir[v * 3 + 2]; kit.bases(p, d, B); } else kit.bases(p, B);
    for (let k = 0; k < NB; k++) {
      R[v * NB + k] = kit.region(B, k);
      H[v * NB + k] = kit.height(k, B, p);
    }
  }
  const lists = Array.from({ length: NB }, () => []);
  const L = (a, b) => Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]);
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t]; const i1 = idx[t + 1]; const i2 = idx[t + 2];
    const me = Math.max(L(i0, i1), L(i1, i2), L(i2, i0));
    const thr = me * 1.35 + 0.004 - GAP * 0.5;
    for (let k = 0; k < NB; k++) {
      if (kit.holes && kit.holes[k]) continue;
      if (skip && skip(k)) continue;
      const m = Math.min(R[i0 * NB + k], R[i1 * NB + k], R[i2 * NB + k]);
      if (m < thr) lists[k].push(i0, i1, i2);
    }
  }
  let count = 0;
  const remap = new Int32Array(nV);
  const outIdx = [];
  const oPos = []; const oNor = []; const oDir = []; const oPan = []; const oH = [];
  const stats = Array.from({ length: NB }, () => ({ n: new THREE.Vector3(), c: new THREE.Vector3(), minY: 9, maxY: -9, verts: 0 }));
  for (let k = 0; k < NB; k++) {
    const list = lists[k];
    if (!list.length) continue;
    remap.fill(-1);
    const S = stats[k];
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      let r = remap[v];
      if (r < 0) {
        r = count++;
        remap[v] = r;
        oPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        oNor.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
        if (useDir) oDir.push(dir[v * 3], dir[v * 3 + 1], dir[v * 3 + 2]);
        oPan.push(k);
        oH.push(H[v * NB + k]);
        if (R[v * NB + k] < 0) {
          S.n.x += nor[v * 3]; S.n.y += nor[v * 3 + 1]; S.n.z += nor[v * 3 + 2];
          S.c.x += pos[v * 3]; S.c.y += pos[v * 3 + 1]; S.c.z += pos[v * 3 + 2];
          S.minY = Math.min(S.minY, pos[v * 3 + 1]);
          S.maxY = Math.max(S.maxY, pos[v * 3 + 1]);
          S.verts++;
        }
      }
      outIdx.push(r);
    }
  }
  for (const S of stats) {
    if (S.verts) { S.n.normalize(); S.c.multiplyScalar(1 / S.verts); } else S.n.set(0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(outIdx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(oPos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(oNor, 3));
  if (useDir) g.setAttribute('aDir', new THREE.Float32BufferAttribute(oDir, 3));
  g.setAttribute('aPanel', new THREE.Float32BufferAttribute(oPan, 1));
  g.setAttribute('aH', new THREE.Float32BufferAttribute(oH, 1));
  g.computeBoundingSphere();
  if (g.boundingSphere) g.boundingSphere.radius += 0.1;
  return { geometry: g, stats };
}

/** Kopfplatten aus einem feinen Gitter auf der Huelle */
export function buildHeadShell(THREE, shape, kit, segW, segH) {
  const grid = buildHead(THREE, shape, segW, segH);
  const src = {
    pos: grid.getAttribute('position').array,
    nor: grid.getAttribute('normal').array,
    dir: grid.getAttribute('aDir').array,
    idx: grid.index.array,
  };
  const res = buildPanelGeometry(THREE, src, kit, { useDir: true });
  grid.dispose();
  return res;
}

/** Innenschale: Huelle, um `off` nach innen versetzt (Graphit). Mit aDir fuer Fugenlicht und Lueftung. */
export function buildInnerHead(THREE, shape, segW, segH, off) {
  const g = buildHead(THREE, shape, segW, segH);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) - nor.getX(i) * off, pos.getY(i) - nor.getY(i) * off, pos.getZ(i) - nor.getZ(i) * off);
  }
  g.computeBoundingSphere();
  return g;
}

/** Rumpfplatten aus dem Gitter des Rumpfes, dazu die Huelle selbst (fuer Strahlen-Tests) */
export function buildTorsoShell(THREE, A, kit, segU, segV) {
  const grid = buildTorso(THREE, A, segU, segV);
  const src = { pos: grid.getAttribute('position').array, nor: grid.getAttribute('normal').array, idx: grid.index.array };
  const res = buildPanelGeometry(THREE, src, kit, { useDir: false });
  // Unterkante weich ausblenden: die Platten bekommen aParam nicht, der Shader blendet ueber y aus
  return { ...res, hull: grid };
}

export function buildInnerTorso(THREE, A, segU, segV, off) {
  const g = buildTorso(THREE, A, segU, segV);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) - nor.getX(i) * off, pos.getY(i) - nor.getY(i) * off, pos.getZ(i) - nor.getZ(i) * off);
  }
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------- Attribute fuer Teile */
/**
 * Setzt die Material-Attribute eines Bauteils (konstant oder per Funktion je Vertex).
 * o: { col: THREE.Color, rough, metal, code, cls, part: (i, p, out4) => void, br: (i, p, out2) => void }
 */
export function partAttrs(THREE, g, o) {
  const pos = g.getAttribute('position');
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const rm = new Float32Array(n * 2);
  const part = new Float32Array(n * 4);
  const br = new Float32Array(n * 2);
  const cls = new Float32Array(n);
  const p = new THREE.Vector3();
  const o4 = [0, 0, 0, 0];
  const o2 = [0, 0];
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    col[i * 3] = o.col.r; col[i * 3 + 1] = o.col.g; col[i * 3 + 2] = o.col.b;
    rm[i * 2] = o.rough; rm[i * 2 + 1] = o.metal;
    o4[0] = o.code || 0; o4[1] = 0; o4[2] = 0; o4[3] = 0;
    if (o.part) o.part(i, p, o4);
    part[i * 4] = o4[0]; part[i * 4 + 1] = o4[1]; part[i * 4 + 2] = o4[2]; part[i * 4 + 3] = o4[3];
    o2[0] = 0; o2[1] = 0;
    if (o.br) o.br(i, p, o2);
    br[i * 2] = o2[0]; br[i * 2 + 1] = o2[1];
    cls[i] = o.cls ?? 0;
  }
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aRM', new THREE.BufferAttribute(rm, 2));
  g.setAttribute('aPart', new THREE.BufferAttribute(part, 4));
  g.setAttribute('aBr', new THREE.BufferAttribute(br, 2));
  g.setAttribute('aCls', new THREE.BufferAttribute(cls, 1));
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return g;
}

export function mergeParts(THREE, list) {
  const geos = list.filter(Boolean).map((g) => (g.index ? g : indexify(THREE, g)));
  const keep = ['position', 'normal', 'aCol', 'aRM', 'aPart', 'aBr', 'aCls'];
  for (const g of geos) for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
  const m = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  if (!m) throw new Error('robot-parts: Teile passen nicht zusammen (Attribute)');
  m.computeBoundingSphere();
  return m;
}
function indexify(THREE, g) {
  const n = g.getAttribute('position').count;
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(idx);
  return g;
}

/* -------------------------------------------------------------- Visier */
const lerp = (a, b, t) => a + (b - a) * t;
function blendOutline(F, G, t) {
  return {
    halfW: lerp(F.halfW, G.halfW, t), halfH: lerp(F.halfH, G.halfH, t), corner: lerp(F.corner, G.corner, t),
    taper: lerp(F.taper, G.taper, t), centerPhi: F.centerPhi, rh: F.rh,
  };
}

/**
 * Ringe entlang eines Visier-Umrisses: rings = [{ o (Umriss), inset, h }]. Liefert Geometrie mit aUv (Bogen x,
 * Hoehe ab Lichtband), aS (Umfang 0..1), aT (Ring 0..1).
 */
export function buildOutlineRings(THREE, shape, rings, perim, bandPhi) {
  const nR = rings.length;
  const pos = new Float32Array(nR * perim * 3);
  const uv = new Float32Array(nR * perim * 2);
  const sA = new Float32Array(nR * perim);
  const tA = new Float32Array(nR * perim);
  const e2 = { x: 0, y: 0 };
  const s = { p: new THREE.Vector3(), n: new THREE.Vector3() };
  let k = 0;
  for (let r = 0; r < nR; r++) {
    const { o, inset, h } = rings[r];
    const A = Math.max(1e-4, o.halfW - inset);
    const B = Math.max(1e-4, o.halfH - inset);
    const rr = Math.max(1e-4, Math.min(A, B, o.corner - inset));
    for (let i = 0; i < perim; i++) {
      outlinePoint(i / perim, A, B, rr, e2);
      const yn = e2.y / o.halfH;
      const wsc = 1 - o.taper * smoothstep(0.35, -1.0, yn);
      const xa = e2.x * wsc;
      const theta = xa / o.rh;
      const phi = o.centerPhi + e2.y;
      headSample(THREE, shape, theta, phi, s);
      pos[k * 3] = s.p.x + s.n.x * h;
      pos[k * 3 + 1] = s.p.y + s.n.y * h;
      pos[k * 3 + 2] = s.p.z + s.n.z * h;
      uv[k * 2] = xa;
      uv[k * 2 + 1] = phi - bandPhi;
      sA[k] = i / perim;
      tA[k] = nR > 1 ? r / (nR - 1) : 0;
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
  g.setAttribute('aS', new THREE.BufferAttribute(sA, 1));
  g.setAttribute('aT', new THREE.BufferAttribute(tA, 1));
  return { g, pos, idx };
}

/** Visier: Titanrahmen, Glas, LED-Platine mit Innenwand (Haube). */
export function buildVisorParts(THREE, shape, A, q, tok) {
  const F = VISOR.frame;
  const G = VISOR.glass;
  const bandPhi = Math.asin(A.visor.center.y / A.head.radii.y);
  const perim = Math.max(140, Math.round(320 * q));

  // Rahmen: Profil von aussen (unter die Schale gesteckt) ueber die Oberseite bis zur Glas-Auflage
  const prof = [
    [-0.32, -0.012], [-0.04, -0.002], [0.0, 0.0015], [0.07, 0.008], [0.16, 0.0135], [0.27, 0.0162],
    [0.38, VISOR.frameTop], [0.7, VISOR.frameTop], [0.8, 0.016], [0.9, 0.0135], [1.0, 0.0105],
  ];
  const frameRings = prof.map(([t, h]) => ({ o: blendOutline(F, G, t), inset: 0, h }));
  const fr = buildOutlineRings(THREE, shape, frameRings, perim, bandPhi);
  orientOutward(THREE, fr.g, fr.pos, fr.idx);
  const sAttr = fr.g.getAttribute('aS');
  const tAttr = fr.g.getAttribute('aT');
  const perimLen = 2 * (F.halfW + F.halfH) * 2 * 0.9;
  partAttrs(THREE, fr.g, {
    col: tok.titanium, rough: 0.3, metal: 1, code: PART.frame, cls: 1,
    part: (i, p, o) => { o[1] = sAttr.getX(i); o[2] = tAttr.getX(i); },
    br: (i, p, o) => { o[0] = sAttr.getX(i) * perimLen; o[1] = tAttr.getX(i) * 0.035; },
  });

  // Glas: vom Rand bis zur Mitte, liegt etwas tiefer als die Rahmen-Oberseite
  const minHalf = Math.min(G.halfW, G.halfH);
  const gr = [];
  const nG = Math.max(8, Math.round(14 * q));
  for (let i = 0; i <= nG; i++) {
    const u = i / nG;
    gr.push({ o: G, inset: (1 - Math.pow(1 - u, 2.2)) * minHalf, h: VISOR.glassOff + 0.0015 * u });
  }
  const gl = buildOutlineRings(THREE, shape, gr, perim, bandPhi);
  orientOutward(THREE, gl.g, gl.pos, gl.idx);

  // Platine mit Innenwand: Auflage des Glases -> Wand nach innen -> Platine bis zur Mitte
  const br = [
    { o: G, inset: -0.002, h: 0.0105 }, { o: G, inset: 0.0, h: 0.004 }, { o: G, inset: 0.002, h: -0.012 },
    { o: G, inset: 0.004, h: VISOR.boardOff }, { o: G, inset: 0.012, h: VISOR.boardOff },
  ];
  const nB = Math.max(8, Math.round(16 * q));
  for (let i = 1; i <= nB; i++) {
    const u = i / nB;
    br.push({ o: G, inset: 0.012 + (1 - Math.pow(1 - u, 2.0)) * (minHalf - 0.012), h: VISOR.boardOff });
  }
  const bd = buildOutlineRings(THREE, shape, br, perim, bandPhi);
  orientOutward(THREE, bd.g, bd.pos, bd.idx);
  // Wand-Markierung: die ersten drei Ringe sind Innenwand (Graphit), danach Platine
  const wall = new Float32Array(bd.g.getAttribute('position').count);
  for (let i = 0; i < wall.length; i++) wall[i] = i < perim * 3 ? 1 : 0;
  bd.g.setAttribute('aWall', new THREE.BufferAttribute(wall, 1));

  // Schrauben am Rahmen: oben 2, seitlich je 1, unten 2 (Mitte der Oberseite)
  const screws = [];
  const tScrew = 0.54;
  const o = blendOutline(F, G, tScrew);
  const spots = [[-0.27, 1], [0.27, 1], [-1, 0.05], [1, 0.05], [-0.2, -1], [0.2, -1]];
  const s = { p: new THREE.Vector3(), n: new THREE.Vector3() };
  for (const [sx, sy] of spots) {
    let ex; let ey;
    if (Math.abs(sy) === 1) { ex = sx; ey = sy * o.halfH; } else { ex = sx * o.halfW; ey = sy; }
    const yn = ey / o.halfH;
    const wsc = 1 - o.taper * smoothstep(0.35, -1.0, yn);
    headSample(THREE, shape, (ex * wsc) / o.rh, o.centerPhi + ey, s);
    screws.push({ p: s.p.clone().addScaledVector(s.n, VISOR.frameTop), n: s.n.clone(), panel: -1, head: true, size: 1 });
  }
  return { frame: fr.g, glass: gl.g, board: bd.g, screws, bandPhi };
}

/* ------------------------------------------------------------- Ohren */
/**
 * Ohrmodul je Seite: Gehaeusering (Titan), Boden mit 16 Lamellen (Graphit), Nabe mit Iris-Ring, Linse,
 * Innengehaeuse (nur im Roentgen zu sehen). Die Aussenkante folgt der Woelbung, der Rest ist ein starres Teil.
 */
export function buildEarParts(THREE, shape, side, q, tok) {
  const fr = hullFrame(THREE, shape, side * EAR.theta, EAR.phi);
  const seg = Math.max(28, Math.round(64 * q));
  const tmp = { p: new THREE.Vector3(), n: new THREE.Vector3() };
  const hullH = (r, a) => projectToHull(THREE, shape, fr, r * Math.cos(a), r * Math.sin(a), tmp).h;
  let hf = 0;
  for (let i = 0; i < 12; i++) hf += hullH(0.19, (i / 12) * Math.PI * 2);
  hf /= 12;
  // [r, h, folgt der Huelle?]
  const prof = [
    [0.244, -0.014, 1], [0.238, -0.003, 1], [0.232, 0.009, 1], [0.224, 0.024, 1],
    [0.216, 0.038, 0], [0.209, 0.0438, 0], [0.203, 0.045, 0], [0.18, 0.045, 0], [0.175, 0.043, 0],
    [0.171, 0.037, 0], [0.169, 0.02, 0], [0.165, 0.0125, 0], [0.158, 0.0105, 0], [0.11, 0.0105, 0], [0.07, 0.0105, 0],
    [0.067, 0.0125, 0], [0.063, 0.02, 0], [0.058, 0.0238, 0], [0.05, 0.0248, 0], [0.0455, 0.0236, 0],
  ];
  const nP = prof.length;
  const pos = new Float32Array(nP * seg * 3);
  const rA = new Float32Array(nP * seg);
  const ca = new Float32Array(nP * seg);
  const sa = new Float32Array(nP * seg);
  let k = 0;
  for (let j = 0; j < nP; j++) {
    const [r, h, conform] = prof[j];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a); const sn = Math.sin(a);
      const base = conform ? hullH(r, a) : hf;
      pos[k * 3] = fr.c.x + fr.t1.x * r * c + fr.t2.x * r * sn + fr.n.x * (base + h);
      pos[k * 3 + 1] = fr.c.y + fr.t1.y * r * c + fr.t2.y * r * sn + fr.n.y * (base + h);
      pos[k * 3 + 2] = fr.c.z + fr.t1.z * r * c + fr.t2.z * r * sn + fr.n.z * (base + h);
      rA[k] = r; ca[k] = c; sa[k] = sn;
      k++;
    }
  }
  const idx = [];
  for (let j = 0; j < nP - 1; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i;
      const b = j * seg + ((i + 1) % seg);
      const c = a + seg;
      const e = b + seg;
      idx.push(a, c, b, b, c, e);
    }
  }
  const casing = new THREE.BufferGeometry();
  casing.setIndex(idx);
  casing.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const center = fr.c.clone().addScaledVector(fr.n, -0.5);
  orientOutward(THREE, casing, pos, idx, center);
  partAttrs(THREE, casing, {
    col: tok.titanium, rough: 0.3, metal: 1, code: PART.ear, cls: 1,
    part: (i, p, o) => { o[1] = rA[i]; o[2] = ca[i]; o[3] = sa[i]; },
    br: (i, p, o) => { o[0] = Math.atan2(sa[i], ca[i]) * rA[i]; o[1] = rA[i]; },
  });
  // Boden und Nabe sind dunkler (Graphit-Einsatz)
  {
    const col = casing.getAttribute('aCol');
    const rm = casing.getAttribute('aRM');
    for (let i = 0; i < col.count; i++) {
      const r = rA[i];
      if (r < 0.166 && r > 0.066) {
        col.setXYZ(i, tok.graphite.r, tok.graphite.g, tok.graphite.b);
        rm.setXY(i, 0.6, 0);
      }
    }
  }
  const M = new THREE.Matrix4().makeBasis(fr.t1, fr.t2, fr.n).setPosition(fr.c.clone().addScaledVector(fr.n, hf));

  // Lamellen: 16 Rippen, um 8 Grad gegen radial verdreht (Turbinen-Look)
  const lams = [];
  const L0 = EAR.lamella[0]; const L1 = EAR.lamella[1];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const b = new THREE.BoxGeometry(L1 - L0, 0.006, 0.012);
    b.translate((L0 + L1) / 2, 0, 0.0105 + 0.006);
    const R = new THREE.Matrix4().makeRotationZ(a);
    const tw = new THREE.Matrix4().makeRotationZ(0.14);
    // um den eigenen Mittelpunkt verdrehen
    const mid = new THREE.Vector3((L0 + L1) / 2, 0, 0);
    b.translate(-mid.x, 0, 0);
    b.applyMatrix4(tw);
    b.translate(mid.x, 0, 0);
    b.applyMatrix4(R);
    b.applyMatrix4(M);
    partAttrs(THREE, b, { col: tok.graphite, rough: 0.55, metal: 0, code: PART.lamella, cls: 1 });
    lams.push(b);
  }
  // Linse: flache Kuppel (dunkles Glas)
  const Rl = (EAR.lens * EAR.lens + 0.02 * 0.02) / (2 * 0.02);
  const lens = new THREE.SphereGeometry(Rl, Math.max(16, seg >> 1), 6, 0, Math.PI * 2, 0, Math.asin(EAR.lens / Rl));
  lens.rotateX(Math.PI / 2);
  lens.translate(0, 0, 0.0236 + 0.02 - Rl);
  lens.applyMatrix4(M);
  partAttrs(THREE, lens, { col: tok.glass, rough: 0.06, metal: 0, code: PART.lens, cls: 1 });
  // Innengehaeuse: Dose nach innen (traegt im Roentgen die Strebe der Gehirn-Wiege)
  const can = new THREE.CylinderGeometry(EAR.inner, EAR.inner * 0.94, 0.12, Math.max(20, seg >> 1), 1, false);
  can.rotateX(Math.PI / 2);
  can.translate(0, 0, -0.064);
  can.applyMatrix4(M);
  partAttrs(THREE, can, { col: tok.titanium.clone().multiplyScalar(0.55), rough: 0.42, metal: 1, code: PART.can, cls: 0 });

  // Schrauben auf dem Gehaeusering (45, 135, 225, 315 Grad)
  const screws = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const r = 0.1915;
    const p = fr.c.clone().addScaledVector(fr.t1, r * Math.cos(a)).addScaledVector(fr.t2, r * Math.sin(a)).addScaledVector(fr.n, hf + 0.045);
    screws.push({ p, n: fr.n.clone(), panel: -1, head: true, size: 0.9 });
  }
  return { geos: [casing, ...lams, lens, can], screws, frame: fr, hf };
}

/* ---------------------------------------------------------- Scharnier */
export function buildHingeParts(THREE, shape, side, q, tok) {
  const fr = hullFrame(THREE, shape, side * HINGE.theta, HINGE.phi);
  const seg = Math.max(20, Math.round(36 * q));
  const drumProf = [[0.001, -0.035], [0.058, -0.035], [0.058, 0.014], [0.055, 0.019], [0.049, 0.021], [0.03, 0.021], [0.0275, 0.023], [0.001, 0.023]];
  const drum = new THREE.LatheGeometry(drumProf.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  const capProf = [[0.001, 0.021], [0.025, 0.021], [0.025, 0.029], [0.022, 0.031], [0.001, 0.031]];
  const cap = new THREE.LatheGeometry(capProf.map(([r, h]) => new THREE.Vector2(r, h)), 6);
  const M = new THREE.Matrix4().makeBasis(fr.t1, fr.n, fr.t2.clone().negate()).setPosition(fr.c);
  const pd = drum.getAttribute('position');
  const hA = new Float32Array(pd.count);
  const aA = new Float32Array(pd.count);
  for (let i = 0; i < pd.count; i++) { hA[i] = pd.getY(i); aA[i] = Math.atan2(pd.getZ(i), pd.getX(i)); }
  drum.applyMatrix4(M);
  cap.applyMatrix4(M);
  partAttrs(THREE, drum, {
    col: tok.titanium, rough: 0.28, metal: 1, code: PART.hinge, cls: 1,
    part: (i, p, o) => { o[1] = hA[i]; o[2] = Math.cos(aA[i]); o[3] = Math.sin(aA[i]); },
    br: (i, p, o) => { o[0] = aA[i] * 0.055; o[1] = hA[i]; },
  });
  partAttrs(THREE, cap, { col: tok.titanium.clone().multiplyScalar(0.8), rough: 0.36, metal: 1, code: PART.cap, cls: 1 });
  return [drum, cap];
}

/* ------------------------------------------------------------ Hals */
const UP = Object.freeze({ x: 0, y: 1, z: 0 });

/** Schnittpunkt der Strecke a -> b mit der Kopfhuelle (sternfoermig um den Ursprung), Parameter 0..1 */
export function hullCrossing(THREE, shape, a, b) {
  const tmp = new THREE.Vector3();
  const pt = new THREE.Vector3();
  const inside = (t) => {
    pt.copy(a).lerp(b, t);
    const l = pt.length();
    shape(pt.x / l, pt.y / l, pt.z / l, tmp);
    return l < tmp.length();
  };
  let lo = 0; let hi = 1;
  if (inside(lo) === inside(hi)) return -1;
  const inLo = inside(lo);
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (inside(m) === inLo) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * Halsmechanik. Liefert:
 *  body: Geometrie (Kabelbuendel, Schellen, Rueckenmark, Kragen, Montageboecke auf dem Kragen); im Shader per Hoehe
 *        mit dem Kopf mitbewegt (rbSkin, wie V1)
 *  head: Montageboecke an der Kopfunterseite (bewegen sich mit dem Kopf)
 *  vertebra, ring, cylinder, rod, clevis: Geometrien fuer InstancedMesh (Matrizen pro Frame)
 *  pistons: [{ top0, bot }] Gelenkpunkte (top0 in Kopf-Ruhelage)
 */
export function buildNeckParts(THREE, shape, A, q, tok) {
  const seg = Math.max(10, Math.round(18 * q));
  const bot = A.neck.bottom;
  const body = [];
  const head = [];

  // Kabel
  const cables = cableDefs(THREE);
  cables.forEach((C, i) => {
    const curve = new THREE.CatmullRomCurve3(C.pts, false, 'centripetal');
    const tube = new THREE.TubeGeometry(curve, Math.max(24, Math.round(56 * q)), C.r, C.spine ? Math.max(10, seg) : Math.max(6, Math.round(10 * q)), false);
    const uv = tube.getAttribute('uv');
    partAttrs(THREE, tube, {
      col: C.spine ? tok.rubber.clone().lerp(tok.graphite, 0.4) : tok.rubber, rough: 0.82, metal: 0, code: PART.cable, cls: 0,
      part: (k, p, o) => { o[1] = uv.getX(k); o[2] = C.pulse; o[3] = (i * 0.618) % 1; },
      br: (k, p, o) => { o[0] = uv.getX(k); o[1] = uv.getY(k); },
    });
    body.push(tube);
    // Schellen um die Buendel (Titanband)
    if (!C.spine && (i % 5) === 0) {
      for (const t of [0.42, 0.74]) {
        const pnt = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        const band = new THREE.CylinderGeometry(0.056, 0.056, 0.022, Math.max(12, seg), 1, true);
        const band2 = new THREE.CylinderGeometry(0.06, 0.06, 0.012, Math.max(12, seg), 1, true);
        const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
        // Mitte des Buendels: Mittelwert der fuenf Kabel an dieser Stelle
        const m = new THREE.Matrix4().compose(pnt, qq, new THREE.Vector3(1, 1, 1));
        band.applyMatrix4(m);
        band2.applyMatrix4(m);
        for (const g of [band, band2]) {
          partAttrs(THREE, g, { col: tok.titanium, rough: 0.34, metal: 1, code: PART.clamp, cls: 0 });
          body.push(g);
        }
      }
    }
  });

  // Kragen (Titan) mit Lichtlippe
  const collarY = bot.y + NECK.collar.dy;
  const collarZ = bot.z + NECK.collar.dz;
  const collar = new THREE.LatheGeometry(COLLAR_PROFILE.map(([r, h]) => new THREE.Vector2(r, h)), Math.max(32, Math.round(72 * q)));
  collar.scale(NECK.collar.sx, 1, NECK.collar.sz);
  collar.translate(0, collarY, collarZ);
  partAttrs(THREE, collar, {
    col: tok.titanium, rough: 0.3, metal: 1, code: PART.collar, cls: 1,
    br: (i, p, o) => { const r = Math.hypot(p.x, p.z - collarZ); o[0] = Math.atan2(p.x, p.z - collarZ) * r; o[1] = r; },
  });
  body.push(collar);

  // Kolben: Gelenke. Das obere Gelenk sitzt knapp in der Kopfunterseite (Montagebock dort)
  const pistons = [];
  const tmpP = new THREE.Vector3();
  for (const P of pistonDefs(THREE)) {
    // Strecke ueber das obere Gelenk hinaus verlaengern, falls dieses noch ausserhalb des Kopfes liegt
    const far = P.bot.clone().lerp(P.top, 1.8);
    const t = hullCrossing(THREE, shape, P.bot, far);
    let top0 = P.top.clone();
    if (t > 0) {
      tmpP.copy(P.bot).lerp(far, t);
      const dir = P.top.clone().sub(P.bot).normalize();
      top0 = tmpP.clone().addScaledVector(dir, 0.035);
      // Montageblock an der Kopfunterseite
      const blk = new THREE.BoxGeometry(0.07, 0.03, 0.06);
      blk.applyMatrix4(new THREE.Matrix4().compose(tmpP.clone().addScaledVector(dir, 0.005), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, 1, 1)));
      partAttrs(THREE, blk, { col: tok.graphite, rough: 0.55, metal: 0, code: PART.mount, cls: 0 });
      head.push(blk);
    }
    const botP = P.bot.clone();
    pistons.push({ top0, bot: botP, side: P.side });
    // Sockel auf dem Kragen
    const base = new THREE.CylinderGeometry(0.038, 0.046, 0.03, Math.max(10, seg), 1, false);
    base.translate(botP.x, collarY + 0.065, botP.z);
    partAttrs(THREE, base, { col: tok.graphite, rough: 0.5, metal: 0, code: PART.mount, cls: 1 });
    body.push(base);
  }

  // Instanz-Geometrien
  const vseg = Math.max(16, Math.round(40 * q));
  const vertebra = buildVertebraGeometry(THREE, vseg);
  partAttrs(THREE, vertebra, {
    col: tok.titanium, rough: 0.3, metal: 1, code: PART.vertebra, cls: 0,
    br: (i, p, o) => { const r = Math.hypot(p.x, p.z); o[0] = Math.atan2(p.x, p.z) * r; o[1] = p.y; },
  });
  const ringGap = (() => { const L = vertebraLayout(A); return Math.abs(L[1].y - L[0].y) - NECK.vertebra.h + 0.006; })();
  const ring = new THREE.CylinderGeometry(NECK.ring.r, NECK.ring.r, ringGap, Math.max(16, Math.round(32 * q)), 2, false);
  partAttrs(THREE, ring, { col: tok.rubber, rough: 0.86, metal: 0, code: PART.ring, cls: 0 });
  const cyl = new THREE.CylinderGeometry(NECK.cylinder.r, NECK.cylinder.r, NECK.cylinder.len, Math.max(12, Math.round(24 * q)), 4, false);
  cyl.translate(0, NECK.cylinder.len / 2 + 0.02, 0);
  partAttrs(THREE, cyl, {
    col: tok.graphite, rough: 0.48, metal: 0, code: PART.piston, cls: 0,
    part: (i, p, o) => { o[1] = p.y; o[2] = Math.atan2(p.z, p.x); },
  });
  const rod = new THREE.CylinderGeometry(NECK.rod.r, NECK.rod.r, NECK.rod.len, Math.max(8, Math.round(16 * q)), 1, false);
  rod.translate(0, -NECK.rod.len / 2 - 0.02, 0);
  partAttrs(THREE, rod, {
    col: tok.titanium.clone().multiplyScalar(1.08), rough: 0.16, metal: 1, code: PART.rod, cls: 0,
    br: (i, p, o) => { o[0] = Math.atan2(p.z, p.x) * NECK.rod.r; o[1] = p.y; },
  });
  // Gabelkopf: Block mit Bolzen
  const fork = new THREE.BoxGeometry(0.05, 0.04, 0.036);
  const pin = new THREE.CylinderGeometry(0.009, 0.009, 0.062, 10, 1, false);
  pin.rotateZ(Math.PI / 2);
  const clevis = mergeParts(THREE, [
    partAttrs(THREE, fork, { col: tok.titanium.clone().multiplyScalar(0.9), rough: 0.32, metal: 1, code: PART.clevis, cls: 0 }),
    partAttrs(THREE, pin, { col: tok.titanium, rough: 0.2, metal: 1, code: PART.clevis, cls: 0 }),
  ]);

  // Schrauben auf dem Kragen (8)
  const screws = [];
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const r = 0.43;
    const p = new THREE.Vector3(Math.sin(a) * r * NECK.collar.sx, collarY + 0.0585, collarZ + Math.cos(a) * r * NECK.collar.sz);
    screws.push({ p, n: new THREE.Vector3(Math.sin(a) * 0.12, 1, Math.cos(a) * 0.12).normalize(), panel: -1, head: false, size: 1 });
  }
  return {
    body: mergeParts(THREE, body), head: head.length ? mergeParts(THREE, head) : null,
    vertebra, ring, cylinder: cyl, rod, clevis, pistons, screws, layout: vertebraLayout(A), collarY, collarZ,
  };
}

/* ----------------------------------------------- Rumpf: Streben, Schrauben */
/** Punkt auf der Rumpfhuelle per Strahl (Ursprung o, Richtung dir). Liefert { p, n } oder null. */
export function makeTorsoCaster(THREE, hull) {
  const mesh = new THREE.Mesh(hull, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  const cast = (o, dir) => {
    rc.set(o, dir.clone().normalize());
    const hit = rc.intersectObject(mesh, false)[0];
    if (!hit) return null;
    const n = hit.face.normal.clone();
    if (n.dot(dir) > 0) n.negate();
    return { p: hit.point.clone(), n };
  };
  return { cast, dispose: () => mesh.material.dispose() };
}

/** Schrauben an den Enden der Titan-Baender (Schluesselbein-Streben), per Strahl auf die Rumpfhuelle */
export function strapScrews(THREE, caster, torsoKit) {
  const screws = [];
  const dir = new THREE.Vector3(0, -1, 0);
  torsoKit.straps.forEach((S, si) => {
    const k = torsoKit.id[si === 0 ? 'strapL' : 'strapR'];
    for (const t of [0.032, S.L - 0.032]) {
      const hit = caster.cast(new THREE.Vector3(S.x0 + S.ux * t, 1.0, S.z0 + S.uz * t), dir);
      if (hit) screws.push({ p: hit.p.addScaledVector(hit.n, torsoKit.height(k) + 0.0005), n: hit.n, panel: 100 + k, head: false, size: 0.85 });
    }
  });
  return screws;
}

/** Schraubenpositionen auf Kopf- und Rumpfplatten */
export function plateScrews(THREE, shape, headKit, torsoKit, caster) {
  const out = [];
  const B = new Float32Array(Math.max(headKit.NB, torsoKit.NB));
  const s = { p: new THREE.Vector3(), n: new THREE.Vector3() };
  const d = new THREE.Vector3();
  const onHead = (theta, phi, panelName, size = 1) => {
    headSample(THREE, shape, theta, phi, s);
    dirFromAngles(theta, phi, d);
    headKit.bases(s.p, d, B);
    const k = headKit.id[panelName];
    const h = headKit.height(k, B);
    out.push({ p: s.p.clone().addScaledVector(s.n, h + 0.0005), n: s.n.clone(), panel: k, head: true, size });
  };
  // Seitenschalen: 2 am Hinterrand
  for (const sd of [-1, 1]) {
    onHead(sd * 2.07, 0.24, sd < 0 ? 'sideL' : 'sideR');
    onHead(sd * 2.07, -0.18, sd < 0 ? 'sideL' : 'sideR');
  }
  // Service-Klappe: 4 Ecken (Hinterkopf, Position ueber x/y gesucht)
  const HC = headKit.HC;
  for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const tx = ox * (HC.hatchW - 0.024);
    const ty = HC.hatchY + oy * (HC.hatchH - 0.022);
    // Richtung mit diesem x/y auf der Rueckseite suchen
    let best = null;
    for (let it = 0; it < 3; it++) {
      const th = best ? best.th : Math.PI - tx;
      const ph = best ? best.ph : ty;
      let bt = th; let bp = ph;
      for (let k = 0; k < 6; k++) {
        headSample(THREE, shape, bt, bp, s);
        bt += (s.p.x - tx) / Math.max(0.3, Math.abs(s.p.z));
        bp -= (s.p.y - ty) / 0.95;
      }
      best = { th: bt, ph: bp };
    }
    onHead(best.th, best.ph, 'hatch', 0.85);
  }
  // Rumpf: Schulterkappen 6 je Seite am Innenrand, Brust 4, Ruecken 4
  const torsoAt = (o, dir, size = 1) => {
    const hit = caster.cast(o, dir);
    if (!hit) return;
    torsoKit.bases(hit.p, B);
    let k = 0;
    let best = 9;
    for (let j = 0; j < torsoKit.NB; j++) { const r = torsoKit.region(B, j); if (r < best) { best = r; k = j; } }
    const h = torsoKit.height(k);
    out.push({ p: hit.p.clone().addScaledVector(hit.n, h + 0.0005), n: hit.n.clone(), panel: 100 + k, head: false, size });
  };
  const down = new THREE.Vector3(0, -1, 0);
  for (const sd of [-1, 1]) {
    for (const z of [0.36, 0.2, 0.04, -0.12, -0.28, -0.44]) torsoAt(new THREE.Vector3(sd * 1.345, 1, z), down);
  }
  const back = new THREE.Vector3(0, 0, 1);
  const fwd = new THREE.Vector3(0, 0, -1);
  for (const [x, y] of [[-0.62, -2.62], [0.62, -2.62], [-0.98, -2.2], [0.98, -2.2]]) torsoAt(new THREE.Vector3(x, y, 3), fwd);
  for (const [x, y] of [[-0.9, -2.0], [0.9, -2.0], [-0.9, -2.7], [0.9, -2.7]]) torsoAt(new THREE.Vector3(x, y, -3), back);
  // Brustkern: 4 kleine Schrauben in den Ecken
  for (const [x, y] of [[-0.14, -1.915], [0.14, -1.915], [-0.14, -2.085], [0.14, -2.085]]) torsoAt(new THREE.Vector3(x, y, 3), fwd, 0.7);
  return out;
}

/** Sechskantschraube: Kopf (6 Seiten, leicht gewoelbt), Mitte im Ursprung, Achse +Y */
export function buildScrewGeometry(THREE, tok) {
  const prof = [[0.001, -0.004], [0.0125, -0.004], [0.0125, 0.0018], [0.0108, 0.0036], [0.006, 0.0044], [0.001, 0.0045]];
  const g = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 6);
  partAttrs(THREE, g, {
    col: tok.titanium, rough: 0.3, metal: 1, code: PART.screw, cls: 1,
    br: (i, p, o) => { o[0] = Math.atan2(p.z, p.x) * 0.01; o[1] = Math.hypot(p.x, p.z); },
  });
  return g;
}

export { UP };
