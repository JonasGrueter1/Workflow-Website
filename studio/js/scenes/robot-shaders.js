// Materialien des Roboters (Version 2).
//
//   Platten (Kopf, Rumpf): MeshPhysicalMaterial mit eingehaengten Shader-Teilen. Pro Pixel: eigene Platte aus der
//     Abstandsfunktion (robot-parts.js), Fuge verwerfen (dahinter liegt die Innenschale), gerundete Fase per Bump,
//     Kantenabnutzung, Gravuren, Loecher (Lueftung, Lautsprecher), Status-Schlitze, Keramik oder Graphit.
//   Bauteile (alles andere): ein Material mit Vertex-Attributen (Farbe, Rauheit, Metall, Teil-Code), Buerstung fuer
//     Metall, Nuten, Warnstreifen, Lichtimpulse in Kabeln, Status-Punkte und Iris der Ohren, Lichtlippe am Kragen.
//   Glas: getoent, Spiegelung bleibt bei geringer Deckkraft voll (vormultipliziertes Alpha), Fresnel-Rand.
//   LED-Platine: eigenes ShaderMaterial (Punktmatrix 65 x 15, Augen, Blinzeln, Scan, Startsequenz, Denken, Laecheln).
//   Hologramm: additiv, Plattenkanten als feine Eis-Linien, Hoehenlinien, Fresnel. Fuer Aufbau und Roentgenblick.
//
// Gemeinsame Uniforms (U, robot.js): Zeit, Aufbau-Ebene uBuildY, Roentgen-Scan uScanY/uDissolve/uXray,
// Kopfmatrix uHeadMat, Plattenversatz uPanelOff/uPanelN (Kopf) und uTorsoOff/uTorsoN (Rumpf), Lichtfarben.
// Die Fabriken sind exportiert, damit die Gehirn-Hardware (brain-hardware.js) Titan, Graphit und Gummi mit gleicher
// Buerstung und gleicher Roentgen-Toenung nutzen kann: makePartMaterial(THREE, U, { env }).

/* ------------------------------------------------------------ Farb-Tokens */
// sRGB-Hex. Kommen aus config.js (HEX), sobald dort vorhanden; sonst diese Werte (Konzept V2, Kapitel 1.2).
export const ROBOT_HEX = Object.freeze({
  ceramic: 0xa9b1b9, graphite: 0x1b2129, titanium: 0x8e969e, rubber: 0x0b0d10, glass: 0x05080b,
  pcb: 0x0c1620, gold: 0xd4a457, alu: 0xb9c0c6, copper: 0xb87346,
});
// Rueckfallebene "dunkel" (nur dev.html mit ?robot=dark)
export const ROBOT_HEX_DARK = Object.freeze({ ceramic: 0x3a424c, graphite: 0x14181e });

export function robotTokens(THREE, palette, dark = false) {
  const out = {};
  for (const [k, hex] of Object.entries(ROBOT_HEX)) {
    const h = dark && ROBOT_HEX_DARK[k] !== undefined ? ROBOT_HEX_DARK[k] : null;
    out[k] = h !== null ? new THREE.Color(h) : palette && palette[k] ? palette[k].clone() : new THREE.Color(hex);
  }
  return out;
}

/* ------------------------------------------------------------------- GLSL */
export const NOISE = /* glsl */ `
vec3 rbMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 rbMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 rbPermute(vec4 x) { return rbMod289(((x * 34.0) + 10.0) * x); }
float rbSnoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = rbMod289(i);
  vec4 p = rbPermute(rbPermute(rbPermute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float rbHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float rbHash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
// 1D-Wertrauschen (Buerstung)
float rbVN(float x) { float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(rbHash1(i), rbHash1(i + 1.0), u); }
`;

// Sichtbarkeit: Aufbau von unten (uBuildY) als feine Abtastlinie mit Funken. Roentgen-Scan von oben (uScanY):
// darueber verschwinden Schalenteile (useScan = 1), Mechanik bleibt (useScan = 0). Rueckgabe < 0: verwerfen.
export const MASK = /* glsl */ `
uniform float uTime;
uniform float uBuildY;
uniform float uDissolve;
uniform float uScanY;
uniform float uXray;
float rbMask(vec3 p, float useScan, out float edge) {
  edge = 0.0;
  bool scan = uDissolve > 0.0 && useScan > 0.5;
  if (uBuildY > 1.4 && !scan) return 1.0;
  float b = 9.0;
  if (uBuildY <= 1.4) {
    vec3 c = floor(p * 60.0);
    float r = rbHash(c);
    float n = rbSnoise(vec3(p.x * 5.0, p.z * 5.0, p.y * 1.5 + uTime * 0.3));
    b = uBuildY - (p.y + n * 0.012 + (r - 0.5) * 0.006);
    float w = clamp(fwidth(b) * 1.1, 0.0025, 0.008);
    float line = 1.0 - smoothstep(w * 0.5, w * 2.0, abs(b));
    float glow = exp(-abs(b) / 0.025) * 0.08;
    float spark = step(0.99, rbHash(c + floor(uTime * 9.0))) * (1.0 - smoothstep(0.0, 0.03, abs(b)));
    edge = line * 0.42 + glow + spark * 1.1;
  }
  float d = 9.0;
  if (scan) {
    d = uScanY - p.y;
    float wd = clamp(fwidth(d) * 1.2, 0.002, 0.006);
    float onHead = mix(0.22, 1.0, smoothstep(-2.0, -1.2, p.y));
    float lineD = 1.0 - smoothstep(wd * 0.5, wd * 2.0, abs(d));
    float glowD = exp(-abs(d) / 0.05) * 0.14;
    edge = max(edge, (lineD * 0.8 + glowD) * onHead);
  }
  return min(b, d);
}
`;

export const SKIN = /* glsl */ `
uniform mat4 uHeadMat;
float rbSkinW(vec3 p) { return smoothstep(-1.32, -0.82, p.y); }
vec3 rbSkin(vec3 p) { return mix(p, (uHeadMat * vec4(p, 1.0)).xyz, rbSkinW(p)); }
vec3 rbSkinN(vec3 n, vec3 p) { return normalize(mix(n, mat3(uHeadMat) * n, rbSkinW(p))); }
`;

