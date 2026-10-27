// Materialien der Szene "robot".
// Schale, Metall, Visier: MeshPhysicalMaterial (PBR, Umgebung, Nebel) mit eingehaengten Shader-Teilen:
//   Aufbau-Ebene und Aufloesen (discard mit leuchtender Kante), Paneel-Fugen als prozedurales Bump,
//   analytische Umgebungsverdeckung, Lichtaustritt aus den Fugen, Visier-Licht, Datenimpulse im Hals.
// Hologramm: eigenes ShaderMaterial (additiv), Fresnel + Raster + Abtastlinie, fuer Aufbau und Roentgenblick.

/* ------------------------------------------------------------ GLSL */
const NOISE = /* glsl */ `
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
`;

// Sichtbarkeit: Aufbau von unten nach oben als feine waagrechte Abtastlinie (leicht unruhig durch Rauschen und
// feine Zellen von 1/60 Einheit, mit einzelnen Funken). Roentgen-Wechsel als praeziser Scan: eine helle, duenne
// Linie laeuft von oben nach unten (uScanY), darueber ist der Roboter Roentgen, darunter noch Schale.
// Rueckgabe < 0: verwerfen. Nur im Fragment-Shader verwenden (fwidth).
const MASK = /* glsl */ `
uniform float uTime;
uniform float uBuildY;
uniform float uDissolve;
uniform float uScanY;
uniform vec3 uFocus;
float rbHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float rbMask(vec3 p, float bias, out float edge) {
  edge = 0.0;
  if (uBuildY > 1.4 && uDissolve <= 0.0) return 1.0;
  float b = 9.0;
  if (uBuildY <= 1.4) {
    vec3 c = floor(p * 60.0);
    float r = rbHash(c);
    float n = rbSnoise(vec3(p.x * 5.0, p.z * 5.0, p.y * 1.5 + uTime * 0.3));
    b = uBuildY - (p.y + n * 0.012 + (r - 0.5) * 0.006);
    // Linienbreite begrenzen: an streifend gesehenen Flaechen (Rumpf von oben) sonst ein dicker Ring
    float w = clamp(fwidth(b) * 1.1, 0.0025, 0.008);
    float line = 1.0 - smoothstep(w * 0.5, w * 2.0, abs(b));
    float glow = exp(-abs(b) / 0.025) * 0.08;
    float spark = step(0.99, rbHash(c + floor(uTime * 9.0))) * (1.0 - smoothstep(0.0, 0.03, abs(b)));
    edge = line * 0.42 + glow + spark * 1.1;
  }
  float d = 9.0;
  if (uDissolve > 0.0) {
    // Scan: scharfe Linie ohne Rauschen, darunter ein kurzer, weicher Lichtsaum auf der Schale
    d = uScanY - p.y;
    float wd = clamp(fwidth(d) * 1.2, 0.002, 0.006);
    // Auf dem Rumpf leiser (von oben gesehen wuerde die Linie sonst ein grosser heller Bogen)
    float onHead = mix(0.22, 1.0, smoothstep(-2.0, -1.2, p.y));
    float lineD = 1.0 - smoothstep(wd * 0.5, wd * 2.0, abs(d));
    float glowD = exp(-abs(d) / 0.05) * 0.14;
    edge = max(edge, (lineD * 0.8 + glowD) * onHead);
  }
  return min(b, d);
}
`;

const SKIN = /* glsl */ `
uniform mat4 uHeadMat;
float rbSkinW(vec3 p) { return smoothstep(-1.32, -0.82, p.y); }
vec3 rbSkin(vec3 p) { return mix(p, (uHeadMat * vec4(p, 1.0)).xyz, rbSkinW(p)); }
vec3 rbSkinN(vec3 n, vec3 p) { return normalize(mix(n, mat3(uHeadMat) * n, rbSkinW(p))); }
`;

