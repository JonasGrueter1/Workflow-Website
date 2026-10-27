// Zentrale Konstanten fuer die immersive Strecke.
// Alle Szenen-Module lesen Farben, Masse und Zeitfenster von hier (ueber ctx), nie hart codiert.
// Aenderungen hier wirken auf alle Szenen: vorher ARCHITEKTUR.md lesen.
import * as THREE from 'three';

const v = (x, y, z) => Object.freeze(new THREE.Vector3(x, y, z));

/* ------------------------------------------------------------------ Farben */
// Hex-Werte sind sRGB (wie in CSS). THREE.Color rechnet sie beim Setzen in linear um.
export const HEX = Object.freeze({
  void: 0x04060a,      // Hintergrund, Nebel
  deep: 0x070b12,      // tiefe Flaechen
  ink: 0x0d141d,       // dunkle Schale, Paneele
  steel: 0x2a3644,     // Kanten, Linien im Schatten
  mist: 0x8a99a8,      // gedaempfte Linien
  white: 0xe9f2f7,     // fast weiss, kuehl
  signal: 0x46e6ff,    // Akzent: elektrisches Cyan (Licht, Daten, Impulse)
  ice: 0xbdf6ff,       // heller Kern von Cyan-Glow
  ember: 0xffa45c,     // Gegenlicht: warmes Glimmen (Funken, Menschliches)
  emberDeep: 0xff7a2e, // tiefes Warm fuer Kerne
});

// Fertige THREE.Color-Objekte (linear). Nicht veraendern, bei Bedarf .clone().
export const PALETTE = Object.freeze(
  Object.fromEntries(Object.entries(HEX).map(([k, hex]) => [k, new THREE.Color(hex)]))
);

/* ------------------------------------------------------------- Qualitaet */
// particles: Faktor fuer Partikel-/Instanzzahlen. bloomScale: Aufloesung der Bloom-Kette.
export const QUALITY = Object.freeze({
  high: { dprMax: 2, dprMin: 1, msaa: 4, bloomScale: 1, particles: 1, aberration: true },
  medium: { dprMax: 1.5, dprMin: 0.85, msaa: 0, bloomScale: 1, particles: 0.5, aberration: false },
  low: { dprMax: 1, dprMin: 0.7, msaa: 0, bloomScale: 0.75, particles: 0.25, aberration: false },
});

/* ------------------------------------------------- Koordinaten und Masse */
// Y oben, rechtshaendig, Kamera schaut am Anfang Richtung -Z. 1 Einheit ~ 10 cm.
// Der Kopf des Roboters steht im Ursprung, das Gesicht zeigt nach +Z (zur Startkamera).
export const ANCHORS = Object.freeze({
  head: Object.freeze({ center: v(0, 0, 0), radii: v(0.82, 1.0, 0.92) }),
  visor: Object.freeze({ center: v(0, 0.05, 0.86), width: 1.3, height: 0.26 }),
  neck: Object.freeze({ top: v(0, -0.85, -0.05), bottom: v(0, -1.55, -0.1), radius: 0.32 }),
  bust: Object.freeze({ center: v(0, -2.4, -0.15), shoulderWidth: 4.2, bottomY: -3.4 }),
  brain: Object.freeze({ center: v(0, 0.24, -0.06), radii: v(0.6, 0.48, 0.7) }),
  cableRoot: v(0, -0.28, -0.52),
  nodes: Object.freeze({
    email: v(-4.6, 1.8, -6.2),
    kalender: v(4.4, 2.2, -6.6),
    dokumente: v(-3.8, -2.0, -8.4),
    kunden: v(4.0, -1.6, -8.8),
    website: v(0, 0.5, -10.0),
  }),
  nodeRadius: 0.32,
  dna: Object.freeze({ start: v(0, 0.5, -10.4), end: v(0, 0.5, -32), radius: 1.1, turnLength: 4.2 }),
  wireframe: Object.freeze({ center: v(0, 0.5, -36), width: 5.6, height: 3.4 }),
});

/* ------------------------------------------------------- Szenen (Beats) */
// Reihenfolge = Reihenfolge der <section data-scene> in index.html.
// len = Hoehe des Abschnitts in vh. Daraus misst der Director die Zeitfenster (global 0..1).
export const BEATS = Object.freeze([
  { name: 'intro', len: 140, label: 'Start' },
  { name: 'robot', len: 220, label: 'Partner' },
  { name: 'zoom', len: 170, label: 'Einblick' },
  { name: 'brain', len: 200, label: 'Intelligenz' },
  { name: 'cables', len: 220, label: 'Verbindung' },
  { name: 'dna', len: 240, label: 'Code' },
  { name: 'outro', len: 200, label: 'Kontakt' },
]);

// Breite der Ueberblendung an Beat-Grenzen (in global-Einheiten, ca. 2.6 vh pro 0.002).
export const BEAT_FADE = 0.02;