export const SEAMS = /* glsl */ `
// Rinne mit Gauss-Profil (Gravur, Nut) als Bump. d: vorzeichenbehafteter Abstand in Einheiten.
// Zu feine Rinnen werden verbreitert und abgeschwaecht (kein Flimmern in der Ferne).
void rbSeamM(float d, float w, float depth, float mask, inout float g, inout vec2 dH) {
  vec2 dd = vec2(dFdx(d), dFdy(d));
  float fw = length(dd) + 1e-6;
  float we = max(w, fw * 0.85);
  float amp = (w / we) * mask;
  float x = d / we;
  float gg = exp(-x * x) * amp;
  g = max(g, gg);
  dH += depth * 2.0 * x / we * gg * dd;
}
// Bump nach Mikkelsen, Hoehe in Welt-Einheiten. sx/sy: Ableitungen der Position (vor einem discard berechnet)
vec3 rbPerturb(vec3 sx, vec3 sy, vec3 n, vec2 dHdxy, float faceDir) {
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * n - grad);
}
// Sechseck-Raster: Abstand zur Zellmitte (Zelle 1 breit)
vec2 rbHexCell(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
`;

// Licht-Uniforms aller Robotermaterialien
const LIGHT_UNIFORMS = /* glsl */ `
uniform vec3 uSig;
uniform vec3 uIce;
uniform vec3 uEmber;
uniform vec3 uEdgeCol;
uniform vec3 uLeakCol;
uniform vec3 uRimCol;
uniform vec3 uEnvTint;
uniform float uLeak;
uniform float uEar;
uniform float uIris;
uniform vec2 uPulse;
uniform vec3 uCrest;
uniform vec3 uCore;
uniform float uLip;
`;

/* -------------------------------------------------------------- Hilfen */
// Modulation nach der Lichtberechnung: Verdeckung, Spiegelungen einfaerben (Lichtfarbe des Beats), Glanz begrenzen
const AO_BLOCK = /* glsl */ `
reflectedLight.indirectDiffuse *= rbAO;
reflectedLight.indirectSpecular *= rbAO * uEnvTint;
reflectedLight.directDiffuse *= mix(1.0, rbAO, 0.75);
reflectedLight.directSpecular *= mix(1.0, rbAO, 0.75);
#ifdef USE_CLEARCOAT
clearcoatSpecularIndirect *= rbAO * uEnvTint;
clearcoatSpecularDirect *= mix(1.0, rbAO, 0.75) * 0.6;
clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(1.4));
clearcoatSpecularIndirect = min(clearcoatSpecularIndirect, vec3(1.6));
#endif
reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(1.6));
reflectedLight.indirectSpecular = min(reflectedLight.indirectSpecular, vec3(1.8));
`;

function hookCommon(shader, U) {
  for (const k of Object.keys(U)) shader.uniforms[k] = U[k];
}

