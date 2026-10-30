// Android B: Aufteilung der Schale (Fugen und Oeffnungen) als Felder in Ruhelage-Koordinaten (ARCHITEKTUR-Masse:
// Kopfmitte im Ursprung, Gesicht +Z, Kinn y -1, Scheitel y 1, Unterkante y -3.5). Meist symmetrisch: q = (|x|, y, z).
// Die Brust ist asymmetrisch (lSide = Vorzeichen von x): rechts im Bild (x < 0) eine weisse Brustplatte mit
// Rippenschlitzen, links offener Muskel.
//
// seamField(p): ungefaehre Distanz zur naechsten Fuge (Nullstellen glatter Funktionen, auf Bereiche begrenzt).
//   Der Shader rechnet daraus mit dem Tangential-Gradienten die Distanz auf der Oberflaeche (gleichmaessige Fugenbreite).
//   Gesicht in vier Platten: Stirn, Augenpartie mit Nasenruecken, Wange mit Kiefer, Mund und Kinn. Feine Lidfuge.
// openField(p): < 0 dort, wo keine Schale ist.
//   tief offen (deepOpen, auch keine Muskelschicht): Hinterkopf ab der Ohr-Platte (Mechanik, Kabel, Glas),
//   Hals rundum (Kopfwender, Kehlkopf, Wirbel), Schlitz zwischen den Schulterblaettern (dort tauchen die Kabel ein).
//   Muskel offen: Rumpf vorne ausserhalb der Platten, Schulterring.

export const LAYOUT = {
  shoulder: [1.473, -2.257, -0.29],
  armDir: [0.199, -0.98, 0.017],
  ringAt: 0.5,
  ringHalf: 0.03,
  deltoid: [1.56, -2.02, -0.24],
  deltoidR: 0.6,
  // Hinterkopf-Fenster: Bogen ab th0 (Winkel von vorne) bis hinten, y von bot bis top. Glas oberhalb von glassY.
  skull: { th0: 2.0, top: 0.36, bot: -0.44, glassY: 0.0 },
  // Brustplatte: Unterrand als Kreisbogen (Mitte, Radius)
  pecC: [0.08, -1.74],
  pecR: 1.16,
};

const f3 = (a) => `vec3(${a.map((x) => x.toFixed(4)).join(', ')})`;
const f2 = (a) => `vec2(${a.map((x) => x.toFixed(4)).join(', ')})`;
const SK = LAYOUT.skull;

