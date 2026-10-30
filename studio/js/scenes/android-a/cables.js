// Kabel und Fasern aus dem Hinterkopf (android-a v2).
// Drei Gruppen, alle als Stuetzpunkte (K je Kabel) in einer Float-Textur, eine instanzierte Roehre, im Vertex-Shader
// entlang der Catmull-Rom-Kurve gebogen:
//   Buendel   6 bis 8 gefuehrte Straenge vom Hinterkopf entlang des Nackens in den oberen Ruecken (Buchse).
//             Je Buendel 5 bis 11 Kabel, Dicken etwa 1:6, leicht verdrillt, an Manschetten zusammengezogen.
//   Faecher   steife, duenne Glasfasern, die vom Hinterkopf nach hinten oben abstehen (Silhouette wie Referenz 1),
//             frei endend, einzelne mit leuchtender Spitze. Schwingen kaum.
//   Boegen    kurze Kabel auf dem Schaedel unter dem Glas.
// Kopf folgen: jeder Stuetzpunkt nach seiner Hoehe wie die Haut (aaSkinW), so passen Manschetten (Parts) und Kabel.
import { RC, dirAB, mulberry32, cutField } from './shape.js';
import { patchCommon } from './materials.js';

const K = 10;
// Arten: 0 Gummi dunkel, 1 Metallschlauch, 2 Glasfaser, 3 weisser Schlauch, 4 Glasschlauch mit Leuchtfaden
const KIND = { RUBBER: 0, METAL: 1, FIBER: 2, WHITE: 3, GLASS: 4 };

/* ------------------------------------------------------------------ Rueckenflaeche aus dem Netz */
function makeBackSurface(pos) {
  // Raster ueber (x, y): kleinstes z (Rueckseite) je Zelle
  const x0 = -1.2; const y0 = -2.4; const dx = 0.04; const nx = 61; const ny = 70;
  const z = new Float32Array(nx * ny).fill(9);
  for (let i = 0; i < pos.length; i += 3) {
    const ix = Math.round((pos[i] - x0) / dx); const iy = Math.round((pos[i + 1] - y0) / dx);
    if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) continue;
    const k = iy * nx + ix;
    if (pos[i + 2] < z[k]) z[k] = pos[i + 2];
  }
  return (x, y) => {
    const ix = Math.round((x - x0) / dx); const iy = Math.round((y - y0) / dx);
    let best = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const jx = ix + a; const jy = iy + b;
      if (jx < 0 || jy < 0 || jx >= nx || jy >= ny) continue;
      best = Math.min(best, z[jy * nx + jx]);
    }
    return best;
  };
}