/* ------------------------------------------------------- Platten-Material */
// kind: 'head' | 'torso'. glsl: Abstandsfunktionen der Platten (robot-parts.js). C: Konstanten fuer Dekore.
export function makeShellMaterial(THREE, U, kind, kitGlsl, C, params) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, ...params });
  const head = kind === 'head';
  mat.defines = { [head ? 'RB_HEADSHELL' : 'RB_TORSOSHELL']: '' };
  mat.customProgramCacheKey = () => `robot-shell-${kind}`;
  const gf = C.gf;
  const decoHead = head ? /* glsl */ `
  if (id == ${C.id.back}) {
    float hs = 9.0;
    for (int i = 0; i < 8; i++) { float yc = ${gf(C.ventY0)} + float(i) * 0.036; hs = min(hs, rbRBox(vec2(p.x, p.y - yc), vec2(0.13, 0.0062), 0.006)); }
    s = min(s, hs);
  }
  if (id == ${C.id.chin}) {
    float hs = 9.0;
    for (int i = 0; i < 7; i++) { float yc = ${gf(C.chinY)} + float(i - 3) * 0.022; hs = min(hs, rbRBox(vec2(p.x, p.y - yc), vec2(0.12, 0.0042), 0.0042)); }
    s = min(s, hs);
  }` : /* glsl */ `
  if (id == ${C.id.backplate}) {
    float hs = 9.0;
    for (int i = 0; i < 5; i++) { float yc = -2.22 - float(i) * 0.042; hs = min(hs, rbRBox(vec2(p.x, p.y - yc), vec2(0.16, 0.0075), 0.0075)); }
    s = min(s, hs);
  }`;
  const decoHead2 = head ? /* glsl */ `
  if (id == ${C.id.crest}) {
    rbSeamM(p.x, 0.0015, 0.0011, smoothstep(0.02, 0.05, s), g, dH);
    float psi = atan(p.y, p.z);
    float rr = length(p.yz);
    for (int i = 0; i < 3; i++) {
      float pc = ${gf(C.slit0)} + float(i) * ${gf(C.slitD)};
      float sd = rbRBox(vec2(p.x, (psi - pc) * rr), vec2(0.025, 0.006), 0.0055);
      float fs = max(fwidth(sd), 1e-5);
      float inS = 1.0 - smoothstep(-fs, fs, sd);
      g = max(g, inS * 0.92);
      rbSeamM(sd, 0.0013, 0.0011, 1.0, g, dH);
      emit += uSig * inS * uCrest[i] * 2.0;
    }
  }
  if (id == ${C.id.forehead}) {
    float fd = rbHeadFace(d);
    float side = -(abs(p.x) * ${gf(C.cf)} - p.z * ${gf(C.sf)});
    float m = smoothstep(0.035, 0.06, side);
    rbSeamM(fd - 0.036, 0.0016, 0.0012, m, g, dH);
    rbSeamM(fd - 0.06, 0.0016, 0.0012, m, g, dH);
  }
  if (id == ${C.id.sideL} || id == ${C.id.sideR}) {
    bool L = id == ${C.id.sideL};
    vec3 v = p - (L ? ${C.earL.c} : ${C.earR.c});
    vec2 u = vec2(dot(v, L ? ${C.earL.t1} : ${C.earR.t1}), dot(v, L ? ${C.earL.t2} : ${C.earR.t2}));
    float fd = rbRBox(u - vec2(0.0, 0.375), vec2(0.15, 0.08), 0.02);
    rbSeamM(fd, 0.0017, 0.0013, 1.0, g, dH);
    rbSeamM(fd + 0.014, 0.0011, 0.0007, 0.7, g, dH);
  }
  if (id == ${C.id.jawL} || id == ${C.id.jawR}) {
    rbSeamM(s - 0.03, 0.0015, 0.0011, 1.0, g, dH);
  }
  if (id == ${C.id.hatch}) {
    float nd = rbRBox(vec2(p.x, p.y - (${gf(C.hatchY + 0.05)})), vec2(0.026, 0.0055), 0.0055);
    rbSeamM(nd, 0.0018, 0.0014, 1.0, g, dH);
    g = max(g, (1.0 - smoothstep(-0.001, 0.001, nd)) * 0.7);
  }
  if (id == ${C.id.chin}) {
    float sd = length(vec2(p.x, p.y - (${gf(C.chinY - 0.1)}))) - 0.008;
    float inS = 1.0 - smoothstep(-0.0012, 0.0012, sd);
    rbSeamM(sd, 0.0012, 0.001, 1.0, g, dH);
    emit += uEmber * inS * 0.45 * uEar;
    cc = mix(cc, 1.0, inS);
  }` : /* glsl */ `
  if (id == ${C.id.core}) {
    for (int i = 0; i < 3; i++) {
      float sd = length(vec2(p.x - float(i - 1) * 0.05, p.y - (${gf(C.coreY + 0.04)}))) - 0.008;
      float inS = 1.0 - smoothstep(-0.0015, 0.0015, sd);
      rbSeamM(sd, 0.0012, 0.001, 1.0, g, dH);
      emit += (i == 2 ? uEmber : uSig) * inS * uCore[i] * 2.4;
    }
    rbSeamM(abs(p.y - (${gf(C.coreY + 0.005)})) - 0.0, 0.0012, 0.0008, step(abs(p.x), 0.12), g, dH);
  }
  if (id == ${C.id.trapL} || id == ${C.id.trapR}) {
    vec2 hc = rbHexCell(vec2(p.x, p.z) / 0.03);
    float hd = (length(hc) - 0.28) * 0.03;
    float fh = max(fwidth(hd), 1e-5);
    float holeM = (1.0 - smoothstep(-fh, fh, hd)) * smoothstep(0.02, 0.04, s) * clamp(1.6 - fh / 0.004, 0.0, 1.0);
    g = max(g, holeM * 0.85);
    ao *= 1.0 - 0.5 * holeM;
  }
  if (id == ${C.id.chest} || id == ${C.id.backplate}) {
    rbSeamM(p.x, 0.0018, 0.0014, smoothstep(0.03, 0.06, s), g, dH);
  }
  if (id == ${C.id.capL} || id == ${C.id.capR}) {
    rbSeamM(s - 0.045, 0.0017, 0.0013, 1.0, g, dH);
  }`;

  const graphCond = head ? `(id == ${C.id.chin} || id == ${C.id.under})` : `(id == ${C.id.core} || id == ${C.id.trapL} || id == ${C.id.trapR})`;
  const metalCond = head ? 'false' : `(id == ${C.id.strapL} || id == ${C.id.strapR})`;
  const regionCall = head ? 'rbHeadRegion(id, p, d)' : 'rbTorsoRegion(id, p)';

  mat.onBeforeCompile = (shader) => {
    hookCommon(shader, U);
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', `#include <common>
attribute float aPanel;
attribute float aH;
${head ? 'attribute vec3 aDir;\nvarying vec3 vRDir;' : ''}
uniform float ${head ? 'uPanelOff[16]' : 'uTorsoOff[12]'};
uniform vec3 ${head ? 'uPanelN[16]' : 'uTorsoN[12]'};
varying vec3 vRL;
flat varying int vRPanel;
`);
    vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
vRL = position;
int rbPid = int(aPanel + 0.5);
vRPanel = rbPid;
${head ? 'vRDir = aDir;' : ''}
transformed += objectNormal * aH + ${head ? 'uPanelN[rbPid] * uPanelOff[rbPid]' : 'uTorsoN[rbPid] * uTorsoOff[rbPid]'};
`);
    fs = fs.replace('#include <common>', `#include <common>
${NOISE}
${MASK}
${SEAMS}
${C.sdfGlsl}
${kitGlsl}
${LIGHT_UNIFORMS}
uniform vec3 uCeramic;
uniform vec3 uGraphite;
uniform vec3 uTitanium;
varying vec3 vRL;
flat varying int vRPanel;
${head ? 'varying vec3 vRDir;' : ''}
#define RB_GAP ${gf(C.gap)}
#define RB_BEVEL ${gf(C.bevel)}
void rbShell(int id, vec3 p, vec3 d, inout vec3 col, inout float rough, inout float cc, inout float g, inout vec2 dH, inout float ao, inout vec3 emit, out float s, out float wear, out float met) {
  s = -${regionCall} - RB_GAP * 0.5;
${decoHead}
  float fw = max(fwidth(s), 1e-5);
  float t = clamp(s / RB_BEVEL, 0.0, 1.0);
  float hb = -RB_BEVEL * 0.7 * (1.0 - sin(t * 1.5707963));
  float sharp = clamp(2.2 - fw / RB_BEVEL * 2.4, 0.0, 1.0);
  dH += vec2(dFdx(hb), dFdy(hb)) * sharp;
  float cav = 1.0 - smoothstep(0.0, max(fw * 1.8, RB_BEVEL * 0.3), s);
  ao *= 1.0 - 0.62 * cav;
  wear = smoothstep(0.18, 0.5, t) * (1.0 - smoothstep(0.62, 1.0, t)) * sharp;
${decoHead2}
  bool graph = ${graphCond};
  bool metal = ${metalCond};
  col = graph ? uGraphite : uCeramic;
  col *= 1.0 + (rbHash1(float(id) + 3.0) - 0.5) * 0.045;
  rough = graph ? 0.6 : 0.44;
  cc *= graph ? 0.0 : 1.0;
  col *= 1.0 + wear * (graph ? 0.18 : 0.07);
  rough += wear * 0.08;
  met = 0.0;
  if (metal) {
    // Titan-Band, gebuerstet in Laengsrichtung
    float q1 = dot(vec2(abs(p.x), p.z), vec2(0.2, 0.98)) * 900.0;
    float st = (rbVN(q1) - 0.5) * clamp(1.4 - fwidth(q1) * 0.7, 0.0, 1.0);
    col = uTitanium * (1.0 + st * 0.08 + wear * 0.1);
    rough = 0.3 + st * 0.1;
    cc = 0.0;
    met = 1.0;
  }
}
`);
    fs = fs.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
