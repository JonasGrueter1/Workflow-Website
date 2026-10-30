// Szene "robot", Variante B: Android-Bueste mit menschlicher Anatomie (Referenz 2 von Jonas).
// Gleiche Schnittstelle wie robot.js (create(ctx) -> { group, look, update, setActive, dispose }), kann robot.js ersetzen.
//
// Grundlage: MakeHuman-Grundmodell (CC0), offline aufbereitet (assets/android-b/bust.bin), zur Laufzeit mit
// Catmull-Clark geglaettet (high 2 Stufen, sonst 1).
// Aufbau:
//   Schale    weisse Klarlack-Platten mit sauberen Fugen entlang der Anatomie (layout.js), Fase und Schattenlinie
//   Muskeln   tuerkis-transparent wirkendes Gel mit Faserbuendeln unter den Oeffnungen (Bauch, Achsel, Schulterring)
//   Hals      offene Seitenfenster: Kopfwender-Muskeln (Gel), Wirbelsaeule, Kolben, Kabelbuendel, Luftroehre (mech.js)
//   Gelenke   Chrom-Ringe am Hals und an den Schultern
//   Augen     dunkles Glas, feiner Cyan-Ring
// Ablauf (ctx.director.beat), wie robot.js:
//   robot   Bueste steht, atmet, Kopf folgt dezent der Maus, Lichtimpulse in den Muskeln und Kabeln
//   zoom    0.30-0.84 Roentgen-Scan von oben nach unten (uScanY): darueber Hologramm, das Gehirn (brain.js) wird sichtbar
//   brain   Hologramm leise um das Gehirn, bis die Kamera eintaucht
//   outro   Bueste wieder ganz, Augen leuchten im Lichtblitz auf
import { loadBust, catmullClark, computeNormals, toGeometry, subMesh } from './mesh.js';
import { makeShellMaterial, makeMuscleMaterial, makeHoloMaterial, makeCoreMaterial, makeGlassMaterial } from './materials.js';
import { buildStudioEnv, buildBackdrop } from './env.js';
import { buildMechanics } from './mech.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Roentgen-Scan aus dem Fortschritt von zoom (gleiche Formel wie robot.js robotScan, damit brain.js passt) */
export function robotScan(zoomP, inOutro = false, out = {}) {
  const dissolve = inOutro ? 0 : smoothstep(0.3, 0.84, zoomP);
  out.dissolve = dissolve;
  out.scanY = dissolve <= 0 ? 9 : 1.15 - 2.35 * smoothstep(0, 0.62, dissolve) - 2.4 * smoothstep(0.62, 1, dissolve);
  out.xray = inOutro ? 0 : smoothstep(0.42, 0.62, zoomP);
  return out;
}