const SEAMS = /* glsl */ `
// Fuge als weiche Rinne (Gauss-Profil) mit Bump-Gradient. d: vorzeichenbehafteter Abstand in Einheiten.
// Zu feine Fugen werden verbreitert und abgeschwaecht (kein Flimmern in der Ferne).
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
void rbSeam(float d, float w, float depth, inout float g, inout vec2 dH) { rbSeamM(d, w, depth, 1.0, g, dH); }
// Bump nach Mikkelsen, mit unnormierten Ableitungen: Hoehe in Welt-Einheiten
vec3 rbPerturb(vec3 surfPos, vec3 n, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos);
  vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, n);
  vec3 r2 = cross(n, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * n - grad);
}
`;

// Teile: liefern Fugen (g, dH), Verdeckung (ao), Ausblenden nach unten (fade), Emission, Rauheit
const PARTS = /* glsl */ `
uniform vec3 uSig;
uniform vec3 uIce;
uniform float uEar;
uniform vec2 uPulse;
uniform vec4 uVisor;   // x Leistung, y Verstaerkung, z Scan-Position (Bogen), w Scan-Staerke
uniform vec4 uEye;     // x/y Blickversatz, z Oeffnung (Blinzeln), w Sakkade-Helligkeit
varying vec3 vRL;
varying float vRN;
#ifdef RB_HEAD
varying vec3 vRDir;
#endif
#ifdef RB_TORSO
varying vec2 vRP;
#endif
#ifdef RB_EAR
varying float vRRad;
#endif
#ifdef RB_TENDON
varying float vRT;
varying vec2 vRPulse;
#endif
#if defined(RB_VISOR) || defined(RB_BEZEL)
varying vec2 vRUv;
varying float vRRing;
#endif

float rbBottomFade(float y) { return smoothstep(-3.2, -2.3, y); }

void rbPart(inout float g, inout vec2 dH, inout float ao, inout float fade, inout vec3 emit, inout float rough) {
#ifdef RB_HEAD
  vec3 dir = normalize(vRDir);
  float th = atan(dir.x, dir.z);
  float ath = abs(th);
  float ph = asin(clamp(dir.y, -1.0, 1.0));
  // Scheitel: Doppelfuge von der Stirn ueber den Kopf nach hinten
  float crown = max(smoothstep(0.5, 0.58, ph), step(dir.z, 0.0)) * smoothstep(-0.55, -0.25, dir.y);
  rbSeamM(abs(vRL.x) - 0.085, 0.0042, 0.0032, crown, g, dH);
  // Seitenpaneel um das Ohrmodul
  vec3 sideAx = normalize(vec3(dir.x >= 0.0 ? 1.0 : -1.0, 0.02, -0.1));
  float aSide = acos(clamp(dot(dir, sideAx), -1.0, 1.0));
  rbSeam((aSide - 0.5) * 0.85, 0.005, 0.0038, g, dH);
  // Hinterkopf: waagrechte Fuge
  float backM = smoothstep(0.62, 0.72, aSide) * step(0.0, -dir.z) * smoothstep(0.1, 0.16, abs(vRL.x));
  rbSeamM((ph + 0.32) * 0.95, 0.005, 0.0036, backM, g, dH);
  // Lueftung: kurze Schlitze hinter dem Seitenpaneel
  float ventM = smoothstep(0.64, 0.68, aSide) * (1.0 - smoothstep(0.86, 0.9, aSide)) * smoothstep(-0.02, 0.02, ph - 0.02) * (1.0 - smoothstep(0.2, 0.24, ph)) * step(0.0, -dir.z);
  rbSeamM((fract(ph / 0.045) - 0.5) * 0.045, 0.0045, 0.004, ventM, g, dH);
  // Stirnplatte: feine Fuge im Bogen ueber dem Visier, zwischen den Seitenpaneelen
  float browM = step(0.0, dir.z) * (1.0 - smoothstep(0.42, 0.5, aSide)) * smoothstep(0.1, 0.13, abs(vRL.x));
  rbSeamM((ph - 0.5) * 0.95, 0.0035, 0.0026, browM, g, dH);
  // Kinnplatte: Fuge unter dem Visier, dazu zwei kurze senkrechte Fugen zu den Wangen
  float chinM = step(0.0, dir.z) * (1.0 - smoothstep(0.44, 0.5, aSide));
  rbSeamM((ph + 0.74) * 0.95, 0.0035, 0.0026, chinM, g, dH);
  float cheekM = step(0.0, dir.z) * smoothstep(-0.9, -0.85, ph) * (1.0 - smoothstep(-0.76, -0.72, ph));
  rbSeamM(abs(vRL.x) - 0.36, 0.003, 0.0022, cheekM, g, dH);
  // Umgebungsverdeckung: Unterseite des Kopfes, Kinn
  ao = mix(0.22, 1.0, smoothstep(-0.98, -0.5, dir.y));
  // Rauheit: grobe und feine Variation (seidenmatte Keramik statt Plastik), Scheitelstreifen etwas glaenzender
  float micro = rbSnoise(vRL * 17.0);
  rough += vRN * 0.08 + micro * 0.035 - crown * (1.0 - smoothstep(0.08, 0.09, abs(vRL.x))) * 0.07;
#endif
#ifdef RB_TORSO
  float a = vRP.x;
  float s = vRP.y;
  vec3 p = vRL;
  float front = smoothstep(-0.2, 0.2, cos(a));
  // Kragenplatte
  rbSeam(s - 0.42, 0.007, 0.006, g, dH);
  // Brust: Doppellinie in der Mitte
  float cm = front * smoothstep(0.46, 0.56, s);
  rbSeamM(abs(p.x) - 0.07, 0.005, 0.0038, cm, g, dH);
  // Brustplatte: Bogen unter dem Kragen
  float dPlate = (length((vec2(abs(p.x), p.y) - vec2(0.0, -1.5)) / vec2(1.2, 0.82)) - 1.0) * 0.9;
  rbSeamM(dPlate, 0.0065, 0.0055, front * smoothstep(0.46, 0.52, s), g, dH);
  // Schultergelenk: Ring um den Oberarm
  rbSeamM(abs(p.x) - 1.66, 0.0065, 0.0055, smoothstep(-1.7, -1.85, p.y), g, dH);
  // Ruecken: Mittellinie
  rbSeamM(p.x, 0.0055, 0.004, (1.0 - front) * smoothstep(0.46, 0.56, s), g, dH);
  // Paneele leicht unterschiedlich: Brustplatte glaenzender, Schulterkappen dunkler
  float inPlate = (1.0 - smoothstep(-0.01, 0.01, dPlate)) * front * smoothstep(0.42, 0.5, s);
  rough -= inPlate * 0.12;
  float cap = smoothstep(1.64, 1.68, abs(p.x)) * smoothstep(-1.7, -1.85, p.y);
  rough += cap * 0.06;
  // Verdeckung am Hals
  float r = length(vec2(p.x, p.z + 0.1));
  ao = mix(0.22, 1.0, smoothstep(0.4, 1.0, r));
  fade = rbBottomFade(p.y);
  rough += vRN * 0.08 + rbSnoise(p * 15.0) * 0.03;
#endif
#ifdef RB_EAR
  float r = vRRad;
  // feine konzentrische Rillen auf der Kuppe
  float rr = r / 0.011;
  rbSeamM((fract(rr) - 0.5) * 0.011, 0.0016, 0.0009, smoothstep(0.02, 0.03, r) * (1.0 - smoothstep(0.11, 0.12, r)), g, dH);
  float ring = smoothstep(0.137, 0.141, r) * (1.0 - smoothstep(0.148, 0.152, r));
  emit += uSig * ring * uEar;
  ao = mix(0.55, 1.0, smoothstep(0.19, 0.17, r));
#endif
#ifdef RB_NECK
  ao = 0.3 + 0.7 * smoothstep(-0.72, -0.98, vRL.y) * smoothstep(-1.62, -1.4, vRL.y);
  // Lichtring oben auf dem Kragen (gleiches Licht wie Ohren und Visier)
  float cr = length(vec2(vRL.x / 1.06, (vRL.z + 0.08) / 0.96));
  float lip = smoothstep(0.405, 0.412, cr) * (1.0 - smoothstep(0.422, 0.429, cr)) * smoothstep(-1.415, -1.405, vRL.y);
  emit += uSig * lip * uEar * 1.4;
  ao = max(ao, lip);
#endif
#ifdef RB_TENDON
  ao = 0.3 + 0.7 * smoothstep(-0.7, -0.95, vRL.y) * smoothstep(-1.6, -1.42, vRL.y);
  float ph = fract(vRT + uTime * uPulse.x + vRPulse.y);
  float dash = smoothstep(0.0, 0.015, ph) * (1.0 - smoothstep(0.015, 0.16, ph));
  float ph2 = fract(vRT * 1.0 + uTime * uPulse.x * 1.37 + vRPulse.y + 0.5);
  dash += 0.6 * smoothstep(0.0, 0.015, ph2) * (1.0 - smoothstep(0.015, 0.1, ph2));
  emit += uSig * dash * vRPulse.x * uPulse.y * smoothstep(0.02, 0.1, vRT);
  emit += uSig * vRPulse.x * 0.05 * uPulse.y;
#endif
#ifdef RB_VISOR
  // Licht hinter dem Glas: Lichtband, zwei Augen, LED-Raster, Scan-Licht
  vec2 q = vRUv;                         // x: Bogen ab Mitte, y: Hoehe ab Lichtband (rad ~ Einheiten)
  float pw = uVisor.x;
  float bandW = 0.6;
  float tipFade = 1.0 - smoothstep(bandW - 0.16, bandW, abs(q.x));
  // Linie gefiltert: wird sie kleiner als ein Pixel, breiter und schwaecher statt flimmernd
  float lw = max(0.006, fwidth(q.y) * 0.9);
  float line = exp(-pow(q.y / lw, 2.0)) * (0.006 / lw) * tipFade;
  float fill = exp(-pow(q.y / 0.05, 2.0)) * 0.1 * tipFade + exp(-abs(q.y) / 0.16) * 0.025;
  // Augen: liegende Kapseln, folgen dem Blick
  vec2 e = vec2(abs(q.x - uEye.x) - 0.25, (q.y - uEye.y) / max(0.08, uEye.z));
  float cap = length(vec2(max(abs(e.x) - 0.07, 0.0), e.y)) - 0.0145;
  float aa = max(0.002, fwidth(cap));
  float core = 1.0 - smoothstep(-aa, aa, cap);
  float halo = exp(-max(cap, 0.0) / 0.022);
  // LED-Raster (nur nah sichtbar)
  vec2 cell = q / 0.0105;
  float fwc = fwidth(cell.x);
  float dots = smoothstep(0.42, 0.18, length(fract(cell) - 0.5));
  float led = mix(1.0, 0.4 + 0.6 * dots, clamp(1.4 - fwc * 1.6, 0.0, 1.0));
  // Scan-Licht
  float scan = exp(-pow((q.x - uVisor.z) / 0.04, 2.0)) * uVisor.w * exp(-pow(q.y / 0.09, 4.0)) * tipFade;
  vec3 col = uSig * line * 1.5 * led
           + uIce * core * 3.0 * led + uSig * halo * 0.7 * led
           + uIce * scan * 1.5 * (0.55 + 0.45 * dots);
  emit += (col * uVisor.y + uSig * fill) * pw;
  // Kante des Glases: feiner Lichtsaum
  emit += uSig * smoothstep(0.93, 1.0, vRRing) * 0.12 * pw;
  ao = 1.0;
#endif
#ifdef RB_BEZEL
  ao = 0.7;
#endif
}
`;

