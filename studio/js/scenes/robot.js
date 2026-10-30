// Szene "robot" (Version 2): detaillierter Roboterkopf mit Hals-Mechanik und Schultern, prozedural modelliert.
// Fenster: robot@0 bis brain@0.6 (Hauptfenster) und outro@0 bis outro@1 (Ausklang).
//
// Aufbau (robot-parts.js, robot-shaders.js):
//   Kopf      14 Platten mit echtem Spaltmass (Keramik, Kinn und Unterseite Graphit), Innenschale aus Graphit,
//             Visier: Titanrahmen mit 6 Schrauben, getoentes Glas, 0.034 dahinter LED-Platine (Punktmatrix 65 x 15).
//             Ohrmodule (Gehaeusering, 16 Lamellen, Iris, Linse, Innengehaeuse), Kieferscharniere mit Warnstreifen.
//   Hals      6 Wirbel (drehen anteilig mit), Gummiringe, 4 Kolben (Stange aendert die Laenge, wenn der Kopf nickt),
//             2 Kabelbuendel mit Schellen und Lichtimpulsen, Rueckenmark, Kragen mit Lichtlippe.
//   Rumpf     Platten: Schulterkappen, Oberarm-Ringe, Brustplatte mit Brustkern (3 LEDs), Trapez-Paneele mit
//             Sechseck-Lochung, Rueckenplatte mit Lueftung, Schluesselbein-Streben. Unterkante blendet aus.
//   Details   56 Sechskantschrauben, 15 Beschriftungen (robot-decals.js), Gravuren, Kantenabnutzung, Buerstung.
//
// Ablauf (Fortschritt p im Beat, ctx.director.beat()):
//   robot  0.08-0.26  Hologramm mit Plattenkanten erscheint, waehrend die Partikel sich sammeln
//          0.26-0.64  Aufbau von unten. Jede Platte schwebt erst 0.06 vor ihrem Platz und schnappt ein (0.25 s),
//                     sobald die Aufbau-Linie ihren tiefsten Punkt passiert. Schrauben erscheinen danach.
//          0.64       Visier startet: Testbild, Schachbrett, dann die Augen. Danach Leerlauf (Kapitel 1.6 Konzept)
//   zoom   0.00-0.30  Augen im Modus "Denken". 0.12-0.30 Entriegeln: Platten loesen sich, Fugenlicht steigt
//          0.30-0.84  Roentgen-Scan von oben nach unten (uScanY), darueber Hologramm der Platten (Explosionszeichnung)
//   brain  0.00-0.50  Hologramm leise um das Gehirn, Mechanik bleibt sichtbar (dunkler)
//   outro            Roboter ganz, Augen an im Lichtblitz, einmal ein kleines Laecheln (outro p 0.35)
//
// Qualitaet: Segmentzahlen ueber SEG (high 1, medium 0.68, low 0.48). Klarlack und Duennschicht nur high.
import {
  makeHeadShape, buildNeckMetal, buildTendons, smoothstep, clamp01, mulberry32, VISOR, NECK, headSample, dirFromAngles,
} from './robot-geometry.js';
import {
  makeHeadPanels, makeTorsoPanels, buildHeadShell, buildInnerHead, buildTorsoShell, buildInnerTorso, buildVisorParts,
  buildEarParts, buildHingeParts, buildNeckParts, makeTorsoCaster, strapScrews, plateScrews, buildScrewGeometry,
  mergeParts, SDF_GLSL, gf, gv3, GAP, BEVEL,
} from './robot-parts.js';
import {
  robotTokens, makeShellMaterial, makeInnerMaterial, makePartMaterial, makeGlassMaterial, makeBoardMaterial,
  makeHoloMaterial, NOISE, MASK,
} from './robot-shaders.js';
import { buildStudioEnv } from './robot-env.js';
import { buildDecalAtlas, buildDecalMesh } from './robot-decals.js';

const SEG = { high: 1, medium: 0.68, low: 0.48 };

/**
 * Roentgen-Scan aus dem Fortschritt des Beats zoom (fuer Roboter und Gehirn-Hardware gleich).
 * dissolve 0..1, scanY = Hoehe der Scan-Linie (darueber Roentgen), xray 0..1 (Toenung, Raster).
 */