vec3 rbSX = dFdx(-vViewPosition);
vec3 rbSY = dFdy(-vViewPosition);
float rbEdge = 0.0;
float rbVis = rbMask(vRL, 1.0, rbEdge);
float rbG = 0.0;
vec2 rbDH = vec2(0.0);
float rbAO = 1.0;
vec3 rbEmit = vec3(0.0);
vec3 rbCol = vec3(1.0);
float rbRough = 0.5;
float rbCC = 1.0;
float rbS = 1.0;
float rbWear = 0.0;
float rbMet = 0.0;
${head ? 'vec3 rbD = normalize(vRDir);' : 'vec3 rbD = vec3(0.0, 1.0, 0.0);'}
rbShell(vRPanel, vRL, rbD, rbCol, rbRough, rbCC, rbG, rbDH, rbAO, rbEmit, rbS, rbWear, rbMet);
// Mikrostruktur: zwei Rauschfrequenzen in der Rauheit, feine Orangenhaut im Klarlack
float rbN1 = rbSnoise(vRL * 17.0);
float rbN2 = rbSnoise(vRL * 61.0);
rbRough += rbN1 * 0.035 + rbN2 * 0.02;
vec2 rbPeel = vec2(dFdx(rbN2), dFdy(rbN2)) * 0.00004;
${head ? 'rbAO *= mix(0.3, 1.0, smoothstep(-0.98, -0.45, rbD.y));' : 'rbAO *= mix(0.35, 1.0, smoothstep(0.38, 0.95, length(vec2(vRL.x, vRL.z + 0.1))));'}
if (rbVis < 0.0 || rbS < 0.0) discard;
`);
    fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = rbCol * (1.0 - 0.72 * rbG);
`);
    fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(rbRough + rbG * 0.3, 0.05, 1.0);
`);
    fs = fs.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = rbMet;
`);
    fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = rbPerturb(rbSX, rbSY, normal, rbDH, faceDirection);
`);
    fs = fs.replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
#ifdef USE_CLEARCOAT
clearcoatNormal = rbPerturb(rbSX, rbSY, clearcoatNormal, rbDH + rbPeel, faceDirection);
#endif
`);
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float rbNdV = saturate(dot(normal, normalize(vViewPosition)));
totalEmissiveRadiance += rbEmit + uEdgeCol * rbEdge + uRimCol * pow(1.0 - rbNdV, 5.0) * 0.5;
`);
    fs = fs.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
material.clearcoat *= rbCC * (1.0 - rbG);
#endif
`);
    fs = fs.replace('#include <aomap_fragment>', `rbAO *= 1.0 - 0.55 * rbG;
${AO_BLOCK}`);
    fs = fs.replace('#include <opaque_fragment>', `#ifdef RB_TORSOSHELL
diffuseColor.a *= smoothstep(-3.2, -2.3, vRL.y) * smoothstep(-3.2, -2.3, vRL.y);
#endif
outgoingLight = min(outgoingLight, vec3(8.0));
#include <opaque_fragment>`);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  return mat;
}

/* --------------------------------------------------------- Innenschale */
// Graphit unter den Platten. Durch die Fugen sichtbar, traegt das Fugenlicht (uLeak). kind: 'head' | 'torso'
export function makeInnerMaterial(THREE, U, kind, params) {
  const mat = new THREE.MeshPhysicalMaterial({ ...params });
  mat.defines = { [kind === 'head' ? 'RB_INNERHEAD' : 'RB_INNERTORSO']: '' };
  mat.customProgramCacheKey = () => `robot-inner-${kind}`;
  mat.onBeforeCompile = (shader) => {
    hookCommon(shader, U);
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\nvarying vec3 vRL;');
    vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRL = position;');
    fs = fs.replace('#include <common>', `#include <common>
${NOISE}
${MASK}
${LIGHT_UNIFORMS}
varying vec3 vRL;
`);
    fs = fs.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float rbEdge = 0.0;
if (rbMask(vRL, 1.0, rbEdge) < 0.0) discard;
`);
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
#ifdef RB_INNERHEAD
float rbLk = smoothstep(-1.15, -0.85, vRL.y);
#else
float rbLk = smoothstep(-2.6, -1.9, vRL.y) * 0.6;
#endif
totalEmissiveRadiance += uLeakCol * uLeak * rbLk * (0.75 + 0.25 * sin(vRL.y * 40.0 - uTime * 3.0)) + uEdgeCol * rbEdge * 0.3;
`);
    fs = fs.replace('#include <opaque_fragment>', `#ifdef RB_INNERTORSO
diffuseColor.a *= smoothstep(-3.2, -2.3, vRL.y) * smoothstep(-3.2, -2.3, vRL.y);
#endif
#include <opaque_fragment>`);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  return mat;
}

/* --------------------------------------------------------- Bauteile */
// Ein Material fuer alle Bauteile ausser den Platten. opts.skin: Hals-Verformung (rbSkin) im Vertex-Shader.
export function makePartMaterial(THREE, U, { skin = false, env = null, envIntensity = 1, name = 'parts' } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.5, metalness: 1, envMap: env, envMapIntensity: envIntensity,
  });
  mat.defines = skin ? { RB_SKIN: '' } : {};
  mat.customProgramCacheKey = () => `robot-part-${name}-${skin ? 1 : 0}`;
  mat.onBeforeCompile = (shader) => {
    hookCommon(shader, U);
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', `#include <common>
attribute vec3 aCol;
attribute vec2 aRM;
attribute vec4 aPart;
attribute vec2 aBr;
attribute float aCls;
varying vec3 vRCol;
varying vec2 vRRM;
varying vec4 vRPart;
varying vec2 vRBr;
varying float vRCls;
varying vec3 vRL;
varying vec3 vRW;
#ifdef RB_SKIN
${SKIN}
#endif
`);
    vs = vs.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
#ifdef RB_SKIN
objectNormal = rbSkinN(objectNormal, position);
#endif
`);
    vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
