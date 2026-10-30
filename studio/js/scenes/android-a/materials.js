// Materialien von android-a (v2). Alle teilen dieselben Uniforms (U) fuer Kopfbewegung, Atmen, Aufbau, Roentgen-Scan.
// Vertex: Haut-Ueberblendung Kopf/Hals (uHeadMat ab Hals anteilig), Atmen der Brust.
// Licht v2: eigenes Dreipunkt-Licht im Kameraraum (uRigDir/uRigCol), die Lichter der Engine sind hier aus (uEngK 0):
//   0 Key   vorne links oben, neutral bis leicht warm
//   1 Fill  vorne rechts unten, kuehl, etwa 1:4 zum Key
//   2 Kante hinten links, kuehl und stark: trennt das Profil (Stirn, Nase, Lippen, Kinn, Hals) vom Hintergrund
//   3 Kante hinten rechts oben, Eis-Cyan: Hinterkopf, Mechanik, Kabel
// Haut (AA_SKIN): Wrap-Diffuse mit warmem Terminator (Streulicht-Ersatz), Schatten neutral und tief.
import { CUT_GLSL } from './shape.js';

export function makeUniforms(THREE, palette, shared) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
  const C = (r, g, b, k) => new THREE.Vector3(r * k, g * k, b * k);
  return {
    uTime: shared.uTime,
    uHeadMat: { value: new THREE.Matrix4() },
    uSkinY: { value: new THREE.Vector2(-1.55, -0.85) },
    uBreath: { value: 0 },
    uBuildY: { value: 9 },
    uScanY: { value: 9 },
    uXray: { value: 0 },
    uHolo: { value: 0 },
    uAlpha: { value: 1 },
    uSig: { value: palette.signal.clone() },
    uIce: { value: palette.ice.clone() },
    uEmber: { value: palette.ember.clone() },
    uVoid: { value: palette.void.clone() },
    uGlow: { value: 1 },
    uPulse: { value: 0 },
    uFadeY: { value: new THREE.Vector2(-2.45, -3.4) },
    uEngK: { value: 0 },
    // v3: Key etwas seitlicher und waermer, Aufhellung ~1:4, Kanten schmaler und kraeftiger
    uRigDir: { value: [V(-0.84, 0.42, 0.36), V(0.7, -0.12, 0.66), V(-0.8, 0.16, -0.58), V(0.6, 0.45, -0.66)] },
    uRigCol: { value: [C(1.0, 0.95, 0.9, 2.45), C(0.72, 0.84, 1.0, 0.55), C(0.82, 0.92, 1.0, 2.6), C(0.5, 0.86, 1.0, 2.2)] },
  };
}

export const COMMON_GLSL = /* glsl */ `
#ifndef AA_CLAMP
#define AA_CLAMP 2.2
#endif
uniform mat4 uHeadMat;
uniform vec2 uSkinY;
uniform float uBreath;
uniform float uBuildY;
uniform float uScanY;
uniform float uXray;
uniform float uAlpha;
uniform vec3 uSig;
uniform vec3 uIce;
uniform vec3 uEmber;
uniform float uTime;
uniform float uGlow;
uniform vec2 uFadeY;
uniform float uEngK;
uniform vec3 uRigDir[4];
uniform vec3 uRigCol[4];
uniform vec4 uRigK;
float aaSkinW(float y) { return smoothstep(uSkinY.x, uSkinY.y, y); }
vec3 aaSkinP(vec3 p, float w) { return mix(p, (uHeadMat * vec4(p, 1.0)).xyz, w); }
vec3 aaSkinN(vec3 n, float w) { return normalize(mix(n, mat3(uHeadMat) * n, w)); }
vec3 aaBreathe(vec3 p) {
  float c = smoothstep(-1.4, -2.1, p.y) * (1.0 - smoothstep(-2.9, -3.6, p.y));
  return p + vec3(p.x * 0.004, 0.011, 0.012 * smoothstep(-0.3, 0.5, p.z)) * c * uBreath;
}
float aaSq(float x) { return x * x; }
float aaHash13(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float aaHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// Wertrauschen mit Ableitung (iq): xyz = Gradient, w = Wert
vec4 aaNoised(vec3 x) {
  vec3 i = floor(x); vec3 w = fract(x);
  vec3 u = w * w * (3.0 - 2.0 * w); vec3 du = 6.0 * w * (1.0 - w);
  float a = aaHash13(i); float b = aaHash13(i + vec3(1, 0, 0)); float c = aaHash13(i + vec3(0, 1, 0)); float d = aaHash13(i + vec3(1, 1, 0));
  float e = aaHash13(i + vec3(0, 0, 1)); float f = aaHash13(i + vec3(1, 0, 1)); float g = aaHash13(i + vec3(0, 1, 1)); float h = aaHash13(i + vec3(1, 1, 1));
  float k1 = b - a; float k2 = c - a; float k3 = e - a; float k4 = a - b - c + d; float k5 = a - c - e + g; float k6 = a - b - e + f;
  float k7 = -a + b + c - d + e - f - g + h;
  return vec4(du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y),
    a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z);
}
${CUT_GLSL}
`;