/* ------------------------------------------------------------------ Pfade erzeugen */
function writeCable(out, made, pts, o) {
  const { data, inst0, inst1 } = out;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = cum[cum.length - 1];
  let j = 0;
  const tmp = pts[0].clone();
  for (let k = 0; k < K; k++) {
    const target = L * (k / (K - 1));
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const t = (target - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
    tmp.copy(pts[j]).lerp(pts[j + 1], Math.min(1, Math.max(0, t)));
    const o4 = (made * K + k) * 4;
    data[o4] = tmp.x; data[o4 + 1] = tmp.y; data[o4 + 2] = tmp.z; data[o4 + 3] = target;
  }
  // inst0: Zeile, Radius (negativ = steif), Art, Phase. inst1: Impuls-Tempo (0 = keiner), Versatz, Laenge, Zufall
  // Phase + 10: im Roentgen-Modus oberhalb der Scan-Linie ausblenden
  inst0.set([made, o.sway ? o.radius : -o.radius, o.kind, o.rnd() * 6.283 + (o.hideX ? 10 : 0)], made * 4);
  inst1.set([o.pulse || 0, o.rnd(), L, o.rnd()], made * 4);
}

export function makeCablePaths(THREE, rmap, pos, o) {
  const { bundles: nBundles = 8, perBundle = 9, fan = 70, arcs = 16, flow = 0 } = o;
  const rnd = mulberry32(o.seed || 7);
  const d = { x: 0, y: 0, z: 0 };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const onSkull = (a, b, off, out = V()) => {
    dirAB(a, b, d);
    const r = rmap.sample(a, b) + off;
    return out.set(RC[0] + d.x * r, RC[1] + d.y * r, RC[2] + d.z * r);
  };
  const backZ = makeBackSurface(pos);
  const total = nBundles * (perBundle + 2) + fan + arcs + flow;
  const out = { data: new Float32Array(total * K * 4), inst0: new Float32Array(total * 4), inst1: new Float32Array(total * 4) };
  let made = 0;
  const guides = [];

  /* 1) Buendel: Wurzel am Hinterkopf, aussen am Nacken entlang, Buchse im oberen Ruecken */
  // v3: Buendel laufen zur Wirbelsaeule zusammen (V-Form wie ein Zopf), statt als Gitter parallel nach unten
  const roots = [
    { a: Math.PI * 1.13, b: 0.2, endX: 0.06, R: 0.04 },
    { a: Math.PI * 1.03, b: 0.5, endX: 0.13, R: 0.034 },
    { a: Math.PI * 0.95, b: 0.72, endX: 0.2, R: 0.028 },
    { a: Math.PI * 1.2, b: 0.78, endX: 0.26, R: 0.026 },
  ];
  const sides = [1, -1];
  const order = [];
  for (const R of roots) for (const s of sides) order.push({ ...R, s });
  for (let bi = 0; bi < Math.min(nBundles, order.length); bi++) {
    const B = order[bi];
    const root = onSkull(B.a, B.s * B.b, -0.03);
    const nrm = V(d.x, d.y, d.z);
    const p1 = root.clone().addScaledVector(nrm, 0.11).add(V(0, -0.05, -0.02));
    const yA = -0.92; const yB = -1.3; const yE = -1.66 - 0.06 * Math.abs(B.endX);
    const xA = B.s * (0.1 + B.endX * 0.6); const xB = B.s * (0.05 + B.endX * 0.7); const xE = B.s * B.endX;
    const gap = 0.045 + B.R + 0.03 * (bi % 2); // v3: dichter am Nacken (kein Gitter aus Staeben)
    const p2 = V(xA, yA, backZ(xA, yA) - gap);
    const p3 = V(xB, yB, backZ(xB, yB) - gap * 0.85);
    const zE = backZ(xE, yE);
    const p4 = V(xE, yE, zE + 0.04);
    const pre = V(xE, yE + 0.12, zE - 0.06);
    const curve = new THREE.CatmullRomCurve3([root, p1, p2, p3, pre, p4], false, 'centripetal');
    const cuffs = [0.2, 0.5, 0.78];
    guides.push({ curve, radius: B.R, cuffs });
    // Querschnitt: Sonnenblumen-Muster, Dicken gestreut
    const n = perBundle - (bi > 5 ? 2 : 0);
    const items = [];
    for (let i = 0; i < n; i++) {
      const rr = Math.sqrt((i + 0.5) / n) * B.R * 0.78;
      const an = i * 2.39996;
      let radius; let kind;
      if (i === 0) { radius = 0.016 + rnd() * 0.004; kind = bi % 3 === 0 ? KIND.METAL : KIND.WHITE; }
      else if (i < 3) { radius = 0.008 + rnd() * 0.004; kind = [KIND.GLASS, KIND.RUBBER, KIND.WHITE][i % 3]; }
      else { radius = 0.003 + rnd() * 0.003; kind = rnd() < 0.5 ? KIND.RUBBER : rnd() < 0.7 ? KIND.WHITE : KIND.GLASS; }
      items.push({ rr, an, radius, kind });
    }
    const steps = 60;
    const fr = curve.computeFrenetFrames(steps, false);
    for (const it of items) {
      const pts = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const c = curve.getPointAt(t);
        // an den Manschetten zusammengezogen, dazwischen etwas lockerer, an der Wurzel gebuendelt
        let sq = 1.0;
        for (const cf of cuffs) sq = Math.min(sq, 0.72 + 0.28 * Math.min(1, Math.abs(t - cf) / 0.06));
        sq *= 0.65 + 0.35 * Math.min(1, t / 0.08);
        const an = it.an + t * 1.4;
        const ox = Math.cos(an) * it.rr * sq * 1.12; const oy = Math.sin(an) * it.rr * sq * 1.12;
        pts.push(c.clone().addScaledVector(fr.normals[k], ox).addScaledVector(fr.binormals[k], oy));
      }
      writeCable(out, made++, pts, { radius: it.radius, kind: it.kind, sway: false, rnd, pulse: it.kind === KIND.GLASS ? 0.25 + rnd() * 0.2 : 0 });
    }
  }

  /* 2) Faecher: steife Glasfasern nach hinten oben */
  let guard = 0; let nf = 0;
  while (nf < fan && guard++ < fan * 40) {
    // v3: strahlenfoermig vom Hinterkopf nach hinten (oben bis unten), wie Referenz 1. Seitlich wenig (keine Peruecke).
    const a = Math.PI * (0.62 + 0.55 * Math.pow(rnd(), 0.8));
    const b = (rnd() - 0.5) * 1.3;
    const root = onSkull(a, b, -0.032);
    if (cutField(root.x, root.y, root.z) < 0.2) continue;
    if (Math.abs(root.x) < 0.05) continue; // Kamm
    const nrm = V(d.x, d.y, d.z);
    const dir = nrm.clone().multiplyScalar(0.85).add(V(0, 0.05, -0.75)).normalize();
    dir.x *= 0.45; dir.normalize();
    const side = V(rnd() - 0.5, (rnd() - 0.5) * 0.6, 0).multiplyScalar(0.22);
    const L = 0.35 + 1.25 * Math.pow(rnd(), 0.65);
    const sag = 0.02 + 0.08 * rnd();
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const s = (k / 12) * L;
      pts.push(root.clone().addScaledVector(dir, s).addScaledVector(side, s * s * 0.5).add(V(0, -sag * s * s, 0)));
    }
    // Dicken etwa 1:5, wenige dicke Glasstaebe, Impulse sparsam
    const thick = rnd();
    const radius = 0.0024 + 0.0095 * thick * thick * thick;
    const glass = thick > 0.72;
    writeCable(out, made++, pts, { radius, kind: glass ? KIND.GLASS : KIND.FIBER, sway: true, rnd, pulse: glass ? 0.3 : (rnd() < 0.12 ? 1 : 0), hideX: true });
    nf++;
  }

  /* 3) kurze Boegen auf dem Schaedel unter dem Glas */
  guard = 0; let na = 0;
  while (na < arcs && guard++ < arcs * 40) {
    const a1 = Math.PI * (0.65 + 0.5 * rnd()); const b1 = (rnd() - 0.5) * 2.2;
    const a2 = a1 + (rnd() - 0.3) * 0.6; const b2 = b1 + (rnd() - 0.5) * 0.5;
    const A = onSkull(a1, b1, -0.05); const Bp = onSkull(a2, b2, -0.05);
    if (cutField(A.x, A.y, A.z) < 0.08 || cutField(Bp.x, Bp.y, Bp.z) < 0.08) continue;
    const pts = [];
    const lift = 0.012 + rnd() * 0.025;
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      pts.push(onSkull(a1 + (a2 - a1) * t, b1 + (b2 - b1) * t, -0.044 + lift * Math.sin(Math.PI * t)));
    }
    const kind = rnd() < 0.5 ? KIND.METAL : KIND.RUBBER;
    writeCable(out, made++, pts, { radius: 0.004 + rnd() * 0.006, kind, sway: false, rnd, hideX: true });
    na++;
  }
  /* 4) Filamente unter dem Glas: vom Haaransatz in weichen Bahnen nach hinten, laufen am Hinterkopf zusammen
        (wie gekaemmtes Haar aus Glasfaser, eisig). Liegen an der Schale an: keine Peruecken-Silhouette. */
  guard = 0; let nfl = 0;
  while (nfl < flow && guard++ < flow * 60) {
    const b0 = (rnd() - 0.5) * 2.5;
    let a0 = Math.PI * 0.32;
    let p0 = null;
    for (; a0 < Math.PI * 1.1; a0 += 0.01) { p0 = onSkull(a0, b0, -0.036); if (cutField(p0.x, p0.y, p0.z) > 0.2) break; }
    if (!p0 || p0.y < -0.35) continue;
    const a1 = Math.PI * (1.08 + 0.14 * rnd());
    const b1 = b0 * (0.25 + 0.2 * rnd());
    const pts = [];
    const lift = 0.006 + rnd() * 0.012;
    const n = 20;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const e = t * t * (3 - 2 * t);
      pts.push(onSkull(a0 + (a1 - a0) * t, b0 + (b1 - b0) * e, -0.04 + lift * Math.sin(Math.PI * t) + 0.004 * Math.sin(t * 9 + b0 * 5)));
    }
    const r = rnd();
    const kind = r < 0.5 ? KIND.WHITE : r < 0.78 ? KIND.GLASS : KIND.METAL;
    writeCable(out, made++, pts, { radius: 0.0028 + rnd() * 0.0045, kind, sway: false, rnd, pulse: kind === KIND.GLASS && rnd() < 0.5 ? 0.22 : 0, hideX: true });
    nfl++;
  }
  return { ...out, count: made, K, guides };
}