vRCol = aCol; vRRM = aRM; vRPart = aPart; vRBr = aBr; vRCls = aCls;
vRL = position;
#ifdef RB_SKIN
transformed = rbSkin(position);
#endif
`);
    // Position im Koerper-Raum (nach Instanz-Matrix) fuer Maske und Scan
    vs = vs.replace('#include <project_vertex>', `#include <project_vertex>
vec4 rbW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
rbW = instanceMatrix * rbW;
#endif
vRW = rbW.xyz;
`);
    fs = fs.replace('#include <common>', `#include <common>
${NOISE}
${MASK}
${SEAMS}
${LIGHT_UNIFORMS}
varying vec3 vRCol;
varying vec2 vRRM;
varying vec4 vRPart;
varying vec2 vRBr;
varying float vRCls;
varying vec3 vRL;
varying vec3 vRW;
`);
    fs = fs.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
vec3 rbSX = dFdx(-vViewPosition);
vec3 rbSY = dFdy(-vViewPosition);
float rbEdge = 0.0;
float rbVis = rbMask(vRW, vRCls, rbEdge);
int rbCode = int(vRPart.x + 0.5);
vec3 rbCol = vRCol;
float rbRough = vRRM.x;
float rbMet = vRRM.y;
float rbG = 0.0;
vec2 rbDH = vec2(0.0);
float rbAO = 1.0;
vec3 rbEmit = vec3(0.0);
// Buerstung (Metall): Streifen quer zur Buerstrichtung, gefiltert gegen Flimmern
if (rbMet > 0.5) {
  float q1 = vRBr.y * 900.0 + rbVN(vRBr.x * 6.0) * 3.0;
  float q2 = vRBr.y * 2700.0 + 31.0;
  float f1 = clamp(1.4 - fwidth(q1) * 0.7, 0.0, 1.0);
  float f2 = clamp(1.4 - fwidth(q2) * 0.7, 0.0, 1.0);
  float st = (rbVN(q1) - 0.5) * f1 * 0.65 + (rbVN(q2) - 0.5) * f2 * 0.35;
  rbRough += st * 0.12;
  rbCol *= 1.0 + st * 0.08;
}
if (rbCode == ${3}) {
  // Ohr: Status-Punkte auf dem Ring (2 Cyan, 1 Ember), Iris-Ring auf der Nabe mit kreisendem Bogen
  float r = vRPart.y;
  float a = atan(vRPart.w, vRPart.z);
  for (int i = 0; i < 3; i++) {
    float ac = 1.3089969 + float(i) * 0.2617994;
    float dd = length(vec2(r - 0.1915, (a - ac) * r)) - 0.0058;
    float inD = 1.0 - smoothstep(-0.0012, 0.0012, dd);
    rbEmit += (i == 1 ? uEmber * 0.9 : uSig) * inD * uEar * 2.2;
    rbG = max(rbG, inD * 0.6);
  }
  float ring = smoothstep(0.0462, 0.0478, r) * (1.0 - smoothstep(0.0532, 0.0548, r));
  float ph = mod(a - uTime * 1.7951958, 6.2831853);
  float arc = smoothstep(0.7, 0.0, ph) + smoothstep(5.9, 6.2831853, ph) * 0.6;
  rbEmit += uSig * ring * (0.45 + 1.8 * arc) * uIris;
  rbG = max(rbG, ring * 0.5);
}
if (rbCode == ${6}) {
  rbEmit += uSig * 0.12 * uEar;
}
if (rbCode == ${8}) {
  // Kieferscharnier: schmaler Warnstreifen (Ember/Graphit diagonal) um die Walze
  float h = vRPart.y;
  float a = atan(vRPart.w, vRPart.z);
  float band = smoothstep(0.0, 0.0012, h - 0.002) * (1.0 - smoothstep(0.0, 0.0012, h - 0.013));
  float dg = fract((a * 0.055 + h) / 0.012);
  float sw = smoothstep(0.45, 0.5, dg) * (1.0 - smoothstep(0.95, 1.0, dg));
  rbCol = mix(rbCol, mix(uEmber * 0.55, vec3(0.012), sw), band);
  rbMet = mix(rbMet, 0.0, band);
  rbRough = mix(rbRough, 0.5, band);
  rbSeamM(h - 0.0015, 0.0008, 0.0006, 1.0, rbG, rbDH);
  rbSeamM(h - 0.0135, 0.0008, 0.0006, 1.0, rbG, rbDH);
}
if (rbCode == ${10}) {
  rbSeamM((fract(vRL.y / 0.0075) - 0.5) * 0.0075, 0.0009, 0.0007, 1.0, rbG, rbDH);
}
if (rbCode == ${11}) {
  // Kolbenzylinder: zwei Ringnuten, Warnstreifen oben
  float y = vRL.y;
  rbSeamM(y - 0.075, 0.0016, 0.0013, 1.0, rbG, rbDH);
  rbSeamM(y - 0.105, 0.0016, 0.0013, 1.0, rbG, rbDH);
  float band = smoothstep(0.322, 0.3235, y) * (1.0 - smoothstep(0.3315, 0.333, y));
  rbCol = mix(rbCol, uEmber * 0.6, band);
  rbRough = mix(rbRough, 0.42, band);
}
if (rbCode == ${14}) {
  // Kabel: Lichtimpulse (wie V1)
  float t = vRPart.y;
  float ph1 = fract(t + uTime * uPulse.x + vRPart.w);
  float dash = smoothstep(0.0, 0.015, ph1) * (1.0 - smoothstep(0.015, 0.16, ph1));
  float ph2 = fract(t + uTime * uPulse.x * 1.37 + vRPart.w + 0.5);
  dash += 0.6 * smoothstep(0.0, 0.015, ph2) * (1.0 - smoothstep(0.015, 0.1, ph2));
  rbEmit += uSig * (dash * uPulse.y * smoothstep(0.02, 0.1, t) + 0.05 * uPulse.y) * vRPart.z;
}
if (rbCode == ${15}) {
  rbSeamM((fract(vRBr.x * 220.0) - 0.5) / 220.0, 0.0008, 0.0005, 1.0, rbG, rbDH);
}
if (rbCode == ${16}) {
  // Kragen: Lichtlippe oben (gleiches Licht wie Ohren und Visier)
  float cr = length(vec2(vRL.x / 1.06, (vRL.z + 0.08) / 0.96));
  float lip = smoothstep(0.405, 0.412, cr) * (1.0 - smoothstep(0.422, 0.429, cr)) * smoothstep(-1.415, -1.405, vRL.y);
  rbEmit += uSig * lip * uLip * 1.4;
  rbAO = max(0.6, 1.0 - lip);
}
if (rbCode == ${18}) {
  // Schraube: Innensechskant
  vec2 q = abs(vRL.xz);
  float hx = max(q.x * 0.8660254 + q.y * 0.5, q.y) - 0.0042;
  float inH = (1.0 - smoothstep(-0.0006, 0.0006, hx)) * step(0.0025, vRL.y);
  rbG = max(rbG, inH * 0.85);
  rbSeamM(hx, 0.0006, 0.0005, step(0.0025, vRL.y), rbG, rbDH);
}
if (rbVis < 0.0) discard;
`);
    fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = rbCol * (1.0 - 0.7 * rbG);
