// Szene "robot", Variante android-a v2: Androidin nach Referenz 1 (Profil, Haut-Porzellan, offener Hinterkopf).
// Gleiche Schnittstelle wie js/scenes/robot.js: create(ctx) -> { group, look, update, setActive, dispose }.
//
// Aufbau
//   Grundform   MakeHuman-Basis (CC0) mit weiblichen Targets, Kalotte flacher, Hals laenger (scripts2/build_v5.py),
//               assets/android-a/head.bin (Vierecke, ~120 KB). Zur Laufzeit Catmull-Clark (high 2, sonst 1 Stufe).
//   Haut        Gesicht und Hals: heller, warmer Grundton, Wrap-Diffuse mit warmem Terminator, Lippen, Lider, Brauen,
//               Wimpern (Band mit Haar-Alpha). Bueste unterhalb des Kragens: Keramik mit Fugen.
//   Schnitt     Ab Schaedelmitte nach hinten offen (shape.js CUT). Kante mit Materialstaerke.
//   Innen       Grossformen zuerst: Titan-Kamm ueber den Scheitel, zwei Lagen Milchglas, Wirbelsaeule bis in die
//               Schaedelbasis, Servo hinter dem Ohr mit Kolben zum Hals. Dann Module, Spangen, Anschluesse.
//               Innere Schale aus hellen Titanplatten (nur Rauheit/Normale, kein Leuchten).
//   Kabel       6 bis 8 gefuehrte Buendel mit Manschetten in den Ruecken, Faecher aus steifen Glasfasern nach hinten
//               oben, kurze Boegen unter dem Glas. high 8 Buendel + 70 Fasern, medium 6 + 36, low 6 + 22.
//   Licht       eigenes Dreipunkt-Licht im Kameraraum (materials.js), weicher Lichtschein hinter dem Kopf.
//   Pose        Im Beat robot dreht sie sich ins Profil, Blick zum Text (links). Zum Roentgen-Zoom dreht sie zurueck
//               nach vorne (Gehirn und Gehirn-Hardware aus brain.js passen nur in der Grundstellung). Outro: Profil.
// Ablauf (ctx.director.beat, wie robot.js): robot 0.08-0.26 Hologramm, 0.26-0.64 Aufbau von unten, danach Leerlauf.
//   zoom 0.3-0.84 Roentgen-Scan von oben nach unten (gleiche Formel wie robotScan), Gehirn (brain.js) sichtbar.
//   outro: ganz, ruhig, Iris leuchtet im Lichtblitz auf.
import { catmullClark, quadsToTris, splitStride } from './subdiv.js';
import { buildRadialMap, cutField, smoothstep } from './shape.js';
import { buildAndroidEnv } from './env.js';
import {
  makeUniforms, makeSkin, makeRibbon, makeInner, makeGlass, makeEye, makeParts, makeHolo, makeBand, makeLash, makeHalo,
} from './materials.js';
import {
  buildRadialSurface, buildRibbon, Parts, buildServo, buildSpine, buildStruts, buildBoards, buildCrest, buildBundleHardware,
} from './parts.js';
import { makeCablePaths, buildCables } from './cables.js';

const ASSET = new URL('../../../assets/android-a/', import.meta.url);
const TIER = {
  high: { levels: 2, bundles: 8, perBundle: 9, fan: 46, arcs: 16, seg: 64, radial: 6, grid: 1, boards: 16 },
  medium: { levels: 1, bundles: 6, perBundle: 6, fan: 28, arcs: 8, seg: 40, radial: 5, grid: 0.7, boards: 10 },
  low: { levels: 1, bundles: 6, perBundle: 5, fan: 18, arcs: 6, seg: 30, radial: 4, grid: 0.5, boards: 6 },
};
// Gesamtdrehung (Koerper + Kopf) in rad: Gesicht nach links zum Text. Koerper uebernimmt 55 %, der Kopf den Rest.
export const POSE = { robot: -1.02, outro: -1.32, body: 0.55 };

