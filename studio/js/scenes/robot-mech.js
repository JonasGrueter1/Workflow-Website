// Szene "robot": Mechanik und Details. Alles in Ruhelage-Koordinaten der Bueste; was am Hals sitzt, bekommt ein Kopf-Gewicht
// (aHead, aus dem Netz gemessen) und biegt sich mit der Kopfdrehung wie die Haut. Kolben sind starr (Instanzen, pro Bild).
//
//   Augen       dunkles Glas mit feinem Cyan-Ring
//   Hals        Gehaeuse (Graphit, Rippen), 6 Wirbel mit Dornfortsaetzen, Bandscheiben aus Gel, Atlas-Kugel (Chrom),
//               Luftroehre (Gel mit Chrom-Spangen), Kopfwender-Muskeln (Gel, zwei Koepfe), 2 Kolben je Seite,
//               5 Kabel je Seite (eins mit Lichtimpulsen), Schellen, Chrom-Ringe oben und unten
//   Schultern   Chrom-Ring im offenen Band des Oberarms (folgt dem Querschnitt), dunkles Lager dahinter
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMechMaterial } from './robot-materials.js';
import { LAYOUT } from './robot-layout.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function buildMechanics(THREE, o) {
  const { lm, mesh, U, palette, env, headMat, quality } = o;
  const hi = quality === 'high';
  const q = hi ? 1 : 0.6;
  const S = (n, min) => Math.max(min, Math.round(n * q));
  const group = new THREE.Group();
  const head = new THREE.Group();
  head.matrixAutoUpdate = false;
  group.add(head);
  const disposables = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ------------------------------------------------ Hilfen: Halsachse, Kopf-Gewicht, Haut */
  const zn = (y) => -0.21 - 0.12 * clamp(-1 - y, -0.4, 0.6);
  const neckPt = (y, th, r) => V(Math.sin(th) * r, y, zn(y) + Math.cos(th) * r);
  // Kopf-Gewicht entlang des Halses aus dem Netz (Mittelwert pro Hoehe)
  const bins = new Float32Array(40); const cnt = new Float32Array(40);
  for (let i = 0; i < mesh.nV; i++) {
    const x = mesh.pos[i * 3]; const y = mesh.pos[i * 3 + 1]; const z = mesh.pos[i * 3 + 2];
    if (Math.abs(x) > 0.55 || y < -2.0 || y > -0.2 || z < -0.9 || z > 0.35) continue;
    const b = Math.floor((y + 2.0) / 0.045);
    if (b >= 0 && b < 40) { bins[b] += mesh.head[i]; cnt[b] += 1; }
  }
  for (let b = 0; b < 40; b++) bins[b] = cnt[b] ? bins[b] / cnt[b] : (b > 20 ? 1 : 0);
  const wAt = (y) => {
    const f = clamp((y + 2.0) / 0.045 - 0.5, 0, 39);
    const i = Math.floor(f); const t = f - i;
    return clamp(bins[i] * (1 - t) + bins[Math.min(39, i + 1)] * t, 0, 1);
  };
  // Naechster Hautpunkt (Hals- und Schulterbereich)
  const skinIdx = [];
  for (let i = 0; i < mesh.nV; i++) {
    const y = mesh.pos[i * 3 + 1];
    if (y < -2.0 || y > -0.3 || Math.abs(mesh.pos[i * 3]) > 1.0) continue;
    skinIdx.push(i);
  }
  const skinAt = (p) => {
    let best = -1; let bd = 1e9;
    for (const i of skinIdx) {
      const dx = mesh.pos[i * 3] - p.x; const dy = mesh.pos[i * 3 + 1] - p.y; const dz = mesh.pos[i * 3 + 2] - p.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    return { p: V(mesh.pos[best * 3], mesh.pos[best * 3 + 1], mesh.pos[best * 3 + 2]), n: V(mesh.normal[best * 3], mesh.normal[best * 3 + 1], mesh.normal[best * 3 + 2]) };
  };

  /* ------------------------------------------------------ Geometrie-Sammler */
  const kits = { chrome: [], graphite: [], rubber: [], cable: [], gel: [], housing: [], ceramic: [], grille: [], led: [], hose: [], chromeS: [], graphiteS: [] };
  // three-Geometrie vorbereiten: nicht indiziert, aUv2 aus uv, aHead (Zahl oder Funktion von y)
  const prep = (g, w, m4 = null) => {
    if (m4) g.applyMatrix4(m4);
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    const c = n.attributes.position.count;
    const uv = n.attributes.uv;
    const u2 = new Float32Array(c * 2);
    if (uv) u2.set(uv.array.subarray(0, c * 2));
    n.setAttribute('aUv2', new THREE.BufferAttribute(u2, 2));
    n.deleteAttribute('uv');
    const h = new Float32Array(c);
    for (let i = 0; i < c; i++) h[i] = typeof w === 'function' ? w(n.attributes.position.getY(i)) : w;
    n.setAttribute('aHead', new THREE.BufferAttribute(h, 1));
    return n;
  };
  // Rohr entlang Punkten (Parallel-Transport), r(t) Radius, w(y) Kopf-Gewicht
  const tube = (pts, rFn, radial, w, closed = false) => {
    const n = pts.length;
    const T = []; const N = []; const B = [];
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      T.push(b.clone().sub(a).normalize());
    }
    let nn = new THREE.Vector3(0, 0, 1);
    if (Math.abs(nn.dot(T[0])) > 0.9) nn.set(1, 0, 0);
    nn.sub(T[0].clone().multiplyScalar(nn.dot(T[0]))).normalize();
    for (let i = 0; i < n; i++) {
      if (i > 0) { nn = N[i - 1].clone().sub(T[i].clone().multiplyScalar(N[i - 1].dot(T[i]))).normalize(); }
      N.push(nn.clone());
      B.push(new THREE.Vector3().crossVectors(T[i], nn));
    }
    const rows = n + (closed ? 1 : 0);
    const pos = new Float32Array(rows * (radial + 1) * 3);
    const nor = new Float32Array(rows * (radial + 1) * 3);
    const uv = new Float32Array(rows * (radial + 1) * 2);
    let len = 0; const L = [0];
    for (let i = 1; i < rows; i++) { len += pts[i % n].distanceTo(pts[(i - 1) % n]); L.push(len); }
    for (let i = 0; i < rows; i++) {
      const k = i % n;
      const t = L[i] / Math.max(len, 1e-6);
      const r = rFn(t);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const dx = N[k].x * Math.cos(a) + B[k].x * Math.sin(a);
        const dy = N[k].y * Math.cos(a) + B[k].y * Math.sin(a);
        const dz = N[k].z * Math.cos(a) + B[k].z * Math.sin(a);
        const o = (i * (radial + 1) + j);
        pos[o * 3] = pts[k].x + dx * r; pos[o * 3 + 1] = pts[k].y + dy * r; pos[o * 3 + 2] = pts[k].z + dz * r;
        nor[o * 3] = dx; nor[o * 3 + 1] = dy; nor[o * 3 + 2] = dz;
        uv[o * 2] = j / radial; uv[o * 2 + 1] = t;
      }
    }
    const idx = [];
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j; const b = a + radial + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return prep(g, w);
  };
  const smooth = (ctrl, n) => new THREE.CatmullRomCurve3(ctrl, false, 'centripetal').getPoints(n);
  const m4 = new THREE.Matrix4();
  const qt = new THREE.Quaternion();
  const up = V(0, 1, 0);
  // Objekt mit Achse Y an Punkt p, Achse dir
  const place = (p, dir, sx = 1, sy = 1, sz = 1) => {
    qt.setFromUnitVectors(up, dir.clone().normalize());
    return new THREE.Matrix4().compose(p, qt, V(sx, sy, sz));
  };

  /* ------------------------------------------------------------------ Augen */
  // Glasaugen: Augapfel (helles Porzellan-Grau), Iris in kuehlem Grau-Tuerkis mit feinen radialen Fasern, dunkle Pupille
  // mit leisem Schein, darueber eine klare Hornhaut-Kuppel mit starker Spiegelung. Im Roentgenbild ueber der Scan-Linie weg.
  const eyeR = 0.128;
  const eyeGeo = new THREE.SphereGeometry(eyeR, S(56, 32), S(36, 22));
  const corneaGeo = new THREE.SphereGeometry(eyeR * 1.04, S(48, 28), S(14, 10), 0, Math.PI * 2, 0, 0.66).rotateX(Math.PI / 2);
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: palette.white.clone().multiplyScalar(0.42), roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.12,
    envMap: env, envMapIntensity: 0.8,
  });
  const EU = {
    uIris: { value: 1 },
    uIrisCol: { value: palette.signal.clone().multiplyScalar(1.6) },
    uIrisBase: { value: palette.steel.clone().lerp(palette.signal, 0.48).multiplyScalar(0.8) },
    uScanY: U.uScanY,
  };
  const scanClip = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEP; varying float vWY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEP = position; vWY = (modelMatrix * vec4(position, 1.0)).y;');
  };
  eyeMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, EU);
    scanClip(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEP; varying float vWY; uniform float uIris; uniform vec3 uIrisCol; uniform vec3 uIrisBase; uniform float uScanY;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (vWY > uScanY) discard;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float R = ${eyeR.toFixed(3)};
  float rr = length(vEP.xy) / R;
  float front = smoothstep(0.0, 0.25, vEP.z / R);
  float ang = atan(vEP.y, vEP.x);
  float irisM = (1.0 - smoothstep(0.43, 0.455, rr)) * front;
  float pupil = (1.0 - smoothstep(0.135, 0.16, rr)) * front;
  float fib = 0.5 + 0.5 * sin(ang * 72.0 + sin(ang * 11.0) * 1.7 + rr * 9.0);
  fib = mix(fib, 0.5 + 0.5 * sin(ang * 29.0 + 2.0 + rr * 4.0), 0.35);
  float coll = exp(-pow((rr - 0.25) / 0.03, 2.0));
  vec3 irisCol = uIrisBase * (0.45 + 0.75 * fib) * (1.0 + 0.6 * coll) * (0.7 + 0.3 * smoothstep(0.445, 0.2, rr));
  float limbus = exp(-pow((rr - 0.45) / 0.03, 2.0)) * front;
  // Augapfel zum Rand hin dunkler (Lid-Schatten)
  diffuseColor.rgb *= 0.45 + 0.55 * smoothstep(0.98, 0.55, rr) * front + 0.0;
  diffuseColor.rgb = mix(diffuseColor.rgb, irisCol, irisM);
  diffuseColor.rgb *= (1.0 - 0.55 * limbus) * (1.0 - 0.96 * pupil);
  float ring = exp(-pow((rr - 0.435) / 0.012, 2.0)) * front;
  totalEmissiveRadiance += uIrisCol * uIris * (ring * 0.07 + pupil * 0.12 * (1.0 - rr / 0.16) + irisM * fib * 0.03);
}`);
  };
  eyeMat.customProgramCacheKey = () => 'ab-eye3';
  // Hornhaut: nur Spiegelung (schwarze Grundfarbe), Deckung aus der Helligkeit der Spiegelung. So erscheint das
  // Glanzlicht der Softbox als klarer Lichtpunkt im Auge (Augenglanz), der Rest bleibt glasklar.
  const corneaMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
    envMap: env, envMapIntensity: 3.2, transparent: true, depthWrite: false,
  });
  corneaMat.onBeforeCompile = (sh) => {
    sh.uniforms.uScanY = U.uScanY;
    scanClip(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEP; varying float vWY; uniform float uScanY;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (vWY > uScanY) discard;')
      .replace('#include <opaque_fragment>', `float cf = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