export function robotScan(zoomP, inOutro = false, out = {}) {
  const dissolve = inOutro ? 0 : smoothstep(0.3, 0.84, zoomP);
  out.dissolve = dissolve;
  out.scanY = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
  out.xray = inOutro ? 0 : smoothstep(0.42, 0.62, zoomP);
  return out;
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export async function create(ctx) {
  const { THREE, palette, anchors: A, director, pointer, shared, quality } = ctx;
  const q = SEG[quality] ?? 1;
  const S = (n, min) => Math.max(min, Math.round(n * q));
  const hi = quality === 'high';
  const dark = !!ctx.dev && /[?&]robot=dark\b/.test(window.location.search);
  const debugPanels = !!ctx.dev && /[?&]robot=panels\b/.test(window.location.search);
  const tok = robotTokens(THREE, palette, dark);

  const group = new THREE.Group();
  group.name = 'scene:robot';
  const body = new THREE.Group();
  group.add(body);
  const head = new THREE.Group();
  head.matrixAutoUpdate = false;
  body.add(head);

  /* ------------------------------------------------------------ Bauplan */
  const shape = makeHeadShape(A.head.radii);
  const headKit = makeHeadPanels(THREE, shape);
  const torsoKit = makeTorsoPanels();
  const hs = { p: new THREE.Vector3(), n: new THREE.Vector3() };
  headSample(THREE, shape, 0, -0.85, hs);
  const C = {
    gf, sdfGlsl: SDF_GLSL, gap: GAP, bevel: BEVEL,
    id: { ...headKit.id, ...torsoKit.id },
    ventY0: -0.075, chinY: hs.p.y + 0.005, slit0: 0.86, slitD: 0.032, hatchY: headKit.HC.hatchY,
    cf: Math.cos(headKit.HC.foreTh), sf: Math.sin(headKit.HC.foreTh), coreY: torsoKit.TC.coreY,
    earL: { c: gv3(headKit.frames.earL.c), t1: gv3(headKit.frames.earL.t1), t2: gv3(headKit.frames.earL.t2) },
    earR: { c: gv3(headKit.frames.earR.c), t1: gv3(headKit.frames.earR.t1), t2: gv3(headKit.frames.earR.t2) },
  };

  /* ---------------------------------------------------------- Geometrie */
  const shell = buildHeadShell(THREE, shape, headKit, S(288, 120), S(216, 96));
  const torso = buildTorsoShell(THREE, A, torsoKit, S(208, 96), S(128, 60));
  const geo = {
    shell: shell.geometry,
    inner: buildInnerHead(THREE, shape, S(144, 64), S(108, 48), 0.03),
    torso: torso.geometry,
    torsoInner: buildInnerTorso(THREE, A, S(104, 48), S(64, 32), 0.026),
    holoNeck: buildNeckMetal(THREE, A, S(40, 20)),
    holoTendons: buildTendons(THREE, A, S(40, 20), S(10, 6)),
  };
  const visor = buildVisorParts(THREE, shape, A, q, tok);
  geo.glass = visor.glass;
  geo.board = visor.board;
  const earL = buildEarParts(THREE, shape, -1, q, tok);
  const earR = buildEarParts(THREE, shape, 1, q, tok);
  const neck = buildNeckParts(THREE, shape, A, q, tok);
  const caster = makeTorsoCaster(THREE, torso.hull);
  geo.headParts = mergeParts(THREE, [
    visor.frame, ...earL.geos, ...earR.geos, ...buildHingeParts(THREE, shape, -1, q, tok), ...buildHingeParts(THREE, shape, 1, q, tok),
    neck.head,
  ]);
  geo.bodyParts = neck.body;
  geo.vertebra = neck.vertebra;
  geo.ring = neck.ring;
  geo.cylinder = neck.cylinder;
  geo.rod = neck.rod;
  geo.clevis = neck.clevis;
  geo.screw = buildScrewGeometry(THREE, tok);
  const screwList = [
    ...visor.screws, ...earL.screws, ...earR.screws, ...neck.screws, ...strapScrews(THREE, caster, torsoKit),
    ...plateScrews(THREE, shape, headKit, torsoKit, caster),
  ];

  /* --------------------------------------------------------- Uniforms */
  const headMat = new THREE.Matrix4();
  const NH = 16;
  const NT = 12;
  const U = {
    uTime: shared.uTime,
    uBuildY: { value: 2 },
    uDissolve: { value: 0 },
    uScanY: { value: 9 },
    uXray: { value: 0 },
    uHoloFloor: { value: -2.5 },
    uHeadMat: { value: headMat },
    uSig: { value: palette.signal.clone() },
    uIce: { value: palette.ice.clone() },
    uEmber: { value: palette.ember.clone() },
    uEdgeCol: { value: palette.signal.clone().multiplyScalar(4.5) },
    uLeakCol: { value: palette.signal.clone().multiplyScalar(1.7) },
    uRimCol: { value: palette.signal.clone().multiplyScalar(0.45) },
    uEnvTint: { value: new THREE.Color(1, 1, 1) },
    uLeak: { value: 0 },
    uEar: { value: 0 },
    uIris: { value: 0 },
    uPulse: { value: new THREE.Vector2(0.32, 1) },
    uCrest: { value: new THREE.Vector3() },
    uCore: { value: new THREE.Vector3() },
    uLip: { value: 0 },
    uPanelOff: { value: new Array(NH).fill(0) },
    uPanelN: { value: Array.from({ length: NH }, (_, i) => (shell.stats[i] ? shell.stats[i].n.clone() : new THREE.Vector3(0, 1, 0))) },
    uTorsoOff: { value: new Array(NT).fill(0) },
    uTorsoN: { value: Array.from({ length: NT }, (_, i) => (torso.stats[i] ? torso.stats[i].n.clone() : new THREE.Vector3(0, 1, 0))) },
    uCeramic: { value: tok.ceramic.clone() },
    uGraphite: { value: tok.graphite.clone() },
    uTitanium: { value: tok.titanium.clone() },
    uHolo: { value: 0 },
    uHoloCol: { value: palette.signal.clone().multiplyScalar(0.7) },
    uHoloHi: { value: palette.ice.clone().multiplyScalar(1.8) },
    uGlassA: { value: 0.32 },
    uVisorPow: { value: 0 },
    uLedA: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLedB: { value: new THREE.Vector4(1, 0, 0, -99) },
    uLedC: { value: new THREE.Vector4(0, 0, 0, 0) },
  };

  /* -------------------------------------------------------- Materialien */
  const env = buildStudioEnv(THREE, ctx.renderer, palette);
  const envP = { envMap: env.texture };
  const mats = {
    shell: makeShellMaterial(THREE, U, 'head', headKit.glsl, C, {
      ...envP, envMapIntensity: 0.7, roughness: 0.45, metalness: 0, clearcoat: hi ? 0.35 : 0, clearcoatRoughness: 0.28,
    }),
    torso: makeShellMaterial(THREE, U, 'torso', torsoKit.glsl, C, {
      ...envP, envMapIntensity: 0.7, roughness: 0.45, metalness: 0, clearcoat: hi ? 0.3 : 0, clearcoatRoughness: 0.3,
      transparent: true,
    }),
    inner: makeInnerMaterial(THREE, U, 'head', { ...envP, envMapIntensity: 0.25, color: tok.graphite.clone().multiplyScalar(0.7), roughness: 0.72, metalness: 0 }),
    torsoInner: makeInnerMaterial(THREE, U, 'torso', {
      ...envP, envMapIntensity: 0.25, color: tok.graphite.clone().multiplyScalar(0.7), roughness: 0.72, metalness: 0, transparent: true,
    }),
    parts: makePartMaterial(THREE, U, { env: env.texture, envIntensity: 1 }),
    partsSkin: makePartMaterial(THREE, U, { skin: true, env: env.texture, envIntensity: 1, name: 'neck' }),
    glass: makeGlassMaterial(THREE, U, {
      ...envP, envMapIntensity: 0.85, color: tok.glass, roughness: 0.05, metalness: 0,
      clearcoat: hi ? 1 : 0, clearcoatRoughness: 0.03,
      iridescence: hi ? 0.3 : 0, iridescenceIOR: 1.45, iridescenceThicknessRange: [200, 480],
    }),
    board: makeBoardMaterial(THREE, U, tok, VISOR.led),
    holoHead: makeHoloMaterial(THREE, U, 'head', headKit.glsl, C),
    holoTorso: makeHoloMaterial(THREE, U, 'torso', torsoKit.glsl, C),
    holoSkin: makeHoloMaterial(THREE, U, 'skin'),
  };
  if (debugPanels) {
    // dev: Platten einfaerben (Kontrolle der Umrisse)
    const cols = [0xff5555, 0x55ff55, 0x5555ff, 0xffff55, 0xff55ff, 0x55ffff, 0xffaa33, 0x33aaff, 0xaaff33, 0xaa33ff, 0x33ffaa, 0xff3399, 0x99ff33, 0x3399ff, 0xdddddd];
    mats.shell.onBeforeCompile = ((orig) => (shader) => {
      orig(shader);
      shader.fragmentShader = shader.fragmentShader.replace('diffuseColor.rgb = rbCol * (1.0 - 0.72 * rbG);', `vec3 dbg[15] = vec3[15](${cols.map((c) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(3)}, ${k.g.toFixed(3)}, ${k.b.toFixed(3)})`; }).join(', ')});\ndiffuseColor.rgb = dbg[vRPanel] * (1.0 - 0.72 * rbG);`);
    })(mats.shell.onBeforeCompile);
  }

  /* ------------------------------------------------------------ Meshes */
  const mesh = (g, m, parent, order = 0) => {
    const o = new THREE.Mesh(g, m);
    o.renderOrder = order;
    parent.add(o);
    return o;
  };
  const inst = (g, m, n, parent) => {
    const o = new THREE.InstancedMesh(g, m, n);
    o.frustumCulled = false;
    o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(o);
    return o;
  };
  const shellMesh = mesh(geo.shell, mats.shell, head);
  const innerMesh = mesh(geo.inner, mats.inner, head);
  const headParts = mesh(geo.headParts, mats.parts, head);
  const boardMesh = mesh(geo.board, mats.board, head);
  const glassMesh = mesh(geo.glass, mats.glass, head, 5);
  const torsoInnerMesh = mesh(geo.torsoInner, mats.torsoInner, body, 1);
  const torsoMesh = mesh(geo.torso, mats.torso, body, 2);
  const bodyParts = mesh(geo.bodyParts, mats.partsSkin, body);
  bodyParts.frustumCulled = false;
  const L = neck.layout;
  const vertebrae = inst(geo.vertebra, mats.parts, L.length, body);
  const rings = inst(geo.ring, mats.parts, L.length - 1, body);
  const cylinders = inst(geo.cylinder, mats.parts, neck.pistons.length, body);
  const rods = inst(geo.rod, mats.parts, neck.pistons.length, body);
  const clevises = inst(geo.clevis, mats.parts, neck.pistons.length * 2, body);
  const screws = inst(geo.screw, mats.parts, screwList.length, body);

  // Beschriftungen
  const atlas = await buildDecalAtlas(THREE);
  const decalList = makeDecalList();
  const decals = buildDecalMesh(THREE, atlas, decalList, U, MASK, NOISE);
  body.add(decals.mesh);

  const holos = [
    mesh(geo.shell, mats.holoHead, head, 20),
    mesh(geo.torso, mats.holoTorso, body, 20),
    mesh(geo.holoNeck, mats.holoSkin, body, 20),
    mesh(geo.holoTendons, mats.holoSkin, body, 20),
  ];
  holos[2].frustumCulled = false;
  holos[3].frustumCulled = false;
  const shells = [shellMesh, innerMesh, glassMesh, torsoMesh, torsoInnerMesh, decals.mesh];
  caster.dispose();

  /* ----------------------------------------------------- Beschriftungen */
  function makeDecalList() {
    const out = [];
    const ink = tok.graphite.clone().multiplyScalar(0.45);
    const engr = tok.titanium.clone().multiplyScalar(0.25);
    const B = new Float32Array(headKit.NB);
    const s = { p: new THREE.Vector3(), n: new THREE.Vector3() };
    const d = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const onHead = (key, theta, phi, h, panelName, col = ink) => {
      headSample(THREE, shape, theta, phi, s);
      dirFromAngles(theta, phi, d);
      headKit.bases(s.p, d, B);
      const k = headKit.id[panelName];
      const t = new THREE.Vector3().crossVectors(up, s.n).normalize();
      out.push({ key, p: s.p.clone().addScaledVector(s.n, headKit.height(k, B)), n: s.n.clone(), t, h, col, head: true, panel: k });
    };
    const onEar = (key, fr, u, v, h) => {
      const p = fr.c.clone().addScaledVector(fr.t1, u).addScaledVector(fr.t2, v);
      const th = Math.atan2(p.x, p.z);
      const ph = Math.asin(p.y / p.length());
      // Feld ueber dem Ohr: Punkt auf der Huelle in dieser Richtung
      headSample(THREE, shape, th, ph, s);
      const t = new THREE.Vector3().crossVectors(up, s.n).normalize();
      out.push({ key, p: s.p.clone(), n: s.n.clone(), t, h, col: ink, head: true, panel: headKit.id[fr.c.x > 0 ? 'sideR' : 'sideL'] });
    };
    onHead('JG-01', -0.3, 0.6, 0.02, 'forehead');
    onHead('scale', 0.3, 0.6, 0.016, 'forehead');
    // Hinterkopf: Klappe und Warnhinweis (theta nahe pi)
    const back = (key, x, y, h, panelName) => {
      let th = Math.PI - x; let ph = y;
      for (let i = 0; i < 6; i++) {
        headSample(THREE, shape, th, ph, s);
        th += (s.p.x - x) / Math.max(0.3, Math.abs(s.p.z));
        ph -= (s.p.y - y) / 0.95;
      }
      onHead(key, th, ph, h, panelName);
    };
    const hy = headKit.HC.hatchY;
    back('SERVICE', 0, hy - 0.012, 0.016, 'hatch');
    back('NICHT ÖFFNEN', 0, hy - 0.098, 0.011, 'back');
    back('0.8 Nm', -0.19, hy + 0.04, 0.0105, 'back');
    back('warn', 0.19, hy + 0.04, 0.02, 'back');
    // Seitenfeld ueber dem Ohr: Data-Matrix und Kennung
    onEar('matrix', headKit.frames.earL, -0.085, 0.375, 0.05);
    onEar('LU 01', headKit.frames.earL, 0.04, 0.375, 0.017);
    onEar('matrix', headKit.frames.earR, -0.085, 0.375, 0.05);
    onEar('JG-01', headKit.frames.earR, 0.045, 0.375, 0.017);
    // Warnhinweis am Kieferscharnier
    onHead('warn', -(Math.PI / 2 + 0.32), -0.47, 0.022, 'jawL');
    onHead('warn', Math.PI / 2 + 0.32, -0.47, 0.022, 'jawR');
    // Rumpf (per Strahl auf die Huelle)
    const B2 = new Float32Array(torsoKit.NB);
    const onTorso = (key, o, dir, h, tdir, col = ink) => {
      const hit = caster.cast(o, dir);
      if (!hit) return;
      torsoKit.bases(hit.p, B2);
      let k = 0; let best = 9;
      for (let j = 0; j < torsoKit.NB; j++) { const r = torsoKit.region(B2, j); if (r < best) { best = r; k = j; } }
      out.push({ key, p: hit.p.addScaledVector(hit.n, torsoKit.height(k)), n: hit.n, t: tdir.clone(), h, col, head: false, panel: 100 + k });
    };
    const fwd = new THREE.Vector3(0, 0, -1);
    const bwd = new THREE.Vector3(0, 0, 1);
    const ex = new THREE.Vector3(1, 0, 0);
    onTorso('MK II', new THREE.Vector3(1.52, -2.28, 3), fwd, 0.036, ex);
    onTorso('LU 01', new THREE.Vector3(-1.52, -2.28, 3), fwd, 0.032, ex);
    onTorso('KI-EINHEIT', new THREE.Vector3(0, -2.155, 3), fwd, 0.02, ex);
    onTorso('warn', new THREE.Vector3(0.3, -1.98, 3), fwd, 0.03, ex);
    onTorso('JG-01', new THREE.Vector3(0.42, -2.05, -3), bwd, 0.034, ex.clone().negate());
    onTorso('matrix', new THREE.Vector3(-0.45, -2.05, -3), bwd, 0.075, ex.clone().negate());
    onTorso('scale', new THREE.Vector3(0, -2.62, 3), fwd, 0.022, ex, engr);
    return out;
  }

  /* --------------------------------------------------- Instanz-Matrizen */
  const _m = new THREE.Matrix4();
  const _m2 = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _q2 = new THREE.Quaternion();
  const _qI = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  const pivot = new THREE.Vector3().fromArray(NECK.pivot);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const headQ = new THREE.Quaternion();

  // Schrauben: Basis-Matrix je Schraube (Achse = Normale, zufaellige Drehung)
  const rnd = mulberry32(31);
  const screwBase = screwList.map((sc) => {
    const qq = new THREE.Quaternion().setFromUnitVectors(_up, sc.n.clone().normalize());
    const spin = new THREE.Quaternion().setFromAxisAngle(_up, rnd() * Math.PI);
    return { p: sc.p.clone(), q: qq.multiply(spin), s: sc.size || 1, head: sc.head, panel: sc.panel, axis: sc.n.clone().normalize() };
  });
  const torsoPanelOf = (panel) => (panel >= 100 ? panel - 100 : -1);

  function panelOffset(panel, head, out) {
    out.set(0, 0, 0);
    if (panel < 0) return out;
    if (panel >= 100) {
      const k = torsoPanelOf(panel);
      return out.copy(U.uTorsoN.value[k]).multiplyScalar(U.uTorsoOff.value[k]);
    }
    return out.copy(U.uPanelN.value[panel]).multiplyScalar(U.uPanelOff.value[panel]);
  }

  /* ------------------------------------------------------------- Zustand */
  const sacc = Array.from({ length: 16 }, () => [(rnd() - 0.5) * 3.0, (rnd() - 0.5) * 1.0]);
  const NBH = headKit.NB;
  const NBT = torsoKit.NB;
  const snapH = new Float32Array(NBH).fill(-1);
  const snapT = new Float32Array(NBT).fill(-1);
  const unlockOrder = headKit.names.map((n) => (n === 'crest' ? 0 : n === 'forehead' ? 1 : n.startsWith('side') ? 2 : n === 'back' || n === 'hatch' ? 3 : 4));
  const st = {
    yaw: 0, pitch: 0, ex: 0, ey: 0,
    visorOn: false, boot: 10, power: 0,
    blinkT: -9, blinkNext: 3, smileT: -9, smileDone: false, listen: 0, fresh: true, wall: 0,
  };
  const scan = {};
  const look = {
    exposure: 1.06, bloom: 0.85, bloomRadius: 0.55, bloomThreshold: 0.8, key: 1.6, rim: 3.0, amb: 0.15,
    parallax: 0.26, drift: 0.025, aberration: 0.005, flash: 0, vignette: 0.72,
  };
  const tintCol = new THREE.Color();

  const bootOut = [0, 0, 0, 0];
  function bootLevels(t, o) {
    // Testbild (60 ms), Schachbrett (2 Wechsel), kurz dunkel, dann Augen weich hoch
    o[0] = t < 0.06 ? 0.22 : 0;
    o[1] = t >= 0.06 && t < 0.22 ? 0.5 : 0;
    o[2] = t >= 0.14 ? 1 : 0;
    o[3] = smoothstep(0.3, 0.9, t);
    return o;
  }
  const slitPulse = (cph, i) => Math.exp(-Math.pow((cph - 0.1 - i * 0.12) / 0.05, 2));
  const bw = { r: 0, z: 0, b: 0, o: 0, s: 1 };
  const mix4 = (a, b, c, d) => (a * bw.r + b * bw.z + c * bw.b + d * bw.o) / bw.s;

  const api = {
    group,
    look,
    update(time, dt, local, global, weight = 1) {
      const rb = director.beat('robot');
      const zm = director.beat('zoom');
      const br = director.beat('brain');
      const out = director.beat('outro');
      const inOutro = global >= out.start - 0.04;

      let build = 1;
      let holoAmt = 0;
      let leak = 0;
      let follow = 1;
      let boost = 1;
      let visorWanted = false;
      let zoomIn = 0;
      let think = 0;
      if (inOutro) {
        visorWanted = true;
        if (!st.visorOn) { st.visorOn = true; st.boot = 0.6; }
      } else {
        build = smoothstep(0.26, 0.64, rb.p);
        holoAmt = smoothstep(0.08, 0.26, rb.p) * (1 - smoothstep(0.6, 0.68, rb.p));
        visorWanted = rb.p > 0.64;
        zoomIn = zm.p;
        leak = smoothstep(0.1, 0.32, zm.p) * (1 - smoothstep(0.7, 0.85, zm.p));
        holoAmt = Math.max(holoAmt, 0.6 * smoothstep(0.3, 0.42, zm.p) * (1 - 0.55 * smoothstep(0.6, 0.95, zm.p))
          * (1 - smoothstep(0.32, 0.5, br.p)));
        follow = 1 - smoothstep(0.0, 0.32, zm.p);
        boost = 1 + 0.6 * smoothstep(0.0, 0.5, zm.p);
        think = smoothstep(0.0, 0.07, zm.p) * (1 - smoothstep(0.26, 0.34, zm.p));
      }
      // Scan-Zustand: vom Director (engine.shared), sonst selbst gerechnet (gleiche Funktion)
      if (shared.uScanY && shared.uDissolve) {
        scan.scanY = shared.uScanY.value;
        scan.dissolve = shared.uDissolve.value;
        scan.xray = shared.uXray ? shared.uXray.value : robotScan(zm.p, inOutro, {}).xray;
      } else robotScan(zm.p, inOutro, scan);

      /* Visier: Einschalten mit Startsequenz, Ausschalten weich */
      if (visorWanted && !st.visorOn) { st.visorOn = true; st.boot = 0; }
      if (!visorWanted) st.visorOn = false;
      // Startsequenz in Echtzeit (Wanduhr): laeuft auch bei kurzer Bildrate in 0.9 s durch
      const now = performance.now();
      const wallDt = st.wall ? Math.min(0.25, Math.max(0, (now - st.wall) / 1000)) : dt;
      st.wall = now;
      st.boot += Math.max(dt, wallDt);
      st.power = st.visorOn ? 1 : st.power + (0 - st.power) * (1 - Math.exp(-dt * 8));

      /* Kopf: folgt der Maus, leichtes Eigenleben, Atmen (fertige Drehung mal follow: ab zoom 0.32 exakt 0) */
      const k = 1 - Math.exp(-dt * 2.4);
      const idleYaw = Math.sin(time * 0.21) * 0.05 + Math.sin(time * 0.071) * 0.03;
      const idlePitch = Math.sin(time * 0.17 + 1.0) * 0.022;
      st.yaw += ((pointer.sx * 0.3 + idleYaw) * follow - st.yaw) * k;
      st.pitch += ((-pointer.sy * 0.12 + idlePitch) * follow - st.pitch) * k;
      const roll = (Math.sin(time * 0.13) * 0.012 - st.yaw * 0.05) * follow;
      const breath = Math.sin((time * Math.PI * 2) / 4.8);
      body.position.y = breath * 0.009 * follow;
      euler.set(st.pitch * follow, st.yaw * follow, roll);
      headMat.makeRotationFromEuler(euler);
      headQ.setFromEuler(euler);
      _v.copy(pivot).applyMatrix4(headMat);
      headMat.setPosition(pivot.x - _v.x, pivot.y - _v.y + Math.sin(time * 1.1 - 0.7) * 0.005 * follow, pivot.z - _v.z);
      head.matrix.copy(headMat);
      head.matrixWorldNeedsUpdate = true;

      /* Aufbau, Roentgen, Fugenlicht */
      const buildY = build >= 0.999 ? 2 : -3.75 + (1.18 + 3.75) * build;
      U.uBuildY.value = buildY;
      U.uDissolve.value = scan.dissolve;
      U.uScanY.value = scan.scanY;
      U.uXray.value = scan.xray;
      U.uHoloFloor.value = -2.5 + 1.6 * scan.xray;
      U.uLeak.value = leak * weight;
      U.uHolo.value = holoAmt * weight;

      /* Platten: Montage (einschnappen), Entriegeln, Explosionszeichnung, Atmen der Schulterkappen */
      if (st.fresh) {
        st.fresh = false;
        if (build >= 0.999 || inOutro) { snapH.fill(1); snapT.fill(1); }
      }
      const explode = inOutro ? 0 : 0.025 * smoothstep(0.34, 0.8, zm.p);
      for (let i = 0; i < NBH; i++) {
        const S0 = shell.stats[i];
        if (buildY > S0.minY + 0.03) { if (snapH[i] < 0) snapH[i] = 0; snapH[i] += dt; } else if (!inOutro) snapH[i] = -1;
        const snap = snapH[i] < 0 ? 0 : easeOut(clamp01(snapH[i] / 0.25));
        const o = unlockOrder[i];
        const unlock = inOutro ? 0 : 0.015 * smoothstep(0.12 + 0.04 * o, 0.2 + 0.04 * o, zm.p);
        U.uPanelOff.value[i] = 0.06 * (1 - snap) + unlock + explode;
      }
      for (let i = 0; i < NBT; i++) {
        const S0 = torso.stats[i];
        if (buildY > S0.minY + 0.03) { if (snapT[i] < 0) snapT[i] = 0; snapT[i] += dt; } else if (!inOutro) snapT[i] = -1;
        const snap = snapT[i] < 0 ? 0 : easeOut(clamp01(snapT[i] / 0.25));
        const nm = torsoKit.names[i];
        const cap = nm === 'capL' || nm === 'capR' ? 0.004 * breath * follow : 0;
        U.uTorsoOff.value[i] = 0.06 * (1 - snap) + cap;
      }

      /* Augen (LED-Matrix): Blick in ganzen Punkten mit weichem Ueberblenden, Sakkaden, Blinzeln, Denken, Laecheln */
      const si = Math.floor(time / 2.7) % sacc.length;
      const ke = 1 - Math.exp(-dt * 12);
      const tx = Math.max(-4, Math.min(4, (pointer.sx * 4.2 + sacc[si][0]) * follow));
      const ty = Math.max(-1, Math.min(1, (pointer.sy * 1.2 + sacc[si][1]) * follow + 0.5 * think));
      st.ex += (tx - st.ex) * ke;
      st.ey += (ty - st.ey) * ke;
      if (time >= st.blinkNext) { st.blinkT = time; st.blinkNext = time + 4 + 3 * rnd(); }
      const bp = (time - st.blinkT) / 0.12;
      const blink = bp >= 0 && bp <= 1 ? Math.sin(bp * Math.PI) : 0;
      let eyeH = 1 - blink;
      eyeH = eyeH * (1 - 0.5 * think);
      if (inOutro && out.p > 0.35 && !st.smileDone) { st.smileDone = true; st.smileT = time; }
      if (!inOutro || out.p < 0.2) st.smileDone = false;
      const sp = (time - st.smileT) / 1.5;
      const smile = sp >= 0 && sp <= 1 ? Math.sin(sp * Math.PI) : 0;
      if (st.visorOn) bootLevels(st.boot, bootOut); else bootOut.fill(0);
      const allOn = bootOut[0]; const chk = bootOut[1]; const phase = bootOut[2]; const eyesUp = bootOut[3];
      const scanPh = (time % 6.5) / 1.2;
      const scanCol = scanPh < 1 && think < 0.01 ? -36 + 72 * scanPh : -99;
      const pw = st.power * weight;
      U.uLedA.value.set(pw, eyesUp * boost, st.ex, st.ey);
      U.uLedB.value.set(eyeH, smile, think, scanCol);
      U.uLedC.value.set(allOn, chk, phase, think * eyesUp);
      U.uVisorPow.value = pw;

      /* Ohren, Scheitel, Brustkern, Kragen */
      const v = Math.abs(pointer.vx) + Math.abs(pointer.vy);
      st.listen = Math.max(st.listen - dt * 1.4, v > 1.5 ? 1 : 0);
      U.uEar.value = (0.55 * st.power + 1.6 * leak) * weight;
      U.uIris.value = (0.5 + 0.8 * st.power) * (1 + st.listen) * weight * (st.visorOn || inOutro ? 1 : 0.4);
      const cph = (time % 2.4) / 2.4;
      U.uCrest.value.set(slitPulse(cph, 0), slitPulse(cph, 1), slitPulse(cph, 2)).multiplyScalar(st.power * weight);
      const blinkCore = (time % 3) < 0.15 ? 1 : 0.15;
      U.uCore.value.set(0.9, blinkCore, 0.55 + 0.35 * breath).multiplyScalar(Math.max(0.15, st.power) * weight);
      U.uLip.value = U.uEar.value * (1 + 0.1 * breath);
      U.uPulse.value.set(0.28 + 0.5 * zoomIn + 0.3 * scan.xray, (0.6 + 2.2 * leak) * Math.max(0.25, st.power) * weight);

      /* Spiegelungen in der Lichtfarbe des Kantenlichts (30 %) */
      tintCol.copy(ctx.lights.rim.color);
      const mx = Math.max(tintCol.r, tintCol.g, tintCol.b, 1e-3);
      tintCol.multiplyScalar(1 / mx);
      U.uEnvTint.value.setRGB(0.7 + 0.3 * tintCol.r, 0.7 + 0.3 * tintCol.g, 0.7 + 0.3 * tintCol.b);

      /* Hals: Wirbel drehen anteilig mit, Kolben folgen den Gelenken */
      for (let i = 0; i < L.length; i++) {
        const y = L[i].y;
        const w = smoothstep(-1.32, -0.82, y);
        _q.slerpQuaternions(_qI, headQ, w);
        _v.set(0, y, L[i].z).sub(pivot).applyQuaternion(_q).add(pivot);
        _m.compose(_v, _q, _s.set(1, 1, 1));
        vertebrae.setMatrixAt(i, _m);
        if (i < L.length - 1) {
          const y2 = (L[i].y + L[i + 1].y) / 2;
          const z2 = (L[i].z + L[i + 1].z) / 2;
          _q.slerpQuaternions(_qI, headQ, smoothstep(-1.32, -0.82, y2));
          _v.set(0, y2, z2).sub(pivot).applyQuaternion(_q).add(pivot);
          _m.compose(_v, _q, _s);
          rings.setMatrixAt(i, _m);
        }
      }
      vertebrae.instanceMatrix.needsUpdate = true;
      rings.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < neck.pistons.length; i++) {
        const P = neck.pistons[i];
        _v.copy(P.top0).applyMatrix4(headMat);
        _v2.copy(_v).sub(P.bot).normalize();
        _q.setFromUnitVectors(_up, _v2);
        _m.compose(P.bot, _q, _s.set(1, 1, 1));
        cylinders.setMatrixAt(i, _m);
        clevises.setMatrixAt(i * 2, _m);
        _m.compose(_v, _q, _s);
        rods.setMatrixAt(i, _m);
        clevises.setMatrixAt(i * 2 + 1, _m);
      }
      cylinders.instanceMatrix.needsUpdate = true;
      rods.instanceMatrix.needsUpdate = true;
      clevises.instanceMatrix.needsUpdate = true;

      /* Schrauben: mit Platte und Kopf, erscheinen nach dem Einschnappen, drehen beim Entriegeln */
      const unlockRot = inOutro ? 0 : (Math.PI / 2) * smoothstep(0.12, 0.26, zm.p);
      for (let i = 0; i < screwBase.length; i++) {
        const b = screwBase[i];
        let appear = 1;
        if (b.panel >= 0 && b.panel < 100) appear = snapH[b.panel] < 0 ? 0 : smoothstep(0.3, 0.42, snapH[b.panel]);
        else if (b.panel >= 100) { const kk = torsoPanelOf(b.panel); appear = snapT[kk] < 0 ? 0 : smoothstep(0.3, 0.42, snapT[kk]); }
        else appear = b.p.y < buildY - 0.02 ? 1 : 0;
        panelOffset(b.panel, b.head, _v);
        _v.add(b.p);
        _q2.setFromAxisAngle(b.axis, b.head ? unlockRot : 0);
        _q.copy(_q2).multiply(b.q);
        const sc = Math.max(1e-4, appear) * b.s;
        _m.compose(_v, _q, _s.set(sc, sc, sc));
        if (b.head) _m.premultiply(headMat);
        screws.setMatrixAt(i, _m);
      }
      screws.instanceMatrix.needsUpdate = true;

      /* Beschriftungen: mit Platte und Kopf */
      for (let i = 0; i < decalList.length; i++) {
        const dc = decalList[i];
        panelOffset(dc.panel, dc.head, _v);
        _m.makeTranslation(_v.x, _v.y, _v.z).multiply(decals.base[i]);
        if (dc.head) _m.premultiply(headMat);
        decals.mesh.setMatrixAt(i, _m);
      }
      decals.mesh.instanceMatrix.needsUpdate = true;

      /* Sichtbarkeit (spart Draw Calls) */
      const shellOn = buildY > -3.7 && scan.dissolve < 0.999;
      for (const m of shells) m.visible = shellOn;
      const holoOn = holoAmt > 0.002;
      for (const m of holos) m.visible = holoOn;
      const anyOn = buildY > -3.7;
      headParts.visible = anyOn;
      bodyParts.visible = anyOn;
      boardMesh.visible = anyOn;
      screws.visible = anyOn && scan.dissolve < 0.999;

      /* Bildwirkung je Beat (Licht: Konzept Kapitel 1.5) */
      bw.r = rb.w; bw.z = zm.w; bw.b = br.w; bw.o = out.w;
      bw.s = Math.max(1e-3, bw.r + bw.z + bw.b + bw.o);
      look.key = mix4(1.9, 1.6, 1.1, 2.1);
      look.rim = mix4(3.0, 3.2, 2.4, 2.4);
      look.amb = mix4(0.15, 0.12, 0.1, 0.15);
      look.exposure = mix4(1.1, 1.06, 1.0, 1.1);
      // Im Zoom erst ruhig (Details lesbar), mehr Glanz erst, wenn das Roentgenbild fuehrt
      const xr = smoothstep(0.45, 0.75, zoomIn);
      look.bloom = (mix4(0.8, 0.8, 1.0, 0.9) + 0.25 * xr) * (ctx.isMobile ? 0.86 : 1);
      look.bloomThreshold = mix4(0.8, 0.84, 0.72, 0.78) - 0.08 * xr;
      look.bloomRadius = mix4(0.55, 0.6, 0.62, 0.68);
      look.vignette = mix4(0.72, 0.8, 0.85, 0.72);
      look.parallax = (inOutro ? 0.28 : 0.26) * follow + 0.02;
      look.drift = 0.025 * (1 - smoothstep(0.4, 0.9, zoomIn)) + 0.004;
      look.aberration = 0.005 + 0.003 * smoothstep(0.6, 0.95, zoomIn);
      look.flash = inOutro ? 0 : 0.06 * Math.exp(-Math.pow((br.p - 0.46) / 0.05, 2));
      const envF = mix4(1.0, 0.85, 0.7, 1.0);
      mats.shell.envMapIntensity = 0.85 * envF;
      mats.torso.envMapIntensity = 0.85 * envF;
      mats.parts.envMapIntensity = envF;
      mats.partsSkin.envMapIntensity = envF;
    },
    setActive(active) {
      if (!active) { st.visorOn = false; st.power = 0; }
      else st.fresh = true;
    },
    dispose() {
      Object.values(geo).forEach((g) => g && g.dispose && g.dispose());
      torso.hull.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      decals.geo.dispose();
      decals.mat.dispose();
      atlas.texture.dispose();
      env.dispose();
      [vertebrae, rings, cylinders, rods, clevises, screws, decals.mesh].forEach((m) => m.dispose && m.dispose());
      group.clear();
    },
  };
  return api;
}