/* ------------------------------------------------------- Shell-Material */
// part: 'head' | 'torso' | 'pad' | 'ear' | 'neck' | 'tendon' | 'visor' | 'bezel'
export function makeShellMaterial(THREE, U, part, params, opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial(params);
  const key = part.toUpperCase();
  const skin = part === 'neck' || part === 'tendon';
  mat.defines = { ['RB_' + key]: '' };
  if (skin) mat.defines.RB_SKIN = '';
  const bias = opts.bias ?? 0;
  const rim = opts.rim ?? 0.0;
  mat.customProgramCacheKey = () => 'robot-' + part;
  mat.onBeforeCompile = (shader) => {
    for (const k of Object.keys(U)) shader.uniforms[k] = U[k];
    let vs = shader.vertexShader;
    let fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', `#include <common>
${NOISE}
varying vec3 vRL;
varying float vRN;
#ifdef RB_HEAD
attribute vec3 aDir;
varying vec3 vRDir;
#endif
#ifdef RB_TORSO
attribute vec2 aParam;
varying vec2 vRP;
#endif
#ifdef RB_EAR
attribute float aRad;
varying float vRRad;
#endif
#ifdef RB_TENDON
attribute float aT;
attribute vec2 aPulse;
varying float vRT;
varying vec2 vRPulse;
#endif
#if defined(RB_VISOR) || defined(RB_BEZEL)
attribute vec2 aUv;
attribute float aRing;
varying vec2 vRUv;
varying float vRRing;
#endif
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
vRL = position;
vRN = rbSnoise(position * 2.6) * 0.5 + 0.5;
#ifdef RB_SKIN
transformed = rbSkin(position);
#endif
#ifdef RB_HEAD
vRDir = aDir;
#endif
#ifdef RB_TORSO
vRP = aParam;
#endif
#ifdef RB_EAR
vRRad = aRad;
#endif
#ifdef RB_TENDON
vRT = aT;
vRPulse = aPulse;
#endif
#if defined(RB_VISOR) || defined(RB_BEZEL)
vRUv = aUv;
vRRing = aRing;
#endif
`);
    fs = fs.replace('#include <common>', `#include <common>
${NOISE}
${MASK}
${SEAMS}
${PARTS}
uniform float uLeak;
uniform vec3 uEdgeCol;
uniform vec3 uLeakCol;
uniform vec3 uRimCol;
`);
    fs = fs.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float rbEdge = 0.0;
float rbVis = rbMask(vRL, ${bias.toFixed(3)}, rbEdge);
float rbG = 0.0;
vec2 rbDH = vec2(0.0);
float rbAO = 1.0;
float rbFade = 1.0;
vec3 rbEmit = vec3(0.0);
float rbRough = 0.0;
rbPart(rbG, rbDH, rbAO, rbFade, rbEmit, rbRough);
if (rbVis < 0.0) discard;
`);
    fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= 1.0 - 0.75 * rbG;
`);
    fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + rbRough + rbG * 0.35, 0.04, 1.0);
`);
    fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = rbPerturb(-vViewPosition, normal, rbDH, faceDirection);
