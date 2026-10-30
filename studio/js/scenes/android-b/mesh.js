// Android B: Bueste laden und glaetten.
// Grundlage: MakeHuman-Grundmodell (CC0), offline aufbereitet (Targets, Arme gesenkt, zugeschnitten, ARCHITEKTUR-Massstab).
// Datei assets/android-b/bust.bin: 'AB01', JSON-Kopf, uint16 Positionen (quantisiert), uint8 Kopf-Gewicht, uint8 Oberarm-
// Gewicht, uint8 Ambient Occlusion (offline per Strahltest gerechnet, Kopf-Flag 'ao'), uint16 Vierecke.
// Hier: Catmull-Clark-Unterteilung (Randregeln fuer offene Kanten), Normalen, BufferGeometry.

/** Laedt die Bueste. Gibt { pos: Float32Array, head: Float32Array, quads: Uint32Array, nV, lm } zurueck. */
export async function loadBust(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`android-b: ${url} fehlt (${res.status})`);
  const buf = await res.arrayBuffer();
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'AB01') throw new Error('android-b: falsches Dateiformat');
  const hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  let o = 8 + hl;
  const { nV, nF, bmin, bmax } = head;
  const q = new Uint16Array(buf, o, nV * 3);
  o += nV * 6;
  const hw = new Uint8Array(buf, o, nV);
  o += nV + ((4 - (nV % 4)) % 4);
  const armW = new Float32Array(nV);
  if (head.arm) {
    const aw = new Uint8Array(buf, o, nV);
    for (let i = 0; i < nV; i++) armW[i] = aw[i] / 255;
    o += nV + ((4 - (nV % 4)) % 4);
  }
  const ao = new Float32Array(nV).fill(1);
  if (head.ao) {
    const a8 = new Uint8Array(buf, o, nV);
    for (let i = 0; i < nV; i++) ao[i] = a8[i] / 255;
    o += nV + ((4 - (nV % 4)) % 4);
  }
  const quads16 = new Uint16Array(buf, o, nF * 4);
  const pos = new Float32Array(nV * 3);
  for (let i = 0; i < nV; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = bmin[k] + (q[i * 3 + k] / 65535) * (bmax[k] - bmin[k]);
  }
  const headW = new Float32Array(nV);
  for (let i = 0; i < nV; i++) headW[i] = hw[i] / 255;
  return { pos, head: headW, arm: armW, ao, quads: Uint32Array.from(quads16), nV, lm: head.lm };
}

/** Eine Stufe Catmull-Clark fuer reine Vierecks-Netze. Die Ecken-Attribute head, arm und ao werden mitgeteilt. */
export function catmullClark(mesh) {
  const r1 = ccStep({ pos: mesh.pos, head: mesh.head, quads: mesh.quads, nV: mesh.nV, lm: mesh.lm });
  const r2 = ccStep({ pos: mesh.pos, head: mesh.arm, quads: mesh.quads, nV: mesh.nV, lm: mesh.lm });
  const r3 = ccStep({ pos: mesh.pos, head: mesh.ao || new Float32Array(mesh.nV).fill(1), quads: mesh.quads, nV: mesh.nV, lm: mesh.lm });
  r1.arm = r2.head;
  r1.ao = r3.head;
  return r1;
}

/** Teilnetz: nur Vierecke, deren Mitte keep(x, y, z) erfuellt (fuer Innenschale und Glas). */
export function subMesh(mesh, keep) {
  const { pos, quads } = mesh;
  const map = new Int32Array(mesh.nV).fill(-1);
  const q = [];
  let n = 0;
  for (let f = 0; f < quads.length; f += 4) {
    let x = 0; let y = 0; let z = 0;
    for (let k = 0; k < 4; k++) { const v = quads[f + k]; x += pos[v * 3]; y += pos[v * 3 + 1]; z += pos[v * 3 + 2]; }
    if (!keep(x / 4, y / 4, z / 4)) continue;
    for (let k = 0; k < 4; k++) {
      const v = quads[f + k];
      if (map[v] < 0) map[v] = n++;
      q.push(map[v]);
    }
  }
  const P = new Float32Array(n * 3); const N = new Float32Array(n * 3);
  const H = new Float32Array(n); const A = new Float32Array(n); const O = new Float32Array(n);
  for (let v = 0; v < mesh.nV; v++) {
    const m = map[v];
    if (m < 0) continue;
    for (let k = 0; k < 3; k++) { P[m * 3 + k] = pos[v * 3 + k]; N[m * 3 + k] = mesh.normal[v * 3 + k]; }
    H[m] = mesh.head[v]; A[m] = mesh.arm[v]; O[m] = mesh.ao ? mesh.ao[v] : 1;
  }
  return { pos: P, normal: N, head: H, arm: A, ao: O, quads: Uint32Array.from(q), nV: n, lm: mesh.lm };
}

