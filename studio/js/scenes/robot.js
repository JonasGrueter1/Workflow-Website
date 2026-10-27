// Szene "robot": eleganter Roboterkopf mit Hals und Schulteransatz, prozedural modelliert.
// Fenster: robot@0 bis zoom@1 (Hauptfenster) und outro@0 bis outro@1 (Ausklang).
//
// Ablauf (Zeitpunkte als Fortschritt p im jeweiligen Beat, ueber ctx.director.beat())
//   robot  0.08-0.26  Hologramm (Hoehenlinien, Fresnel) erscheint, waehrend die Partikel sich sammeln
//          0.26-0.64  Aufbau in digitalen Zellen von unten nach oben, frische Zellen leuchten kurz auf
//          0.64       Visier startet (kurzes Flackern), danach Leerlauf: Atmen, Blick folgt der Maus
//   zoom   0.00-0.40  Kopf haelt still, Licht tritt aus den Fugen, Datenimpulse im Hals werden schneller
//          0.30-0.84  Roentgenblick als Scan: eine helle Linie laeuft von oben nach unten, darueber Roentgen
//                     (Hologramm), darunter noch Schale. Kopf bis ~0.64, danach Hals und Rumpf
//          0.40-1.00  Kamera kreist frueh nach links oben (Seitenansicht, Gehirn nie frontal als zwei Halbkugeln)
//   brain  0.00-0.50  Hologramm-Schale bleibt leise um das Gehirn, blendet beim Eintauchen aus (Fenster bis brain@0.6)
//   outro            Roboter ganz und ruhig, Augen leuchten schon im Lichtblitz des Schnitts
//
// Qualitaetsstufen: Segmentzahlen ueber SEG (high 1, medium 0.68, low 0.48).
// Dateien: robot-geometry.js (Formen), robot-shaders.js (Materialien), robot-env.js (Studio-Spiegelungen).
import {
  makeHeadShape, buildHead, buildVisor, buildEars, buildNeckMetal, buildTendons, buildTorso,
  smoothstep, mulberry32,
} from './robot-geometry.js';
import { makeShellMaterial, makeHoloMaterial } from './robot-shaders.js';
import { buildStudioEnv } from './robot-env.js';

const SEG = { high: 1, medium: 0.68, low: 0.48 };