// Module (js/scenes/<name>.js) und ihre Zeitfenster. 'beat@p' = Punkt p (0..1) im Beat.
// windows[0] ist das Hauptfenster: daraus kommt `local`. Weitere Fenster halten das Modul nur aktiv.
export const MODULES = Object.freeze({
  particles: { windows: [{ from: 'intro@0', to: 'robot@0.7' }] },
  robot: { windows: [{ from: 'robot@0', to: 'zoom@1' }, { from: 'outro@0', to: 'outro@1' }] },
  brain: { windows: [{ from: 'zoom@0.3', to: 'cables@1' }] },
  cables: { windows: [{ from: 'brain@0.7', to: 'dna@0.3' }] },
  dna: { windows: [{ from: 'dna@0', to: 'dna@1' }] },
});
export const MODULE_FADE = 0.015;

/* ------------------------------------------------------------ Kamerapfad */
// Keyframes, an Beats verankert. pos = Kameraposition, look = Blickziel, fov = vertikal in Grad.
// posM/lookM: optional fuer Hochformat (Handy). cut: true = harter Schnitt mit Abblende.
export const CAMERA_KEYS = Object.freeze([
  { at: 'intro@0', pos: [0, 0.35, 15.5], look: [0, -0.1, 0], fov: 30 },
  { at: 'intro@1', pos: [0.6, 0.3, 12.0], look: [0, -0.2, 0], fov: 31 },
  { at: 'robot@0.5', pos: [3.6, 0.9, 8.2], look: [0, -0.45, 0], fov: 32 },
  { at: 'robot@1', pos: [1.8, 0.45, 5.6], look: [0, -0.15, 0], fov: 33 },
  { at: 'zoom@0.45', pos: [0.35, 0.2, 3.2], look: [0, 0.12, 0], fov: 38 },
  { at: 'zoom@1', pos: [0, 0.22, 0.7], look: [0, 0.22, -0.4], fov: 52 },
  { at: 'brain@0.5', pos: [0.18, 0.3, -0.05], look: [-0.3, 0.15, -0.55], fov: 60 },
  { at: 'brain@1', pos: [-0.35, 0.55, -0.85], look: [0, 0, -3], fov: 55 },
  { at: 'cables@0.45', pos: [-8.5, 3.0, -3.0], look: [0, 0.2, -4.5], fov: 45 },
  { at: 'cables@1', pos: [0, 0.55, -6.6], look: [0, 0.5, -10], fov: 42 },
  { at: 'dna@0.12', pos: [0, 0.5, -9.7], look: [0, 0.5, -14], fov: 50 },
  { at: 'dna@0.6', pos: [0.5, 0.7, -22], look: [0, 0.5, -27], fov: 50 },
  { at: 'dna@0.85', pos: [0, 0.5, -29.5], look: [0, 0.5, -36], fov: 42 },
  { at: 'dna@1', pos: [0, 0.5, -31.0], look: [0, 0.5, -36], fov: 40 },
  { at: 'outro@0', cut: true, pos: [0, 0.0, 4.6], look: [0, -0.2, 0], fov: 34 },
  {
    at: 'outro@1', pos: [-1.9, 0.15, 8.6], look: [-1.1, -0.45, 0], fov: 32,
    posM: [0, 0.3, 10.5], lookM: [0, -0.9, 0],
  },
]);
export const CUT_FADE = 0.012; // halbe Breite der Abblende um einen Schnitt (global)

// Hochformat: vertikales FOV wird erweitert, damit horizontal genug Bild bleibt.
export const PORTRAIT = Object.freeze({ refAspect: 1.6, exponent: 0.7, maxFactor: 2.4, below: 0.85 });

/* ------------------------------------------------------------------ Look */
// Bildwirkung pro Frame. Module setzen Teilwerte in `module.look`, main mischt nach Gewicht.
export const BASE_LOOK = Object.freeze({
  exposure: 1.0,        // renderer.toneMappingExposure
  bloom: 0.85,          // UnrealBloom strength
  bloomRadius: 0.55,
  bloomThreshold: 0.72, // nur Werte ueber ~0.7 (linear) leuchten: Glow-Farben bewusst > 1 setzen
  aberration: 0.006,    // chromatische Aberration (UV-Versatz in der Ecke ~ 0.35 * Wert)
  vignette: 0.75,
  grain: 0.045,
  fogDensity: 0.035,
  env: 0.35,            // scene.environmentIntensity (Spiegelungen)
  key: 1.3,             // warmes Hauptlicht
  rim: 2.0,             // kuehles Kantenlicht
  amb: 0.12,            // Hemisphaere
  parallax: 0.22,       // Kamera folgt der Maus (Einheiten)
  drift: 0.025,         // ruhiges Schweben der Kamera
  flash: 0,             // additiver Lichtblitz in Signal-Farbe 0..1
  fade: 0,              // Abblende zu Schwarz 0..1
  dim: 0,               // Abdunkeln (Inhaltsbereich) 0..1
});
export const LOOK_KEYS = Object.freeze(Object.keys(BASE_LOOK));

/* --------------------------------------------------------------- Helfer */
// Nominelle Zeitfenster (ohne DOM), z. B. fuer dev.html. Gleiche Formel wie der Director.
export function nominalBeatWindows(beats = BEATS, viewportVh = 100) {
  const total = beats.reduce((s, b) => s + b.len, 0);
  const range = Math.max(1, total - viewportVh);
  let acc = 0;
  const out = {};
  beats.forEach((b, i) => {
    const start = acc / range;
    acc += b.len;
    const end = i === beats.length - 1 ? 1 : Math.min(1, acc / range);
    out[b.name] = { start: Math.min(1, start), end };
  });
  return out;
}
