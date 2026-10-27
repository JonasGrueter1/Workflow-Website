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
  // text = [ein0, ein1, aus0, aus1] (p im Beat), scrim = Abdunkeln des Bildes hinter dem Text (FxPass, 0..1)
  { name: 'intro', len: 120, label: 'Start', text: [0, 0, 0.45, 0.7], scrim: 0.32 },
  { name: 'robot', len: 180, label: 'Partner', scrim: 0.42 },
  { name: 'zoom', len: 170, label: 'Einblick', scrim: 0.45 },
  { name: 'brain', len: 150, label: 'Intelligenz', scrim: 0.62 },
  { name: 'cables', len: 190, label: 'Verbindung', text: [0.14, 0.24, 0.46, 0.6], scrim: 0.5 },
  { name: 'dna', len: 210, label: 'Code', text: [0.02, 0.12, 0.4, 0.54], scrim: 0.62 },
  { name: 'outro', len: 160, label: 'Kontakt', scrim: 0.45 },
]);

// Breite der Ueberblendung an Beat-Grenzen (in global-Einheiten, ca. 2.6 vh pro 0.002).
export const BEAT_FADE = 0.02;

// Module (js/scenes/<name>.js) und ihre Zeitfenster. 'beat@p' = Punkt p (0..1) im Beat.
// windows[0] ist das Hauptfenster: daraus kommt `local`. Weitere Fenster halten das Modul nur aktiv.
export const MODULES = Object.freeze({
  particles: { windows: [{ from: 'intro@0', to: 'robot@0.7' }] },
  // robot bleibt bis brain@0.6 aktiv: die Roentgen-Schale (Hologramm) umgibt das Gehirn, bis die Kamera eintaucht
  robot: { windows: [{ from: 'robot@0', to: 'brain@0.6' }, { from: 'outro@0', to: 'outro@1' }] },
  brain: { windows: [{ from: 'zoom@0.3', to: 'cables@1' }] },
  cables: { windows: [{ from: 'brain@0.7', to: 'dna@0.3' }] },
  dna: { windows: [{ from: 'dna@0', to: 'dna@1' }] },
});
export const MODULE_FADE = 0.015;