// Lichter der Engine abschalten (uEngK) und das eigene Licht-Rig anhaengen
const LIGHTS_RIG = (THREE) => THREE.ShaderChunk.lights_fragment_begin.replace(
  'getDirectionalLightInfo( directionalLight, directLight );',
  'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uEngK;',
) + /* glsl */ `
#if defined( RE_Direct )
for (int aaI = 0; aaI < 4; aaI++) {
  directLight.direction = uRigDir[aaI];
  directLight.color = uRigCol[aaI] * uRigK[aaI];
  directLight.visible = true;
  #ifdef AA_SKIN
  if (aaI >= 2) {
    // Kantenlicht auf der Haut: nur ein schmaler Saum am Umriss (Fresnel), Glanz gedaempft. Kein Hotspot auf der Stirn.
    float aaNdl = dot(geometryNormal, directLight.direction);
    float aaNv = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
    float aaRim = smoothstep(-0.05, 0.4, aaNdl) * pow(1.0 - aaNv, 2.2);
    reflectedLight.directDiffuse += directLight.color * aaRim * 0.5 * material.diffuseColor * vec3(1.0, 0.95, 0.92);
    vec3 aaDc = material.diffuseColor;
    material.diffuseColor = vec3(0.0);
    directLight.color *= 0.3;
    RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
    material.diffuseColor = aaDc;
  } else {
    float aaNdl = dot(geometryNormal, directLight.direction);
    float aaWd = max(0.0, (aaNdl + AA_WRAP) / (1.0 + AA_WRAP));
    float aaTerm = smoothstep(-AA_WRAP, 0.05, aaNdl) * (1.0 - smoothstep(0.05, 0.6, aaNdl));
    vec3 aaTint = mix(vec3(1.0), uScatter, aaTerm * 0.55);
    reflectedLight.directDiffuse += directLight.color * aaWd * aaTint * BRDF_Lambert(material.diffuseColor);
    vec3 aaDc = material.diffuseColor;
    material.diffuseColor = vec3(0.0);
    RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
    material.diffuseColor = aaDc;
  }
  #else
  RE_Direct(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
  #endif
}
#endif
`;

/**
 * Gemeinsamer Patch: Uniforms, GLSL-Helfer, Haut (Kopf folgt), Ruhepose als Varying, Licht-Rig.
 * o.skin: Vertex wird mit dem Kopf ueberblendet. o.vertexPre/vertexPos: eigene Zeilen. o.rigK: Staerke je Licht.
 */
