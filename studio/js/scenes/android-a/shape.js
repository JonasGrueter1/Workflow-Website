// Form-Konstanten und Hilfen fuer android-a: Schnittlinie (offener Hinterkopf) in JS und GLSL, Radial-Karte des Schaedels.
// Alle Koordinaten im Objektraum der Ruhepose (Kopf im Ursprung, Gesicht nach +Z, 1 Einheit ~ 10 cm).

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
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

/* ------------------------------------------------------------------ Schnittlinie */
// Tiefe der Grenze Gesicht/Mechanik (z) als Funktion der Hoehe y. Stuetzstellen alle 0.3 ab y = 1.2 nach unten.
// Vorne (z groesser) bleibt Porzellan, dahinter oeffnet sich der Kopf. Am Scheitel etwa Schaedelmitte, an der Schlaefe
// hinter dem Auge, vor dem Ohr, hinter dem Kieferwinkel, am Hals die hintere Haelfte.
export const CUT = {
  y0: 1.2,
  dy: 0.3,
  z: [-0.06, -0.02, 0.1, 0.29, 0.4, 0.37, 0.17, -0.09, -0.31, -0.5, -0.8, -0.9],
  neckY: -1.85, // darunter (Schultern, Brust) ist alles geschlossen (Hals v2 um 0.1 laenger)
};

function cutZ(y) {
  const s = (CUT.y0 - y) / CUT.dy;
  const n = CUT.z.length;
  const i = Math.max(0, Math.min(n - 2, Math.floor(s)));
  const u = Math.max(0, Math.min(1, s - i));
  const g = (k) => CUT.z[Math.max(0, Math.min(n - 1, k))];
  const p0 = g(i - 1); const p1 = g(i); const p2 = g(i + 1); const p3 = g(i + 2);
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}

/** > 0: offen (Mechanik), < 0: Porzellan. Wert ~ Abstand in Einheiten. */
export function cutField(x, y, z) {
  const a = cutZ(y) - z;
  const b = (y - CUT.neckY) * 0.8;
  return Math.min(a, b);
}

export const CUT_GLSL = /* glsl */ `
const float AA_CUT_Y0 = ${CUT.y0.toFixed(4)};
const float AA_CUT_DY = ${CUT.dy.toFixed(4)};
const float AA_CUT_NECK = ${CUT.neckY.toFixed(4)};
float aaCutZ(float y) {
  float zs[${CUT.z.length}] = float[${CUT.z.length}](${CUT.z.map((v) => v.toFixed(4)).join(', ')});
  float s = (AA_CUT_Y0 - y) / AA_CUT_DY;
  int n = ${CUT.z.length};
  int i = clamp(int(floor(s)), 0, n - 2);
  float u = clamp(s - float(i), 0.0, 1.0);
  float p0 = zs[max(i - 1, 0)];
  float p1 = zs[i];
  float p2 = zs[i + 1];
  float p3 = zs[min(i + 2, n - 1)];
  return 0.5 * ((2.0 * p1) + (-p0 + p2) * u + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * u * u + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * u * u * u);
}
float aaCut(vec3 p) {
  return min(aaCutZ(p.y) - p.z, (p.y - AA_CUT_NECK) * 0.8);
}
`;

/* ------------------------------------------------------------------ Radial-Karte */
// Schaedel als Funktion der Richtung: Abstand vom Zentrum RC. Pole liegen auf der X-Achse (unter den Ohrmodulen),
// damit die Rueckseite des Kopfes ohne Verzerrung parametrisiert ist.
//   a = Winkel um die X-Achse (0 = +Z vorne, pi/2 = oben, pi = hinten), b = asin(x / r) (-pi/2..pi/2)
export const RC = [0, 0.02, -0.06];
export const RMAP = { na: 128, nb: 64 };

export function dirAB(a, b, out) {
  const cb = Math.cos(b);
  out.x = Math.sin(b);
  out.y = Math.sin(a) * cb;
  out.z = Math.cos(a) * cb;
  return out;
}

