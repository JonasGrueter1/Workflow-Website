// Catmull-Clark-Unterteilung fuer reine Vierecks-Netze (mit offenen Raendern).
// Eingabe: v Float32Array mit S Werten je Punkt (die ersten drei = Position, weitere werden mitgeteilt, z. B. AO),
// quads Uint32Array (4 Indizes je Viereck). Ausgabe: { pos, quads } eine Stufe feiner.
// Raender: Kantenpunkte = Mitte, Randpunkte = 1/8, 3/4, 1/8.

export function catmullClark(v, quads, S = 3) {
  const nv = v.length / S;
  const nf = quads.length / 4;

  /* Kanten sammeln: Schluessel a * nv + b (a < b) */
  const edgeMap = new Map();
  const edgeA = []; const edgeB = []; const edgeF0 = []; const edgeF1 = [];
  const faceEdges = new Uint32Array(nf * 4);
  for (let f = 0; f < nf; f++) {
    for (let k = 0; k < 4; k++) {
      const a = quads[f * 4 + k];
      const b = quads[f * 4 + ((k + 1) & 3)];
      const lo = a < b ? a : b;
      const hi = a < b ? b : a;
      const key = lo * nv + hi;
      let e = edgeMap.get(key);
      if (e === undefined) {
        e = edgeA.length;
        edgeMap.set(key, e);
        edgeA.push(lo); edgeB.push(hi); edgeF0.push(f); edgeF1.push(-1);
      } else edgeF1[e] = f;
      faceEdges[f * 4 + k] = e;
    }
  }
  const ne = edgeA.length;

  /* Flaechenpunkte */
  const fp = new Float32Array(nf * S);
  for (let f = 0; f < nf; f++) {
    for (let k = 0; k < 4; k++) {
      const o = quads[f * 4 + k] * S;
      for (let c = 0; c < S; c++) fp[f * S + c] += v[o + c] * 0.25;
    }
  }

  /* Kantenpunkte */
  const ep = new Float32Array(ne * S);
  const boundaryV = new Uint8Array(nv);
  for (let e = 0; e < ne; e++) {
    const a = edgeA[e] * S; const b = edgeB[e] * S;
    if (edgeF1[e] < 0) {
      for (let c = 0; c < S; c++) ep[e * S + c] = (v[a + c] + v[b + c]) * 0.5;
      boundaryV[edgeA[e]] = 1; boundaryV[edgeB[e]] = 1;
    } else {
      const f0 = edgeF0[e] * S; const f1 = edgeF1[e] * S;
      for (let c = 0; c < S; c++) ep[e * S + c] = (v[a + c] + v[b + c] + fp[f0 + c] + fp[f1 + c]) * 0.25;
    }
  }

  /* Neue Eckpunkte */
  const Qs = new Float32Array(nv * S); const Rs = new Float32Array(nv * S); const Bs = new Float32Array(nv * S);
  const fc = new Uint16Array(nv); const ec = new Uint16Array(nv);
  for (let f = 0; f < nf; f++) {
    for (let k = 0; k < 4; k++) {
      const p = quads[f * 4 + k];
      for (let c = 0; c < S; c++) Qs[p * S + c] += fp[f * S + c];
      fc[p]++;
    }
  }
  for (let e = 0; e < ne; e++) {
    const a = edgeA[e]; const b = edgeB[e];
    for (let c = 0; c < S; c++) {
      const m = (v[a * S + c] + v[b * S + c]) * 0.5;
      Rs[a * S + c] += m; Rs[b * S + c] += m;
      if (edgeF1[e] < 0) { Bs[a * S + c] += v[b * S + c]; Bs[b * S + c] += v[a * S + c]; }
    }
    ec[a]++; ec[b]++;
  }
  const vp = new Float32Array(nv * S);
  for (let p = 0; p < nv; p++) {
    const i = p * S;
    if (boundaryV[p]) {
      for (let c = 0; c < S; c++) vp[i + c] = v[i + c] * 0.75 + Bs[i + c] * 0.125;
    } else {
      const n = ec[p]; const nfv = fc[p] || 1;
      for (let c = 0; c < S; c++) vp[i + c] = (Qs[i + c] / nfv + (2 * Rs[i + c]) / n + (n - 3) * v[i + c]) / n;
    }
  }

  /* Zusammensetzen: [Eckpunkte | Kantenpunkte | Flaechenpunkte] */
  const out = new Float32Array((nv + ne + nf) * S);
  out.set(vp, 0); out.set(ep, nv * S); out.set(fp, (nv + ne) * S);
  const oq = new Uint32Array(nf * 16);
  for (let f = 0; f < nf; f++) {
    const F = nv + ne + f;
    for (let k = 0; k < 4; k++) {
      const p = quads[f * 4 + k];
      const e1 = nv + faceEdges[f * 4 + k];
      const e0 = nv + faceEdges[f * 4 + ((k + 3) & 3)];
      const o = (f * 4 + k) * 4;
      oq[o] = p; oq[o + 1] = e1; oq[o + 2] = F; oq[o + 3] = e0;
    }
  }
  return { pos: out, quads: oq };
}

/** Vierecke -> Dreiecke (Index-Puffer) */
export function quadsToTris(quads, count) {
  const nf = quads.length / 4;
  const out = count > 65535 ? new Uint32Array(nf * 6) : new Uint16Array(nf * 6);
  for (let f = 0; f < nf; f++) {
    const a = quads[f * 4]; const b = quads[f * 4 + 1]; const c = quads[f * 4 + 2]; const d = quads[f * 4 + 3];
    out[f * 6] = a; out[f * 6 + 1] = b; out[f * 6 + 2] = c;
    out[f * 6 + 3] = a; out[f * 6 + 4] = c; out[f * 6 + 5] = d;
  }
  return out;
}

/** Werte mit Schrittweite S in Position (3) und Rest aufteilen */
export function splitStride(v, S) {
  const n = v.length / S;
  const pos = new Float32Array(n * 3);
  const rest = new Float32Array(n * (S - 3));
  for (let i = 0; i < n; i++) {
    pos[i * 3] = v[i * S]; pos[i * 3 + 1] = v[i * S + 1]; pos[i * 3 + 2] = v[i * S + 2];
    for (let c = 3; c < S; c++) rest[i * (S - 3) + c - 3] = v[i * S + c];
  }
  return { pos, rest };
}