export function patchCommon(THREE, shader, U, o = {}) {
  const rigK = { uRigK: { value: o.rigK || new THREE.Vector4(1, 1, 1, 1) } };
  Object.assign(shader.uniforms, U, rigK, o.uniforms || {});
  const head = `${COMMON_GLSL}\n${o.common || ''}\nvarying vec3 vAaObj;\nvarying vec3 vAaPos;\n`;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${head}\n${o.vertexHead || ''}`);
  if (o.raw) {
    // eigener Vertex-Code (Kabel): beginnormal/begin_vertex ersetzt der Aufrufer
  } else shader.vertexShader = shader.vertexShader
    .replace('#include <beginnormal_vertex>', o.skin === false
      ? '#include <beginnormal_vertex>\nfloat aaW = 0.0;'
      : `#include <beginnormal_vertex>
        float aaW = aaSkinW(position.y);
        objectNormal = aaSkinN(objectNormal, aaW);`)
    .replace('#include <begin_vertex>', o.skin === false
      ? `#include <begin_vertex>\n${o.vertexPos || ''}\nvAaObj = position; vAaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      : `vec3 transformed = aaSkinP(aaBreathe(position), aaW);
        ${o.vertexPos || ''}
        vAaObj = position; vAaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${head}\n${o.fragmentHead || ''}`)
    .replace('#include <lights_fragment_begin>', LIGHTS_RIG(THREE))
    .replace('#include <opaque_fragment>', 'outgoingLight = min(outgoingLight, vec3(AA_CLAMP));\n#include <opaque_fragment>');
  return shader;
}

/* ================================================================== Haut (Gesicht, Hals) und Keramik (Bueste) */
// Gesichtsmasken im Objektraum der Ruhepose, gemessen am Kopfnetz v2 (scripts2/build_v5.py):
//   Augen (+-0.271, -0.094, 0.696) r 0.114, Lidkante oben y ~ -0.045, Mundschlitz y -0.687, Mundwinkel x 0.185,
//   Oberlippe bis y -0.572 (Mitte), Unterlippe bis y -0.79, Nasenspitze (0, -0.37, 1.12).
export const FACE_GLSL = /* glsl */ `
float aaLipMask(vec3 p) {
  float u = abs(p.x) / 0.185;
  float yU = -0.572 + 0.008 * exp(-aaSq((u - 0.24) / 0.13)) - 0.118 * pow(smoothstep(0.3, 1.0, u), 2.2);
  float yL = -0.792 + 0.10 * pow(smoothstep(0.25, 1.0, u), 2.5);
  float e = 0.006;
  float m = smoothstep(yL - e, yL + e, p.y) * (1.0 - smoothstep(yU - e, yU + e, p.y));
  m *= 1.0 - smoothstep(0.96, 1.04, u);
  return m * smoothstep(0.8, 0.86, p.z);
}
// Braue: Bogen ueber dem Auge, innen kraeftiger, aussen fein. h = Haar-Struktur
float aaBrow(vec3 p) {
  float ax = abs(p.x);
  float t = (ax - 0.105) / 0.335;
  if (t < -0.08 || t > 1.08) return 0.0;
  float tc = clamp(t, 0.0, 1.0);
  float yc = 0.068 + 0.05 * sin(3.14159 * pow(tc, 0.75)) - 0.012 * tc;
  float hw = mix(0.02, 0.008, tc);
  float d = abs(p.y - yc);
  float m = 1.0 - smoothstep(0.0, hw, d);
  m *= smoothstep(-0.08, 0.04, t) * (1.0 - smoothstep(0.92, 1.08, t));
  // Haare: schraeg, innen steil nach oben, aussen flach nach aussen
  float ang = mix(1.25, 0.25, tc);
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 q = vec2(ax, p.y);
  float across = dot(q, vec2(-dir.y, dir.x));
  float id = floor(across / 0.0032);
  float fr = fract(across / 0.0032);
  float hair = smoothstep(0.15, 0.4, fr) * (1.0 - smoothstep(0.6, 0.85, fr));
  float rnd = aaHash12(vec2(id, 3.0));
  hair *= step(0.25, rnd);
  float fw = fwidth(across / 0.0032);
  hair = mix(hair, 0.45, smoothstep(0.35, 0.9, fw));
  return m * (0.7 + 0.3 * hair) * smoothstep(0.55, 0.7, p.z);
}
// Lidrand oben (Wimpernlinie) und Augenhoehle
void aaEyeZones(vec3 p, out float lash, out float socket, out float lid) {
  vec3 c = vec3(sign(p.x) * 0.271, -0.094, 0.696);
  vec3 q = p - c;
  float r = length(q) / 0.114;
  float up = smoothstep(-0.012, 0.02, q.y);
  float sideF = 1.0 - smoothstep(0.075, 0.125, abs(q.x));
  lash = (1.0 - smoothstep(1.0, 1.13, r)) * up * sideF * step(0.0, q.z);
  float lo = (1.0 - smoothstep(1.0, 1.07, r)) * (1.0 - up) * (1.0 - smoothstep(0.06, 0.11, abs(q.x))) * step(0.0, q.z);
  lash = max(lash, lo * 0.35);
  vec2 e = vec2((p.x - c.x) / 0.19, (p.y - c.y - 0.025) / 0.13);
  socket = 1.0 - smoothstep(0.55, 1.15, length(e));
  // Oberlid (zwischen Lidrand und Lidfalte) leicht schimmernd
  lid = (1.0 - smoothstep(1.12, 1.45, r)) * up * smoothstep(1.0, 1.12, r) * step(0.0, q.z);
}
`;

export function makeSkin(THREE, U, env, o) {
  const { hi } = o;
  const mat = new THREE.MeshPhysicalMaterial({
    // v3: heller, leicht warmer Porzellan-Hautton (statt grauem Ton), Klarlack nur schwach, etwas Sheen
    color: new THREE.Color(0.68, 0.56, 0.5),
    roughness: 0.5,
    metalness: 0,
    ior: 1.4,
    clearcoat: hi ? 0.07 : 0.05,
    clearcoatRoughness: 0.4,
    sheen: 0.3,
    sheenColor: new THREE.Color(0.32, 0.28, 0.28),
    sheenRoughness: 0.5,
    envMap: env,
    envMapIntensity: 0.3,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const uIn = {
    uInner: { value: new THREE.Color(0x0c1218) },
    uSeamCol: { value: new THREE.Color(0x2b3440) },
    uScatter: { value: new THREE.Vector3(1.0, 0.52, 0.4) },
    uLip: { value: new THREE.Color(0.56, 0.26, 0.24) },
    uBrowCol: { value: new THREE.Color(0.2, 0.15, 0.13) },
    uShell: { value: new THREE.Color(0.6, 0.55, 0.52) }, // Bueste: entsaettigtes Porzellan, kein harter Wechsel zur Haut
  };
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      uniforms: uIn,
      rigK: new THREE.Vector4(1, 1, 1.0, 0.6),
      vertexHead: 'attribute float aAO;\nvarying float vAO;',
      vertexPos: 'vAO = aAO;',
      fragmentHead: /* glsl */ `
        varying float vAO;
        uniform vec3 uInner, uSeamCol, uLip, uBrowCol, uShell;
        uniform vec3 uScatter;
        ${FACE_GLSL}
        // Fugen nur an der Keramik-Bueste (Kragen, Brustbein, Schulterkappen, Ruecken)
        float aaSeams(vec3 p) {
          float d = 9.0;
          float bust = step(p.y, -1.6);
          float col = p.y + 1.74 + 0.16 * p.x * p.x;
          d = min(d, abs(col) + step(-1.6, p.y) * 9.0);
          d = min(d, abs(p.x) + step(-1.76 - 0.16 * p.x * p.x, p.y) * 9.0 + step(p.z, 0.05) * 9.0);
          float cap = abs(length(vec2(abs(p.x) - 1.78, (p.y + 2.05) * 0.9)) - 0.5);
          d = min(d, cap + (1.0 - bust) * 9.0);
          float spine = abs(p.x) + step(-0.2, p.z) * 9.0 + step(-1.75, p.y) * 9.0;
          d = min(d, spine);
          return d;
        }
      `,
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', /* glsl */ `#include <clipping_planes_fragment>
        float aaF = aaCut(vAaObj);
        if (aaF > 0.0) discard;
        if (vAaPos.y > uBuildY) discard;
        if (vAaPos.y > uScanY) discard;
      `)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        vec3 P = vAaObj;
        // Keramik-Bueste unterhalb des Kragens: kuehler, heller, glatter
        float aaShellW = 1.0 - smoothstep(-1.78, -1.7, P.y + 0.16 * P.x * P.x);
        float aaSeam = aaSeams(P);
        float aaG = (1.0 - smoothstep(0.0016, 0.0045, aaSeam)) * aaShellW;
        vec3 sk = diffuseColor.rgb;
        // Albedo-Variation: Wangen, Nasenspitze, Ohren etwas waermer, Augenhoehlen und Lider dunkler, Lippen rose
        // breit und leise: Wangen, Nase, Kinn minimal waermer, Stirn und Schlaefen kuehler (kein Rouge-Fleck)
        float aaChk = exp(-aaSq((abs(P.x) - 0.36) / 0.2) - aaSq((P.y + 0.33) / 0.22)) * smoothstep(0.4, 0.7, P.z);
        sk *= mix(vec3(1.0), vec3(1.02, 0.93, 0.92), aaChk * 0.45);
        float aaNose = exp(-aaSq(P.x / 0.08) - aaSq((P.y + 0.34) / 0.1)) * smoothstep(0.98, 1.1, P.z);
        sk *= mix(vec3(1.0), vec3(1.02, 0.93, 0.92), aaNose * 0.5);
        float aaCool = smoothstep(0.1, 0.45, P.y) + smoothstep(0.62, 0.4, P.z) * smoothstep(-0.2, 0.1, P.y);
        sk *= mix(vec3(1.0), vec3(0.96, 0.97, 1.0), clamp(aaCool, 0.0, 1.0) * 0.5);
        // ganz feine Unregelmaessigkeit (gross, kein Rauschen auf Pixelebene)
        sk *= 0.975 + 0.05 * aaNoised(P * 9.0).w;
        float aaLash; float aaSock; float aaLidZ;
        aaEyeZones(P, aaLash, aaSock, aaLidZ);
        sk *= mix(vec3(1.0), vec3(0.78, 0.68, 0.68), aaSock * 0.5);
        sk *= mix(vec3(1.0), vec3(0.92, 0.84, 0.84), aaLidZ * 0.6);
        float aaLipM = aaLipMask(P);
        sk = mix(sk, uLip, aaLipM * 0.58);
        float aaBrowM = aaBrow(P);
        sk = mix(sk, uBrowCol, aaBrowM * 0.3);
        sk = mix(sk, vec3(0.03, 0.025, 0.025), aaLash * 0.85);
        diffuseColor.rgb = mix(sk, uShell, aaShellW);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSeamCol, 0.85 * aaG);
        float aaAO = clamp(vAO, 0.0, 1.0);
        aaAO = mix(0.1, 1.0, smoothstep(0.08, 0.95, aaAO));
        diffuseColor.rgb *= mix(1.0, aaAO, 0.5);
        if (!gl_FrontFacing) diffuseColor.rgb = uInner;
        float aaFade = 1.0 - smoothstep(uFadeY.x, uFadeY.y, vAaPos.y);
        diffuseColor.a *= aaFade;
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
        #ifdef AA_HI
        {
          vec4 n1 = aaNoised(vAaObj * 140.0);
          vec4 n2 = aaNoised(vAaObj * 380.0 + 3.1);
          float faceW = 1.0 - smoothstep(-1.78, -1.7, vAaObj.y + 0.16 * vAaObj.x * vAaObj.x);
          vec3 g = (n1.xyz * 0.0009 + n2.xyz * 0.00045) * (1.0 - faceW * 0.8);
          vec3 gv = mat3(viewMatrix) * g;
          normal = normalize(normal - (gv - dot(gv, normal) * normal) * (gl_FrontFacing ? 1.0 : 0.0));
        }
        #endif
      `)
      .replace('#include <lights_physical_fragment>', /* glsl */ `#include <lights_physical_fragment>
        // Lippen etwas glaenzender, Brauen matt, Keramik glatter mit Klarlack
        material.roughness = clamp(material.roughness - 0.12 * aaLipM + 0.2 * aaBrowM - 0.1 * aaShellW, 0.08, 1.0);
        if (!gl_FrontFacing) {
          material.roughness = 0.7;
          #ifdef USE_CLEARCOAT
          material.clearcoat = 0.0;
          #endif
          #ifdef USE_SHEEN
          material.sheenColor = vec3(0.0);
          #endif
        }
        #ifdef USE_CLEARCOAT
        material.clearcoat = mix(material.clearcoat, 0.25, aaShellW) * (1.0 - aaG) * smoothstep(0.3, 0.9, aaAO);
        #endif
        #ifdef USE_SHEEN
        material.sheenColor *= (1.0 - aaShellW) * (1.0 - aaBrowM);
        #endif
      `)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        // Schattenseite neutral und tief: Umgebungslicht entsaettigen, Verdeckung stark
        {
          float l = dot(reflectedLight.indirectDiffuse, vec3(0.2126, 0.7152, 0.0722));
          reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, vec3(l) * vec3(1.0, 0.96, 0.95), 0.75) * aaAO * 0.45;
        }
        reflectedLight.indirectSpecular *= aaAO * aaAO;
        {
          float aaPool = mix(1.0, 0.1, smoothstep(-1.4, -2.35, vAaPos.y));
          reflectedLight.directDiffuse *= aaPool; reflectedLight.directSpecular *= aaPool;
          reflectedLight.indirectDiffuse *= aaPool; reflectedLight.indirectSpecular *= aaPool;
        }
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        // Aufbau- und Scan-Linie: heller Saum in Signal-Cyan
        float aaBand = exp(-aaSq((vAaPos.y - uBuildY) / 0.02)) * step(uBuildY, 8.0);
        aaBand += exp(-aaSq((vAaPos.y - uScanY) / 0.012)) * step(uScanY, 8.0);
        totalEmissiveRadiance += uSig * 3.5 * aaBand;
        // ganz wenig Cyan aus der Mechanik direkt an der Schnittkante
        totalEmissiveRadiance += uSig * 0.025 * exp(aaF / 0.03) * (gl_FrontFacing ? 1.0 : 0.0) * (1.0 - aaShellW);
      `);
    shader.fragmentShader = '#define AA_SKIN\n#define AA_WRAP 0.3\n#define AA_CLAMP 1.45\n' + shader.fragmentShader;
    if (hi) shader.fragmentShader = '#define AA_HI\n' + shader.fragmentShader;
  };
  mat.customProgramCacheKey = () => `aa-skin-${hi ? 1 : 0}`;
  mat.userData.u = uIn;
  return mat;
}

/* ================================================================== Kante am Schnitt (Materialstaerke + feine Lichtlinie) */
export function makeRibbon(THREE, U, env, o) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.62, 0.6, 0.6), roughness: 0.38, metalness: 0.1, envMap: env, envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      vertexHead: 'attribute float aRib;\nvarying float vRib;',
      vertexPos: 'vRib = aRib;',
      fragmentHead: 'varying float vRib;',
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vAaPos.y > uBuildY || vAaPos.y > uScanY) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= mix(1.0, 0.2, smoothstep(0.35, 0.8, vRib));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float aaL = smoothstep(0.7, 0.9, vRib) * (1.0 - smoothstep(0.95, 1.0, vRib));
        float aaFace = smoothstep(0.08, 0.45, abs(dot(normal, normalize(vViewPosition))));
        float aaTop = 1.0 - 0.75 * smoothstep(0.6, 0.85, vAaObj.y);
        totalEmissiveRadiance += uSig * 0.3 * aaL * uGlow * aaFace * aaTop;`);
    shader.fragmentShader = '#define AA_CLAMP 1.4\n' + shader.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'aa-ribbon';
  return mat;
}

