// Eigene Studio-Umgebung fuer die Spiegelungen des Roboters (nur seine Materialien).
// Schwarzer Raum mit weichen Leuchtflaechen wie im Fotostudio: warme Hauptflaeche vorne rechts,
// Cyan-Streiflicht hinten links, kuehles Streiflicht hinten rechts, Deckenlicht, feine Linie vorne.
// So wirkt die dunkle Schale dunkel, mit klaren, ruhigen Glanzlichtern statt grauem Schleier.
export function buildStudioEnv(THREE, renderer, palette) {
  const scene = new THREE.Scene();
  scene.background = palette.void.clone().multiplyScalar(0.6);
  const disposables = [];

  // Kuppel mit leichtem Verlauf (Horizont minimal heller), damit Schattenseiten nicht tot schwarz sind
  const domeGeo = new THREE.SphereGeometry(30, 32, 16);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uLow: { value: palette.void.clone().multiplyScalar(0.4) },
      uMid: { value: palette.steel.clone().multiplyScalar(0.55) },
      uHigh: { value: palette.deep.clone().multiplyScalar(1.2) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLow, uMid, uHigh;
      varying vec3 vP;
      void main() {
        float y = vP.y;
        vec3 c = mix(uLow, uMid, smoothstep(-0.5, 0.0, y));
        c = mix(c, uHigh, smoothstep(0.05, 0.8, y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(domeGeo, domeMat));
  disposables.push(domeGeo, domeMat);

  // Weiche Leuchtflaeche: Rand faellt sanft ab (keine harten Rechtecke in der Spiegelung)
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  disposables.push(planeGeo);
  const panel = (w, h, color, intensity, pos, soft = 0.25) => {
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uCol: { value: color.clone().multiplyScalar(intensity) }, uSoft: { value: soft } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCol;
        uniform float uSoft;
        varying vec2 vUv;
        void main() {
          vec2 d = abs(vUv - 0.5) * 2.0;
          float m = (1.0 - smoothstep(1.0 - uSoft, 1.0, d.x)) * (1.0 - smoothstep(1.0 - uSoft, 1.0, d.y));
          gl_FragColor = vec4(uCol * m, 1.0);
        }`,
    });
    const m = new THREE.Mesh(planeGeo, mat);
    m.scale.set(w, h, 1);
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
    disposables.push(mat);
    return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const warm = new THREE.Color(1.0, 0.86, 0.72);
  const white = palette.white.clone();
  panel(2.6, 4.4, warm, 2.6, V(4.4, 2.6, 5.0), 0.8);             // Hauptlicht vorne rechts
  panel(1.0, 7.0, palette.signal, 4.0, V(-5.2, 0.6, -3.4), 0.5); // Cyan-Streiflicht hinten links
  panel(0.7, 6.0, palette.ice, 1.6, V(5.4, 0.2, -3.0), 0.5);     // kuehles Streiflicht hinten rechts
  panel(3.6, 3.6, white, 1.1, V(0.0, 7.0, 0.8), 0.6);            // Deckenlicht
  panel(3.0, 2.2, palette.mist, 0.35, V(-4.0, -0.4, 5.0), 0.6);  // schwache Aufhellung vorne links
  panel(7.0, 0.22, white, 1.5, V(0.0, 1.6, 6.5), 0.4);           // feine Linie vorne (Glanzstreifen im Visier)

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02, 0.1, 60);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return rt;
}