async function loadHead() {
  const [meta, buf] = await Promise.all([
    fetch(new URL('head.json', ASSET)).then((r) => r.json()),
    fetch(new URL('head.bin', ASSET)).then((r) => r.arrayBuffer()),
  ]);
  const pos = new Float32Array(buf.slice(0, meta.verts * 12));
  const quads = new Uint32Array(new Uint16Array(buf, meta.verts * 12, meta.quads * 4));
  const o8 = meta.verts * 12 + meta.quads * 8;
  const ao = meta.ao ? new Uint8Array(buf, o8, meta.verts) : null;
  const vis = meta.vis ? new Uint8Array(buf, o8 + meta.verts, meta.verts) : null;
  const v = new Float32Array(meta.verts * 5);
  for (let i = 0; i < meta.verts; i++) {
    v[i * 5] = pos[i * 3]; v[i * 5 + 1] = pos[i * 3 + 1]; v[i * 5 + 2] = pos[i * 3 + 2];
    v[i * 5 + 3] = ao ? ao[i] / 255 : 1;
    v[i * 5 + 4] = vis ? vis[i] / 255 : 1;
  }
  return { meta, v, quads };
}

/** Roentgen-Scan aus dem Fortschritt des Beats zoom (gleiche Formel wie robot.js robotScan) */
export function androidScan(zoomP, inOutro = false, out = {}) {
  const dissolve = inOutro ? 0 : smoothstep(0.3, 0.84, zoomP);
  out.dissolve = dissolve;
  out.scanY = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
  out.xray = inOutro ? 0 : smoothstep(0.42, 0.62, zoomP);
  return out;
}

/** Wimpern: Band entlang der Oberlidkante, nach aussen und oben gebogen (aL: u entlang, v nach aussen) */
function buildLashes(THREE, eye) {
  const c = new THREE.Vector3().fromArray(eye.c); const r = eye.r;
  const side = Math.sign(c.x) || 1;
  const N = 40; const rows = 4;
  const pos = []; const aL = []; const idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = (u - 0.5) * 1.62;
    const e = -0.04 + 0.48 * Math.pow(Math.cos(Math.min(1, Math.abs(a) / 0.82) * Math.PI / 2), 0.8);
    const n0 = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    const root = c.clone().addScaledVector(n0, r * 1.035);
    const outer = THREE.MathUtils.smoothstep(a * side, -0.6, 0.55);
    const L = 0.036 * (0.55 + 0.45 * outer) * (1 - 0.6 * Math.pow(Math.abs(a) / 0.81, 4));
    const d1 = n0.clone().add(new THREE.Vector3(side * 0.12 * outer, 0.3, 0)).normalize();
    const d2 = n0.clone().multiplyScalar(0.35).add(new THREE.Vector3(0, 1, 0)).normalize();
    for (let k = 0; k <= rows; k++) {
      const p = root.clone();
      // Kruemmung aufsummieren: erst nach aussen, zur Spitze nach oben
      for (let s = 1; s <= k; s++) p.addScaledVector(d1.clone().lerp(d2, Math.pow(s / rows, 2)).normalize(), L / rows);
      pos.push(p.x, p.y, p.z);
      aL.push(u, k / rows);
    }
  }
  const W = rows + 1;
  for (let i = 0; i < N; i++) for (let k = 0; k < rows; k++) {
    const a = i * W + k; const b = (i + 1) * W + k;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aL', new THREE.Float32BufferAttribute(aL, 2));
  g.setIndex(idx);
  return g;
}