`);
    fs = fs.replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
#ifdef USE_CLEARCOAT
clearcoatNormal = rbPerturb(-vViewPosition, clearcoatNormal, rbDH, faceDirection);
#endif
`);
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float rbNdV = saturate(dot(normal, normalize(vViewPosition)));
totalEmissiveRadiance += rbEmit + uLeakCol * (uLeak * rbG * smoothstep(-1.25, -0.95, vRL.y)) + uEdgeCol * rbEdge + uRimCol * (${rim.toFixed(3)} * pow(1.0 - rbNdV, 4.0));
`);
    fs = fs.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
material.clearcoat *= 1.0 - rbG;
#endif
`);
    fs = fs.replace('#include <aomap_fragment>', `
rbAO *= 1.0 - 0.6 * rbG;
reflectedLight.indirectDiffuse *= rbAO;
reflectedLight.indirectSpecular *= rbAO;
reflectedLight.directDiffuse *= mix(1.0, rbAO, 0.8);
reflectedLight.directSpecular *= mix(1.0, rbAO, 0.8) * 0.6;
#ifdef USE_CLEARCOAT
clearcoatSpecularIndirect *= rbAO;
clearcoatSpecularDirect *= mix(1.0, rbAO, 0.8) * 0.4;
clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(1.2));
clearcoatSpecularIndirect = min(clearcoatSpecularIndirect, vec3(1.6));
#endif
reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(1.2));
reflectedLight.indirectSpecular = min(reflectedLight.indirectSpecular, vec3(1.6));
`);
    // Rumpf: Unterkante ueber die Deckkraft ausblenden (geht in den Hintergrund ueber, statt als schwarzes Loch
    // davor zu stehen). Der Rumpf ist dafuer transparent angelegt (robot.js), die anderen Teile bleiben deckend.
    fs = fs.replace('#include <opaque_fragment>', `#ifdef RB_TORSO
diffuseColor.a *= rbFade * rbFade;
outgoingLight = min(outgoingLight, vec3(7.0));
#else
outgoingLight = min(outgoingLight * rbFade, vec3(7.0));
#endif
#include <opaque_fragment>`);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  return mat;
}