`);
    fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(rbRough + rbG * 0.25, 0.05, 1.0);
`);
    fs = fs.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = rbMet;
`);
    fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = rbPerturb(rbSX, rbSY, normal, rbDH, faceDirection);
`);
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float rbNdV = saturate(dot(normal, normalize(vViewPosition)));
totalEmissiveRadiance += rbEmit + uEdgeCol * rbEdge + uRimCol * pow(1.0 - rbNdV, 5.0) * 0.35;
`);
    fs = fs.replace('#include <aomap_fragment>', `rbAO *= 1.0 - 0.5 * rbG;
${AO_BLOCK}`);
    // Mechanik im Roentgen dunkler, damit das Gehirn fuehrt
    fs = fs.replace('#include <opaque_fragment>', `outgoingLight = (outgoingLight - totalEmissiveRadiance) * (1.0 - 0.45 * uXray * (1.0 - vRCls)) + totalEmissiveRadiance;
outgoingLight = min(outgoingLight, vec3(8.0));
#include <opaque_fragment>`);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  return mat;
}

/* ------------------------------------------------------------- Glas */
export function makeGlassMaterial(THREE, U, params) {
  const mat = new THREE.MeshPhysicalMaterial({ transparent: true, premultipliedAlpha: true, depthWrite: false, ...params });
  mat.customProgramCacheKey = () => 'robot-glass';
  mat.onBeforeCompile = (shader) => {
    hookCommon(shader, U);
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\nattribute float aT;\nattribute vec2 aUv;\nvarying vec3 vRL;\nvarying float vRT;\nvarying vec2 vRUv;');
    vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRL = position; vRT = aT; vRUv = aUv;');
    fs = fs.replace('#include <common>', `#include <common>
${NOISE}
${MASK}
${LIGHT_UNIFORMS}
uniform float uGlassA;
uniform float uVisorPow;
varying vec3 vRL;
varying float vRT;
varying vec2 vRUv;
`);
    fs = fs.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float rbEdge = 0.0;
if (rbMask(vRL, 1.0, rbEdge) < 0.0) discard;
`);
    fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + rbSnoise(vec3(vRUv * vec2(3.0, 9.0), 1.7)) * 0.025, 0.02, 1.0);
`);
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += uSig * (1.0 - smoothstep(0.0, 0.05, vRT)) * 0.25 * uVisorPow + uEdgeCol * rbEdge;
`);
    fs = fs.replace('#include <opaque_fragment>', `float rbNdV = saturate(dot(normal, normalize(vViewPosition)));
float rbA = mix(uGlassA, 0.92, pow(1.0 - rbNdV, 3.0));
// Spiegelung voll, Durchsicht abgedunkelt (vormultipliziertes Alpha)
gl_FragColor = vec4(totalDiffuse * rbA + min(outgoingLight - totalDiffuse, vec3(6.0)), rbA);
`);
    fs = fs.replace('#include <premultiplied_alpha_fragment>', '');
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  return mat;
}

/* ------------------------------------------------------- LED-Platine */
// Punktmatrix hinter dem Glas. aUv: x = Bogen ab Gesichtsmitte, y = Hoehe ab Augenzeile (Einheiten).
// uLedA: x Leistung, y Augen-Helligkeit, z Augen x (Punkte), w Augen y (Punkte)
// uLedB: x Augenhoehe (1 = 3 Zeilen, 0 = 1 Zeile), y Laecheln, z Denken, w Scan-Spalte (Punkte, < -40 aus)
// uLedC: x Testbild alle, y Schachbrett, z Schachbrett-Phase, w Lautstaerke Denken-Punkte
export function makeBoardMaterial(THREE, U, tok, led) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  for (const k of Object.keys(U)) uniforms[k] = U[k];
  const P = led.pitch;
  return new THREE.ShaderMaterial({
    name: 'robot-board',
    uniforms,
    fog: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute vec2 aUv;
      attribute float aWall;
      varying vec2 vUv;
      varying float vWall;
      varying vec3 vRL;
      varying vec3 vN;
      void main() {
        vUv = aUv;
        vWall = aWall;
        vRL = position;
        vN = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      ${NOISE}
      ${MASK}
      ${LIGHT_UNIFORMS}
      uniform vec4 uLedA;
      uniform vec4 uLedB;
      uniform vec4 uLedC;
      varying vec2 vUv;
      varying float vWall;
      varying vec3 vRL;
      varying vec3 vN;
      #define PITCH ${P.toFixed(5)}
      // Ein Auge (7 x 3 Punkte, Ecken aus). dx, dy relativ zur Augenmitte in Punkten.
      float rbEye(float dx, float dy, float h, float smile) {
        float adx = abs(dx);
        dy -= smile * clamp((adx - 1.0) / 2.0, 0.0, 1.0);
        float ady = abs(dy);
        float A = clamp(4.0 - adx, 0.0, 1.0);
        float B = clamp(h + 1.0 - ady, 0.0, 1.0);
        float Cx = clamp(adx - 2.0, 0.0, 1.0);
        float Dy = clamp(ady - h + 1.0, 0.0, 1.0);
        return A * B * (1.0 - Cx * Dy);
      }
      float rbLed(vec2 c) {
        float h = uLedB.x;
        float v = 0.0;
        // Augen
        float ex = uLedA.z;
        float ey = uLedA.w;
        float e = max(rbEye(c.x - (14.0 + ex), c.y - ey, h, uLedB.y), rbEye(c.x - (-14.0 + ex), c.y - ey, h, uLedB.y));
        v = e * uLedA.y;
        // Denken: drei Punkte unter den Augen, die nacheinander pulsieren
        if (uLedC.w > 0.001 && abs(c.y + 3.0) < 0.5) {
          for (int i = 0; i < 3; i++) {
            float cx = float(i - 1) * 2.0;
            float ph = fract(uTime * 0.8 - float(i) * 0.22);
            float pul = 0.25 + 0.75 * exp(-ph * 5.0);
            v = max(v, (1.0 - step(0.5, abs(c.x - cx))) * pul * uLedC.w);
          }
        }
        // Scan-Spalte mit 3 Spalten Nachleuchten, 30 %
        float sd = uLedB.w - c.x;
        v = max(v, 0.2 * step(-0.5, sd) * clamp(1.0 - sd / 3.5, 0.0, 1.0) * step(sd, 3.5) * clamp(3.5 - abs(c.y), 0.0, 1.0));
        // Startsequenz: Testbild und Schachbrett
        v = max(v, uLedC.x);
        float chk = mod(c.x + c.y + uLedC.z, 2.0);
        v = max(v, uLedC.y * step(0.5, chk));
        return v;
      }
      void main() {
        float rbEdge = 0.0;
        // Im Roentgen bleibt nur das Band der Punktmatrix (mit Steg zum Flachbandkabel), der Rest wird gescannt
        float keep = step(abs(vUv.y), 0.148) * step(abs(vUv.x), 0.64) + step(abs(vUv.x), 0.085) * step(-0.34, vUv.y) * step(vUv.y, 0.0);
        float useScan = (vWall > 0.5 || keep < 0.5) ? 1.0 : 0.0;
        if (rbMask(vRL, useScan, rbEdge) < 0.0) discard;
        vec3 n = normalize(vN);
        float lit = 0.35 + 0.65 * max(dot(n, normalize(vec3(-0.5, 0.6, 0.8))), 0.0);
        vec3 col;
        if (!gl_FrontFacing) {
          // Rueckseite (zum Gehirn): Platine mit zwei Chips und Leiterbahnen
          vec2 q = vUv;
          vec3 pcb = ${'vec3(' + [tok.pcb.r, tok.pcb.g, tok.pcb.b].map((x) => x.toFixed(4)).join(', ') + ')'};
          vec3 gold = ${'vec3(' + [tok.gold.r, tok.gold.g, tok.gold.b].map((x) => x.toFixed(4)).join(', ') + ')'};
          float tr = abs(fract(q.y / 0.016) - 0.5) * 0.016;
          float traces = (1.0 - smoothstep(0.0008, 0.0014, tr)) * step(0.55, rbHash(vec3(floor(q / vec2(0.05, 0.016)), 3.0)));
          col = mix(pcb, gold * 0.5, traces * 0.6);
          for (int i = 0; i < 2; i++) {
            vec2 cc = vec2(float(i) * 0.36 - 0.18, -0.12);
            vec2 d = abs(q - cc) - vec2(0.07, 0.05);
            float chip = 1.0 - step(0.0, max(d.x, d.y));
            float pins = (1.0 - step(0.0, max(d.x - 0.008, d.y))) * (1.0 - chip) * step(0.5, fract((q.y - cc.y) / 0.008));
            col = mix(col, vec3(0.01, 0.011, 0.013), chip);
            col = mix(col, gold * 0.7, pins);
          }
          col *= lit * 0.9;
          col += uSig * 0.15 * uLedA.x * step(0.5, fract(uTime * 1.3 + vUv.x * 2.0)) * (1.0 - step(0.004, length(vUv - vec2(0.3, 0.12))));
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
          return;
        }
        if (vWall > 0.5) {
          // Innenwand der Haube (Graphit)
          gl_FragColor = vec4(vec3(0.012, 0.014, 0.017) * lit, 1.0);
          #include <fog_fragment>
          return;
        }
        vec2 g = vUv / PITCH + 0.5;
        vec2 cell = floor(g);
        vec2 f = fract(g) - 0.5;
        float inside = step(abs(cell.x), ${(Math.floor(led.cols / 2)).toFixed(1)}) * step(abs(cell.y), ${(Math.floor(led.rows / 2)).toFixed(1)});
        float dist = length(f);
        float fwc = fwidth(g.x);
        float aa = max(0.02, fwc * 0.75);
        float ldot = 1.0 - smoothstep(${(led.dot / 2).toFixed(3)} - aa, ${(led.dot / 2).toFixed(3)} + aa, dist);
        // Ferne: Punkte zu gleichmaessiger Flaeche mitteln (kein Moire)
        float far = smoothstep(0.25, 0.6, fwc);
        ldot = mix(ldot, 0.24, far);
        // Platine: dunkel, feine Leiterbahnen ausserhalb der Matrix
        vec3 base = vec3(0.006, 0.008, 0.011);
        vec2 tq = vUv / 0.024;
        vec2 tc = floor(tq);
        float rh = rbHash(vec3(tc, 7.0));
        vec2 tf = fract(tq) - 0.5;
        float lineH = (1.0 - smoothstep(0.03, 0.07, abs(tf.y))) * step(0.6, rh);
        float lineV = (1.0 - smoothstep(0.03, 0.07, abs(tf.x))) * step(rh, 0.25);
        float trace = max(lineH, lineV) * (1.0 - inside) * (1.0 - far * 0.7);
        base += vec3(0.01, 0.014, 0.018) * trace;
        // Bauteile: zwei schwarze Rechtecke unten
        for (int i = 0; i < 2; i++) {
          vec2 d = abs(vUv - vec2(float(i) * 0.84 - 0.42, -0.36)) - vec2(0.055, 0.03);
          float comp = 1.0 - step(0.0, max(d.x, d.y));
          base = mix(base, vec3(0.002), comp);
          base += vec3(0.02) * comp * (1.0 - smoothstep(0.0, 0.004, abs(max(d.x, d.y) + 0.004)));
        }
        // Unbeleuchtete LEDs: dunkelgraue Mulden
        vec3 ledOff = vec3(0.017, 0.021, 0.026) * (0.8 + 0.4 * smoothstep(0.1, 0.0, length(f - vec2(-0.08, 0.08))));
        col = mix(base, ledOff, ldot * inside) * lit;
        // Leuchtende Punkte (je Zelle quantisiert: wirkt digital), Augen-Schein darum
        float L = rbLed(cell) * inside * uLedA.x;
        vec3 hot = mix(uSig, uIce, 0.55);
        col += hot * L * ldot * 3.2 * mix(1.0, 1.35, far);
        // weicher Schein der Augen auf der Platine (kontinuierlich)
        vec2 cg = g - 0.5;
        float e = max(rbEye(cg.x - (14.0 + uLedA.z), cg.y - uLedA.w, uLedB.x + 0.6, uLedB.y), rbEye(cg.x - (-14.0 + uLedA.z), cg.y - uLedA.w, uLedB.x + 0.6, uLedB.y));
        col += uSig * e * uLedA.y * uLedA.x * 0.22;
        col += uEdgeCol * rbEdge;
        // Roentgen: feine helle Kante am verbleibenden Band (wirkt wie eine freigelegte Platine)
        float db = min(0.148 - abs(vUv.y), 0.64 - abs(vUv.x));
        float fe = max(fwidth(db), 1e-4);
        col += uIce * (1.0 - smoothstep(fe, fe * 2.5, db)) * step(0.0, db) * uXray * 0.9;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  });
}

/* ------------------------------------------------------------ Hologramm */
// Additiv, sichtbar wo die Schale (noch) fehlt: ueber der Aufbau-Ebene und ueber der Scan-Linie.
// kind: 'head' (Kopfplatten, mit Plattenkanten), 'torso' (Rumpfplatten), 'skin' (Huelle des Halses)
export function makeHoloMaterial(THREE, U, kind, kitGlsl = '', C = null) {
  const head = kind === 'head';
  const torso = kind === 'torso';
  const plates = head || torso;
  const defines = {};
  if (kind === 'skin') defines.RB_SKIN = '';
  if (head) defines.RB_H_HEAD = '';
  if (torso) defines.RB_H_TORSO = '';
  return new THREE.ShaderMaterial({
    name: `robot-holo-${kind}`,
    defines,
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      #ifdef RB_SKIN
      ${SKIN}
      #endif
      ${plates ? `attribute float aPanel;\nattribute float aH;\nflat varying int vRPanel;` : ''}
      ${head ? `attribute vec3 aDir;\nvarying vec3 vRDir;\nuniform float uPanelOff[16];\nuniform vec3 uPanelN[16];` : ''}
      ${torso ? `uniform float uTorsoOff[12];\nuniform vec3 uTorsoN[12];` : ''}
      varying vec3 vL;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 p = position;
        vec3 n = normal;
        #ifdef RB_SKIN
          p = rbSkin(p);
          n = rbSkinN(n, position);
        #endif
        ${plates ? 'int pid = int(aPanel + 0.5); vRPanel = pid; p += n * aH;' : ''}
        ${head ? 'vRDir = aDir; p += uPanelN[pid] * uPanelOff[pid];' : ''}
        ${torso ? 'p += uTorsoN[pid] * uTorsoOff[pid];' : ''}
        vL = position;
        vec4 mv = modelViewMatrix * vec4(p + n * 0.004, 1.0);
        vN = normalize(normalMatrix * n);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      ${MASK}
      ${C ? C.sdfGlsl : ''}
      ${kitGlsl}
      uniform float uHolo;
      uniform float uHoloFloor;
      uniform vec3 uHoloCol;
      uniform vec3 uHoloHi;
      varying vec3 vL;
      varying vec3 vN;
      varying vec3 vV;
      ${plates ? 'flat varying int vRPanel;' : ''}
      ${head ? 'varying vec3 vRDir;' : ''}
      float contour(float x, float w) {
        float fw = fwidth(x);
        float d = abs(fract(x - 0.5) - 0.5);
        return (1.0 - smoothstep(w, w + fw * 1.2, d)) * clamp(1.6 - fw * 2.2, 0.0, 1.0);
      }
      void main() {
        float edge;
        float vis = rbMask(vL, 1.0, edge);
        float ghost = 1.0 - smoothstep(-0.02, 0.0, vis);
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float fres = pow(1.0 - abs(dot(n, v)), 3.0);
        float near = smoothstep(0.2, 1.3, length(vV));
        float kant = 0.0;
        #if defined(RB_H_HEAD) || defined(RB_H_TORSO)
          #ifdef RB_H_HEAD
            float s = -rbHeadRegion(vRPanel, vL, normalize(vRDir)) - ${C ? gf2(C.gap) : '0.01'} * 0.5;
          #else
            float s = -rbTorsoRegion(vRPanel, vL) - ${C ? gf2(C.gap) : '0.01'} * 0.5;
          #endif
          if (s < 0.0) discard;
          float fs = max(fwidth(s), 1e-5);
          kant = 1.0 - smoothstep(fs * 0.6, fs * 1.8, s);
          float lines = contour(vL.y / 0.08, 0.03) * 0.4;
          float body = fres * 0.45 + lines * (0.1 + 0.4 * fres) + 0.004;
        #else
          float lines = contour(vL.y / 0.05, 0.035);
          float sweep = exp(-pow((fract(vL.y * 0.2 - uTime * 0.09) - 0.5) * 10.0, 2.0));
          float body = fres * 0.9 + lines * (0.1 + 0.55 * fres) * (0.6 + 0.8 * sweep) + 0.006;
        #endif
        #ifdef RB_SKIN
          float fade = smoothstep(-2.9, -2.1, vL.y);
        #else
          float fade = smoothstep(uHoloFloor - 0.7, uHoloFloor + 0.1, vL.y);
        #endif
        vec3 col = uHoloCol * body * ghost + uHoloHi * (edge * 0.25 + kant * 0.5 * ghost);
        #ifdef RB_SKIN
          col *= 0.45 * mix(1.0, 0.3, uXray);
        #endif
        gl_FragColor = vec4(col * uHolo * near * fade, 1.0);
      }`,
  });
}
function gf2(v) { const s = (+v).toPrecision(7); return /[.e]/.test(s) ? s : `${s}.0`; }