function ccStep(mesh) {
  const { pos, head, quads, nV } = mesh;
  const nF = quads.length / 4;
  // Kanten
  const edgeMap = new Map();
  const eV = []; // [a, b]
  const eF = []; // [f0, f1]
  const faceEdges = new Uint32Array(nF * 4);
  for (let f = 0; f < nF; f++) {
    for (let k = 0; k < 4; k++) {
      const a = quads[f * 4 + k];
      const b = quads[f * 4 + ((k + 1) & 3)];
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      let e = edgeMap.get(key);
      if (e === undefined) {
        e = eV.length / 2;
        edgeMap.set(key, e);
        eV.push(a, b);
        eF.push(f, -1);
      } else eF[e * 2 + 1] = f;
      faceEdges[f * 4 + k] = e;
    }
  }
  const nE = eV.length / 2;
  const NV = nV + nE + nF;
  const P = new Float32Array(NV * 3);
  const H = new Float32Array(NV);
  const oE = nV;
  const oF = nV + nE;
  // Flaechenpunkte
  for (let f = 0; f < nF; f++) {
    let x = 0; let y = 0; let z = 0; let h = 0;
    for (let k = 0; k < 4; k++) {
      const v = quads[f * 4 + k];
      x += pos[v * 3]; y += pos[v * 3 + 1]; z += pos[v * 3 + 2]; h += head[v];
    }
    const i = oF + f;
    P[i * 3] = x / 4; P[i * 3 + 1] = y / 4; P[i * 3 + 2] = z / 4; H[i] = h / 4;
  }
  // Kantenpunkte
  const boundary = new Uint8Array(nE);
  for (let e = 0; e < nE; e++) {
    const a = eV[e * 2]; const b = eV[e * 2 + 1];
    const f0 = eF[e * 2]; const f1 = eF[e * 2 + 1];
    const i = oE + e;
    if (f1 < 0) {
      boundary[e] = 1;
      for (let k = 0; k < 3; k++) P[i * 3 + k] = (pos[a * 3 + k] + pos[b * 3 + k]) / 2;
      H[i] = (head[a] + head[b]) / 2;
    } else {
      const F0 = oF + f0; const F1 = oF + f1;
      for (let k = 0; k < 3; k++) P[i * 3 + k] = (pos[a * 3 + k] + pos[b * 3 + k] + P[F0 * 3 + k] + P[F1 * 3 + k]) / 4;
      H[i] = (head[a] + head[b] + H[F0] + H[F1]) / 4;
    }
  }
  // Eckpunkte
  const val = new Uint16Array(nV);
  const sumF = new Float32Array(nV * 4); // x, y, z, h
  const sumE = new Float32Array(nV * 4); // Mittelpunkte der Kanten
  const nb = new Uint16Array(nV); // Randkanten
  const bsum = new Float32Array(nV * 4);
  for (let f = 0; f < nF; f++) {
    const F = oF + f;
    for (let k = 0; k < 4; k++) {
      const v = quads[f * 4 + k];
      sumF[v * 4] += P[F * 3]; sumF[v * 4 + 1] += P[F * 3 + 1]; sumF[v * 4 + 2] += P[F * 3 + 2]; sumF[v * 4 + 3] += H[F];
    }
  }
  const nFace = new Uint16Array(nV);
  for (let f = 0; f < nF; f++) for (let k = 0; k < 4; k++) nFace[quads[f * 4 + k]]++;
  for (let e = 0; e < nE; e++) {
    const a = eV[e * 2]; const b = eV[e * 2 + 1];
    const mx = (pos[a * 3] + pos[b * 3]) / 2; const my = (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2; const mz = (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2;
    const mh = (head[a] + head[b]) / 2;
    for (const v of [a, b]) {
      val[v]++;
      sumE[v * 4] += mx; sumE[v * 4 + 1] += my; sumE[v * 4 + 2] += mz; sumE[v * 4 + 3] += mh;
    }
    if (boundary[e]) {
      nb[a]++; nb[b]++;
      bsum[a * 4] += pos[b * 3]; bsum[a * 4 + 1] += pos[b * 3 + 1]; bsum[a * 4 + 2] += pos[b * 3 + 2]; bsum[a * 4 + 3] += head[b];
      bsum[b * 4] += pos[a * 3]; bsum[b * 4 + 1] += pos[a * 3 + 1]; bsum[b * 4 + 2] += pos[a * 3 + 2]; bsum[b * 4 + 3] += head[a];
    }
  }
  for (let v = 0; v < nV; v++) {
    const n = val[v];
    if (nb[v] === 2) {
      for (let k = 0; k < 3; k++) P[v * 3 + k] = (6 * pos[v * 3 + k] + bsum[v * 4 + k]) / 8;
      H[v] = (6 * head[v] + bsum[v * 4 + 3]) / 8;
    } else if (nb[v] > 0 || n < 3 || nFace[v] !== n) {
      for (let k = 0; k < 3; k++) P[v * 3 + k] = pos[v * 3 + k];
      H[v] = head[v];
    } else {
      const fn = nFace[v];
      for (let k = 0; k < 3; k++) {
        const Fk = sumF[v * 4 + k] / fn;
        const Rk = sumE[v * 4 + k] / n;
        P[v * 3 + k] = (Fk + 2 * Rk + (n - 3) * pos[v * 3 + k]) / n;
      }
      H[v] = (sumF[v * 4 + 3] / fn + 2 * (sumE[v * 4 + 3] / n) + (n - 3) * head[v]) / n;
    }
  }
  // Neue Vierecke
  const Q = new Uint32Array(nF * 16);
  for (let f = 0; f < nF; f++) {
    const F = oF + f;
    const v = [quads[f * 4], quads[f * 4 + 1], quads[f * 4 + 2], quads[f * 4 + 3]];
    const e = [oE + faceEdges[f * 4], oE + faceEdges[f * 4 + 1], oE + faceEdges[f * 4 + 2], oE + faceEdges[f * 4 + 3]];
    for (let k = 0; k < 4; k++) {
      const o = f * 16 + k * 4;
      Q[o] = v[k]; Q[o + 1] = e[k]; Q[o + 2] = F; Q[o + 3] = e[(k + 3) & 3];
    }
  }
  return { pos: P, head: H, quads: Q, nV: NV, lm: mesh.lm };
}

/** Flaechengewichtete Normalen */
export function computeNormals(mesh, smoothIters = 2) {
  const { pos, quads, nV } = mesh;
  const N = new Float32Array(nV * 3);
  const tri = (a, b, c) => {
    const ax = pos[a * 3]; const ay = pos[a * 3 + 1]; const az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax; const uy = pos[b * 3 + 1] - ay; const uz = pos[b * 3 + 2] - az;
    const vx = pos[c * 3] - ax; const vy = pos[c * 3 + 1] - ay; const vz = pos[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { N[i * 3] += nx; N[i * 3 + 1] += ny; N[i * 3 + 2] += nz; }
  };
  for (let f = 0; f < quads.length; f += 4) {
    tri(quads[f], quads[f + 1], quads[f + 2]);
    tri(quads[f], quads[f + 2], quads[f + 3]);
  }
  const norm = (A) => {
    for (let i = 0; i < nV; i++) {
      const l = Math.hypot(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]) || 1;
      A[i * 3] /= l; A[i * 3 + 1] /= l; A[i * 3 + 2] /= l;
    }
  };
  norm(N);
  // Normalen glaetten (2 Durchgaenge ueber die Kanten): verhindert Glanzpunkte an Ecken mit Valenz != 4
  const S = new Float32Array(nV * 3); const C = new Float32Array(nV);
  for (let it = 0; it < smoothIters; it++) {
    S.fill(0); C.fill(0);
    for (let f = 0; f < quads.length; f += 4) {
      for (let k = 0; k < 4; k++) {
        const a = quads[f + k]; const b = quads[f + ((k + 1) & 3)];
        S[a * 3] += N[b * 3]; S[a * 3 + 1] += N[b * 3 + 1]; S[a * 3 + 2] += N[b * 3 + 2]; C[a] += 1;
        S[b * 3] += N[a * 3]; S[b * 3 + 1] += N[a * 3 + 1]; S[b * 3 + 2] += N[a * 3 + 2]; C[b] += 1;
      }
    }
    for (let i = 0; i < nV; i++) {
      if (!C[i]) continue;
      N[i * 3] = N[i * 3] + S[i * 3] / C[i];
      N[i * 3 + 1] = N[i * 3 + 1] + S[i * 3 + 1] / C[i];
      N[i * 3 + 2] = N[i * 3 + 2] + S[i * 3 + 2] / C[i];
    }
    norm(N);
  }
  mesh.normal = N;
  return N;
}

/** BufferGeometry (Dreiecke) mit position, normal, aHead. offset: Verschiebung entlang der Normalen. */
export function toGeometry(THREE, mesh, offset = 0) {
  const { pos, quads, nV, head } = mesh;
  const N = mesh.normal || computeNormals(mesh);
  const P = new Float32Array(nV * 3);
  for (let i = 0; i < nV * 3; i++) P[i] = pos[i] + N[i] * offset;
  const nQ = quads.length / 4;
  const idx = nV > 65535 ? new Uint32Array(nQ * 6) : new Uint16Array(nQ * 6);
  for (let f = 0; f < nQ; f++) {
    const a = quads[f * 4]; const b = quads[f * 4 + 1]; const c = quads[f * 4 + 2]; const d = quads[f * 4 + 3];
    // Diagonale entlang der kuerzeren Strecke (weniger Knicke)
    const dac = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2;
    const dbd = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
    const o = f * 6;
    if (dac <= dbd) { idx[o] = a; idx[o + 1] = b; idx[o + 2] = c; idx[o + 3] = a; idx[o + 4] = c; idx[o + 5] = d; } else {
      idx[o] = a; idx[o + 1] = b; idx[o + 2] = d; idx[o + 3] = b; idx[o + 4] = c; idx[o + 5] = d;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N.slice(), 3));
  g.setAttribute('aHead', new THREE.BufferAttribute(head.slice(), 1));
  g.setAttribute('aArm', new THREE.BufferAttribute(mesh.arm.slice(), 1));
  g.setAttribute('aAO', new THREE.BufferAttribute(mesh.ao ? mesh.ao.slice() : new Float32Array(nV).fill(1), 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