/* ================================================================== Innere Schaedelschale (helles Titan, Platten) */
// Grosse, ruhige Sechseck-Platten aus eloxiertem Titan (kuehl, hell). Feindetail nur ueber Rauheit und Normale,
// keine leuchtenden Pixel. Kanten mit fwidth geglaettet (kein Flimmern).
export function makeInner(THREE, U, env, o) {
  const { hi } = o;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.38, metalness: 0.85, envMap: env, envMapIntensity: 0.7,
    side: THREE.DoubleSide, // v3: von oben durch die offene Kalotte nie die Mechanik der Gegenseite sehen
  });
  const uIn = {
    // v3 eisig: Milchglas-Keramik hell und kuehl, wenige Stahlplatten als Kontrast
    uTi: { value: new THREE.Color(0.2, 0.29, 0.38) },
    uTiD: { value: new THREE.Color(0.36, 0.46, 0.55) },
    uGr: { value: new THREE.Color(0.08, 0.1, 0.13) },
  };
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      uniforms: uIn,
      rigK: new THREE.Vector4(0.6, 1, 0.8, 1.0),
      vertexHead: 'attribute vec2 aUV;\nvarying vec2 vUV2;',
      vertexPos: 'vUV2 = aUV;',
      fragmentHead: /* glsl */ `
        varying vec2 vUV2;
        uniform vec3 uTi, uTiD, uGr;
        vec4 aaHex(vec2 p) {
          const vec2 s = vec2(1.0, 1.7320508);
          vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
          vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
          return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + 0.5);
        }
        float aaHexD(vec2 p) { p = abs(p); return max(dot(p, vec2(0.5, 0.8660254)), p.x); }
      `,
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', /* glsl */ `#include <clipping_planes_fragment>
        float aaF = aaCut(vAaObj);
        if (aaF < -0.05) discard;
        if (vAaPos.y > uBuildY) discard;
        if (vAaPos.y > uScanY) discard;
      `)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        vec2 hp = vUV2 / 0.085;
        vec4 hx = aaHex(hp);
        float hd = aaHexD(hx.xy);
        float cellR = aaHash12(hx.zw);
        float fw = fwidth(hd);
        float groove = 1.0 - smoothstep(0.46 - fw, 0.46 + fw, hd);
        float bevel = smoothstep(0.38, 0.46, hd) * groove;
        // Fugen nur, solange die Zelle gross genug ist (sonst Mittelwert: kein Flimmern)
        float aaSmall = smoothstep(0.08, 0.22, fw);
        groove = mix(groove, 0.9, aaSmall); bevel *= 1.0 - aaSmall;
        vec3 col = mix(uTi, uTiD, step(0.6, cellR) * 0.6);
        col = mix(col, uGr, step(0.975, cellR) * 0.7);
        float rough = mix(0.3, 0.4, step(0.6, cellR));
        float metal = 0.55;
        // gebuerstet: feine Streifen nur in der Rauheit
        float br = aaHash12(floor(vUV2 * vec2(700.0, 5.0)));
        rough += (br - 0.5) * 0.06 * smoothstep(1.2, 0.3, fwidth(vUV2.x * 700.0));
        col *= 0.92 + 0.08 * cellR;
        col = mix(col * 0.25, col, groove);
        col *= 1.0 - 0.35 * bevel;
        if (!gl_FrontFacing) col *= 0.45;
        diffuseColor.rgb = col;
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = rough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = metal;')
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
        {
          // Plattenkante als Fase: Normale zur Mitte der Zelle kippen
          vec3 gx = dFdx(vAaPos); vec3 gy = dFdy(vAaPos);
          vec2 du = dFdx(hp); vec2 dv = dFdy(hp);
          float det = du.x * dv.y - du.y * dv.x;
          if (abs(det) > 1e-9) {
            vec3 Tu = (gx * dv.y - gy * du.y) / det;
            vec3 Tv = (gy * du.x - gx * dv.x) / det;
            vec2 dirC = -normalize(hx.xy + 1e-5);
            vec3 tilt = normalize(mat3(viewMatrix) * (Tu * dirC.x + Tv * dirC.y) + 1e-6);
            normal = normalize(normal + tilt * bevel * 0.6);
          }
        }
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += uSig * 3.0 * exp(-aaSq((vAaPos.y - uScanY) / 0.012)) * step(uScanY, 8.0);
        // Eis: weiches Licht von innen, gross verlaufend (kein Pixelrauschen), in den Fugen etwas staerker
        {
          float nvI = abs(dot(normal, normalize(vViewPosition)));
          float big = 0.55 + 0.45 * aaNoised(vAaObj * 3.2 + vec3(0.0, uTime * 0.03, 0.0)).w;
          float deep = smoothstep(0.05, 0.35, aaF);
          float iceCell = (1.0 - step(0.9, cellR));
          totalEmissiveRadiance += uIce * (0.035 * big * iceCell + 0.16 * (1.0 - groove) * big + 0.06 * pow(1.0 - nvI, 2.0)) * deep;
        }
      `);
    if (hi) shader.fragmentShader = '#define AA_HI\n' + shader.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'aa-inner2';
  return mat;
}