export function create(ctx) {
  const { THREE, palette, anchors: A, director, pointer, shared, quality } = ctx;
  const q = SEG[quality] ?? 1;
  const S = (n, min) => Math.max(min, Math.round(n * q));

  const group = new THREE.Group();
  group.name = 'scene:robot';
  const body = new THREE.Group();
  group.add(body);
  const head = new THREE.Group();
  head.matrixAutoUpdate = false;
  body.add(head);

  /* ---------------------------------------------------------- Geometrie */
  const shape = makeHeadShape(A.head.radii);
  const bandPhi = Math.asin(A.visor.center.y / A.head.radii.y);
  // Gesichtsschild aus dunklem Glas, das Lichtband liegt auf Hoehe von ANCHORS.visor
  const shield = { halfW: 0.74, halfH: 0.56, centerPhi: -0.14, corner: 0.3, taper: 0.4, rh: 0.84, bandPhi };
  const geo = {
    head: buildHead(THREE, shape, S(184, 72), S(136, 56)),
    visor: buildVisor(THREE, shape, { ...shield, off: 0.017, bevel: 0.035, perim: S(300, 140), rings: S(16, 9) }),
    bezel: buildVisor(THREE, shape, {
      ...shield, halfW: shield.halfW + 0.035, halfH: shield.halfH + 0.035, corner: shield.corner + 0.035,
      taper: 0.37, off: 0.008, bevel: 0.018, perim: S(300, 140), rings: S(8, 5),
    }),
    ears: buildEars(THREE, shape, S(72, 36)),
    neck: buildNeckMetal(THREE, A, S(56, 28)),
    tendons: buildTendons(THREE, A, S(56, 28), S(12, 7)),
    torso: buildTorso(THREE, A, S(144, 64), S(84, 40)),
  };
  const env = buildStudioEnv(THREE, ctx.renderer, palette);

  /* ---------------------------------------------------------- Uniforms */
  const headMat = new THREE.Matrix4();
  const U = {
    uTime: shared.uTime,
    uBuildY: { value: 2 },
    uDissolve: { value: 0 },
    uScanY: { value: 9 },
    uHoloFloor: { value: -2.5 },
    uXray: { value: 0 },
    uFocus: { value: new THREE.Vector3(0, 0.22, 1.0) },
    uLeak: { value: 0 },
    uHeadMat: { value: headMat },
    uSig: { value: palette.signal.clone() },
    uIce: { value: palette.ice.clone() },
    uEar: { value: 0 },
    uPulse: { value: new THREE.Vector2(0.32, 1) },
    uVisor: { value: new THREE.Vector4(1, 1, -2, 0) },
    uEye: { value: new THREE.Vector4(0, 0, 1, 0) },
    uEdgeCol: { value: palette.signal.clone().multiplyScalar(4.5) },
    uLeakCol: { value: palette.signal.clone().multiplyScalar(2.6) },
    uRimCol: { value: palette.signal.clone().multiplyScalar(0.6) },
    uHolo: { value: 0 },
    uHoloCol: { value: palette.signal.clone().multiplyScalar(0.7) },
    uHoloHi: { value: palette.ice.clone().multiplyScalar(2.4) },
  };

  /* --------------------------------------------------------- Materialien */
  // Keramik: dunkles Graphit, seidenmatt mit Klarlack. Metall: Stahl, gebuerstet wirkend.
  const ceramic = palette.steel.clone().lerp(palette.ink, 0.35);
  const metal = palette.steel.clone().lerp(palette.mist, 0.3);
  const envP = { envMap: env.texture, envMapIntensity: 1 };
  // Handy (medium) und schwache Geraete (low): Klarlack nur am Kopf, keine Duennschicht (Iridescence) im Visier.
  // Der Roboter fuellt im Zoom fast das ganze Bild, jeder Effekt kostet dort pro Pixel.
  const low = quality !== 'high';
  const mats = {
    head: makeShellMaterial(THREE, U, 'head', {
      ...envP, color: ceramic, metalness: 0.05, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12,
    }, { rim: 1 }),
    // transparent: die Unterkante blendet ueber die Deckkraft in den Hintergrund aus (robot-shaders.js)
    torso: makeShellMaterial(THREE, U, 'torso', {
      ...envP, color: ceramic, metalness: 0.05, roughness: 0.42, clearcoat: low ? 0 : 1, clearcoatRoughness: 0.14,
      transparent: true,
    }, { rim: 1 }),
    ear: makeShellMaterial(THREE, U, 'ear', { ...envP, color: metal, metalness: 1, roughness: 0.32 }),
    neck: makeShellMaterial(THREE, U, 'neck', { ...envP, color: metal, metalness: 1, roughness: 0.34 }),
    tendon: makeShellMaterial(THREE, U, 'tendon', {
      ...envP, color: palette.deep.clone().lerp(palette.steel, 0.3), metalness: 0.1, roughness: 0.5,
      clearcoat: low ? 0 : 0.7, clearcoatRoughness: 0.22,
    }, { rim: 0.6 }),
    bezel: makeShellMaterial(THREE, U, 'bezel', { ...envP, color: metal, metalness: 1, roughness: 0.26 }, { bias: 0.08 }),
    visor: makeShellMaterial(THREE, U, 'visor', {
      ...envP, color: palette.void.clone(), metalness: 0.0, roughness: 0.05, clearcoat: low ? 0 : 1, clearcoatRoughness: 0.02,
      iridescence: low ? 0 : 0.45, iridescenceIOR: 1.45, iridescenceThicknessRange: [200, 480],
    }, { bias: 0.12 }),
  };
  const holo = makeHoloMaterial(THREE, U);
  const holoSkin = makeHoloMaterial(THREE, U, { skin: true });

  /* ------------------------------------------------------------- Meshes */
  const mesh = (g, m, parent, order = 0) => {
    const o = new THREE.Mesh(g, m);
    o.renderOrder = order;
    parent.add(o);
    return o;
  };
  const shells = [
    mesh(geo.head, mats.head, head),
    mesh(geo.bezel, mats.bezel, head),
    mesh(geo.visor, mats.visor, head),
    mesh(geo.ears, mats.ear, head),
    mesh(geo.neck, mats.neck, body),
    mesh(geo.tendons, mats.tendon, body),
    mesh(geo.torso, mats.torso, body),
  ];
  // Halsteile werden im Shader mit dem Kopf mitbewegt: Begrenzung grosszuegig, nie wegschneiden
  shells[4].frustumCulled = false;
  shells[5].frustumCulled = false;
  const holos = [
    mesh(geo.head, holo, head, 20),
    mesh(geo.torso, holo, body, 20),
    mesh(geo.neck, holoSkin, body, 20),
    mesh(geo.tendons, holoSkin, body, 20),
  ];
  holos[2].frustumCulled = false;
  holos[3].frustumCulled = false;

  /* -------------------------------------------------------------- Zustand */
  const pivot = new THREE.Vector3(0, -0.62, -0.08);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const tmpV = new THREE.Vector3();
  const rnd = mulberry32(31);
  const sacc = Array.from({ length: 16 }, () => [(rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.014]);
  const st = {
    yaw: 0, pitch: 0, ex: 0, ey: 0,
    visorOn: false, boot: 10, power: 0,
  };
  // key: warmes Fuehrungslicht von links vorne (engine.js), macht Form und Material lesbar und die Figur freundlicher
  const look = {
    bloom: 0.95, bloomRadius: 0.6, key: 1.85, rim: 2.8, amb: 0.1, exposure: 1.05,
    parallax: 0.26, drift: 0.025, aberration: 0.006, flash: 0, vignette: 0.8,
  };

  // Startsequenz des Visiers (Sekunden seit Einschalten): kurzes Flackern, dann weich hoch
  function bootCurve(t) {
    if (t < 0.06) return 0.55;
    if (t < 0.12) return 0.04;
    if (t < 0.2) return 0.8;
    if (t < 0.27) return 0.15;
    return 0.35 + 0.65 * smoothstep(0.27, 0.9, t);
  }

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
      let dissolve = 0;
      let leak = 0;
      let follow = 1;
      let boost = 1;
      let visorWanted = false;
      let zoomIn = 0;
      if (inOutro) {
        // Augen leuchten schon im Lichtblitz des Schnitts (ein schwarzer Helm ohne Augen wirkt kurz bedrohlich)
        visorWanted = true;
        if (!st.visorOn) { st.visorOn = true; st.boot = 0.3; }
      } else {
        build = smoothstep(0.26, 0.64, rb.p);
        holoAmt = smoothstep(0.08, 0.26, rb.p) * (1 - smoothstep(0.6, 0.68, rb.p));
        visorWanted = rb.p > 0.64;
        zoomIn = zm.p;
        leak = smoothstep(0.04, 0.42, zm.p) * (1 - smoothstep(0.7, 0.85, zm.p));
        dissolve = smoothstep(0.3, 0.84, zm.p);
        // Roentgen-Schale: bleibt (leiser) um das Gehirn, bis die Kamera bei brain@~0.45 eintaucht
        holoAmt = Math.max(holoAmt, 0.6 * smoothstep(0.3, 0.42, zm.p) * (1 - 0.55 * smoothstep(0.6, 0.95, zm.p))
          * (1 - smoothstep(0.32, 0.5, br.p)));
        follow = 1 - smoothstep(0.0, 0.32, zm.p);
        boost = 1 + 0.6 * smoothstep(0.0, 0.5, zm.p);
      }

      /* Visier: Einschalten mit Startsequenz, Ausschalten weich */
      if (visorWanted && !st.visorOn) { st.visorOn = true; st.boot = 0; }
      if (!visorWanted) st.visorOn = false;
      st.boot += dt;
      const pTarget = st.visorOn ? bootCurve(st.boot) : 0;
      st.power = st.visorOn ? pTarget : st.power + (0 - st.power) * (1 - Math.exp(-dt * 8));

      /* Kopf: folgt der Maus, leichtes Eigenleben, Atmen */
      const k = 1 - Math.exp(-dt * 2.4);
      const idleYaw = Math.sin(time * 0.21) * 0.05 + Math.sin(time * 0.071) * 0.03;
      const idlePitch = Math.sin(time * 0.17 + 1.0) * 0.022;
      st.yaw += ((pointer.sx * 0.3 + idleYaw) * follow - st.yaw) * k;
      st.pitch += ((-pointer.sy * 0.12 + idlePitch) * follow - st.pitch) * k;
      const roll = (Math.sin(time * 0.13) * 0.012 - st.yaw * 0.05) * follow;
      const breath = Math.sin(time * 1.1);
      body.position.y = breath * 0.009 * follow;
      euler.set(st.pitch, st.yaw, roll);
      headMat.makeRotationFromEuler(euler);
      tmpV.copy(pivot).applyMatrix4(headMat);
      headMat.setPosition(pivot.x - tmpV.x, pivot.y - tmpV.y + Math.sin(time * 1.1 - 0.7) * 0.005 * follow, pivot.z - tmpV.z);
      head.matrix.copy(headMat);
      head.matrixWorldNeedsUpdate = true;

      /* Augen: Blick zur Maus, kleine Sakkaden, Blinzeln */
      const si = Math.floor(time / 2.7) % sacc.length;
      const ke = 1 - Math.exp(-dt * 14);
      st.ex += (pointer.sx * 0.05 * follow + sacc[si][0] * follow - st.ex) * ke;
      st.ey += (pointer.sy * 0.014 * follow + sacc[si][1] * follow - st.ey) * ke;
      const bp = time % 5.3;
      const open = bp < 0.18 ? 1 - Math.sin((bp / 0.18) * Math.PI) * 0.9 : 1;
      U.uEye.value.set(st.ex, st.ey, open, 0);

      /* Scan-Licht: alle 4.6 s ein ruhiger Durchlauf */
      const sp = (time % 4.6) / 1.5;
      const scanOn = sp < 1 ? Math.sin(sp * Math.PI) : 0;
      const ease = sp < 1 ? sp * sp * (3 - 2 * sp) : 1;
      U.uVisor.value.set(st.power * weight, boost, -0.85 + 1.7 * ease, scanOn * (0.8 + 0.6 * zoomIn));

      /* Aufbau, Roentgen (Scanlinie von oben nach unten), Fugenlicht */
      const buildY = build >= 0.999 ? 2 : -3.75 + (1.18 + 3.75) * build;
      U.uBuildY.value = buildY;
      U.uDissolve.value = dissolve;
      // Kopf (Scheitel 1.15 bis Kinn -1.2) im ersten Teil, danach Hals und Rumpf zuegig
      U.uScanY.value = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
      const xray = inOutro ? 0 : smoothstep(0.42, 0.62, zm.p);
      U.uXray.value = xray;
      // Im Roentgen nur Kopf und Hals: das Hologramm der Schultern blendet nach unten aus
      U.uHoloFloor.value = -2.5 + 1.6 * xray;
      U.uLeak.value = leak * weight;
      U.uHolo.value = holoAmt * weight;
      U.uEar.value = (0.55 * st.power + 1.6 * leak) * weight;
      U.uPulse.value.set(0.28 + 0.5 * zoomIn, (0.6 + 2.2 * leak) * Math.max(0.25, st.power) * weight);

      const shellOn = buildY > -3.7 && dissolve < 0.999;
      for (const m of shells) m.visible = shellOn;
      const holoOn = holoAmt > 0.002;
      for (const m of holos) m.visible = holoOn;

      /* Bildwirkung */
      look.bloom = (0.95 + 0.35 * smoothstep(0.1, 0.7, zoomIn)) * (ctx.isMobile ? 0.86 : 1);
      look.key = inOutro ? 1.95 : 1.85;
      look.parallax = (inOutro ? 0.28 : 0.26) * follow + 0.02;
      look.drift = 0.025 * (1 - smoothstep(0.4, 0.9, zoomIn)) + 0.004;
      look.aberration = 0.006 + 0.003 * smoothstep(0.6, 0.95, zoomIn); // wenig Farbsaum an der Roentgen-Schale
      look.flash = inOutro ? 0 : 0.06 * Math.exp(-Math.pow((br.p - 0.46) / 0.05, 2));

    },
    setActive(active) {
      if (!active) { st.visorOn = false; st.power = 0; }
    },
    dispose() {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      holo.dispose();
      holoSkin.dispose();
      env.dispose();
      group.clear();
    },
  };
  return api;
}