/**
 * Radial-Karte aus den Punkten des (unterteilten) Netzes. Ohren (Boxen) werden ausgelassen und aufgefuellt,
 * danach weich geglaettet. Gilt nur fuer den Schaedel (y ueber yMin).
 */
export function buildRadialMap(pos, ears, yMin = -0.95) {
  const { na, nb } = RMAP;
  const r = new Float32Array(na * nb).fill(-1);
  const n = pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3] - RC[0];
    const y = pos[i * 3 + 1] - RC[1];
    const z = pos[i * 3 + 2] - RC[2];
    if (pos[i * 3 + 1] < yMin) continue;
    let skip = false;
    for (const e of ears) {
      if (pos[i * 3] > e.min[0] - 0.03 && pos[i * 3] < e.max[0] + 0.03 && pos[i * 3 + 1] > e.min[1] - 0.03
        && pos[i * 3 + 1] < e.max[1] + 0.03 && pos[i * 3 + 2] > e.min[2] - 0.03 && pos[i * 3 + 2] < e.max[2] + 0.03) skip = true;
    }
    if (skip) continue;
    const l = Math.hypot(x, y, z);
    if (l < 1e-5) continue;
    let a = Math.atan2(y, z);
    if (a < 0) a += Math.PI * 2;
    const b = Math.asin(Math.max(-1, Math.min(1, x / l)));
    const ia = Math.min(na - 1, Math.floor((a / (Math.PI * 2)) * na));
    const ib = Math.min(nb - 1, Math.floor(((b + Math.PI / 2) / Math.PI) * nb));
    const k = ib * na + ia;
    if (l > r[k]) r[k] = l;
  }
  // Loecher fuellen (Nachbarn mitteln, mehrere Durchgaenge)
  for (let pass = 0; pass < 40; pass++) {
    let holes = 0;
    const src = r.slice();
    for (let ib = 0; ib < nb; ib++) {
      for (let ia = 0; ia < na; ia++) {
        const k = ib * na + ia;
        if (src[k] > 0) continue;
        let s = 0; let c = 0;
        for (let db = -1; db <= 1; db++) {
          const jb = ib + db;
          if (jb < 0 || jb >= nb) continue;
          for (let da = -1; da <= 1; da++) {
            const v = src[jb * na + ((ia + da + na) % na)];
            if (v > 0) { s += v; c++; }
          }
        }
        if (c) r[k] = s / c; else holes++;
      }
    }
    if (!holes) break;
  }
  // Glaetten (3 x Box 3x3)
  for (let pass = 0; pass < 3; pass++) {
    const src = r.slice();
    for (let ib = 0; ib < nb; ib++) {
      for (let ia = 0; ia < na; ia++) {
        let s = 0; let c = 0;
        for (let db = -1; db <= 1; db++) {
          const jb = Math.max(0, Math.min(nb - 1, ib + db));
          for (let da = -1; da <= 1; da++) { s += src[jb * na + ((ia + da + na) % na)]; c++; }
        }
        r[ib * na + ia] = s / c;
      }
    }
  }
  const sample = (a, b) => {
    let aa = a % (Math.PI * 2);
    if (aa < 0) aa += Math.PI * 2;
    const fa = (aa / (Math.PI * 2)) * na - 0.5;
    const fb = Math.max(0, Math.min(nb - 1.001, ((b + Math.PI / 2) / Math.PI) * nb - 0.5));
    const ia = Math.floor(fa); const ib = Math.floor(fb);
    const ua = fa - ia; const ub = fb - ib;
    const g = (i, j) => r[Math.min(nb - 1, j) * na + ((i % na) + na) % na];
    return (g(ia, ib) * (1 - ua) + g(ia + 1, ib) * ua) * (1 - ub) + (g(ia, ib + 1) * (1 - ua) + g(ia + 1, ib + 1) * ua) * ub;
  };
  return { r, sample };
}