/* ================================================================== Milchglas-Schalen ueber dem offenen Schaedel */
// Mehrere Lagen (o.layer 0 aussen, 1 innen) mit eigener Platteneinteilung. Milchig (Grundhelligkeit + Fresnel),
// gefaste Plattenkanten als Glanz (nicht als Leuchten), sehr feine Kantenlinie.
export function makeGlass(THREE, U, env, o) {
  const { layer = 0 } = o;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.55, 0.66, 0.74), roughness: layer ? 0.42 : 0.28, metalness: 0, envMap: env, envMapIntensity: 0.75,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const uG = { uLayer: { value: layer } };
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      uniforms: uG,
      rigK: new THREE.Vector4(0.4, 0.55, 1.0, 1.15),
      fragmentHead: /* glsl */ `
        uniform float uLayer;
        // Glasplatten: Bereich hinter der Kante, oberhalb einer Unterkante, mit Fugen.
        // aussen: Laengsfugen bei |x| 0.19 und eine Querfuge; innen: versetzt (|x| 0.33, Querfuge weiter hinten)
        float aaGlassField(vec3 p, out float edgeD) {
          float lay = uLayer;
          float f = aaCut(p) - mix(0.25, 0.12, lay);
          float ax = abs(p.x);
          float yb = mix(mix(-0.52, -0.62, lay), mix(0.02, -0.12, lay), smoothstep(0.16, 0.55, ax));
          float sx = mix(0.19, 0.33, lay);
          float seam = abs(ax - sx) - 0.009;
          float a = atan(p.y - 0.02, p.z + 0.06);
          float qa = mix(2.15, 2.55, lay);
          float seamQ = abs(a - qa) * 0.85 - 0.009;
          float s = min(seam, seamQ);
          edgeD = min(f, min(p.y - yb, s));
          return edgeD;
        }
      `,
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', /* glsl */ `#include <clipping_planes_fragment>
        float aaPanel;
        float aaGf = aaGlassField(vAaObj, aaPanel);
        if (aaGf < 0.0) discard;
        if (vAaPos.y > uBuildY) discard;
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
        // Fase an den Plattenkanten: Normale kippt (Glanzlinie aus der Umgebung)
        float aaBev = 1.0 - smoothstep(0.0, 0.012, aaPanel);
        {
          vec3 gx = dFdx(-vViewPosition); vec3 gy = dFdy(-vViewPosition);
          float fx = dFdx(aaPanel); float fy = dFdy(aaPanel);
          vec3 gv = (cross(gy, normal) * fx + cross(normal, gx) * fy) * sign(dot(gx, cross(gy, normal)));
          if (length(gv) > 1e-10) normal = normalize(normal - normalize(gv) * aaBev * 0.9);
        }
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        float aaEdge = exp(-max(aaPanel, 0.0) / 0.0018) * smoothstep(0.08, 0.45, abs(dot(normal, normalize(vViewPosition))));
        totalEmissiveRadiance += uIce * 0.35 * aaEdge * uGlow * (1.0 - uLayer * 0.6);
      `)
      .replace('#include <opaque_fragment>', /* glsl */ `
        vec3 aaV = normalize(vViewPosition);
        float aaFr = pow(1.0 - abs(dot(normal, aaV)), 2.5);
        // Milchglas: Grundtruebung + Fresnel + Fase
        float aaA = clamp(mix(0.17, 0.1, uLayer) + 0.42 * aaFr + 0.4 * aaBev, 0.0, 1.0) * uAlpha * (1.0 - uXray * 0.85);
        float aaScan = 1.0 - smoothstep(uScanY - 0.02, uScanY + 0.02, vAaPos.y);
        aaA *= mix(1.0, aaScan, step(uScanY, 8.0));
        vec3 milk = uIce * (0.05 + 0.08 * aaFr) * (1.0 - uLayer * 0.4);
        gl_FragColor = vec4((min(outgoingLight, vec3(0.55)) + milk) * aaA * 1.12, aaA * 0.8);
      `);
  };
  mat.customProgramCacheKey = () => `aa-glass2-${layer}`;
  return mat;
}

/* ================================================================== Augen */
export function makeEye(THREE, U, env, o) {
  const { palette } = o;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.4, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.04, envMap: env, envMapIntensity: 0.5,
  });
  const uE = {
    uSclera: { value: new THREE.Color(0.7, 0.68, 0.67) },
    uIris: { value: new THREE.Color(0x5b4232) },
    uIrisRing: { value: palette.signal.clone() },
    uIrisOn: { value: 0.1 },
  };
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      skin: false,
      uniforms: uE,
      rigK: new THREE.Vector4(1, 1, 0.4, 0.3),
      vertexHead: 'varying vec3 vEyeL;',
      vertexPos: 'vEyeL = normalize(position);',
      fragmentHead: 'varying vec3 vEyeL;\nuniform vec3 uSclera, uIris, uIrisRing;\nuniform float uIrisOn;',
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vAaPos.y > uBuildY || vAaPos.y > uScanY) discard;`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float th = acos(clamp(vEyeL.z, -1.0, 1.0));
        float ph = atan(vEyeL.y, vEyeL.x);
        float iris = 1.0 - smoothstep(0.5, 0.53, th);
        float pupil = 1.0 - smoothstep(0.16, 0.18, th);
        float fib = 0.72 + 0.28 * sin(ph * 61.0 + sin(ph * 9.0) * 1.7) * sin(ph * 23.0 + th * 30.0);
        float limb = smoothstep(0.38, 0.52, th);
        float collar = exp(-aaSq((th - 0.23) / 0.05));
        vec3 ic = uIris * fib * (1.0 - 0.6 * limb) + uIris * 0.7 * collar;
        vec3 c = mix(uSclera * (0.8 + 0.2 * smoothstep(0.95, 0.55, th)), ic, iris);
        c *= 1.0 - 0.65 * smoothstep(-0.05, 0.45, vEyeL.y);
        c = mix(c, vec3(0.003), pupil);
        diffuseColor.rgb = c;
        float aaRing = exp(-aaSq((th - 0.2) / 0.01));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uIrisRing * aaRing * uIrisOn * uGlow;`);
  };
  mat.customProgramCacheKey = () => 'aa-eye2';
  mat.userData.u = uE;
  return mat;
}

/* ================================================================== Wimpern (Band mit Haar-Alpha) */
export function makeLash(THREE, U) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      ${COMMON_GLSL}
      attribute vec2 aL;
      varying vec2 vL; varying vec3 vP;
      void main() {
        vL = aL;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      varying vec2 vL; varying vec3 vP;
      void main() {
        if (vP.y > uBuildY || vP.y > uScanY) discard;
        float n = 70.0;
        float id = floor(vL.x * n);
        float fr = fract(vL.x * n);
        float r = aaHash12(vec2(id, 7.0));
        float len = 0.55 + 0.45 * r;
        float w = mix(0.38, 0.06, vL.y / len);
        float hair = step(abs(fr - 0.5), w) * step(vL.y, len);
        if (hair < 0.5) discard;
        gl_FragColor = vec4(vec3(0.012, 0.01, 0.01) * (0.6 + 0.4 * vL.y), 1.0);
      }`,
  });
  return mat;
}