/* ------------------------------------------------------------ Kamerapfad */
// Keyframes, an Beats verankert. pos = Kameraposition, look = Blickziel, fov = vertikal in Grad.
// posM/lookM: optional fuer Hochformat (Handy). cut: true = harter Schnitt mit Abblende.
export const CAMERA_KEYS = Object.freeze([
  // Hero: lose angedeuteter Kopf mit leuchtendem Kern rechts der Mitte (Hochformat: oberes Drittel), Titel links unten
  { at: 'intro@0', pos: [0.15, 0.32, 13.4], look: [-1.75, -0.3, 0], fov: 30, posM: [0, 0.35, 11.0], lookM: [0, -3.25, 0] },
  { at: 'intro@1', pos: [0.6, 0.3, 12.0], look: [-0.9, -0.3, 0], fov: 31, posM: [0.5, 0.3, 9.6], lookM: [0, -2.1, 0] },
  // Roboter leicht rechts der Mitte, links Platz fuer den Text (Hochformat: zentriert, Text unten)
  { at: 'robot@0.5', pos: [3.6, 0.9, 8.2], look: [-0.32, -0.45, 0.14], fov: 32, lookM: [0, -0.45, 0] },
  { at: 'robot@1', pos: [1.8, 0.45, 5.6], look: [-0.5, -0.15, 0.16], fov: 33, posM: [1.8, 0.45, 6.4], lookM: [0, -1.5, 0] },
  // "Was dahinter steckt": Kopf rechts, die Schale wird durchsichtig. Danach kreist die Kamera vor dem Gesicht vorbei
  // nach vorne links oben: Dreiviertelansicht des Gehirns in der Roentgen-Schale (Stirn, Schlaefe, Kleinhirn lesbar)
  // Hochformat: naeher und hoeher, die Unterkante der Bueste bleibt ausserhalb des Bildes
  { at: 'zoom@0.35', pos: [1.0, 0.32, 4.3], look: [-0.58, 0.02, 0.14], fov: 36, posM: [0.5, 0.4, 4.6], lookM: [0, -1.15, 0] },
  // Waehrend des Roentgen-Scans schon seitlich: das Gehirn ist nie frontal (zwei runde Haelften) zu sehen
  { at: 'zoom@0.5', pos: [-1.5, 0.95, 3.7], look: [-0.45, 0.12, 0], fov: 38, posM: [-1.3, 0.5, 3.9], lookM: [-0.05, -0.8, 0] },
  { at: 'zoom@0.7', pos: [-2.0, 1.35, 3.1], look: [-0.3, 0.12, 0], fov: 39, posM: [-1.6, 0.8, 2.85], lookM: [-0.04, -0.6, -0.05] },
  { at: 'zoom@1', pos: [-2.15, 1.5, 2.85], look: [-0.7, 0.12, -0.12], fov: 40, posM: [-1.68, 1.21, 2.3], lookM: [-0.03, -0.46, -0.1] },
  // Text "Intelligenz" links, Gehirn rechts; dann taucht die Kamera ein, fliegt durch und hinten hinaus.
  // Hochformat: der Kopf fuellt rund 70 % der Bildbreite
  { at: 'brain@0.3', pos: [-1.62, 1.2, 2.18], look: [-0.58, 0.16, -0.12], fov: 40, posM: [-1.6, 1.15, 2.2], lookM: [-0.03, -0.45, -0.1] },
  { at: 'brain@0.55', pos: [-0.5, 0.52, 0.42], look: [0.15, 0.22, -0.5], fov: 54 },
  // Austrittspunkt der Kabel nicht in der Bildmitte, leichte Neigung: liest sich als "Kabel werden gezogen"
  { at: 'brain@0.78', pos: [0.02, 0.32, -0.25], look: [0.25, -0.05, -1.0], fov: 58, roll: 6 },
  { at: 'brain@1', pos: [-0.35, 0.55, -0.85], look: [0, 0, -3], fov: 55, roll: 2.5 },
  // Uebersicht von schraeg oben: Gehirn unten rechts, Kabel laufen nach links zu den Knoten, Text rechts
  // Aufstieg: Blick etwas hoeher, damit der Kalender-Knoten (hoechster Knoten) nie unter der Kopfzeile liegt
  { at: 'cables@0.1', pos: [-2.3, 1.75, -0.1], look: [0.55, 0.78, -3.9], fov: 52 },
  { at: 'cables@0.3', pos: [-6.8, 5.94, 2.23], look: [1.5, 0.5, -5.0], fov: 46, lookM: [1.5, -3.0, -5.0] },
  { at: 'cables@0.5', pos: [-7.4, 6.35, 1.86], look: [1.7, 0.4, -5.2], fov: 45, lookM: [1.7, -3.0, -5.2] },
  { at: 'cables@0.8', pos: [-4.4, 3.15, -2.9], look: [1.2, 1.0, -7.4], fov: 44 },
  // Auf den Website-Knoten zu, schon leicht von links: danach steht die Helix einmal von aussen im Bild
  { at: 'cables@1', pos: [-1.9, 1.05, -7.6], look: [0.15, 0.5, -11.2], fov: 44, posM: [-1.2, 1.2, -7.0], lookM: [0.1, -0.4, -11.5] },
  // Helix von aussen (Dreiviertelansicht von links): zwei Straenge mit Sprossen, klar als Doppelhelix lesbar.
  // Text links, die Helix rechts und nach links in die Tiefe. zTrack: die Kamera ist noch nicht in der Helix
  // (dna-build.js rechnet damit, wann Zeichen hinter der Kamera verloeschen)
  {
    at: 'dna@0.1', pos: [-2.75, 0.95, -11.0], look: [0.5, 0.45, -15.9], fov: 46, zTrack: -9.9,
    posM: [-2.1, 1.6, -9.6], lookM: [0.35, -0.9, -15.0],
  },
  // Kamera schwenkt vor den Anfang der Helix und taucht entlang der Achse ein (nicht durch die Wand)
  {
    at: 'dna@0.21', pos: [-0.55, 0.62, -9.5], look: [-1.0, 0.5, -16], fov: 50, zTrack: -10.0,
    posM: [-0.4, 0.75, -9.4], lookM: [0, 0.1, -16],
  },
  // Eingetaucht: Fluchtpunkt rechts der Mitte, solange links der Text steht
  { at: 'dna@0.33', pos: [0.2, 0.56, -15.0], look: [-1.55, 0.55, -20.5], fov: 50, lookM: [0, 0.5, -20.5] },
  // Uebergang ins Geruest: zuegig nah heran, damit es frueh gross und klar im Bild steht
  { at: 'dna@0.58', pos: [0.1, 0.48, -28.0], look: [0, 0.33, -36], fov: 43 },
  // Geruest fertig: oben im Bild, darunter Platz fuer die Angebotszeile (HTML, js/ui.js setOffer)
  { at: 'dna@0.74', pos: [0, 0.44, -29.25], look: [0, 0.3, -36], fov: 41, posM: [0, 0.5, -28.85], lookM: [0, -0.5, -36] },
  { at: 'dna@1', pos: [0, 0.42, -29.45], look: [0, 0.3, -36], fov: 41, posM: [0, 0.5, -29.05], lookM: [0, -0.5, -36] },
  { at: 'outro@0', cut: true, pos: [0, 0.0, 4.6], look: [0, -0.2, 0], fov: 34, posM: [0, 0.2, 6.5], lookM: [0, -2.25, 0] },
  {
    at: 'outro@1', pos: [-1.9, 0.15, 8.6], look: [-1.1, -0.45, 0], fov: 32,
    posM: [0, 0.4, 9.0], lookM: [0, -3.1, 0],
  },
]);
export const CUT_FADE = 0.008; // halbe Breite des Lichtblitzes um einen Schnitt (global, ca. 9 vh)

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