/* ------------------------------------------------------------------ Geometrie + Material */
export function buildCables(THREE, U, env, paths, o) {
  const { seg, radial, palette } = o;
  const base = new THREE.InstancedBufferGeometry();
  const pos = []; const idx = [];
  for (let j = 0; j <= seg; j++) {
    const t = j / seg;
    for (let r = 0; r <= radial; r++) pos.push(t, (r / radial) * Math.PI * 2, 0);
  }
  for (let j = 0; j < seg; j++) {
    for (let r = 0; r < radial; r++) {
      const a = j * (radial + 1) + r; const b = a + radial + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  base.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  base.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  base.setIndex(idx);
  base.setAttribute('aC0', new THREE.InstancedBufferAttribute(paths.inst0.subarray(0, paths.count * 4), 4));
  base.setAttribute('aC1', new THREE.InstancedBufferAttribute(paths.inst1.subarray(0, paths.count * 4), 4));
  base.instanceCount = paths.count;

  const tex = new THREE.DataTexture(paths.data, K, paths.data.length / (K * 4), THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;

  const uC = {
    uCurve: { value: tex },
    uGrow: { value: 1 },
    uSway: { value: 1 },
    uCabRubber: { value: new THREE.Color(0x1a2128) },
    uCabMetal: { value: new THREE.Color(0xaab3bc) },
    // v3: Fasern dunkel und glaenzend (Silhouette mit Lichtkante statt weisser Striche)
    uCabFiber: { value: new THREE.Color(0.07, 0.09, 0.11) },
    uCabWhite: { value: new THREE.Color(0.72, 0.76, 0.8) },
    uCabGlass: { value: new THREE.Color(0.2, 0.32, 0.4) },
  };
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.4, metalness: 0.3, envMap: env, envMapIntensity: 0.9, transparent: true,
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = '#define AA_CLAMP 1.8\n' + shader.fragmentShader;
    patchCommon(THREE, shader, U, {
      raw: true,
      uniforms: uC,
      rigK: new THREE.Vector4(0.85, 1, 1.1, 1.2),
      vertexHead: /* glsl */ `
        attribute vec4 aC0;
        attribute vec4 aC1;
        uniform sampler2D uCurve;
        uniform float uSway;
        varying float vT;
        varying vec4 vC0;
        varying vec4 vC1;
        varying float vAround;
        vec3 aaCP(int k, int row) {
          k = clamp(k, 0, ${K - 1});
          vec4 c = texelFetch(uCurve, ivec2(k, row), 0);
          vec3 p = c.xyz;
          float s = c.w;
          // nur Fasern schwingen, steif: Ausschlag waechst zur Spitze
          float amp = aC0.y < 0.0 ? 0.0 : 0.014 * pow(clamp(s / max(aC1.z, 0.3), 0.0, 1.0), 1.6) * uSway;
          float ph = mod(aC0.w, 10.0) * 0.35 + aC1.w * 0.6;
          p += vec3(sin(uTime * 0.7 + ph), 0.6 * sin(uTime * 0.53 + ph * 1.7), 0.5 * cos(uTime * 0.61 + ph * 1.3)) * amp;
          return aaSkinP(p, aaSkinW(c.y));
        }
      `,
      fragmentHead: 'varying float vT;\nvarying vec4 vC0;\nvarying vec4 vC1;\nvarying float vAround;\nuniform float uGrow;\nuniform vec3 uCabRubber, uCabMetal, uCabFiber, uCabWhite, uCabGlass;',
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <beginnormal_vertex>', /* glsl */ `
        int row = int(aC0.x + 0.5);
        float sK = position.x * ${(K - 1).toFixed(1)};
        int i1 = int(floor(min(sK, ${(K - 1.001).toFixed(3)})));
        float u = sK - float(i1);
        vec3 P0 = aaCP(i1 - 1, row); vec3 P1 = aaCP(i1, row);
        vec3 P2 = aaCP(i1 + 1, row); vec3 P3 = aaCP(i1 + 2, row);
        if (i1 == 0) P0 = 2.0 * P1 - P2;
        if (i1 >= ${K - 2}) P3 = 2.0 * P2 - P1;
        vec3 C = 0.5 * ((2.0 * P1) + (-P0 + P2) * u + (2.0 * P0 - 5.0 * P1 + 4.0 * P2 - P3) * u * u + (-P0 + 3.0 * P1 - 3.0 * P2 + P3) * u * u * u);
        vec3 Tn = normalize(0.5 * ((-P0 + P2) + 2.0 * (2.0 * P0 - 5.0 * P1 + 4.0 * P2 - P3) * u + 3.0 * (-P0 + 3.0 * P1 - 3.0 * P2 + P3) * u * u) + 1e-5);
        vec3 ref = abs(Tn.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 Bn = normalize(cross(Tn, ref));
        vec3 Nn = cross(Bn, Tn);
        float ang = position.y;
        vec3 rad = Nn * cos(ang) + Bn * sin(ang);
        float kindV = aC0.z;
        float rr = abs(aC0.y);
        // Fasern: zur Spitze duenner, runde Kappe
        float fib = step(1.5, kindV) * step(kindV, 2.5);
        rr *= mix(1.0, mix(1.0, 0.35, position.x) * (1.0 - smoothstep(0.985, 1.0, position.x)), fib);
        // Metallschlauch: Rippen
        float rib = kindV > 0.5 && kindV < 1.5 ? 1.0 : 0.0;
        float ribs = rib * (0.5 + 0.5 * sin(position.x * aC1.z * 300.0));
        rr *= 1.0 + 0.14 * ribs;
        vec3 objectNormal = normalize(rad - Tn * rib * 0.3 * cos(position.x * aC1.z * 300.0));
        float aaW = 0.0;
        vT = position.x; vC0 = aC0; vC1 = aC1; vAround = ang;
      `)
      .replace('#include <begin_vertex>', /* glsl */ `
        vec3 transformed = C + rad * rr;
        vAaObj = transformed; vAaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', /* glsl */ `#include <clipping_planes_fragment>
        if (vT > uGrow) discard;
        if (vAaPos.y > uBuildY + 0.02) discard;
        if (vC0.w > 9.0 && vAaPos.y > uScanY + 0.002 && step(uScanY, 8.0) > 0.5) discard;
      `)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float kind = vC0.z;
        vec3 cc = kind < 0.5 ? uCabRubber : kind < 1.5 ? uCabMetal : kind < 2.5 ? uCabFiber : kind < 3.5 ? uCabWhite : uCabGlass;
        // feine Kennzeichnung (Ring) auf einzelnen Gummikabeln
        float band = step(0.8, vC1.w) * step(kind, 0.5) * step(0.94, fract(vT * vC1.z * 2.5 + vC1.y));
        cc = mix(cc, uCabWhite * 0.7, band);
        diffuseColor.rgb = cc;
        float aaFade = 1.0 - smoothstep(uFadeY.x - 0.3, uFadeY.y - 0.4, vAaPos.y);
        diffuseColor.a *= aaFade * uAlpha;
        float cr = kind < 0.5 ? 0.42 : kind < 1.5 ? 0.26 : kind < 2.5 ? 0.2 : kind < 3.5 ? 0.3 : 0.08;
        float cm = kind < 0.5 ? 0.0 : kind < 1.5 ? 1.0 : kind < 2.5 ? 0.7 : 0.0;
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = cr;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = cm;')
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        float L = vC1.z;
        float nv = abs(dot(normal, normalize(vViewPosition)));
        float em = 0.0;
        // Glasschlauch: Leuchtfaden im Inneren (Mitte der sichtbaren Breite), seltene Lichtpakete
        float kG = step(3.5, kind);
        float core = smoothstep(0.84, 0.97, nv);
        float pp = fract(uTime * vC1.x / max(L, 0.5) + vC1.y) * 1.6 - 0.3;
        float pulse = exp(-aaSq((vT - pp) * L / 0.07)) * step(0.01, vC1.x);
        em += kG * core * (0.32 + 2.2 * pulse);
        // Fasern: einzelne Spitzen leuchten
        float kF = step(1.5, kind) * step(kind, 2.5);
        em += kF * step(0.5, vC1.x) * smoothstep(0.96, 1.0, vT) * 1.5;
        totalEmissiveRadiance += mix(uSig, uIce, 0.35 + 0.4 * pulse) * em * uGlow * (1.0 - smoothstep(uFadeY.x, uFadeY.y, vAaPos.y));
      `)
      .replace('#include <opaque_fragment>', /* glsl */ `
        // Glasschlauch und Fasern: Kanten heller (Fresnel), wirkt durchscheinend
        {
          float nv2 = abs(dot(normal, normalize(vViewPosition)));
          float fr = pow(1.0 - nv2, 3.0);
          float kG2 = step(3.5, vC0.z) + step(1.5, vC0.z) * step(vC0.z, 2.5) * 0.25;
          outgoingLight += uIce * 0.22 * fr * kG2;
        }
        outgoingLight = min(outgoingLight, vec3(AA_CLAMP));
        #include <opaque_fragment>
      `);
  };
  mat.customProgramCacheKey = () => `aa-cables3-${K}`;
  const mesh = new THREE.Mesh(base, mat);
  mesh.frustumCulled = false;
  return { mesh, mat, geo: base, tex, U: uC };
}