/* ================================================================== Mechanik (Servo, Hals, Streben, Kamm) */
// Vertex-Farben + Attribut aPbr (x = metalness, y = roughness, z = Leuchten 0..1 in Signal-Cyan)
export function makeParts(THREE, U, env) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.4, metalness: 0.8, envMap: env, envMapIntensity: 1.1,
  });
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      rigK: new THREE.Vector4(1, 1, 1, 1.1),
      vertexHead: 'attribute vec3 aPbr;\nvarying vec3 vPbr;',
      vertexPos: 'vPbr = aPbr;',
      fragmentHead: 'varying vec3 vPbr;',
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (vAaPos.y > uBuildY) discard;
        if (vPbr.z < -0.5 && vAaPos.y > uScanY + 0.002 && step(uScanY, 8.0) > 0.5) discard;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vPbr.y;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vPbr.x;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float aaPul = 0.8 + 0.2 * sin(uTime * 1.3 + vAaObj.y * 6.0);
        totalEmissiveRadiance += uSig * max(vPbr.z, 0.0) * 1.6 * aaPul * uGlow;`);
    // v3: Glanzpunkte auf Metall nicht ueber die Bloom-Schwelle (sonst weisse Flecken an Schlaefe und Scheitel)
    shader.fragmentShader = '#define AA_CLAMP 1.45\n' + shader.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'aa-parts3';
  return mat;
}

/* ================================================================== Hologramm (Roentgen, Aufbau) */
export function makeHolo(THREE, U, o = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uHoloCol: { value: o.palette.signal.clone().multiplyScalar(0.8) }, uOpen: { value: o.open ?? 0.35 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      ${COMMON_GLSL}
      attribute float aVis;
      varying float vAO;
      varying vec3 vAaObj; varying vec3 vAaPos; varying vec3 vN; varying vec3 vV;
      void main() {
        vAO = aVis;
        float w = aaSkinW(position.y);
        vec3 p = aaSkinP(aaBreathe(position), w);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vAaObj = position; vAaPos = wp.xyz;
        vN = normalize(mat3(modelMatrix) * aaSkinN(normal, w));
        vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform float uHolo;
      uniform vec3 uHoloCol;
      uniform float uOpen;
      varying float vAO;
      varying vec3 vAaObj; varying vec3 vAaPos; varying vec3 vN; varying vec3 vV;
      void main() {
        if (vAO < 0.12) discard;
        float above = step(uScanY, vAaPos.y) * step(uScanY, 8.0);
        float a = uHolo * max(above, 1.0 - step(uScanY, 8.0));
        if (a < 0.002) discard;
        vec3 n = normalize(vN); vec3 v = normalize(vV);
        float fr = pow(1.0 - abs(dot(n, v)), 2.2);
        float lines = smoothstep(0.82, 1.0, abs(fract(vAaPos.y * 38.0) - 0.5) * 2.0);
        float open = aaCut(vAaObj) > 0.0 ? uOpen : 1.0;
        float fade = 1.0 - smoothstep(uFadeY.x + 0.4, uFadeY.y + 0.2, vAaPos.y);
        // im Roentgen nur Kopf und Hals: Schultern blenden aus
        fade *= mix(1.0, 1.0 - smoothstep(-1.3, -1.9, vAaPos.y), uXray);
        float i = (0.04 + 0.9 * fr + 0.12 * lines) * open * fade * a;
        gl_FragColor = vec4(uHoloCol * i, 1.0);
      }`,
  });
  return mat;
}

