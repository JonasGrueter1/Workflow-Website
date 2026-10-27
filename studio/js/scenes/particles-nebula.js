// Szene "particles": Nebel-Textur fuer den Hintergrund, einmal beim Start auf der CPU gerechnet.
// Spart pro Bildpunkt teures Rauschen (wichtig fuer Handys). Abbildung wie THREE.SphereGeometry (uv),
// das Rauschen ist 3D ueber die Richtung, darum ohne Naht. R = grosse Wolken, G = verzerrte Feinstruktur.

export function makeNebulaTexture(THREE, width = 320, height = 160, seed = 7) {
  const data = new Uint8Array(width * height * 2);
  const hash = (x, y, z) => {
    let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x1b873593) ^ seed;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  const noise = (x, y, z) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = fade(x - ix);
    const fy = fade(y - iy);
    const fz = fade(z - iz);
    const a = hash(ix, iy, iz);
    const b = hash(ix + 1, iy, iz);
    const c = hash(ix, iy + 1, iz);
    const d = hash(ix + 1, iy + 1, iz);
    const e = hash(ix, iy, iz + 1);
    const f = hash(ix + 1, iy, iz + 1);
    const g = hash(ix, iy + 1, iz + 1);
    const h = hash(ix + 1, iy + 1, iz + 1);
    const x1 = a + (b - a) * fx;
    const x2 = c + (d - c) * fx;
    const x3 = e + (f - e) * fx;
    const x4 = g + (h - g) * fx;
    const y1 = x1 + (x2 - x1) * fy;
    const y2 = x3 + (x4 - x3) * fy;
    return y1 + (y2 - y1) * fz;
  };
  const fbm = (x, y, z, oct) => {
    let s = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < oct; o++) {
      s += amp * noise(x, y, z);
      norm += amp;
      x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 3.1;
      amp *= 0.5;
    }
    return s / norm;
  };

  let k = 0;
  for (let j = 0; j < height; j++) {
    const v = j / (height - 1);
    const theta = (1 - v) * Math.PI; // wie SphereGeometry: v = 1 oben
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    for (let i = 0; i < width; i++) {
      const phi = (i / (width - 1)) * Math.PI * 2;
      const dx = -Math.cos(phi) * st;
      const dy = ct;
      const dz = Math.sin(phi) * st;
      const n = fbm(dx * 2.4 + 5, dy * 2.4 + 5, dz * 2.4 + 5, 4);
      const n2 = fbm(dx * 5.3 + n * 1.6 + 11, dy * 5.3 + n * 1.6 + 11, dz * 5.3 + 11, 3);
      data[k++] = Math.max(0, Math.min(255, Math.round(n * 255)));
      data[k++] = Math.max(0, Math.min(255, Math.round(n2 * 255)));
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RGFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
