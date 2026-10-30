// Kuehle Studio-Umgebung fuer die Spiegelungen des Androiden (nur seine Materialien).
// Grosse kuehle Softbox vorne links oben (weiches Gesichtslicht), Deckenflaeche, zwei Kantenstreifen hinten
// (rechts Eis-Cyan, links kuehles Weiss), ganz kleine warme Flaeche unten rechts (Ember als Gegenakzent),
// dunkelblauer Raum dazwischen.
export function buildAndroidEnv(THREE, renderer, palette) {
  const scene = new THREE.Scene();
  const disposables = [];
  const domeGeo = new THREE.SphereGeometry(30, 32, 16);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uLow: { value: palette.void.clone().multiplyScalar(0.4) },
      uMid: { value: palette.deep.clone().lerp(palette.steel, 0.35) },
      uHigh: { value: palette.ink.clone().multiplyScalar(1.4) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLow, uMid, uHigh;
      varying vec3 vP;
      void main() {
        vec3 c = mix(uLow, uMid, smoothstep(-0.6, 0.0, vP.y));
        c = mix(c, uHigh, smoothstep(0.1, 0.9, vP.y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(domeGeo, domeMat));
  disposables.push(domeGeo, domeMat);

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  disposables.push(planeGeo);
  const panel = (w, h, color, intensity, pos, soft = 0.3) => {
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
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cool = new THREE.Color(0.86, 0.93, 1.0);
  const warm = palette.ember.clone().lerp(new THREE.Color(1, 1, 1), 0.3);
  panel(7.5, 6.0, cool, 1.3, V(-5.5, 3.2, 5.5), 1.0);           // grosse Softbox vorne links oben (Gesicht)
  panel(6.0, 6.0, cool, 0.35, V(1.5, 8.0, -1.5), 1.0);             // Deckenflaeche
  panel(0.9, 8.0, palette.ice, 2.0, V(6.0, 1.0, -3.5), 0.45);     // Kantenstreifen hinten rechts (Cyan)
  panel(0.7, 8.0, cool, 1.3, V(-6.0, 1.0, -3.8), 0.45);           // Kantenstreifen hinten links
  panel(8.0, 0.18, cool, 1.2, V(0.0, 2.2, 7.0), 0.4);             // feine Linie vorne (Glanzkante auf Stirn/Nase)
  panel(1.4, 1.0, warm, 0.6, V(4.5, -2.5, 4.0), 0.8);             // kleiner warmer Gegenakzent unten rechts
  panel(6.0, 1.2, palette.steel, 0.7, V(0.0, -5.0, 2.0), 0.7);    // Bodenreflex
  // schmale Streifen rundum: Metall bekommt Glanzlinien statt nur dunkler Spiegelung
  panel(0.25, 6.0, cool, 1.6, V(-3.0, 1.5, -6.0), 0.5);
  panel(0.25, 6.0, palette.ice, 1.2, V(2.5, 1.0, -6.5), 0.5);
  panel(6.0, 0.25, cool, 1.0, V(0.0, 5.5, -5.0), 0.5);
  panel(3.0, 3.0, palette.mist, 0.5, V(-6.5, -1.0, 0.0), 0.8);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02, 0.1, 60);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return rt;
}