/* ================================================================== Schalen-Baender hinter der Gesichtskante */
// Gestufte Platten parallel zur Schnittkante (f0..f1), in Segmente geteilt, mit gefaster Kante (im Shader).
export function makeBand(THREE, U, env, o) {
  const { f0, f1, color, metal, rough, glow = 0, seg = 0.42, ears } = o;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMap: env, envMapIntensity: 1.0 });
  const uB = {
    uBand: { value: new THREE.Vector4(f0, f1, seg, glow) },
    uEarL: { value: new THREE.Vector3().fromArray(ears[0]) },
    uEarR: { value: new THREE.Vector3().fromArray(ears[1]) },
  };
  mat.onBeforeCompile = (shader) => {
    patchCommon(THREE, shader, U, {
      uniforms: uB,
      rigK: new THREE.Vector4(1, 1, 0.8, 1),
      vertexHead: 'attribute vec2 aUV;\nvarying vec2 vUV2;',
      vertexPos: 'vUV2 = aUV;',
      fragmentHead: 'varying vec2 vUV2;\nuniform vec4 uBand;\nuniform vec3 uEarL, uEarR;',
    });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', /* glsl */ `#include <clipping_planes_fragment>
        float aaF = aaCut(vAaObj);
        float dA = aaF - uBand.x;
        float dB = uBand.y - aaF;
        float sb = vUV2.y / (0.85 * uBand.z);
        float dG = (abs(fract(sb) - 0.5) - 0.5) * -0.85 * uBand.z - 0.006;
        float dE = min(length(vAaObj - uEarL), length(vAaObj - uEarR)) - 0.215;
        float dY = vAaObj.y + 0.74;
        float aaD = min(min(dA, dB), min(dG, min(dE, dY)));
        if (aaD < 0.0) discard;
        if (vAaPos.y > uBuildY || vAaPos.y > uScanY) discard;
      `)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float fwD = fwidth(aaD);
        float bev = smoothstep(0.0, 0.004 + fwD, aaD);
        float hiL = exp(-aaSq((aaD - 0.0055) / (0.0018 + fwD)));
        diffuseColor.rgb *= mix(0.25, 1.0, bev);
        diffuseColor.rgb += vec3(0.22) * hiL;
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        float aaFace = smoothstep(0.08, 0.45, abs(dot(normal, normalize(vViewPosition))));
        float aaTop = 1.0 - 0.75 * smoothstep(0.6, 0.85, vAaObj.y);
        totalEmissiveRadiance += uSig * uBand.w * exp(-max(dB, 0.0) / 0.0025) * uGlow * aaFace * aaTop;
        totalEmissiveRadiance += uSig * 3.0 * exp(-aaSq((vAaPos.y - uScanY) / 0.012)) * step(uScanY, 8.0);
      `);
    shader.fragmentShader = '#define AA_CLAMP 1.4\n' + shader.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'aa-band2';
  mat.userData.u = uB;
  return mat;
}