export const LAYOUT_GLSL = /* glsl */ `
// Oberarm-Gewicht des aktuellen Punkts (aus dem Skinning, 0 Rumpf .. 1 Arm) und Seite, vor dem Aufruf setzen
float lArm = 0.0;
float lSide = 1.0;
float lArmSdf() { return (0.45 - lArm) * 0.35; }
float lSmax(float a, float b, float k) { float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float lSmin(float a, float b, float k) { return -lSmax(-a, -b, k); }
float lSeg(float s, float m) { return max(abs(s), -m); }
float lRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float lLine(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

// Gesichtsmaske: < 0 innerhalb (unter dem Haaransatz, vor der Ohr-Platte, ueber der Kieferlinie)
float lJaw(vec3 q) { return -(q.y + 0.62 + 0.63 * (q.z - 0.05)) / 1.183; }
float lFace(vec3 q) {
  float A = q.y - (0.56 - 0.5 * q.x * q.x);
  float rxz = length(q.xz);
  float th = atan(q.x, q.z);
  float ths = 1.2 + 0.36 * smoothstep(-0.12, -0.62, q.y);
  float B = (th - ths) * rxz;
  return lSmax(lSmax(A, B, 0.08), lJaw(q), 0.05);
}
float lRing(vec3 q) { return q.y - (0.43 - 0.06 * q.z); }

// Fugen der Gesichtsplatten (Vorderansicht x/y, nur x >= 0): Stirn | Augenpartie mit Nase | Wange mit Kiefer | Mund und Kinn
float lFaceSeams(vec2 p) {
  float d = lLine(p, vec2(-0.01, 0.214), vec2(0.2, 0.236));
  d = min(d, lLine(p, vec2(0.2, 0.236), vec2(0.42, 0.232)));
  d = min(d, lLine(p, vec2(0.42, 0.232), vec2(0.62, 0.196)));
  d = min(d, lLine(p, vec2(0.62, 0.196), vec2(0.9, 0.12)));
  // unter dem Auge zum Nasenfluegel
  d = min(d, lLine(p, vec2(0.9, -0.03), vec2(0.56, -0.125)));
  d = min(d, lLine(p, vec2(0.56, -0.125), vec2(0.4, -0.168)));
  d = min(d, lLine(p, vec2(0.4, -0.168), vec2(0.245, -0.178)));
  d = min(d, lLine(p, vec2(0.245, -0.178), vec2(0.168, -0.212)));
  d = min(d, lLine(p, vec2(0.168, -0.212), vec2(0.142, -0.33)));
  d = min(d, lLine(p, vec2(0.142, -0.33), vec2(0.158, -0.428)));
  // unter der Nase
  d = min(d, lLine(p, vec2(0.158, -0.428), vec2(0.06, -0.452)));
  d = min(d, lLine(p, vec2(0.06, -0.452), vec2(-0.01, -0.455)));
  // Nasolabial-Linie zum Kiefer
  d = min(d, lLine(p, vec2(0.158, -0.428), vec2(0.228, -0.502)));
  d = min(d, lLine(p, vec2(0.228, -0.502), vec2(0.292, -0.622)));
  d = min(d, lLine(p, vec2(0.292, -0.622), vec2(0.312, -0.8)));
  d = min(d, lLine(p, vec2(0.312, -0.8), vec2(0.322, -1.08)));
  return d;
}
// Lidfuge: oberer Bogen knapp ueber dem Auge (Lidfalte)
float lLid(vec2 p) {
  vec2 r = vec2(0.15, 0.078);
  vec2 d = (p - vec2(0.3, -0.012)) / r;
  return max(abs(length(d) - 1.0) * 0.08, (0.012 - p.y) * 0.6);
}

// Hals: Polarwinkel um die Halsachse (0 vorne, pi hinten)
float lNeckTh(vec3 q, out float rn) {
  float zn = -0.21 - 0.12 * clamp(-1.0 - q.y, -0.4, 0.6);
  vec2 d = vec2(q.x, q.z - zn);
  rn = max(length(d), 0.2);
  return atan(d.x, d.y);
}
float lHeadSdf(vec3 q) { return min(lJaw(q), max(-(q.y + 0.64 - 0.06 * q.z), q.z - 0.05)); }
// Hals rundum offen: zwischen Kopf (Kiefer, Schaedelbasis) und Rumpf (Schluesselbein vorne, Trapez hinten)
float lNeckBand(vec3 q) {
  float rn;
  float th = lNeckTh(q, rn);
  float bot = -1.6 + 0.13 * smoothstep(0.55, 1.6, th);
  float w = max(bot - q.y, -lHeadSdf(q));
  return max(w, rn - 0.52);
}
// Hinterkopf: Fenster ab der Ohr-Platte nach hinten
float lSkullWin(vec3 q) {
  float rxz = length(q.xz);
  float th = atan(q.x, q.z);
  float u = (3.14159 - th) * rxz;
  float uMax = (3.14159 - ${SK.th0.toFixed(3)}) * 0.8;
  float yc = ${(0.5 * (SK.top + SK.bot)).toFixed(3)};
  float yh = ${(0.5 * (SK.top - SK.bot)).toFixed(3)};
  return lRoundBox(vec2(u, q.y - yc), vec2(uMax, yh), 0.22);
}
// Schlitz zwischen den Schulterblaettern: hier tauchen die Kabel in den Rumpf
float lBackSlot(vec3 q) {
  float s = lRoundBox(vec2(q.x, q.y + 1.86), vec2(0.19 - 0.05 * smoothstep(-1.5, -2.3, q.y), 0.42), 0.11);
  return max(s, q.z + 0.3);
}
// tief offen: keine Schale, keine Muskelschicht (Blick auf Mechanik)
float deepOpen(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  return min(min(lNeckBand(q), lSkullWin(q)), lBackSlot(q));
}
// Glas ueber dem oberen Teil des Hinterkopf-Fensters (> 0: Glas)
float glassField(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  return min(-lSkullWin(q) - 0.012, q.y - (${SK.glassY.toFixed(3)} + 0.05 * q.x * q.x));
}

// Schluesselbein-Linie (y in Abhaengigkeit von x)
float lClavY(float x) { return -1.66 - 0.16 * (x - 0.12) + 0.035 * sin((x - 0.12) * 2.8); }
vec3 lDelt() { return ${f3(LAYOUT.deltoid)}; }
float lDeltSdf(vec3 q) {
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - lDelt();
  float t = dot(rel, ad);
  rel -= ad * t * (1.0 - 1.0 / 1.3);
  return length(rel) - ${LAYOUT.deltoidR.toFixed(3)} * 0.93;
}
// Unterrand der Brustplatte (Kreisbogen) und Rippenschlitze parallel dazu
float lPecLow(vec3 q) { return length(q.xy - ${f2(LAYOUT.pecC)}) - ${LAYOUT.pecR.toFixed(3)}; }

// Platten des vorderen Rumpfs: < 0 innerhalb
float lPlates(vec3 q) {
  float cy = lClavY(q.x);
  // Schluesselbein-Spange
  float clav = lSmax(abs(q.y - cy) - 0.05, lSmax(0.13 - q.x, q.x - 1.26, 0.05), 0.04);
  float dd = lDeltSdf(q);
  float pec = 1e3;
  if (lSide < 0.0) {
    // Brustplatte wie der grosse Brustmuskel: vom Brustbein zur Achsel, oben Schluesselbein, unten runder Bogen
    float xLat = 1.12;
    float inside = lSmax(lSmax(0.012 - q.x, q.y - (cy - 0.085), 0.05), lSmax(lPecLow(q), lSmax(0.05 - dd, q.x - xLat, 0.1), 0.08), 0.06);
    // Rippenschlitze: drei Boegen parallel zum Unterrand
    float slit = 1e3;
    for (int k = 0; k < 3; k++) {
      float rk = 0.13 + 0.1 * float(k);
      float xe = 0.9 - 0.12 * float(k);
      float s = lSmax(abs(lPecLow(q) + rk) - 0.017, max(0.16 - q.x, q.x - xe), 0.03);
      slit = min(slit, s);
    }
    pec = max(inside, -slit);
  }
  // Schulterkappe
  float delt = dd;
  // Oberarm-Schale unter dem Schulterring
  vec3 S = ${f3(LAYOUT.shoulder)};
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - S;
  float ta = dot(rel, ad);
  float sleeve = lSmax(${(LAYOUT.ringAt + LAYOUT.ringHalf).toFixed(3)} - ta, lArmSdf(), 0.03);
  float upper = lSmax(ta - ${(LAYOUT.ringAt - LAYOUT.ringHalf).toFixed(3)}, lArmSdf(), 0.03);
  sleeve = min(sleeve, upper);
  return min(min(clav, pec), min(delt, sleeve));
}

float seamField(vec3 p) {
  lSide = p.x < 0.0 ? -1.0 : 1.0;
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = 1e3;
  if (q.y > -1.15) {
    float face = lFace(q);
    // Gesichtsmaske (nur am Kopf, nicht am Hals)
    d = min(d, max(abs(face), -(q.y + 0.75 + 0.6 * max(q.z, 0.0))));
    // Platten im Gesicht und Lidfuge
    if (q.z > 0.12 && face < 0.05) {
      d = min(d, max(lFaceSeams(q.xy), face));
      d = min(d, lLid(q.xy));
    }
    // Schaedeldecke: Ring ausserhalb der Maske, Scheitelnaht darueber
    float R = lRing(q);
    d = min(d, lSeg(R, face));
    d = min(d, max(q.x, max(-R, -face)));
  }
  // Ruecken: Schulterblatt
  d = min(d, max(abs(length(q - vec3(0.78, -2.6, -1.1)) - 0.62), max(q.z + 0.45, 0.12 - q.x)));
  // Schulterkappe: Fuge hinten (Kappe gegen Ruecken)
  d = min(d, max(abs(lDeltSdf(q)), max(q.z + 0.2, 1.0 - q.x)));
  // Oberarm: Laengsfuge aussen
  vec3 S = ${f3(LAYOUT.shoulder)};
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - S;
  float ta = dot(rel, ad);
  vec3 radial = rel - ad * ta;
  d = min(d, max(abs(radial.z + 0.02), max(max(${LAYOUT.ringAt.toFixed(3)} - ta, lArmSdf()), -radial.x)));
  return d;
}

// Gravierte Linien (keine Oeffnung, nur Rille): Schulterkappe innen
float grooveField(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  return max(abs(lDeltSdf(q) + 0.075), 1.02 - q.x);
}

float openField(vec3 p) {
  lSide = p.x < 0.0 ? -1.0 : 1.0;
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float o = deepOpen(p);
  // Rumpf vorne: offen, wo keine Platte liegt
  float front = lSmax(q.y + 1.38, -(q.z + 0.22 - 0.06 * q.x), 0.05);
  o = min(o, max(front, -lPlates(q)));
  // Schulterring rundum
  vec3 S = ${f3(LAYOUT.shoulder)};
  vec3 ad = ${f3(LAYOUT.armDir)};
  vec3 rel = q - S;
  float ta = dot(rel, ad);
  o = min(o, max(abs(ta - ${LAYOUT.ringAt.toFixed(3)}) - ${LAYOUT.ringHalf.toFixed(3)}, lArmSdf()));
  return o;
}
`;
