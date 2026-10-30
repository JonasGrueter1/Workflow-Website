// Android B: Ersatz fuer makeHeadShape aus js/scenes/robot-geometry.js (gleiche Signatur).
// brain.js gibt die Kopfform an brain-hardware.js weiter (Streben zur Schale, Flansche, Halterungen). Mit dieser Datei
// sitzen die Streben an der Innenseite der Android-Schale statt an der alten Helmform.
//
// Einbau: in brain.js die Zeile  import { makeHeadShape } from './robot-geometry.js';
// auf './android-b/head-shape.js' umstellen (test-android-b.html leitet per importmap um).
// shape(x, y, z, out): Richtung (x, y, z) ab der Kopfmitte -> Punkt auf der Schale in out (x, y, z).
import { loadBust, catmullClark } from './mesh.js';

const NT = 96; // Azimut
const NP = 48; // Hoehe (Polarwinkel)
const GRID = await loadBust(new URL('../../../assets/android-b/bust.bin', import.meta.url).href)
  .then((m) => {
    const s = catmullClark(m);
    const R = new Float32Array(NT * NP);
    for (let i = 0; i < s.nV; i++) {
      const x = s.pos[i * 3]; const y = s.pos[i * 3 + 1]; const z = s.pos[i * 3 + 2];
      if (y < -1.25) continue;
      const r = Math.hypot(x, y, z);
      const t = Math.floor(((Math.atan2(x, z) + Math.PI) / (2 * Math.PI)) * NT) % NT;
      const p = Math.min(NP - 1, Math.floor((Math.acos(Math.max(-1, Math.min(1, y / r))) / Math.PI) * NP));
      if (r > R[p * NT + t]) R[p * NT + t] = r;
    }
    // Luecken (Ohr-Oeffnung, Hals) aus den Nachbarn fuellen
    for (let it = 0; it < 12; it++) {
      for (let p = 0; p < NP; p++) for (let t = 0; t < NT; t++) {
        if (R[p * NT + t]) continue;
        let a = 0; let c = 0;
        for (const [dp, dt] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const pp = p + dp; if (pp < 0 || pp >= NP) continue;
          const v = R[pp * NT + ((t + dt + NT) % NT)];
          if (v) { a += Math.abs(v); c++; }
        }
        if (c) R[p * NT + t] = -a / c;
      }
      for (let i = 0; i < R.length; i++) if (R[i] < 0) R[i] = -R[i];
    }
    return R;
  })
  .catch(() => null);

export function makeHeadShape(radii) {
  return function shape(x, y, z, out) {
    const l = Math.hypot(x, y, z) || 1;
    const dx = x / l; const dy = y / l; const dz = z / l;
    let r;
    if (!GRID) {
      r = 1 / Math.hypot(dx / radii.x, dy / radii.y, dz / radii.z);
    } else {
      // bilinear im Raster
      const ft = ((Math.atan2(dx, dz) + Math.PI) / (2 * Math.PI)) * NT - 0.5;
      const fp = (Math.acos(Math.max(-1, Math.min(1, dy))) / Math.PI) * NP - 0.5;
      const t0 = Math.floor(ft); const p0 = Math.max(0, Math.min(NP - 2, Math.floor(fp)));
      const at = ft - t0; const ap = Math.max(0, Math.min(1, fp - p0));
      const g = (p, t) => GRID[p * NT + ((t % NT) + NT) % NT] || 1;
      r = (g(p0, t0) * (1 - at) + g(p0, t0 + 1) * at) * (1 - ap) + (g(p0 + 1, t0) * (1 - at) + g(p0 + 1, t0 + 1) * at) * ap;
      if (dy < -0.55) r = Math.min(r, 1.25);
    }
    out.x = dx * r; out.y = dy * r; out.z = dz * r;
    return out;
  };
}