/* ================================================================== Lichtschein hinter dem Kopf */
// v3: Hintergrund hinter dem Kopf statt einfarbigem Navy: weicher, kuehler Lichtkegel hinter dem Hinterkopf,
// darin langsam ziehender Dunst (2 Oktaven Wertrauschen), schwache schraege Lichtbahnen und ein tiefer, warmer Hauch
// unten (Gegenpol zum Cyan). Billboard, additiv, alles unter der Bloom-Schwelle.
export function makeHalo(THREE, palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCol: { value: palette.steel.clone().lerp(palette.signal, 0.2).multiplyScalar(0.3) },
      uCol2: { value: palette.deep.clone().lerp(palette.ice, 0.04) },
      uWarm: { value: palette.emberDeep.clone().multiplyScalar(0.016) },
      uAmt: { value: 1 },
      uOff: { value: new THREE.Vector2(0.16, 0.1) },
      uT: { value: 0 },
      uAsp: { value: new THREE.Vector2(1, 1) }, // Groesse der Flaeche relativ zu 10 Einheiten: Muster bleibt gleich gross
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol, uCol2, uWarm;
      uniform float uAmt, uT;
      uniform vec2 uOff;
      uniform vec2 uAsp;
      varying vec2 vUv;
      float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vn(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0 * uAsp - uOff;
        float r = length(p * vec2(1.0, 1.15));
        float g = exp(-r * r * 3.6);
        float g2 = exp(-r * r * 0.8) * 0.4;
        vec2 q = p * 2.2 + vec2(uT * 0.012, -uT * 0.006);
        float haze = vn(q) * 0.65 + vn(q * 2.3 + 7.1) * 0.35;
        // schraege Lichtbahnen von oben hinten (sehr schwach)
        float a = dot(p, normalize(vec2(0.55, 1.0)));
        float rays = pow(0.5 + 0.5 * sin(a * 9.0 + vn(vec2(a * 3.0, 1.3)) * 2.0), 6.0) * exp(-r * 1.4) * smoothstep(-0.4, 0.4, p.y);
        vec3 c = uCol * g * (0.62 + 0.6 * haze) + uCol2 * g2 * (0.8 + 0.4 * haze) + uCol * rays * 0.22;
        float wy = (p.y + 0.95) / 0.4;
        c += uWarm * exp(-wy * wy) * exp(-p.x * p.x * 0.6);
        gl_FragColor = vec4(c * uAmt, 1.0);
      }`,
  });
}
