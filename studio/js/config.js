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

/* ------------------------------------------------------------ Szene robot */
// ownBackdrop: eigener Hintergrund der Android-Bueste (weicher Lichtkegel und Nebel hinter dem Kopf,
// js/scenes/robot-env.js buildBackdrop). Seit dem globalen Hintergrund-Modul (js/scenes/backdrop.js) aus: dessen
// Farbwelt "robot" uebernimmt das Studio-Gegenlicht hinter der Bueste. Ohne Code-Aenderung vergleichen: index.html
// oder dev.html mit ?robotbg=1 (alter Hintergrund zusaetzlich an) bzw. ?robotbg=0.
export const ROBOT = Object.freeze({ ownBackdrop: false });

/* ------------------------------------------------------- Hintergrund */
// Farbwelten des Hintergrund-Moduls (js/scenes/backdrop.js), eine pro Beat plus "inhalt" (Inhaltsbereich).
// backdrop.js mischt sie nach dem Fortschritt: weiche Kante BACKDROP_FADE (global) um jede Beat-Grenze, am Schnitt
// (Ende Code -> Ausklang) ein harter Wechsel im Lichtblitz, im Inhaltsbereich nach director.content zu "inhalt".
// Farben sRGB-Hex (wie HEX), gemischt wird linear. Punkte in Weltkoordinaten (ANCHORS):
//   glowAt     Gegenlicht-Halo liegt (vom Auge aus) hinter diesem Punkt, glowShift verschiebt ihn im Bild
//              (Anteil, x rechts, y oben). So bleibt das Licht beim Kreisen der Kamera hinter dem Motiv.
//   rayAt      Quelle der Lichtstrahlen (darf ausserhalb des Bildes liegen, die Strahlen fallen dann ins Bild)
//   accentAt   Richtung des Akzent-Dunsts (accent, meist ein warmer oder kuehler Gegenpol)
// Mengen 0..1 (Helligkeit linear, Kapitel 12 in ARCHITEKTUR.md). Fehlende Schluessel kommen aus `base` in backdrop.js.
// Kontrast-Regel: base unter 0.006, mid unter 0.025 relative Leuchtdichte; helle Teile (glow, rays, horizonGlow) nur
// auf der Seite des Motivs, nie hinter der Textspalte.
export const BACKDROP_FADE = 0.035;
export const BACKDROPS = Object.freeze({
  // Tiefsee-Petrol: Nebel, Lichtstrahlen von oben (aus der Richtung des Lichtkegels der Partikel), Staub
  intro: {
    base: 0x03121a, mid: 0x072a35, hi: 0x1f6f7c, accent: 0x2b1a10, fogColor: 0x04161d,
    rayColor: 0x8fe3ee, starColor: 0xbdf6ff,
    glowAt: [0.3, -0.6, 0], glowShift: [0.02, 0.1], rayAt: [2.6, 10.5, -3.0], accentAt: [14, -6, -12],
    horizon: -0.02, horizonGlow: 0.2, glow: 0.42, glowSize: 1.3,
    fog: 0.9, fogScale: 1.0, fogSpeed: 0.004, rays: 1.0, rayFreq: 7, stars: 0.5, dust: 0.5, bokeh: 0.12,
  },
  // Kuehles Fotostudio passend zur Android-Bueste: weiches Gegenlicht hinter dem Kopf, leiser Dunst, breite
  // schraege Lichtbahnen von oben rechts (Seite des Kantenlichts), fast statisch
  robot: {
    base: 0x060c14, mid: 0x0f1d2c, hi: 0x3d6e93, accent: 0x14100c, fogColor: 0x070d15,
    rayColor: 0x6f9fc0, starColor: 0xbdf6ff,
    glowAt: [0, -0.35, 0], glowShift: [0.0, 0.06], rayAt: [6, 9, -7], accentAt: [-12, -4, 8],
    horizon: -0.12, horizonGlow: 0.12, glow: 0.95, glowSize: 1.7,
    fog: 0.35, fogScale: 0.8, fogSpeed: 0.002, rays: 0.28, rayFreq: 3, dust: 0.12,
  },
  // Scan-Labor: wie das Studio, dazu Messraster, Scanlinie und Messkreis (steigen mit dem Roentgen-Scan)
  zoom: {
    base: 0x04101a, mid: 0x0a2532, hi: 0x2a8fa8, accent: 0x0f4a5a, fogColor: 0x05141c,
    rayColor: 0x6fbfd0, gridColor: 0x2aa6bf, starColor: 0xbdf6ff,
    glowAt: [0, -0.2, 0], glowShift: [0.0, 0.04], rayAt: [6, 9, -7], accentAt: [0, -10, -10],
    horizon: -0.08, horizonGlow: 0.15, glow: 0.8, glowSize: 1.5,
    fog: 0.4, fogScale: 0.9, fogSpeed: 0.003, rays: 0.12, rayFreq: 3, grid: 0.12, dust: 0.1,
  },
  // Biolumineszenz: violetter Nebel, dessen Schwaden selbst leuchten (magenta, Raender tuerkis), Sporen; das Gehirn
  // bleibt Cyan davor. Gegenlicht hinter dem Hinterkopf (die Kamera taucht spaeter genau dorthin)
  brain: {
    base: 0x090518, mid: 0x1b0c33, hi: 0x7434a8, accent: 0x102a30, fogColor: 0x0b0716,
    auroraA: 0x6a2fd8, auroraB: 0xb8338a, auroraEdge: 0x2fb7b0, starColor: 0x8fe8e0, bokehColor: 0xb8338a,
    glowAt: [0, 0.35, -1.6], glowShift: [0.04, 0.04], rayAt: [0, 10, -10], accentAt: [-6, -8, -14],
    horizon: -0.05, horizonGlow: 0.1, glow: 0.75, glowSize: 1.5,
    fog: 0.75, fogScale: 1.2, fogSpeed: 0.006, aurora: 1.0, dust: 0.35, bokeh: 0.18,
  },
  // Glasfaser-Blau: tiefe Ebene weit unten mit Lichtpaketen auf feinen Bahnen, Bokeh, Sterne; Licht hinter dem
  // Website-Knoten (dort geht die Reise weiter)
  cables: {
    base: 0x030916, mid: 0x0a1a33, hi: 0x2a63b8, accent: 0x0a1f40, fogColor: 0x040b1a,
    streakColor: 0x46e6ff, gridColor: 0x1d4f8f, bokehColor: 0x3a7fe0, starColor: 0xbdf6ff,
    glowAt: [0, 0.5, -14], glowShift: [0, 0], rayAt: [0, 10, -10], accentAt: [10, -10, -20],
    horizon: -0.04, horizonGlow: 0.3, glow: 0.55, glowSize: 1.4,
    fog: 0.3, fogScale: 1.0, fogSpeed: 0.004, streaks: 0.45, bokeh: 0.3, stars: 0.25,
    floor: 0.85, floorY: -9, floorGrid: 2.2, floorShine: 0.8,
  },
  // Code-Raum Gruen-Tuerkis: leiser Code-Regen auf der Tunnelwand, Lichtkern beim Website-Geruest (-z)
  dna: {
    base: 0x02100e, mid: 0x05302a, hi: 0x17a888, accent: 0x0a3a30, fogColor: 0x03130f,
    codeColor: 0x1fd1a5, starColor: 0xbdf6ff,
    glowAt: [0, 0.5, -60], glowShift: [0, 0], rayAt: [0, 10, -10], accentAt: [0, -10, -30],
    horizon: 0, horizonGlow: 0.2, glow: 0.6, glowSize: 1.2,
    fog: 0.3, fogScale: 1.1, fogSpeed: 0.004, code: 0.06, dust: 0.15,
  },
  // Morgenlicht: goldenes Horizontgluehen hinter den Schultern rechts (nie hinter dem Kontakt-Text links), Strahlen
  // von rechts oben, Goldstaub, oben kuehl
  outro: {
    base: 0x0a0908, mid: 0x21170f, hi: 0xe0a05a, accent: 0x1d3550, fogColor: 0x110c08,
    rayColor: 0xffd29a, starColor: 0xffd7a0,
    glowAt: [0.4, -1.3, -0.6], glowShift: [0.3, -0.05], rayAt: [9, 6, -10], accentAt: [-6, 30, -4],
    horizon: -0.12, horizonGlow: 0.8, glow: 0.42, glowSize: 1.5,
    fog: 0.35, fogScale: 0.9, fogSpeed: 0.003, rays: 0.4, rayFreq: 5, dust: 0.3,
  },
  // Inhaltsbereich: ruhig, nur Verlauf und ein Rest Waerme
  inhalt: {
    base: 0x05080d, mid: 0x0a0f16, hi: 0x2a1c12, accent: 0x000000, fogColor: 0x05080d,
    glowAt: [1.4, -1.7, -1.0], glowShift: [0.06, 0.0], horizon: -0.1, horizonGlow: 0.3, glow: 0.2, glowSize: 1.6,
    detail: 0.1,
  },
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
  // Hintergrund hinter allem: immer aktiv (Gewicht 1), Farbwelten aus BACKDROPS
  backdrop: { windows: [{ from: 'intro@0', to: 'outro@1' }] },
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
  // Android-Bueste in Dreiviertelansicht von rechts vorne (+x): das Gesicht wendet sich dem Text links zu, die Bueste
  // steht rechts der Mitte. Danach kreist die Kamera ruhig auf derselben Seite weiter (Hochformat: Bueste oben, Text unten)
  {
    at: 'robot@0.5', pos: [4.2, 0.75, 7.4], look: [-0.98, -0.69, 0.58], fov: 31,
    lookM: [0.18, -2.8, 0.3],
  },
  {
    at: 'robot@1', pos: [6.3, 0.55, 3.9], look: [-0.54, -0.63, 0.78], fov: 32,
    lookM: [0.24, -2.48, 0.05],
  },
  // "Was dahinter steckt": Profil von schraeg hinten, solange der Text steht. Gesicht blickt nach links zum Text,
  // rechts im Bild der offene Hinterkopf mit Schaedelgitter, Glaskappe und Kabeln.
  {
    at: 'zoom@0.22', pos: [7.0, 0.45, -2.3], look: [0.23, -0.46, 0.61], fov: 30,
    posM: [7.0, 0.5, -2.3], lookM: [0.18, -1.89, -0.35],
  },
  {
    at: 'zoom@0.38', pos: [6.6, 0.55, -1.9], look: [0.19, -0.41, 0.59], fov: 31,
    posM: [6.6, 0.6, -1.95], lookM: [0.2, -1.8, -0.35],
  },
  // Roentgen-Scan (zoom@0.3 bis 0.84): die Kamera kommt seitlich nach vorne oben, das Gehirn erscheint in seiner
  // Hardware (Seitenansicht, nie frontal), am Ende Dreiviertelansicht von vorne rechts oben
  {
    at: 'zoom@0.6', pos: [4.3, 0.95, 0.6], look: [-0.07, -0.16, 0.33], fov: 34,
    posM: [4.4, 1.0, 0.6], lookM: [0.25, -1.11, -0.06],
  },
  {
    at: 'zoom@0.8', pos: [3.2, 1.15, 1.7], look: [-0.2, 0.04, 0.26], fov: 37,
    posM: [3.6, 1.25, 2.0], lookM: [0.25, -0.94, 0.04],
  },
  {
    at: 'zoom@1', pos: [2.3, 1.35, 2.55], look: [-0.44, 0.14, 0.26], fov: 40,
    posM: [2.3, 1.5, 3.0], lookM: [0.22, -0.9, 0.19],
  },
  // Text "Intelligenz" links, Gehirn rechts; dann taucht die Kamera ein, fliegt durch und hinten hinaus.
  // Hochformat: der Kopf fuellt rund 70 % der Bildbreite
  // (Seit dem Einbau der Android-Bueste von vorne rechts, gleiche Seite wie Roboter und Zoom.)
  { at: 'brain@0.3', pos: [1.62, 1.2, 2.18], look: [-0.42, 0.12, 0.21], fov: 40, posM: [1.9, 1.35, 2.6], lookM: [0.18, -0.7, 0.15] },
  { at: 'brain@0.55', pos: [0.5, 0.52, 0.42], look: [-0.15, 0.22, -0.5], fov: 54 },
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
  // Ausklang: Schnitt auf das Gesicht (die Augen erwachen im Lichtblitz), dann zieht die Kamera langsam zurueck in eine
  // ruhige Dreiviertelansicht leicht von unten: die Bueste rechts, der Blick zum Kontakt links (Hochformat: Bueste oben)
  { at: 'outro@0', cut: true, pos: [0.5, 0.05, 4.5], look: [-0.22, -0.27, 0.03], fov: 34, posM: [0.4, 0.2, 6.0], lookM: [0.01, -1.95, 0.09] },
  {
    at: 'outro@1', pos: [3.7, -0.3, 7.9], look: [-1.19, -0.75, 0.56], fov: 31,
    posM: [3.4, 0.1, 8.4], lookM: [0.06, -2.83, 0.15],
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
