// Szene "robot": eigene Studio-Umgebung fuer die Spiegelungen (nur Materialien dieser Szene).
// Weiche Leuchtflaechen wie im Fotostudio: grosse Decke (Scheitel-Glanz), Fuehrungsflaeche vorne links,
// Aufheller vorne rechts, zwei schmale Streifen hinten (Kantenlicht in Klarlack und Chrom), dunkler Boden.
// Farben nur aus der Palette (white, ice, signal, ember), Helligkeit ueber multiplyScalar.
export function buildStudioEnv(THREE, renderer, palette) {
  const scene = new THREE.Scene();
  const disposables = [];
  const domeGeo = new THREE.SphereGeometry(30, 48, 24);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uLow: { value: palette.void.clone().multiplyScalar(0.4) },
      uMid: { value: palette.mist.clone().multiplyScalar(0.035) },
      uHigh: { value: palette.mist.clone().multiplyScalar(0.03) },
      uBand: { value: palette.mist.clone().lerp(palette.white, 0.5).multiplyScalar(0.55) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLow, uMid, uHigh, uBand;
      varying vec3 vP;
      void main() {
        float y = vP.y;
        vec3 c = mix(uLow, uMid, smoothstep(-0.35, 0.02, y));
        c = mix(c, uHigh, smoothstep(0.1, 0.9, y));
        // Horizontlinie (Hohlkehle): gibt Chrom und Kanten eine ruhige Spiegelung
        c += uBand * exp(-pow((y + 0.04) / 0.07, 2.0)) * (0.55 + 0.45 * smoothstep(0.2, -0.6, vP.z));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(domeGeo, domeMat));
  disposables.push(domeGeo, domeMat);

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  disposables.push(planeGeo);
  const panel = (w, h, color, pos, soft = 0.3) => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uCol: { value: color }, uSoft: { value: soft } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCol; uniform float uSoft;
        varying vec2 vUv;
        void main() {
          vec2 d = abs(vUv - 0.5) * 2.0;
          float a = (1.0 - smoothstep(1.0 - uSoft, 1.0, d.x)) * (1.0 - smoothstep(1.0 - uSoft, 1.0, d.y));
          gl_FragColor = vec4(uCol * a, 1.0);
        }`,
    });
    const m = new THREE.Mesh(planeGeo, mat);
    m.scale.set(w, h, 1);
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    scene.add(m);
    disposables.push(mat);
    return m;
  };
  const white = palette.white.clone();
  const cool = palette.white.clone().lerp(palette.ice, 0.3);
  const coolDeep = palette.white.clone().lerp(palette.signal, 0.22);
  // Fuehrungslicht: grosse Softbox vorne links oben (neutral, kein Ember auf dem Weiss)
  panel(8, 11, white.clone().multiplyScalar(5.4), [-9.5, 4.5, 4.0], 0.45);
  // Aufheller vorne rechts, schwach und gross
  panel(9, 10, white.clone().multiplyScalar(0.22), [8.5, 0.5, 6.5], 0.6);
  // Oberlicht, klein (Scheitel-Glanz)
  panel(11, 11, white.clone().multiplyScalar(0.8), [0, 12, 1], 0.7);
  // Kantenlicht: zwei hohe Streifen hinten links und rechts, dazu ein Balken hinten oben
  panel(2.4, 14, cool.clone().multiplyScalar(4.4), [-8.5, 3, -6.5], 0.3);
  panel(2.4, 14, coolDeep.clone().multiplyScalar(4.0), [8.5, 3, -6.5], 0.3);
  panel(14, 2.6, cool.clone().multiplyScalar(3.0), [0, 8.5, -7.5], 0.4);
  // Glanzlinie oben vorne (Stirn, Chrom)
  panel(10, 1.8, white.clone().multiplyScalar(1.0), [1.5, 7.5, 9], 0.6);
  // Boden: fast schwarz, leicht kuehl
  panel(24, 24, palette.steel.clone().multiplyScalar(0.12), [0, -12, 0], 0.7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return { texture: rt.texture, dispose: () => rt.dispose() };
}

// Hintergrund hinter der Bueste: weicher Lichtkegel von oben hinten und leiser Nebel (kein flaches Navy).
// Eine Flaeche, die zur Kamera zeigt, additiv, ohne Tiefenschreiben. Staerke ueber uAmt (Gewicht der Szene).
export function buildBackdrop(THREE, palette) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAmt: { value: 0 },
      uAsp: { value: 1 },
      uCol: { value: palette.steel.clone().lerp(palette.signal, 0.12).multiplyScalar(0.55) },
      uCore: { value: palette.mist.clone().lerp(palette.ice, 0.3).multiplyScalar(0.16) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uAmt; uniform float uAsp; uniform vec3 uCol; uniform vec3 uCore;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 p = (vUv - vec2(0.5, 0.5)) * vec2(uAsp, 1.0);
        // Lichtkegel: oben schmal, nach unten breiter, weich
        float y = 0.5 - vUv.y;
        float w = 0.05 + 0.32 * clamp(y + 0.15, 0.0, 1.2);
        float cone = exp(-pow(p.x / w, 2.0)) * smoothstep(-0.55, 0.2, p.y) * smoothstep(0.62, 0.15, length(p));
        float halo = exp(-dot(p * vec2(1.6, 1.25), p * vec2(1.6, 1.25)) / 0.035);
        float glow = exp(-dot(p, p) / 0.09);
        vec3 c = uCol * (0.55 * glow + 0.6 * cone) + uCore * halo;
        c += (h(gl_FragCoord.xy) - 0.5) * 0.004;
        gl_FragColor = vec4(c * uAmt, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms: mat.uniforms, dispose() { geo.dispose(); mat.dispose(); } };
}
