// Beschriftungen und Markierungen des Roboters (Version 2): eine Atlas-Textur aus einem Canvas (Geist Mono),
// darauf Kennzeichnungen ("JG-01", "MK II", "KI-EINHEIT", "SERVICE", ...), ein Punkt-Raster (wie Data-Matrix),
// ein Warndreieck und eine Skala. Gezeichnet als kleine Flaechen auf der Oberflaeche (InstancedMesh, ein Draw Call).
// Die Matrizen rechnet robot.js pro Frame (Kopfbewegung, Plattenversatz), wie bei den Schrauben.
import { mulberry32 } from './robot-geometry.js';

const ENTRIES = [
  { key: 'JG-01', text: 'JG-01' },
  { key: 'MK II', text: 'MK II' },
  { key: 'LU 01', text: 'LU 01' },
  { key: 'KI-EINHEIT', text: 'KI-EINHEIT' },
  { key: 'SERVICE', text: 'SERVICE' },
  { key: 'NICHT ÖFFNEN', text: 'NICHT ÖFFNEN' },
  { key: '0.8 Nm', text: '0.8 Nm' },
  { key: 'matrix', draw: 'matrix', w: 64 },
  { key: 'warn', draw: 'warn', w: 64 },
  { key: 'scale', draw: 'scale', w: 160 },
];

/** Atlas (1024 x 256) zeichnen. Wartet kurz auf die Schrift (hoechstens 1.2 s), sonst monospace. */
export async function buildDecalAtlas(THREE) {
  const W = 1024;
  const H = 256;
  const ROW = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.race([document.fonts.load('500 44px "Geist Mono"'), new Promise((r) => setTimeout(r, 1200))]);
    }
  } catch (e) { /* Schrift fehlt: monospace */ }
  const font = '500 44px "Geist Mono", ui-monospace, monospace';
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.font = font;
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  const rects = {};
  let x = 4;
  let y = 0;
  const rnd = mulberry32(77);
  for (const e of ENTRIES) {
    const w = e.draw ? e.w : Math.ceil(g.measureText(e.text).width) + 12;
    if (x + w > W - 4) { x = 4; y += ROW; }
    if (e.draw === 'matrix') {
      // 12 x 12 Punkte, Rand voll (Suchmuster), innen zufaellig
      const n = 12;
      const c = (ROW - 8) / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const edge = i === 0 || j === n - 1 || (j === 0 && i % 2 === 0) || (i === n - 1 && j % 2 === 0);
          if (edge || rnd() > 0.52) g.fillRect(x + 4 + i * c, y + 4 + j * c, c * 0.92, c * 0.92);
        }
      }
    } else if (e.draw === 'warn') {
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x + 32, y + 6); g.lineTo(x + 60, y + 58); g.lineTo(x + 4, y + 58); g.closePath();
      g.stroke();
      g.fillRect(x + 29.5, y + 24, 5, 18);
      g.fillRect(x + 29.5, y + 46, 5, 5);
    } else if (e.draw === 'scale') {
      for (let i = 0; i <= 20; i++) {
        const lx = x + 6 + i * 7.4;
        const lh = i % 10 === 0 ? 40 : i % 5 === 0 ? 28 : 16;
        g.fillRect(lx, y + 56 - lh, 2.4, lh);
      }
    } else {
      g.fillText(e.text, x + 6, y + ROW / 2 + 2);
    }
    rects[e.key] = { u0: x / W, v0: 1 - (y + ROW) / H, u1: (x + w) / W, v1: 1 - y / H, aspect: w / ROW };
    x += w + 8;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return { texture: tex, rects };
}

/**
 * Decal-Mesh. list: [{ key, p, n, t (Schriftrichtung), h (Hoehe), col (THREE.Color linear), engraved, head, panel }]
 * Die Instanz-Matrizen setzt robot.js pro Frame (setMatrixAt). Die Basis-Matrizen stehen in `base`.
 */
export function buildDecalMesh(THREE, atlas, list, U, MASK, NOISE) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.deleteAttribute('normal');
  const n = list.length;
  const rect = new Float32Array(n * 4);
  const col = new Float32Array(n * 4);
  const base = [];
  const x = new THREE.Vector3();
  const y = new THREE.Vector3();
  list.forEach((d, i) => {
    const r = atlas.rects[d.key];
    rect.set([r.u0, r.v0, r.u1, r.v1], i * 4);
    col.set([d.col.r, d.col.g, d.col.b, d.engraved ? 1 : 0], i * 4);
    x.copy(d.t).normalize();
    y.crossVectors(d.n, x).normalize();
    x.crossVectors(y, d.n).normalize();
    const w = d.h * r.aspect;
    const m = new THREE.Matrix4().makeBasis(x.clone().multiplyScalar(w), y.clone().multiplyScalar(d.h), d.n.clone().multiplyScalar(1));
    m.setPosition(d.p.clone().addScaledVector(d.n, 0.0009));
    base.push(m);
  });
  geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(rect, 4));
  geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 4));
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uAtlas: { value: atlas.texture } }]);
  uniforms.uAtlas.value = atlas.texture;
  for (const k of Object.keys(U)) uniforms[k] = U[k];
  const mat = new THREE.ShaderMaterial({
    name: 'robot-decals',
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute vec4 aRect;
      attribute vec4 aCol;
      varying vec2 vUv;
      varying vec4 vCol;
      varying vec3 vRW;
      varying vec3 vN;
      void main() {
        vUv = mix(aRect.xy, aRect.zw, uv);
        vCol = aCol;
        vec4 w = instanceMatrix * vec4(position, 1.0);
        vRW = w.xyz;
        vN = normalize(normalMatrix * normalize(mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0)));
        vec4 mvPosition = modelViewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      ${NOISE}
      ${MASK}
      uniform sampler2D uAtlas;
      varying vec2 vUv;
      varying vec4 vCol;
      varying vec3 vRW;
      varying vec3 vN;
      void main() {
        float edge;
        if (rbMask(vRW, 1.0, edge) < 0.0) discard;
        float a = texture2D(uAtlas, vUv).a;
        if (a < 0.02) discard;
        float lit = 0.45 + 0.55 * max(dot(normalize(vN), normalize(vec3(-0.5, 0.6, 0.7))), 0.0);
        vec3 c = vCol.rgb * lit;
        gl_FragColor = vec4(c, a * (vCol.a > 0.5 ? 0.75 : 0.92));
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  base.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return { mesh, base, geo, mat };
}