float cs = max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b);
float ca = clamp(cs * 1.1 + 0.2 * cf, 0.0, 1.0);
outgoingLight = outgoingLight / max(ca, 1e-3);
diffuseColor.a = ca;
#include <opaque_fragment>`);
  };
  corneaMat.customProgramCacheKey = () => 'ab-cornea2';
  disposables.push(eyeGeo, eyeMat, corneaGeo, corneaMat);
  // Blick: geradeaus mit leichter Konvergenz; steht die Kamera vor dem Gesicht, folgen die Augen ihr dezent
  // (begrenzt, gedaempft), so wirkt der Blick wach und auf den Betrachter gerichtet.
  const eyes = [];
  const Z = V(0, 0, 1);
  for (const e of [lm.eyeL, lm.eyeR]) {
    const m = new THREE.Mesh(eyeGeo, eyeMat);
    m.position.set(e[0], e[1], e[2] - 0.004);
    const rest = V(e[0] * 0.2 - e[0], 0.02, 3).normalize();
    m.quaternion.setFromUnitVectors(Z, rest);
    const c = new THREE.Mesh(corneaGeo, corneaMat);
    c.renderOrder = 6;
    m.add(c);
    eyes.push({ m, rest, dir: rest.clone() });
    head.add(m);
  }
  const _inv = new THREE.Matrix4(); const _cam = V(0, 0, 0); const _gd = V(0, 0, 0);

  /* ------------------------------------------- Mundspalt: dunkler Abschluss dahinter */
  let mouthGeo = null;
  if (lm.mouthLoop && lm.mouthLoop.length > 3) {
    const L0 = lm.mouthLoop.map((p) => V(p[0], p[1], p[2]));
    const c = L0.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / L0.length);
    // etwas groesser als der Spalt und dahinter: verdeckt den Blick ins Kopfinnere
    const L = L0.map((p) => V(c.x + (p.x - c.x) * 1.15, c.y + (p.y - c.y) * 2.2, p.z - 0.045));
    c.z -= 0.07;
    const pos = []; const nor = []; const uv = [];
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; const b = L[(i + 1) % L.length];
      for (const p of [c, a, b, c, b, a]) { pos.push(p.x, p.y, p.z); nor.push(0, 0, 1); uv.push(0, 0); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    mouthGeo = prep(g, 1);
  }

  /* ----------------------------------------------------------- Hals: Gehaeuse */
  {
    // Ellipsen-Querschnitt, Rippen, von unter dem Schaedel bis in den Rumpf
    const rows = S(90, 50); const seg = S(40, 24);
    const pos = []; const nor = []; const uv = [];
    const y0 = -0.5; const y1 = -2.05;
    const prof = (y) => {
      const t = (y - y0) / (y1 - y0);
      const rib = 1 + 0.035 * Math.pow(0.5 + 0.5 * Math.cos(y * 75), 4);
      const fl = Math.pow(Math.max(0, (t - 0.72) / 0.28), 2);
      return { rx: (0.19 + 0.04 * t + 0.22 * fl) * rib, rz: (0.15 + 0.02 * t + 0.1 * fl) * rib };
    };
    for (let i = 0; i <= rows; i++) {
      const y = y0 + (y1 - y0) * (i / rows);
      const { rx, rz } = prof(y);
      const cz = zn(y) - 0.02;
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        const x = Math.sin(a) * rx; const z = Math.cos(a) * rz;
        pos.push(x, y, cz + z);
        const nx = Math.sin(a) / rx; const nz = Math.cos(a) / rz; const l = Math.hypot(nx, nz);
        nor.push(nx / l, 0, nz / l);
        uv.push(j / seg, i / rows);
      }
    }
    const idx = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j; const b = a + seg + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    kits.housing.push(prep(g, wAt));
  }

  /* -------------------------------------------- Hals: Wirbel, Bandscheiben, Atlas */
  const NV = 6;
  for (let i = 0; i < NV; i++) {
    const y = -0.66 - i * 0.2;
    const c = V(0, y, zn(y) - 0.16);
    const w = wAt(y);
    // Wirbelkoerper: abgerundeter Zylinder
    const prof = [];
    for (let k = 0; k <= 8; k++) {
      const a = -Math.PI / 2 + (k / 8) * Math.PI;
      prof.push(new THREE.Vector2(0.105 + 0.022 * Math.cos(a), 0.06 * Math.sin(a)));
    }
    prof.unshift(new THREE.Vector2(0.0001, -0.06));
    prof.push(new THREE.Vector2(0.0001, 0.06));
    kits.graphite.push(prep(new THREE.LatheGeometry(prof, S(28, 16)), w, place(c, up)));
    // Dornfortsatz nach hinten unten
    const fin = new THREE.BoxGeometry(0.04, 0.045, 0.13, 1, 1, 1);
    const mf = new THREE.Matrix4().makeRotationX(0.35).premultiply(new THREE.Matrix4().makeTranslation(c.x, c.y - 0.025, c.z - 0.15));
    kits.graphite.push(prep(fin, w, mf));
    // Querfortsaetze
    for (const sx of [-1, 1]) {
      const tp = new THREE.BoxGeometry(0.12, 0.035, 0.06);
      kits.graphite.push(prep(tp, w, new THREE.Matrix4().makeTranslation(c.x + sx * 0.15, c.y, c.z + 0.02)));
      const ring = new THREE.TorusGeometry(0.026, 0.008, 8, S(16, 10));
      kits.chrome.push(prep(ring, w, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(c.x + sx * 0.2, c.y, c.z + 0.02))));
    }
    // Bandscheibe (Gel) und Chrom-Spange darunter
    if (i < NV - 1) {
      const yd = y - 0.1;
      const cd = V(0, yd, zn(yd) - 0.16);
      kits.gel.push(prep(new THREE.CylinderGeometry(0.098, 0.098, 0.05, S(28, 16), 1, false), wAt(yd), place(cd, up)));
      kits.chrome.push(prep(new THREE.TorusGeometry(0.102, 0.008, 8, S(32, 18)), wAt(yd), new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(cd.x, cd.y, cd.z))));
    }
  }
  // Atlas-Kugel unter dem Schaedel und Chrom-Kragen oben und unten
  kits.chrome.push(prep(new THREE.SphereGeometry(0.1, S(32, 18), S(20, 12)), wAt(-0.52), new THREE.Matrix4().makeTranslation(0, -0.52, zn(-0.52) - 0.12)));
  for (const [y, R, r] of [[-0.6, 0.205, 0.02], [-1.56, 0.215, 0.022]]) {
    const g = new THREE.TorusGeometry(1, r, 10, S(56, 28));
    // Ellipse: Skalierung in x/z
    kits.chrome.push(prep(g, wAt(y), new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeScale(R * 1.02, 1, R * 0.82)).premultiply(new THREE.Matrix4().makeTranslation(0, y, zn(y) - 0.02))));
  }

  /* --------------------------------------------------------- Hals: Luftroehre */
  {
    // knapp unter der Kehlplatte (Haut minus Schale minus Radius)
    const ctrl = [-1.02, -1.15, -1.3, -1.45, -1.62].map((y) => { const s0 = skinAt(V(0, y, 0.3)); return V(0, y, s0.p.z - 0.035 - 0.085); });
    ctrl.push(V(0, -1.85, ctrl[ctrl.length - 1].z - 0.06));
    const pts = smooth(ctrl, S(40, 24));
    kits.graphite.push(tube(pts, () => 0.045, S(24, 14), wAt));
    const curve = new THREE.CatmullRomCurve3(pts);
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const p = curve.getPointAt(t); const d = curve.getTangentAt(t);
      const g = new THREE.TorusGeometry(0.047, 0.0065, 6, S(28, 16));
      g.rotateX(Math.PI / 2);
      kits.graphite.push(prep(g, wAt(p.y), place(p, d)));
    }
  }

  /* ------------------------------------------------ Hals: Kopfwender-Muskeln (Gel) */
  const underSkin = (p, depth) => { const s = skinAt(p); return s.p.addScaledVector(s.n, -depth); };
  for (const sx of [-1, 1]) {
    const M = V(sx * 0.46, -0.48, -0.2);
    const Ns = V(sx * 0.08, -1.66, -0.04);
    const Nc = V(sx * 0.3, -1.72, -0.03);
    const ctrl = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const p = M.clone().lerp(Ns, t);
      if (k > 0 && k < 6) ctrl.push(underSkin(p, 0.05 + 0.075 * Math.sin(Math.PI * t)));
      else ctrl.push(p);
    }
    const pts = smooth(ctrl, S(48, 28));
    kits.gel.push(tube(pts, (t) => 0.034 + 0.05 * Math.pow(Math.sin(Math.PI * clamp(t * 1.05, 0, 1)), 0.7), S(24, 14), wAt));
    // Schluesselbein-Kopf
    const a = pts[Math.floor(pts.length * 0.5)];
    const mid = underSkin(a.clone().lerp(Nc, 0.5), 0.07);
    const pts2 = smooth([a, mid, Nc], S(24, 14));
    kits.gel.push(tube(pts2, (t) => 0.034 - 0.012 * t, S(16, 10), wAt));
  }

  /* --------------------------------------------------------------- Hals: Kabel */
  const cableDefs = [
    // th0, th1 (Winkel um die Halsachse oben/unten), r0, r1, Radius, leuchtet (hinter den Kopfwendern, vor den Kolben)
    [1.62, 1.5, 0.21, 0.3, 0.019, 0],
    [1.74, 1.64, 0.22, 0.31, 0.016, 1],
    [1.86, 1.78, 0.22, 0.32, 0.021, 0],
    [1.98, 1.92, 0.21, 0.31, 0.015, 0],
    [2.1, 2.06, 0.2, 0.3, 0.018, 1],
  ];
  for (const sx of [-1, 1]) {
    cableDefs.forEach(([t0, t1, r0, r1, rad, lit], i) => {
      if (!hi && (i === 1 || i === 3)) return;
      const ctrl = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const y = -0.5 - 1.42 * t;
        const th = t0 + (t1 - t0) * t + 0.06 * Math.sin(t * Math.PI * 2 + i);
        const r = r0 + (r1 - r0) * smoothstep(0.1, 1, t) + 0.03 * Math.sin(t * Math.PI);
        const p = neckPt(y, th, r);
        p.x *= sx;
        ctrl.push(p);
      }
      const pts = smooth(ctrl, S(60, 32));
      kits[lit ? 'cable' : 'rubber'].push(tube(pts, () => rad, S(12, 8), wAt));
    });
    // Schellen um das Buendel
    for (const y of [-0.86, -1.24]) {
      const th = 1.86; const r = 0.27;
      const p = neckPt(y, th, r); p.x *= sx;
      const g = new THREE.TorusGeometry(0.085, 0.012, 8, S(24, 14));
      g.scale(1.0, 1.0, 1.9);
      const dir = V(Math.sin(th) * sx, 0, Math.cos(th));
      const m = new THREE.Matrix4().makeRotationY(Math.atan2(dir.x, dir.z) + Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z));
      kits.chrome.push(prep(g, wAt(y), new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(m)));
    }
  }

  /* ---------------------------------------------------- Schultern: Chrom-Ring im Band */
  {
    const Sx = V(...LAYOUT.shoulder); const ad = V(...LAYOUT.armDir).normalize();
    const ref = V(1, 0, 0).sub(ad.clone().multiplyScalar(ad.x)).normalize();
    const ref2 = new THREE.Vector3().crossVectors(ad, ref);
    const NB = 48; const rad = new Float32Array(NB); const rc = new Float32Array(NB);
    for (let i = 0; i < mesh.nV; i++) {
      const p = V(Math.abs(mesh.pos[i * 3]), mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]);
      if (mesh.arm[i] < 0.5) continue;
      const rel = p.clone().sub(Sx);
      const ta = rel.dot(ad);
      if (Math.abs(ta - LAYOUT.ringAt) > 0.05) continue;
      const rv = rel.addScaledVector(ad, -ta);
      const r = rv.length();
      if (r > 0.6) continue;
      const a = Math.atan2(rv.dot(ref2), rv.dot(ref));
      const b = Math.floor(((a + Math.PI) / (Math.PI * 2)) * NB) % NB;
      rad[b] += r; rc[b] += 1;
    }
    for (let b = 0; b < NB; b++) rad[b] = rc[b] ? rad[b] / rc[b] : 0;
    for (let b = 0; b < NB; b++) if (!rad[b]) { let l = b; let r = b; while (!rad[(l + NB) % NB]) l--; while (!rad[r % NB]) r++; rad[b] = (rad[(l + NB) % NB] + rad[r % NB]) / 2; }
    const loop = (inset, ta) => {
      const pts = [];
      for (let b = 0; b < NB; b++) {
        const a = -Math.PI + ((b + 0.5) / NB) * Math.PI * 2;
        const r = (rad[(b + NB - 1) % NB] + 2 * rad[b] + rad[(b + 1) % NB]) / 4 - inset;
        pts.push(Sx.clone().addScaledVector(ad, ta).addScaledVector(ref, Math.cos(a) * r).addScaledVector(ref2, Math.sin(a) * r));
      }
      return pts;
    };
    for (const sx of [-1, 1]) {
      const mir = (pts) => pts.map((p) => V(p.x * sx, p.y, p.z));
      // Schulterringe verschwinden im Roentgenbild mit der Scan-Linie (Kits mit '-scan'), wie das Hologramm der Schultern
      kits.chromeS.push(tube(mir(loop(0.038, LAYOUT.ringAt)), () => 0.02, S(12, 8), 0, true));
      kits.chromeS.push(tube(mir(loop(0.05, LAYOUT.ringAt - 0.028)), () => 0.009, S(8, 6), 0, true));
      kits.chromeS.push(tube(mir(loop(0.05, LAYOUT.ringAt + 0.028)), () => 0.009, S(8, 6), 0, true));
      // dunkles Lager: Band hinter dem Ring
      const inner = mir(loop(0.09, LAYOUT.ringAt));
      kits.graphiteS.push(tube(inner, () => 0.04, S(10, 6), 0, true));
    }
  }

  /* ------------------------------------------------- Kopf: Flaeche des Schaedels abfragen */
  // Punkt und Normale der Kopfschale in Richtung th (0 vorne, pi hinten) auf Hoehe y (Achse durch x 0, z -0.05)
  const headIdx = [];
  for (let i = 0; i < mesh.nV; i++) if (mesh.pos[i * 3 + 1] > -0.95 && mesh.pos[i * 3 + 1] < 1.05 && Math.abs(mesh.pos[i * 3]) < 1.0) headIdx.push(i);
  const surfAt = (th, y) => {
    let best = -1; let br = -1;
    for (let pass = 0; pass < 3 && best < 0; pass++) {
      const dy = 0.025 * (pass + 1); const dt = 0.05 * (pass + 1);
      for (const i of headIdx) {
        const vy = mesh.pos[i * 3 + 1];
        if (Math.abs(vy - y) > dy) continue;
        const vx = mesh.pos[i * 3]; const vz = mesh.pos[i * 3 + 2] + 0.05;
        let d = Math.atan2(vx, vz) - th;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > dt) continue;
        const r = Math.hypot(vx, vz);
        if (r > br) { br = r; best = i; }
      }
    }
    const c = Math.hypot(Math.sin(th), Math.cos(th));
    const p = V(Math.sin(th) * br, y, Math.cos(th) * br - 0.05);
    const n = V(mesh.normal[best * 3], mesh.normal[best * 3 + 1], mesh.normal[best * 3 + 2]).normalize();
    return { p, n, r: br / c };
  };
  // Hinterer Hautpunkt (Nacken, Ruecken): kleinstes z bei (x, y)
  const backAt = (x, y) => {
    let bz = 9; let best = -1;
    for (let pass = 0; pass < 3 && best < 0; pass++) {
      const w = 0.03 * (pass + 1);
      for (let i = 0; i < mesh.nV; i++) {
        const vy = mesh.pos[i * 3 + 1]; const vx = mesh.pos[i * 3]; const vz = mesh.pos[i * 3 + 2];
        if (Math.abs(vy - y) > w || Math.abs(vx - x) > w || vz > -0.05) continue;
        if (vz < bz) { bz = vz; best = i; }
      }
    }
    return V(x, y, bz);
  };
  const headW = (y) => (y > -0.62 ? 1 : wAt(y));
  const rnd = (() => { let a = 20261027; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();

  /* ------------------------------------------- Hinterkopf: Schaedelgitter, Streben, Kamm */
  // Die Oeffnung ist eine Ellipse in (Bogenlaenge ab hinten, y), siehe robot-layout.js. Darin ein Gitter wie ein Schaedel
  // aus Streben: Laengsrippen (Graphit) bis zur Schaedelbasis, drei Querrippen dahinter,
  // zwei Chrom-Streben. Am Kamm der Schaedelbasis (unter dem Hirnstamm, cableRoot) treten die Kabel aus.
  const SKW = LAYOUT.skull;
  const uHalf = (y) => SKW.a * Math.sqrt(Math.max(0, 1 - Math.pow((y - SKW.yc) / SKW.b, 2)));
  const rBack = (y) => surfAt(Math.PI, y).r;
  const winTh = (y) => uHalf(y) / Math.max(0.3, rBack(y));
  {
    // Laengsrippen: von oben (unter der Schale) nach unten zum Kamm
    const NM = hi ? 9 : 7;
    for (let k = 0; k < NM; k++) {
      const f = (k / (NM - 1)) * 2 - 1;
      const pts = [];
      const yTop = SKW.yc + SKW.b * Math.sqrt(Math.max(0, 1 - Math.pow(f * 0.86, 2))) + 0.05;
      for (let j = 0; j <= 16; j++) {
        const t = j / 16;
        const y = yTop + (-0.36 - yTop) * t;
        const th = Math.PI + f * (winTh(Math.min(y, 0.3)) + 0.06) * (1 - 0.3 * t * t);
        const s0 = surfAt(th, y);
        pts.push(s0.p.clone().addScaledVector(s0.n, -(0.062 + 0.02 * t * t)));
      }
      kits.graphite.push(tube(smooth(pts, S(44, 22)), (t) => 0.012 + 0.006 * t, S(10, 6), 1));
    }
    // Querrippen dahinter
    for (const y of [0.2, -0.04, -0.27]) {
      const span = winTh(y) + 0.14;
      const pts = [];
      const n = S(36, 20);
      for (let j = 0; j <= n; j++) {
        const th = Math.PI + (j / n - 0.5) * 2 * span;
        const s0 = surfAt(th, y);
        pts.push(s0.p.clone().addScaledVector(s0.n, -0.095));
      }
      kits.graphite.push(tube(smooth(pts, S(60, 30)), () => 0.016, S(12, 8), 1));
    }
    // zwei Chrom-Streben senkrecht neben der Mitte
    for (const sx of [-1, 1]) {
      const pts = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12;
        const y = 0.34 + (-0.42 - 0.34) * t;
        const s0 = surfAt(Math.PI + sx * 0.3 * (1 - 0.15 * t), y);
        pts.push(s0.p.clone().addScaledVector(s0.n, -0.048));
      }
      kits.chrome.push(tube(smooth(pts, S(36, 18)), () => 0.0085, S(10, 6), 1));
    }
    // Kamm an der Schaedelbasis: Graphit-Steg mit Chrom-Kante, hier treten die Kabel aus
    const comb = [];
    for (let j = 0; j <= 18; j++) {
      const th = Math.PI + (j / 18 - 0.5) * 2 * (winTh(-0.44) + 0.1);
      const s0 = surfAt(th, -0.44);
      comb.push(s0.p.clone().addScaledVector(s0.n, -0.07));
    }
    const cs = smooth(comb, S(44, 22));
    kits.graphite.push(tube(cs, () => 0.026, S(12, 8), 1));
    kits.chrome.push(tube(cs.map((p) => V(p.x, p.y + 0.026, p.z)), () => 0.006, 6, 1));
  }

  /* -------------------------------------- Hinterkopf und Nacken: Kabelbuendel (Referenz 1) */
  // 40 bis 90 duenne Kabel und Schlaeuche: aus dem Schaedelinneren (hinter dem Gitter) zum Kamm, dort hinaus und
  // locker ueber den Nacken in den Schlitz zwischen den Schulterblaettern. Sieben lose Straenge statt Zoepfe: kaum
  // verdrillt, einzelne Kabel wandern leicht, Luecken zwischen den Straengen, nur drei Schellen. Die Straenge haengen
  // im Nacken etwas vom Hals weg (Schwerkraft) und laufen erst kurz vor dem Schlitz zusammen.
  // Schwarzes Gummi, graue Schlaeuche, die dicken mit Rillen und Chrom-Huelsen, ~10 % mit Licht.
  {
    const NC = hi ? 112 : 44;
    // u: seitliche Lage (Bogenlaenge am Hinterkopf), d: Abstand vom Nacken, R: Radius des Strangs
    const bundles = [
      { u: -0.33, d: 0.04, R: 0.036 }, { u: -0.215, d: 0.12, R: 0.04 }, { u: -0.1, d: 0.06, R: 0.042 }, { u: 0.0, d: 0.15, R: 0.045 },
      { u: 0.105, d: 0.07, R: 0.042 }, { u: 0.22, d: 0.13, R: 0.04 }, { u: 0.33, d: 0.045, R: 0.036 },
    ];
    const NB = bundles.length;
    // nur drei Schellen (Straenge 1, 3, 5) auf verschiedenen Hoehen
    bundles.forEach((B, i) => { B.c0 = i === 3 ? 2 : i === 1 ? 3 : i === 5 ? 4 : -1; });
    const ys = [-0.56, -0.76, -0.98, -1.22, -1.45, -1.67, -1.9, -2.17];
    const at = (x, y, off) => { const b = backAt(x, y); b.z -= off; return b; };
    // Mitte eines Strangs auf Hoehe y (Index k in ys): breit gefaechert, erst unten im Schlitz zusammen
    // Mitten werden je Strang und Hoehe nur einmal gesucht (backAt laeuft ueber alle Ecken des Netzes)
    const centerCache = new Map();
    const center = (B, k) => {
      const key = `${B.u}:${k}`;
      let c = centerCache.get(key);
      if (!c) { c = centerRaw(B, k); centerCache.set(key, c); }
      return c.clone();
    };
    const centerRaw = (B, k) => {
      const y = ys[k];
      const spread = [1.4, 1.36, 1.3, 1.22, 1.12, 0.98, 0.78, 0.66][k];
      const bulge = [0.07, 0.12, 0.13, 0.11, 0.08, 0.045, -0.02, -0.15][k];
      const out = 1 + 0.3 * Math.abs(B.u) / 0.33; // aeussere Straenge haengen weiter vom Hals weg
      return at(B.u * spread, y, (B.d * (k < 6 ? 1 : 0.4) + bulge) * (k < 6 ? out : 1));
    };
    for (let i = 0; i < NC; i++) {
      const bi = i % NB; const B = bundles[bi];
      const core = i < NB && (bi % 2 === 1 || bi === 3);
      const k0 = rnd();
      const r = core ? 0.016 + 0.004 * rnd() : k0 < 0.7 ? 0.0032 + 0.0026 * rnd() : k0 < 0.93 ? 0.0075 + 0.0035 * rnd() : 0.012 + 0.003 * rnd();
      const lit = !core && i % 10 === 4;
      const rho = core ? 0 : B.R * (0.25 + 0.75 * Math.sqrt(rnd()));
      const ph0 = rnd() * 6.283; const tw = (rnd() < 0.5 ? 1 : -1) * (0.06 + 0.1 * rnd());
      // eigenes leichtes Wandern (seitlich und in der Tiefe), damit die Kabel nicht exakt parallel laufen
      const wa = 0.008 + 0.014 * rnd(); const wf = 0.6 + 0.9 * rnd(); const wp = rnd() * 6.283;
      // Austritt im Schaedel: verteilt ueber das Gitter, unten dichter
      const pu = (rnd() - 0.5) * 2;
      const py = -0.4 + 0.62 * Math.pow(rnd(), 1.6);
      const pth = Math.PI + pu * winTh(Math.min(py, 0.25)) * 0.85;
      const s0 = surfAt(pth, py);
      const ctrl = [s0.p.clone().addScaledVector(s0.n, -(0.11 + 0.03 * rnd()))];
      const sm = surfAt(Math.PI + pu * 0.35, (py - 0.48) * 0.5);
      ctrl.push(sm.p.clone().addScaledVector(sm.n, -0.12 + 0.02 * rnd()));
      const ex = surfAt(Math.PI + (B.u * 2.3 + Math.cos(ph0) * rho) / Math.max(0.3, rBack(-0.46)), -0.46 - 0.04 * rnd());
      ctrl.push(ex.p.clone().addScaledVector(ex.n, -0.035 + 0.03 * rnd()));
      ys.forEach((y, k) => {
        const c = center(B, k);
        const a = ph0 + tw * k;
        const pinch = (k === B.c0) ? 0.55 : 1;
        // unten (Schlitz) enger zusammen
        const tight = k >= 6 ? 0.6 : 1;
        const wob = k > 0 && k < 6 ? Math.sin(k * wf + wp) * wa : 0;
        c.x += Math.cos(a) * rho * pinch * tight + wob;
        c.z -= Math.sin(a) * rho * 0.8 * pinch * tight + wob * 0.6;
        ctrl.push(c);
      });
      const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
      if (core) {
        // Rillenschlauch: Radius moduliert entlang der Laenge
        const n = hi ? 420 : 90;
        const pts = curve.getSpacedPoints(n);
        const L = curve.getLength();
        const ribs = hi ? (t) => r * (1 + 0.16 * Math.pow(0.5 + 0.5 * Math.cos((t * L / 0.026) * 6.283), 2)) : () => r;
        kits.hose.push(tube(pts, ribs, S(14, 8), (y) => headW(y)));
        for (const t of [0.34, 0.97]) {
          const p = curve.getPointAt(t); const d = curve.getTangentAt(t);
          const g = new THREE.CylinderGeometry(r * 1.45, r * 1.45, 0.05, S(16, 8), 1, false);
          kits.chrome.push(prep(g, headW(p.y), place(p, d)));
        }
      } else {
        const pts = curve.getPoints(S(64, 34));
        // Mischung wie Referenz 1: viele helle, silbergraue Leitungen, dazwischen schwarze
        const kit = lit ? 'cable' : (i % 5 < 3 || r > 0.0075) ? 'hose' : 'rubber';
        kits[kit].push(tube(pts, () => r, r > 0.008 ? S(10, 7) : S(7, 5), (y) => headW(y)));
      }
    }
    // Schellen (Graphit mit Chrom-Kante), nur an drei Straengen
    for (const B of bundles) {
      if (B.c0 < 0) continue;
      const k = B.c0;
      const c = center(B, k);
      const n0 = center(B, k + 1).sub(center(B, k - 1)).normalize();
      const Rc = B.R * 0.55 + 0.022;
      const g = new THREE.CylinderGeometry(Rc, Rc, 0.03, S(24, 14), 1, true);
      g.scale(1, 1, 0.8);
      kits.graphite.push(prep(g, headW(c.y), place(c, n0)));
      const t2 = new THREE.TorusGeometry(Rc + 0.001, 0.0045, 6, S(24, 14)).rotateX(Math.PI / 2).scale(1, 1, 0.8);
      kits.chrome.push(prep(t2.translate(0, 0.015, 0), headW(c.y), place(c, n0)));
    }
    // Rahmen im Rueckenschlitz
    // gleiche Form wie lBackSlot (robot-layout.js): abgerundetes Rechteck, oben breiter
    const slot = [];
    const NS = 72;
    const slotHalf = (y) => 0.31 - 0.07 * smoothstep(-1.46, -2.2, y);
    for (let j = 0; j < NS; j++) {
      const a = (j / NS) * Math.PI * 2;
      const cx = Math.cos(a); const sy = Math.sin(a);
      // Superellipse: fast rechteckig mit runden Ecken
      const ex = Math.sign(cx) * Math.pow(Math.abs(cx), 0.45); const ey = Math.sign(sy) * Math.pow(Math.abs(sy), 0.45);
      const y = -1.83 + ey * 0.375;
      const x = ex * (slotHalf(y) + 0.005);
      const b = backAt(x, y);
      slot.push(V(x, y, b.z + 0.012));
    }
    kits.chrome.push(tube(slot, () => 0.009, 8, 0, true));
  }

  /* ---------------------------------------------- Ohr: flaches Sensormodul (statt Ohrmuschel) */
  for (const e of (lm.ears || [])) {
    const c = V(...e.c); const n = V(...e.n).normalize();
    if (n.x * c.x < 0) n.negate();
    const R = (e.rmax || 0.18) + 0.005;
    const M = place(c.clone().addScaledVector(n, 0.002), n);
    // flache Scheibe mit zwei Fasen, innen eine Stufe, kleines Gitter in der Mitte (Sensor), Chrom-Ring
    const prof = [
      [0.052, 0.02], [0.058, 0.026], [0.066, 0.027], [R * 0.62, 0.027], [R * 0.62 + 0.006, 0.022], [R * 0.62 + 0.012, 0.021],
      [R - 0.03, 0.021], [R - 0.012, 0.015], [R - 0.002, 0.002], [R, -0.02], [R - 0.004, -0.06],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    kits.ceramic.push(prep(new THREE.LatheGeometry(prof, S(72, 40)), 1, M));
    const gr = new THREE.CircleGeometry(0.054, S(40, 24)).rotateX(-Math.PI / 2).translate(0, 0.016, 0);
    kits.grille.push(prep(gr, 1, M));
    const ring = new THREE.TorusGeometry(0.056, 0.0055, 10, S(56, 28)).rotateX(Math.PI / 2).translate(0, 0.022, 0);
    kits.chromeS.push(prep(ring, 1, M));
    // Status-Punkt oben hinten auf dem Rand
    const led = new THREE.SphereGeometry(0.006, 12, 8);
    const a = -2.3;
    led.translate(Math.cos(a) * (R * 0.62 - 0.03), 0.028, Math.sin(a) * (R * 0.62 - 0.03) * (c.x > 0 ? 1 : -1));
    kits.led.push(prep(led, 1, M));
  }

  /* ------------------------------------------------------------- Hals: Kehlkopf-Schild */
  {
    const s0 = skinAt(V(0, -1.16, 0.3));
    const z = s0.p.z - 0.07;
    const g = new THREE.CylinderGeometry(0.07, 0.062, 0.16, S(24, 12), 1, true, -1.1, 2.2);
    kits.graphite.push(prep(g, wAt(-1.16), new THREE.Matrix4().makeTranslation(0, -1.16, z - 0.035)));
    const rim = new THREE.TorusGeometry(0.068, 0.006, 6, S(24, 12), 2.2).rotateX(Math.PI / 2).rotateY(-(Math.PI / 2 - 1.1));
    kits.chrome.push(prep(rim, wAt(-1.08), new THREE.Matrix4().makeTranslation(0, -1.08, z - 0.035)));
  }

  /* ------------------------------------------------------------ Materialien */
  const chromeCol = palette.white.clone().multiplyScalar(0.92);
  const mats = {
    chrome: makeMechMaterial(THREE, U, { color: chromeCol, metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 2.0 }, 'metal', 'chrome'),
    graphite: makeMechMaterial(THREE, U, { color: palette.steel.clone().multiplyScalar(0.55), metalness: 0.75, roughness: 0.36, envMap: env, envMapIntensity: 0.9, clearcoat: 0.4, clearcoatRoughness: 0.2 }, 'metal', 'graphite'),
    graphiteS: makeMechMaterial(THREE, U, { color: palette.steel.clone().multiplyScalar(0.55), metalness: 0.75, roughness: 0.36, envMap: env, envMapIntensity: 0.9 }, 'metal', 'graphite-scan'),
    housing: makeMechMaterial(THREE, U, { color: palette.steel.clone().multiplyScalar(0.7), metalness: 0.6, roughness: 0.42, envMap: env, envMapIntensity: 1.0 }, 'housing', 'housing'),
    rubber: makeMechMaterial(THREE, U, { color: palette.void.clone().multiplyScalar(2.6), metalness: 0, roughness: 0.38, envMap: env, envMapIntensity: 0.9, clearcoat: 0.7, clearcoatRoughness: 0.25 }, 'metal', 'rubber'),
    cable: makeMechMaterial(THREE, U, { color: palette.ink.clone().multiplyScalar(1.4), metalness: 0, roughness: 0.3, envMap: env, envMapIntensity: 0.8, clearcoat: 0.6, clearcoatRoughness: 0.2 }, 'cable'),
    gel: makeMechMaterial(THREE, U, { color: palette.signal.clone().multiplyScalar(0.2), metalness: 0, roughness: 0.2, envMap: env, envMapIntensity: 1.0, clearcoat: 0.6, clearcoatRoughness: 0.15 }, 'gel'),
    ceramic: makeMechMaterial(THREE, U, { color: o.shellCol, metalness: 0, roughness: 0.3, envMap: env, envMapIntensity: 1.0, clearcoat: 0.4, clearcoatRoughness: 0.2 }, 'metal', 'ceramic-scan'),
    grille: makeMechMaterial(THREE, U, { color: palette.mist.clone().multiplyScalar(0.55), metalness: 0.8, roughness: 0.35, envMap: env, envMapIntensity: 0.9 }, 'grille', 'grille-scan'),
    chromeS: makeMechMaterial(THREE, U, { color: chromeCol, metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 2.0 }, 'metal', 'chrome-scan'),
    hose: makeMechMaterial(THREE, U, { color: palette.mist.clone().lerp(palette.white, 0.25).multiplyScalar(0.62), metalness: 0.45, roughness: 0.26, envMap: env, envMapIntensity: 1.25, clearcoat: 0.8, clearcoatRoughness: 0.16 }, 'metal', 'hose'),
    led: makeMechMaterial(THREE, U, { color: palette.void.clone(), metalness: 0, roughness: 0.3, envMap: env, envMapIntensity: 0.5 }, 'led', 'led-scan'),
  };
  const meshes = [];
  for (const [k, list] of Object.entries(kits)) {
    if (!list.length) continue;
    const g = mergeGeometries(list, false);
    list.forEach((x) => x.dispose());
    const m = new THREE.Mesh(g, mats[k]);
    m.frustumCulled = false;
    group.add(m);
    meshes.push(m);
    disposables.push(g);
  }
  Object.values(mats).forEach((m) => disposables.push(m));
  // Mundabschluss eigenes Mesh: im Roentgenbild ausgeblendet
  let mouth = null;
  if (mouthGeo) {
    mouth = new THREE.Mesh(mouthGeo, mats.rubber);
    mouth.frustumCulled = false;
    group.add(mouth);
    disposables.push(mouthGeo);
  }

  /* --------------------------------------------------------- Kolben (starr) */
  const pistons = [];
  for (const sx of [-1, 1]) {
    pistons.push({ top: V(sx * 0.22, -0.6, -0.36), bot: V(sx * 0.3, -1.46, -0.52) });
    pistons.push({ top: V(sx * 0.3, -0.61, -0.28), bot: V(sx * 0.4, -1.46, -0.43) });
  }
  const cylGeo = prep(new THREE.CylinderGeometry(0.027, 0.027, 0.46, S(20, 12), 1, false).translate(0, 0.23, 0), 0);
  const capGeo = prep(new THREE.CylinderGeometry(0.034, 0.034, 0.05, S(20, 12), 1, false).translate(0, 0.025, 0), 0);
  const rodGeo = prep(new THREE.CylinderGeometry(0.0135, 0.0135, 0.62, S(16, 10), 1, false).translate(0, 0.31, 0), 0);
  const eyeletGeo = prep(new THREE.SphereGeometry(0.03, 16, 10), 0);
  disposables.push(cylGeo, capGeo, rodGeo, eyeletGeo);
  const mkInst = (g, m, n) => {
    const im = new THREE.InstancedMesh(g, m, n);
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(im);
    return im;
  };
  const cyl = mkInst(cylGeo, mats.graphite, pistons.length);
  const caps = mkInst(capGeo, mats.chrome, pistons.length * 2);
  const rods = mkInst(rodGeo, mats.chrome, pistons.length);
  const eyelets = mkInst(eyeletGeo, mats.chrome, pistons.length * 2);
  const _t = V(0, 0, 0); const _d = V(0, 0, 0); const _s = V(1, 1, 1); const _m = new THREE.Matrix4();

  const pistonMeshes = [cyl, caps, rods, eyelets]; // einmal, nicht pro Frame
  return {
    group,
    update(time, dt, s) {
      head.matrix.copy(headMat);
      head.matrixWorldNeedsUpdate = true;
      EU.uIris.value = s.weight * (s.irisBoost ?? 1);
      for (let i = 0; i < pistons.length; i++) {
        const P = pistons[i];
        _t.copy(P.top).applyMatrix4(headMat);
        _d.copy(_t).sub(P.bot).normalize();
        qt.setFromUnitVectors(up, _d);
        _m.compose(P.bot, qt, _s);
        cyl.setMatrixAt(i, _m);
        caps.setMatrixAt(i * 2, _m);
        eyelets.setMatrixAt(i * 2, _m);
        _m.compose(_t, qt.setFromUnitVectors(up, _d.negate()), _s);
        rods.setMatrixAt(i, _m);
        eyelets.setMatrixAt(i * 2 + 1, _m);
        _m.compose(_d.copy(P.bot).addScaledVector(_t.sub(P.bot).normalize(), 0.44), qt.setFromUnitVectors(up, _t), _s);
        caps.setMatrixAt(i * 2 + 1, _m);
      }
      for (let i = 0; i < pistonMeshes.length; i++) pistonMeshes[i].instanceMatrix.needsUpdate = true;
      const vis = s.scan.dissolve < 0.999 && s.buildLine > -0.6;
      // Blickrichtung (Ruhelage des Kopfs): Kamera vor dem Gesicht -> Augen folgen ihr, sonst geradeaus
      if (s.camPos) {
        _inv.copy(headMat).invert();
        _cam.copy(s.camPos).applyMatrix4(_inv);
        const kk = 1 - Math.exp(-dt * 6);
        for (const E of eyes) {
          _gd.copy(_cam).sub(E.m.position).normalize();
          const front = smoothstep(0.35, 0.75, _gd.z) * (s.gaze ?? 1);
          // Winkel begrenzen: seitlich hoechstens ~16 Grad, vertikal ~9 Grad
          const yaw = clamp(Math.atan2(_gd.x, _gd.z) - Math.atan2(E.rest.x, E.rest.z), -0.28, 0.28) * front;
          const pit = clamp(Math.asin(clamp(_gd.y, -1, 1)) - Math.asin(E.rest.y), -0.16, 0.16) * front;
          const ty = Math.atan2(E.rest.x, E.rest.z) + yaw; const tp = Math.asin(E.rest.y) + pit;
          _gd.set(Math.sin(ty) * Math.cos(tp), Math.sin(tp), Math.cos(ty) * Math.cos(tp));
          E.dir.lerp(_gd, kk).normalize();
          E.m.quaternion.setFromUnitVectors(Z, E.dir);
        }
      }
      for (const E of eyes) E.m.visible = s.buildLine > lm.eyeL[1] + 0.1;
      if (mouth) mouth.visible = s.scan.scanY > -0.5 && s.buildLine > -0.5;
      for (const m of meshes) m.visible = true;
      cyl.visible = caps.visible = rods.visible = eyelets.visible = vis;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      [cyl, caps, rods, eyelets].forEach((m) => m.dispose());
      group.clear();
    },
  };
}