/* ------------------------------------------------------- Hologramm */
// Sichtbar, wo die Schale (noch) nicht massiv ist: ueber der Aufbau-Ebene und wo sie sich aufgeloest hat.
// Hoehenlinien wie bei einem 3D-Scan, Fresnel-Kontur, langsame Abtastwelle.
export function makeHoloMaterial(THREE, U, { skin = false } = {}) {
  return new THREE.ShaderMaterial({
    name: skin ? 'robot-holo-skin' : 'robot-holo',
    defines: skin ? { RB_SKIN: '' } : {},
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      #ifdef RB_SKIN
      ${SKIN}
      #endif
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
        vL = position;
        vec4 mv = modelViewMatrix * vec4(p + n * 0.004, 1.0);
        vN = normalize(normalMatrix * n);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      ${MASK}
      uniform float uHolo;
      uniform float uHoloFloor;
      uniform float uXray;
      uniform vec3 uHoloCol;
      uniform vec3 uHoloHi;
      varying vec3 vL;
      varying vec3 vN;
      varying vec3 vV;
      float contour(float x, float w) {
        float fw = fwidth(x);
        float d = abs(fract(x - 0.5) - 0.5);
        return (1.0 - smoothstep(w, w + fw * 1.2, d)) * clamp(1.6 - fw * 2.2, 0.0, 1.0);
      }
      void main() {
        float edge;
        float vis = rbMask(vL, 0.0, edge);
        float ghost = 1.0 - smoothstep(-0.02, 0.0, vis);        // 1 wo die Schale fehlt
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float fres = pow(1.0 - abs(dot(n, v)), 3.0);
        float lines = contour(vL.y / 0.05, 0.035);
        float sweep = exp(-pow((fract(vL.y * 0.2 - uTime * 0.09) - 0.5) * 10.0, 2.0));
        float near = smoothstep(0.2, 1.3, length(vV));
        // Unterkante: im Roentgen bleiben nur Kopf und Hals (keine Schulter-Schale wie ein Teller unter dem Kopf)
        #ifdef RB_SKIN
          float fade = smoothstep(-2.9, -2.1, vL.y);
        #else
          float fade = smoothstep(uHoloFloor - 0.7, uHoloFloor + 0.1, vL.y);
        #endif
        float body = fres * 0.9 + lines * (0.1 + 0.55 * fres) * (0.6 + 0.8 * sweep) + 0.006;
        vec3 col = uHoloCol * body * ghost + uHoloHi * edge * 0.25;
        #ifdef RB_SKIN
          // Hals: viele Rohre ueberlagern sich additiv. Im Roentgen deutlich zurueck (sonst wirkt er wie eine Dose)
          col *= 0.45 * mix(1.0, 0.3, uXray);
        #endif
        gl_FragColor = vec4(col * uHolo * near * fade, 1.0);
      }`,
  });
}