export async function create(ctx) {
  const { THREE, palette, director, pointer, shared, quality, camera } = ctx;
  const T = TIER[quality] || TIER.high;
  const hi = quality === 'high';

  const group = new THREE.Group();
  group.name = 'scene:robot';
  const body = new THREE.Group();
  group.add(body);
  const headGroup = new THREE.Group();
  headGroup.matrixAutoUpdate = false;
  body.add(headGroup);

  /* ------------------------------------------------------------ Grundform */
  const head = await loadHead();
  let sub = { pos: head.v, quads: head.quads };
  for (let i = 0; i < T.levels; i++) sub = catmullClark(sub.pos, sub.quads, 5);
  const sp = splitStride(sub.pos, 5);
  const aoArr = new Float32Array(sp.rest.length / 2);
  const visArr = new Float32Array(sp.rest.length / 2);
  for (let i = 0; i < aoArr.length; i++) { aoArr[i] = sp.rest[i * 2]; visArr[i] = sp.rest[i * 2 + 1]; }
  const net = { pos: sp.pos, quads: sub.quads };
  const nv = net.pos.length / 3;
  const index = quadsToTris(net.quads, nv);
  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.BufferAttribute(net.pos, 3));
  shellGeo.setAttribute('aAO', new THREE.BufferAttribute(aoArr, 1));
  shellGeo.setAttribute('aVis', new THREE.BufferAttribute(visArr, 1));
  shellGeo.setIndex(new THREE.BufferAttribute(index, 1));
  shellGeo.computeVertexNormals();
  const rmap = buildRadialMap(net.pos, head.meta.ears);

  /* ------------------------------------------------------------ Material */
  const envRT = buildAndroidEnv(THREE, ctx.renderer, palette);
  const env = envRT.texture;
  const U = makeUniforms(THREE, palette, shared);
  const o = { palette, hi };
  const mats = {
    skin: makeSkin(THREE, U, env, o),
    ribbon: makeRibbon(THREE, U, env, o),
    inner: makeInner(THREE, U, env, o),
    glass: makeGlass(THREE, U, env, { ...o, layer: 0 }),
    eye: makeEye(THREE, U, env, o),
    parts: makeParts(THREE, U, env, o),
    holo: makeHolo(THREE, U, { palette }),
    lash: makeLash(THREE, U),
    halo: makeHalo(THREE, palette),
  };
  if (quality !== 'low') mats.glass2 = makeGlass(THREE, U, env, { ...o, layer: 1 });

  /* ------------------------------------------------------------ Meshes */
  const geos = [shellGeo];
  const add = (g, m, parent, order = 0) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = order;
    parent.add(mesh);
    if (!geos.includes(g)) geos.push(g);
    return mesh;
  };
  const shell = add(shellGeo, mats.skin, body, 3);
  const ribbonGeo = buildRibbon(THREE, net.pos, index, shellGeo.attributes.normal.array, 0.028, visArr);
  const ribbon = add(ribbonGeo, mats.ribbon, body, 1);

  const G = T.grid;
  const innerGeo = buildRadialSurface(THREE, rmap, {
    off: -0.05, na: Math.round(200 * G), nb: Math.round(110 * G), a0: 0.6, a1: Math.PI * 1.62, b0: -1.42, b1: 1.42,
    keep: (x, y, z) => cutField(x, y, z) > -0.07 && y > -0.86,
  });
  const inner = add(innerGeo, mats.inner, body, 0);
  const glassGeo = buildRadialSurface(THREE, rmap, {
    off: 0.004, na: Math.round(180 * G), nb: Math.round(100 * G), a0: 0.6, a1: Math.PI * 1.4, b0: -1.4, b1: 1.4,
    keep: (x, y, z) => cutField(x, y, z) > 0.22 && y > -0.62,
  });
  const glass = add(glassGeo, mats.glass, body, 8);
  const glasses = [glass];
  if (mats.glass2) {
    const g2 = buildRadialSurface(THREE, rmap, {
      off: -0.026, na: Math.round(170 * G), nb: Math.round(96 * G), a0: 0.6, a1: Math.PI * 1.45, b0: -1.4, b1: 1.4,
      keep: (x, y, z) => cutField(x, y, z) > 0.09 && y > -0.7,
    });
    glasses.push(add(g2, mats.glass2, body, 7));
  }

  // Kabel (zuerst: die Buendel-Fuehrungen braucht die Mechanik)
  const paths = makeCablePaths(THREE, rmap, net.pos, { bundles: T.bundles, perBundle: T.perBundle, fan: T.fan, arcs: T.arcs, seed: 11 });
  const cables = buildCables(THREE, U, env, paths, { seg: T.seg, radial: T.radial, palette });
  cables.mesh.renderOrder = 4;
  body.add(cables.mesh);

  // Mechanik
  const P = new Parts(THREE);
  const q = hi ? 1 : 0.6;
  // Servo auf dem Pol der Radial-Karte (Hoehe des Hirn-Wiegenrings, dort setzen die Streben aus brain.js an)
  const SERVO = [0.695, 0.0, -0.07];
  for (const side of [1, -1]) buildServo(THREE, P, new THREE.Vector3(side * SERVO[0], SERVO[1], SERVO[2]), side, q);
  buildSpine(THREE, P, q);
  buildCrest(THREE, P, rmap, q);
  buildStruts(THREE, P, rmap, q);
  buildBoards(THREE, P, rmap, { count: T.boards, q });
  buildBundleHardware(THREE, P, paths.guides, q);
  const partsGeo = P.geometry();
  const parts = add(partsGeo, mats.parts, body, 0);

  // Gestufte Schalen-Baender hinter der Gesichtskante (Porzellan, helles Titan, dunkles Titan mit feiner Lichtkante)
  const earArr = [[-SERVO[0], SERVO[1], SERVO[2]], [SERVO[0], SERVO[1], SERVO[2]]];
  const BANDS = [
    { f0: 0.012, f1: 0.078, off: -0.004, color: new THREE.Color(0.74, 0.7, 0.68), metal: 0, rough: 0.4, seg: 0.5 },
    { f0: 0.088, f1: 0.158, off: -0.013, color: new THREE.Color(0xb3bcc4), metal: 0.7, rough: 0.3, seg: 0.38 },
    { f0: 0.168, f1: 0.236, off: -0.022, color: new THREE.Color(0x6a747d), metal: 0.8, rough: 0.34, seg: 0.3, glow: 0.45 },
  ];
  const bands = BANDS.map((B) => {
    const g = buildRadialSurface(THREE, rmap, {
      off: B.off, na: Math.round(220 * G), nb: Math.round(120 * G), a0: 0.6, a1: Math.PI * 1.5, b0: -1.45, b1: 1.45,
      keep: (x, y, z) => { const f = cutField(x, y, z); return f > B.f0 - 0.03 && f < B.f1 + 0.03 && y > -0.8; },
    });
    mats['band' + B.f0] = makeBand(THREE, U, env, { ...B, ears: earArr });
    return add(g, mats['band' + B.f0], body, 0);
  });

  // Augen und Wimpern (im Kopf, starr)
  const eyeGeo = new THREE.SphereGeometry(1, hi ? 48 : 28, hi ? 32 : 20);
  geos.push(eyeGeo);
  const eyes = head.meta.eyes.map((e) => {
    const m = new THREE.Mesh(eyeGeo, mats.eye);
    m.position.fromArray(e.c);
    m.scale.setScalar(e.r * 0.985);
    m.renderOrder = 2;
    headGroup.add(m);
    return m;
  });
  const lashes = head.meta.eyes.map((e) => add(buildLashes(THREE, e), mats.lash, headGroup, 3));

  // Hologramm (Aufbau, Roentgen)
  const holo = add(shellGeo, mats.holo, body, 20);
  holo.visible = false;

  // Lichtschein hinter dem Kopf (dreht nicht mit, schaut immer zur Kamera)
  const haloGeo = new THREE.PlaneGeometry(1, 1);
  const halo = add(haloGeo, mats.halo, group, -5);
  halo.frustumCulled = false;
  const _hv = new THREE.Vector3();

  /* ------------------------------------------------------------ Zustand */
  const pivot = new THREE.Vector3(0, -0.95, -0.15);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const headMat = U.uHeadMat.value;
  const _v = new THREE.Vector3();
  const gazeE = new THREE.Euler(0, 0, 0, 'YXZ');
  const st = { yaw: 0, pitch: 0, gx: 0, gy: 0, iris: 0, pose: 0, fresh: true };
  const scan = {};
  const look = {
    exposure: 1.0, bloom: 0.62, bloomRadius: 0.5, bloomThreshold: 0.86, key: 1.6, rim: 3.0, amb: 0.05,
    parallax: 0.24, drift: 0.022, aberration: 0.003, vignette: 0.8, flash: 0,
  };
  const bw = { r: 0, z: 0, b: 0, o: 0, s: 1 };
  const mix4 = (a, b, c, d) => (a * bw.r + b * bw.z + c * bw.b + d * bw.o) / bw.s;

  // dev: einzelne Teile ausblenden (test-android-a.html?aa=noglass,nocables), Pose fest (?pose=-1.0)
  const qs = ctx.dev ? new URLSearchParams(window.location.search) : null;
  const dbg = new Set(qs ? (qs.get('aa') || '').split(',').filter(Boolean) : []);
  const poseFix = qs && qs.has('pose') ? parseFloat(qs.get('pose')) : null;
  const snap = !!(qs && qs.has('snap')); // Tests: Pose ohne Daempfung
  const api = {
    group,
    look,
    headShape: rmap,
    update(time, dt, local, global, weight = 1) {
      const rb = director.beat('robot');
      const zm = director.beat('zoom');
      const br = director.beat('brain');
      const out = director.beat('outro');
      const inOutro = global >= out.start - 0.04;

      let build = 1; let holoAmt = 0; let follow = 1; let grow = 1; let irisOn = 0.12; let pose;
      if (!inOutro) {
        build = smoothstep(0.26, 0.64, rb.p);
        grow = smoothstep(0.5, 0.78, rb.p);
        holoAmt = smoothstep(0.08, 0.26, rb.p) * (1 - smoothstep(0.6, 0.68, rb.p));
        holoAmt = Math.max(holoAmt, 0.6 * smoothstep(0.3, 0.42, zm.p) * (1 - 0.5 * smoothstep(0.6, 0.95, zm.p))
          * (1 - smoothstep(0.32, 0.5, br.p)));
        follow = 1 - smoothstep(0.0, 0.32, zm.p);
        irisOn = 0.12 * smoothstep(0.62, 0.72, rb.p) + 0.2 * smoothstep(0.0, 0.2, zm.p) * (1 - smoothstep(0.3, 0.5, zm.p));
        // ins Profil drehen, zum Roentgen zurueck in die Grundstellung (Gehirn passt nur dort)
        pose = POSE.robot * smoothstep(0.18, 0.52, rb.p) * (1 - smoothstep(0.02, 0.3, zm.p));
      } else {
        irisOn = 0.12 + 0.9 * Math.exp(-Math.pow((out.p - 0.06) / 0.08, 2));
        pose = POSE.outro + 0.06 * out.p;
      }
      if (poseFix !== null) pose = poseFix;
      if (st.fresh || snap) { st.pose = pose; st.fresh = false; }
      st.pose += (pose - st.pose) * (1 - Math.exp(-dt * 3.5));
      if (shared.uScanY && shared.uDissolve) {
        scan.scanY = shared.uScanY.value; scan.dissolve = shared.uDissolve.value;
        scan.xray = shared.uXray ? shared.uXray.value : androidScan(zm.p, inOutro).xray;
      } else androidScan(zm.p, inOutro, scan);

      /* Koerper dreht, Kopf dreht mehr; Kopf folgt dezent der Maus, Eigenleben, Atmen */
      body.rotation.y = st.pose * POSE.body;
      const headPose = st.pose * (1 - POSE.body);
      const k = 1 - Math.exp(-dt * 2.2);
      const idleYaw = Math.sin(time * 0.19) * 0.035 + Math.sin(time * 0.067) * 0.02;
      const idlePitch = Math.sin(time * 0.15 + 1.0) * 0.018;
      st.yaw += ((pointer.sx * 0.15 + idleYaw) * follow - st.yaw) * k;
      st.pitch += ((-pointer.sy * 0.08 + idlePitch) * follow - st.pitch) * k;
      const roll = (Math.sin(time * 0.11) * 0.01 - st.yaw * 0.06) * follow + headPose * 0.04;
      const breath = Math.sin((time * Math.PI * 2) / 5.2);
      euler.set(st.pitch + 0.03 * Math.abs(headPose), st.yaw + headPose, roll);
      headMat.makeRotationFromEuler(euler);
      _v.copy(pivot).applyMatrix4(headMat);
      headMat.setPosition(pivot.x - _v.x, pivot.y - _v.y + breath * 0.004 * follow, pivot.z - _v.z);
      headGroup.matrix.copy(headMat);
      headGroup.matrixWorldNeedsUpdate = true;
      U.uBreath.value = breath * follow;

      /* Augen: ruhig, folgen dezent */
      const ke = 1 - Math.exp(-dt * 3);
      st.gx += ((pointer.sx * 0.14 + Math.sin(time * 0.31) * 0.03) * follow - st.gx) * ke;
      st.gy += ((pointer.sy * 0.07 - 0.03) * follow - 0.03 * (1 - follow) - st.gy) * ke;
      for (const e of eyes) {
        gazeE.set(-st.gy, st.gx + (e.position.x > 0 ? -0.015 : 0.015), 0);
        e.quaternion.setFromEuler(gazeE);
      }
      st.iris += (irisOn - st.iris) * (1 - Math.exp(-dt * 4));
      mats.eye.userData.u.uIrisOn.value = st.iris * weight;

      /* Aufbau, Roentgen */
      U.uBuildY.value = build >= 0.999 ? 9 : -3.85 + (1.2 + 3.85) * build;
      U.uScanY.value = scan.scanY;
      U.uXray.value = scan.xray;
      U.uHolo.value = holoAmt * weight;
      U.uAlpha.value = weight;
      cables.U.uGrow.value = grow;
      U.uGlow.value = 0.9 + 0.1 * Math.sin(time * 0.9);

      /* Sichtbarkeit */
      holo.visible = holoAmt > 0.002;
      const solid = build > 0.001 && scan.dissolve < 0.999;
      shell.visible = solid; ribbon.visible = solid; inner.visible = solid;
      for (const g of glasses) g.visible = solid;
      for (const b of bands) b.visible = solid;
      for (const e of eyes) e.visible = solid;
      for (const l of lashes) l.visible = solid;
      parts.visible = build > 0.001;
      cables.mesh.visible = grow > 0.001;

      /* Lichtschein: hinter dem Kopf, zur Kamera gedreht, im Roentgen aus */
      const haloAmt = weight * (inOutro ? 1 : smoothstep(0.2, 0.6, rb.p) * (1 - smoothstep(0.2, 0.5, zm.p)));
      halo.visible = haloAmt > 0.002;
      if (halo.visible) {
        _hv.set(0, -0.1, 0).sub(camera.position).normalize();
        halo.position.set(0, -0.1, 0).addScaledVector(_hv, 2.4);
        halo.quaternion.copy(camera.quaternion);
        halo.scale.setScalar(10);
        mats.halo.uniforms.uAmt.value = haloAmt;
      }

      if (dbg.size) {
        if (dbg.has('noglass')) for (const g of glasses) g.visible = false;
        if (dbg.has('nocables')) cables.mesh.visible = false;
        if (dbg.has('noparts')) parts.visible = false;
        if (dbg.has('noinner')) inner.visible = false;
        if (dbg.has('noband')) for (const b of bands) b.visible = false;
        if (dbg.has('noribbon')) ribbon.visible = false;
        if (dbg.has('nohalo')) halo.visible = false;
      }

      /* Bildwirkung je Beat */
      bw.r = rb.w; bw.z = zm.w; bw.b = br.w; bw.o = out.w;
      bw.s = Math.max(1e-3, bw.r + bw.z + bw.b + bw.o);
      look.key = mix4(1.6, 1.35, 0.9, 1.6);
      look.rim = mix4(3.0, 3.2, 2.4, 2.8);
      look.amb = mix4(0.05, 0.08, 0.08, 0.05);
      look.exposure = mix4(1.0, 1.0, 1.0, 1.02);
      const xr = smoothstep(0.45, 0.75, zm.p);
      look.bloom = (mix4(0.62, 0.68, 0.95, 0.7) + 0.3 * xr) * (ctx.isMobile ? 0.86 : 1);
      look.bloomThreshold = mix4(0.86, 0.86, 0.72, 0.84) - 0.1 * xr;
      look.parallax = 0.24 * follow + 0.02;
      look.drift = 0.022 * (1 - smoothstep(0.4, 0.9, zm.p)) + 0.004;
      look.flash = inOutro ? 0 : 0.06 * Math.exp(-Math.pow((br.p - 0.46) / 0.05, 2));
    },
    setActive(active) {
      if (active) st.fresh = true;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      cables.geo.dispose();
      cables.tex.dispose();
      cables.mat.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      envRT.dispose();
      group.clear();
    },
  };
  return api;
}