export async function create(ctx) {
  const { THREE, palette, director, pointer, shared, quality } = ctx;
  const hi = quality === 'high';
  const debug = !!ctx.dev && /[?&]ab=debug\b/.test(window.location.search);
  const noShell = !!ctx.dev && /[?&]ab=mech\b/.test(window.location.search);
  const noBloom = !!ctx.dev && /[?&]ab=nobloom\b/.test(window.location.search);
  const dbgFlags = ctx.dev ? (new URLSearchParams(window.location.search).get('ab') || '') : '';

  const group = new THREE.Group();
  group.name = 'scene:robot';
  const body = new THREE.Group();
  group.add(body);

  /* ------------------------------------------------------------- Netz */
  let mesh = await loadBust(new URL('../../../assets/android-b/bust.bin', import.meta.url).href);
  const lm = mesh.lm;
  const levels = hi ? 2 : 1;
  for (let i = 0; i < levels; i++) mesh = catmullClark(mesh);
  computeNormals(mesh);
  const DEPTH = 0.032;
  const CORE = 0.13;
  // Hinterkopf: Innenschale (Graphit, 0.13 tiefer) und Glas, nur die Vierecke im Bereich des Fensters
  const backHead = (x, y, z) => z < 0.2 && y > -0.72 && y < 0.6 && Math.atan2(Math.abs(x), z + 0.05) > 1.6;
  const geo = {
    shell: toGeometry(THREE, mesh),
    muscle: toGeometry(THREE, mesh, -DEPTH),
    core: toGeometry(THREE, subMesh(mesh, backHead), -CORE),
    glass: toGeometry(THREE, subMesh(mesh, (x, y, z) => backHead(x, y, z) && y > -0.12), 0),
  };

  /* --------------------------------------------------------- Uniforms */
  const headMat = new THREE.Matrix4();
  const U = {
    uTime: shared.uTime,
    uHeadMat: { value: headMat },
    uBreath: { value: 0 },
    uScanY: { value: 9 },
    uInner: { value: palette.steel.clone().multiplyScalar(0.4) },
    uFall: { value: new THREE.Vector2(-3.5, -2.95) },
    uDebug: { value: debug ? 1 : 0 },
    uEdgeGlow: { value: 0 },
    uEdgeCol: { value: palette.signal.clone().multiplyScalar(2.0) },
    uGel: { value: palette.signal.clone().multiplyScalar(0.16) },
    uGelHi: { value: palette.signal.clone().multiplyScalar(0.85) },
    uStruct: { value: palette.steel.clone().multiplyScalar(0.22) },
    uRidge: { value: palette.white.clone().lerp(palette.ice, 0.2).multiplyScalar(0.3) },
    uCoreDepth: { value: CORE },
    uPulse: { value: new THREE.Vector4(0.22, 1.0, 1.0, 0) },
    uDepth: { value: DEPTH },
    uDim: { value: 0 },
    uMechDim: { value: 0 },
    uMechCut: { value: 9 },
    uWall: { value: palette.white.clone().multiplyScalar(0.8) },
    uHolo: { value: 0 },
    uHoloCol: { value: palette.signal.clone().multiplyScalar(0.55) },
    uHoloHi: { value: palette.ice.clone().multiplyScalar(1.6) },
  };

  /* ------------------------------------------------------- Materialien */
  const env = buildStudioEnv(THREE, ctx.renderer, palette);
  const shellCol = palette.white.clone().multiplyScalar(0.93);
  const mats = {
    shell: makeShellMaterial(THREE, U, { color: shellCol, envMap: env.texture, envIntensity: 1.22, clearcoat: hi ? 0.4 : 0.3, cheap: !hi }),
    muscle: makeMuscleMaterial(THREE, U, { color: palette.signal.clone().multiplyScalar(0.16), envMap: env.texture, envIntensity: 1.1, cheap: !hi }),
    holo: makeHoloMaterial(THREE, U),
    core: makeCoreMaterial(THREE, U, { color: palette.mist.clone().multiplyScalar(0.36), envMap: env.texture }),
    glass: makeGlassMaterial(THREE, U, { color: palette.white.clone(), envMap: env.texture }),
  };
  const shellMesh = new THREE.Mesh(geo.shell, mats.shell);
  const muscleMesh = new THREE.Mesh(geo.muscle, mats.muscle);
  const holoMesh = new THREE.Mesh(geo.shell, mats.holo);
  holoMesh.renderOrder = 20;
  muscleMesh.renderOrder = 1;
  shellMesh.renderOrder = 2;
  const coreMesh = new THREE.Mesh(geo.core, mats.core);
  const glassMesh = new THREE.Mesh(geo.glass, mats.glass);
  glassMesh.renderOrder = 8;
  for (const m of [shellMesh, muscleMesh, holoMesh, coreMesh, glassMesh]) m.frustumCulled = false;
  body.add(coreMesh, muscleMesh, shellMesh, glassMesh, holoMesh);

  /* ---------------------------------------------------- Hintergrund-Licht */
  const backdrop = buildBackdrop(THREE, palette);
  group.add(backdrop.mesh);
  const _bq = new THREE.Vector3();

  /* ---------------------------------------------------------- Mechanik */
  const mech = buildMechanics(THREE, { lm, mesh, U, palette, env: env.texture, quality, headMat, shellCol });
  body.add(mech.group);

  /* ----------------------------------------------------------- Zustand */
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const pivot = new THREE.Vector3().fromArray(lm.headPivot);
  const _v = new THREE.Vector3();
  const st = { yaw: 0, pitch: 0, eye: 0, wall: 0 };
  const scan = {};
  const look = {
    exposure: 1.0, bloom: 0.55, bloomRadius: 0.5, bloomThreshold: 1.15, key: 1.35, rim: 1.0, amb: 0.1,
    parallax: 0.26, drift: 0.025, aberration: 0.0012, flash: 0, vignette: 0.74, env: 0.35,
  };
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

      let follow = 1;
      let holoAmt = 0;
      let buildLine = 9;
      let power = 1;
      let leak = 0;
      if (!inOutro) {
        follow = 1 - smoothstep(0.0, 0.32, zm.p);
        leak = smoothstep(0.1, 0.32, zm.p) * (1 - smoothstep(0.7, 0.85, zm.p));
        holoAmt = 0.6 * smoothstep(0.3, 0.42, zm.p) * (1 - 0.55 * smoothstep(0.6, 0.95, zm.p)) * (1 - smoothstep(0.32, 0.5, br.p));
        // Aufbau im Beat robot: erst Hologramm (0.08-0.26), dann von unten nach oben fest (0.26-0.64)
        const b = smoothstep(0.26, 0.64, rb.p);
        buildLine = b >= 0.999 ? 9 : -3.6 + (1.25 + 3.6) * b;
        holoAmt = Math.max(holoAmt, 0.75 * smoothstep(0.08, 0.26, rb.p) * (1 - smoothstep(0.6, 0.68, rb.p)));
        power = smoothstep(0.64, 0.74, rb.p);
      }
      if (shared.uScanY && shared.uDissolve) {
        scan.scanY = shared.uScanY.value;
        scan.dissolve = shared.uDissolve.value;
        scan.xray = shared.uXray ? shared.uXray.value : robotScan(zm.p, inOutro, {}).xray;
      } else robotScan(zm.p, inOutro, scan);

      /* Kopf folgt der Maus (dezent), Eigenleben, Atmen */
      const k = 1 - Math.exp(-dt * 2.2);
      const idleYaw = Math.sin(time * 0.19) * 0.04 + Math.sin(time * 0.067) * 0.025;
      const idlePitch = Math.sin(time * 0.15 + 1.0) * 0.018;
      st.yaw += ((pointer.sx * 0.26 + idleYaw) * follow - st.yaw) * k;
      st.pitch += ((-pointer.sy * 0.1 + idlePitch) * follow - st.pitch) * k;
      const roll = (Math.sin(time * 0.11) * 0.01 - st.yaw * 0.06) * follow;
      euler.set(st.pitch, st.yaw, roll);
      headMat.makeRotationFromEuler(euler);
      _v.copy(pivot).applyMatrix4(headMat);
      headMat.setPosition(pivot.x - _v.x, pivot.y - _v.y, pivot.z - _v.z);
      const breath = Math.sin((time * Math.PI * 2) / 5.2);
      U.uBreath.value = breath * follow;
      body.position.y = breath * 0.004 * follow;

      U.uScanY.value = Math.min(scan.scanY, buildLine);
      U.uMechCut.value = buildLine;
      // Augen: kurzes Flackern beim Einschalten, im Ausklang hell im Lichtblitz
      const flick = power > 0 && power < 1 ? 0.55 + 0.45 * Math.sin(time * 47) * Math.sin(time * 13) : 1;
      const irisBoost = power * flick * (inOutro ? 1 + 1.4 * Math.exp(-Math.pow(out.p / 0.12, 2)) : 1);
      U.uHolo.value = holoAmt * weight;
      U.uEdgeGlow.value = leak * 0.45 * weight;
      U.uDim.value = 0.35 * scan.xray;
      U.uMechDim.value = 0.4 * scan.xray;
      U.uPulse.value.y = (0.9 + 1.2 * leak) * weight;

      mech.update(time, dt, { follow, scan, weight, leak, inOutro, out, irisBoost, buildLine });

      shellMesh.visible = scan.dissolve < 0.999 && buildLine > -3.55 && !noShell;
      muscleMesh.visible = scan.dissolve < 0.999 && buildLine > -3.55;
      coreMesh.visible = scan.dissolve < 0.999 && buildLine > -0.9;
      glassMesh.visible = scan.dissolve < 0.5 && buildLine > -0.3 && !noShell;
      holoMesh.visible = holoAmt > 0.002;

      /* Bildwirkung */
      bw.r = rb.w; bw.z = zm.w; bw.b = br.w; bw.o = out.w;
      bw.s = Math.max(1e-3, bw.r + bw.z + bw.b + bw.o);
      // Licht: kuehles Kantenlicht hinten deutlich, warmes Fuehrungslicht fast weg (Weiss bleibt neutral), Fuellung leise
      look.key = mix4(0.14, 0.16, 0.45, 0.14);
      look.rim = mix4(1.8, 1.6, 1.4, 1.7);
      look.amb = mix4(0.06, 0.06, 0.1, 0.06);
      look.aberration = mix4(0.0012, 0.0015, 0.004, 0.001);
      look.exposure = mix4(1.06, 1.04, 0.98, 1.06);
      const xr = smoothstep(0.45, 0.75, zm.p);
      look.bloom = (mix4(0.55, 0.6, 0.95, 0.6) + 0.3 * xr) * (ctx.isMobile ? 0.86 : 1);
      look.bloomThreshold = mix4(1.3, 1.2, 0.8, 1.25) - 0.35 * xr;
      if (noBloom) look.bloom = 0;
      if (dbgFlags.includes('nokey')) { look.key = 0; look.rim = 0; }
      if (dbgFlags.includes('noenv')) { mats.shell.envMapIntensity = 0; }
      // Hintergrund-Licht hinter dem Kopf: zur Kamera gedreht, im Roentgen-Zoom ausgeblendet
      const cam = ctx.camera;
      _bq.set(0, -0.35, 0).sub(cam.position).normalize();
      backdrop.mesh.position.set(0, -0.35, 0).addScaledVector(_bq, 3.4);
      backdrop.mesh.quaternion.copy(cam.quaternion);
      _bq.copy(cam.position).sub(backdrop.mesh.position);
      const sc = 2 * _bq.length() * Math.tan((cam.fov * Math.PI) / 360) * 1.25;
      backdrop.mesh.scale.set(sc * cam.aspect, sc, 1);
      backdrop.uniforms.uAsp.value = cam.aspect;
      backdrop.uniforms.uAmt.value = weight * (1 - smoothstep(0.2, 0.5, inOutro ? 0 : zm.p)) * (inOutro ? smoothstep(0.0, 0.3, out.p) : 1);
      backdrop.mesh.visible = backdrop.uniforms.uAmt.value > 0.002;
      look.parallax = (inOutro ? 0.28 : 0.26) * follow + 0.02;
      look.drift = 0.025 * (1 - smoothstep(0.4, 0.9, zm.p)) + 0.004;
      look.flash = inOutro ? 0 : 0.06 * Math.exp(-Math.pow((br.p - 0.46) / 0.05, 2));
    },
    setActive() {},
    dispose() {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      mech.dispose();
      env.dispose();
      backdrop.dispose();
      group.clear();
    },
  };
  return api;
}
