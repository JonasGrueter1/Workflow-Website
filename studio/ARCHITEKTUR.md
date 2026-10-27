# Studio: Architektur und Schnittstellen (Version 1)

Immersive Website von Jonas Grüter. Diese Datei ist der Vertrag zwischen Fundament und Szenen-Entwicklern.
Wer eine Szene baut, ändert nur seine Datei `js/scenes/<name>.js`. Alles andere läuft über die Schnittstellen unten.

## 1. Dateien

```
studio/
  index.html            Seite: echte HTML-Inhalte, importmap, Canvas fix im Hintergrund, Preloader
  dev.html              Testseite: eine Szene isoliert, Regler für local, Kamerapfad oder Orbit
  css/style.css         Design-System (Tokens, Typo, Raster, Story-Panels, Inhalt, Formular, Fallback)
  js/config.js          ALLE Konstanten: Farben, Qualitätsstufen, Masse (ANCHORS), Beats, Modul-Fenster, Kamera-Keys, Look
  js/engine.js          Renderer, Licht, Umgebung, Postprocessing, Resize, Maus, adaptive Auflösung
  js/director.js        Scroll -> global 0..1 -> Beats, Modul-Fenster, Kamerapfad, CSS-Variablen der Panels
  js/runner.js          Szenen laden, pro Frame aktivieren/updaten, Looks mischen (gleich für Seite und dev.html)
  js/main.js            Seite starten: Fallback-Entscheid, Preloader, Loop, Pause bei verstecktem Tab
  js/ui.js              Ohne three.js: Preloader, Cursor, Navigation, HUD, Einblendungen, Kontaktformular
  js/dev.js             Logik von dev.html
  js/fx/FxPass.js       Eigener Bild-Pass: chromatische Aberration, Vignette, Filmkorn, Blitz, Abblende, Abdunkeln
  js/scenes/*.js        particles, robot, brain, cables, dna (zurzeit PLATZHALTER mit einfachen Formen)
  assets/fonts/         Geist (variabel 300..700) und Geist Mono (variabel 400..600), latin, woff2, OFL
  vendor/               three r170 (ES-Module) und GSAP 3.12.5 + ScrollTrigger (UMD, global window.gsap)
```

Ablauf pro Frame (js/main.js):

1. `engine.updatePointer` (Maus geglättet)
2. `director.pullScroll()` und `director.update(dt)`: global, Beats, Modul-Zustände, Kamerapose
3. `director.applyCamera(camera, pointer, look)`: Pfad + Maus-Parallax + ruhiges Schweben
4. `runner.step(time, dt)`: Module aktivieren, `update(...)` aufrufen, `look` mischen
5. `engine.applyLook(look)` und `engine.render()`: RenderPass -> UnrealBloom -> OutputPass (ACES + sRGB) -> FxPass

## 2. Szenen-Modul

Jede Szene ist ein ES-Modul `js/scenes/<name>.js` mit genau diesem Export:

```js
export function create(ctx) {           // darf auch async sein (Promise)
  const group = new ctx.THREE.Group();
  // ... Geometrie, Materialien, Shader EINMAL hier erzeugen
  return {
    group,                               // Pflicht: wird von main in die Szene gehängt
    look: { bloom: 1.1 },                // optional: Bildwirkung, wird nach Gewicht gemischt (Kapitel 6)
    update(time, dt, local, global, weight) { ... },   // Pflicht, nur aufgerufen solange aktiv
    setActive(active) { ... },           // Pflicht (darf leer sein)
    dispose() { ... },                   // Pflicht: Geometrien, Materialien, Texturen freigeben
  };
}
```

Parameter von `update`:

| Name | Bedeutung |
| --- | --- |
| `time` | Sekunden seit Start, läuft nicht weiter, wenn der Tab versteckt ist |
| `dt` | Sekunden seit letztem Frame, begrenzt auf höchstens 0.05 |
| `local` | Fortschritt 0..1 im **Hauptfenster** der Szene (`MODULES[name].windows[0]`) |
| `global` | gedämpfter Gesamtfortschritt 0..1 der Story |
| `weight` | 0..1, Sichtbarkeit inkl. Überblendung an den Fensterrändern. Für Deckkraft/Alpha verwenden |

`setActive(bool)` wird bei jedem Wechsel aufgerufen. `group.visible` setzt der Runner selbst, die Szene muss das nicht tun.
Wirft `update` einen Fehler, blendet der Runner die Szene aus und meldet es einmal in der Konsole. Die Seite läuft weiter.

### ctx

| Feld | Inhalt |
| --- | --- |
| `THREE` | three.js r170 (Addons per `import ... from 'three/addons/...'`) |
| `renderer`, `scene`, `camera` | Nur lesen. Kamera gehört dem Director, nie selbst bewegen |
| `quality` | `'high'`, `'medium'` oder `'low'` |
| `tier` | Werte der Stufe aus `QUALITY`, wichtig: `tier.particles` (1, 0.5, 0.25) als Faktor für Mengen |
| `isMobile` | Touch-Gerät oder schmal |
| `pointer` | `{ x, y }` roh und `{ sx, sy }` geglättet, je -1..1 (y oben), `vx, vy` Geschwindigkeit. Auf Touch: sanftes Eigenleben |
| `palette` | `THREE.Color` (linear) aus `HEX`. Nie verändern, für Glow `.clone().multiplyScalar(2..5)` |
| `anchors` | Masse und Positionen (Kapitel 3). Vektoren sind eingefroren: immer `.clone()` |
| `director` | `director.beat('zoom')` -> `{ start, end, p, w }`, `director.module('robot')`, `director.global`, `director.cutFade` |
| `shared` | gemeinsame Uniforms: `uTime`, `uResolution` (Pixel inkl. DPR), `uPixelRatio`. Objekt direkt in eigene Uniforms hängen |
| `envMap` | PMREM-Umgebung (prozedural), ist schon `scene.environment` |
| `lights` | `{ key, rim, amb }`: feste Lichter. Intensität nur über `look.key/rim/amb` steuern |
| `overlay` | DOM-Ebene über dem Canvas für Beschriftungen (Klasse `.gl-label`), z. B. Werkzeug-Namen bei den Kabeln |
| `size` | `{ width, height, dpr }` aktuell |
| `onResize(fn)` | Rückruf `fn(width, height, dpr)`, gibt eine Abmelde-Funktion zurück |
| `time` | aktuelle Zeit (gleich wie `time` in update) |
| `dev` | `true` in dev.html |

## 3. Koordinatensystem und Massstab

- Y zeigt nach oben, rechtshändig. Die Startkamera steht auf +Z und schaut Richtung -Z.
- 1 Einheit entspricht etwa 10 cm. Der Kopf ist also rund 2 Einheiten hoch.
- **Der Kopf des Roboters steht im Ursprung**, das Gesicht (Visier) zeigt nach +Z.
- Alle Werte stehen in `js/config.js` unter `ANCHORS`. Nie Zahlen doppelt hart codieren.

| Anker | Wert | Bedeutung |
| --- | --- | --- |
| `head.center` | (0, 0, 0) | Kopfmitte |
| `head.radii` | (0.82, 1.0, 0.92) | Halbachsen des Kopf-Ellipsoids (Breite 1.64, Höhe 2.0, Tiefe 1.84) |
| `visor.center` | (0, 0.05, 0.86) | Mitte des Visiers auf der Vorderseite, Breite 1.3, Höhe 0.26 |
| `neck.top` / `neck.bottom` | (0, -0.85, -0.05) / (0, -1.55, -0.1) | Hals, Radius 0.32 |
| `bust.center` | (0, -2.4, -0.15) | Schulterpartie, Schulterbreite 4.2, Unterkante y = -3.4 |
| `brain.center` | (0, 0.24, -0.06) | Gehirn im Kopf, Halbachsen (0.6, 0.48, 0.7), liegt ganz im Kopf |
| `cableRoot` | (0, -0.28, -0.52) | Hirnstamm: hier treten die Kabel aus (hinten unten am Gehirn) |
| `nodes.email` | (-4.6, 1.8, -6.2) | Werkzeug-Knoten hinter dem Kopf, Radius `nodeRadius` 0.32 |
| `nodes.kalender` | (4.4, 2.2, -6.6) | |
| `nodes.dokumente` | (-3.8, -2.0, -8.4) | |
| `nodes.kunden` | (4.0, -1.6, -8.8) | |
| `nodes.website` | (0, 0.5, -10.0) | Mittlerer Knoten: hier taucht die Kamera in die Faser ein |
| `dna.start` / `dna.end` | (0, 0.5, -10.4) / (0, 0.5, -32) | Achse der Doppelhelix (entlang -Z), Radius 1.1, eine Windung pro 4.2 |
| `wireframe.center` | (0, 0.5, -36) | Website-Gerüst am Ende der Helix, 5.6 x 3.4, Fläche zeigt nach +Z |

Seitenansicht (Y nach oben, Z nach rechts = zur Startkamera):

```
  y
  2 |                       email/kalender (y 1.8..2.2, z -6.2..-6.6)
  1 |   wireframe   helix (r 1.1)          website    .-head-.
  0 |   [z -36]  ~~~~~~~~~~~~~~~~~~~~~~~~~~  (z -10)  ( brain )|visor  ....... Kamera Start (0, 0.35, 15.5)
 -1 |                                                 '-neck-'
 -2 |                       dokumente/kunden (y -2..-1.6)   bust
    +---------------------------------------------------------------------------------> z
     -36            -32                    -10   -6     -1   0   1                15.5
```

Draufsicht: Knoten auf einem Bogen hinter dem Kopf, Website-Knoten genau auf der Achse x = 0, DNA dahinter auf derselben Achse.

Kamera: `near` 0.01, `far` 220. Im Kopf und im Gehirn arbeitet die Kamera mit Abständen um 0.1 bis 1.

## 4. Zeitfenster

### Beats (Abschnitte der Story)

Jeder `<section data-scene="...">` in index.html ist ein Beat. Seine Höhe kommt aus `BEATS[].len` (in vh, als CSS-Variable `--len`).
Der Director misst die Abschnitte und rechnet Start/Ende in `global` um. Nominalwerte (1440 x 900, Standardlängen):

| Beat | len (vh) | start | end | Inhalt |
| --- | --- | --- | --- | --- |
| intro | 140 | 0.0000 | 0.1085 | schwebende Partikel, Titel |
| robot | 220 | 0.1085 | 0.2791 | Partikel formen den Roboter, Maus-Reaktion |
| zoom | 170 | 0.2791 | 0.4109 | Flug auf den Kopf, Schale wird transparent, Eintauchen |
| brain | 200 | 0.4109 | 0.5659 | neuronales Gehirn, Impulse |
| cables | 220 | 0.5659 | 0.7364 | Kabel werden gezogen, Knoten der Werkzeuge |
| dna | 240 | 0.7364 | 0.9225 | Flug in den Website-Knoten, Helix aus Code, Website-Gerüst |
| outro | 200 | 0.9225 | 1.0000 | Schnitt, Roboter wieder ganz und ruhig, Kontakt |

Formel: `start = top / (storyHeight - vh)`, `end = (top + height) / (storyHeight - vh)`, der letzte Beat endet bei 1.
`director.beat(name)` liefert `p` (0..1 im Beat, gedämpft) und `w` (Gewicht mit Überblendung `BEAT_FADE` = 0.02).

### Fenster der Module

In `MODULES` als `'beat@p'` definiert (p = Punkt im Beat). Nominal:

| Modul | Hauptfenster (local 0..1) | weitere Fenster | global nominal |
| --- | --- | --- | --- |
| particles | intro@0 bis robot@0.7 | | 0.0000 bis 0.2279 |
| robot | robot@0 bis zoom@1 | outro@0 bis outro@1 | 0.1085 bis 0.4109, 0.9225 bis 1 |
| brain | zoom@0.3 bis cables@1 | | 0.3186 bis 0.7364 |
| cables | brain@0.7 bis dna@0.3 | | 0.5194 bis 0.7922 |
| dna | dna@0 bis dna@1 | | 0.7364 bis 0.9225 |

- Ein Modul ist aktiv, solange eines seiner Fenster Gewicht > 0 hat (Rampe `MODULE_FADE` = 0.015 an beiden Enden).
- Für genaues Timing innerhalb der Geschichte lieber `ctx.director.beat('zoom').p` verwenden als `local`.
  Beispiel Roboter: Schale transparent machen mit `beat('zoom').p`, Ausklang mit `beat('outro').p`.
- Fenster nur in `config.js` ändern und hier nachführen.

## 5. Kamerapfad

`CAMERA_KEYS` in config.js: Keyframes an Beats verankert, `pos` (Position), `look` (Blickziel), `fov` (vertikal, Grad).

- Pro Schnitt-Abschnitt (Shot) je eine `CatmullRomCurve3` (centripetal) für Position und Blickziel.
- Zeit -> Kurve über Bogenlänge und monotone kubische Interpolation: die Geschwindigkeit bleibt über Keyframes stetig, kein Ruckeln.
- `cut: true` startet einen neuen Shot (harter Schnitt). Darum blendet der Director automatisch ab (`CUT_FADE` 0.012 je Seite, `look.fade`).
  Zurzeit gibt es einen Schnitt: Ende DNA -> Ausklang beim Roboter.
- `posM` / `lookM`: eigene Werte fürs Hochformat (Seitenverhältnis unter 0.85). Zusätzlich wird im Hochformat das FOV
  erweitert (`PORTRAIT`), damit horizontal genug Bild bleibt.
- Danach kommen Maus-Parallax (`look.parallax`, Einheiten) und ruhiges Schweben (`look.drift`).
- Dämpfung: `global` folgt dem Scroll mit `lambda` 4.2 (bei grossen Sprüngen schneller). Die Szenen bekommen immer den gedämpften Wert.

Verlauf (Entwurf, darf von der Integration feinjustiert werden):

| Key | pos | look | fov | Notiz |
| --- | --- | --- | --- | --- |
| intro@0 | (0, 0.35, 15.5) | (0, -0.1, 0) | 30 |  |
| intro@1 | (0.6, 0.3, 12) | (0, -0.2, 0) | 31 |  |
| robot@0.5 | (3.6, 0.9, 8.2) | (0, -0.45, 0) | 32 |  |
| robot@1 | (1.8, 0.45, 5.6) | (0, -0.15, 0) | 33 |  |
| zoom@0.45 | (0.35, 0.2, 3.2) | (0, 0.12, 0) | 38 |  |
| zoom@1 | (0, 0.22, 0.7) | (0, 0.22, -0.4) | 52 | im Kopf, hinter dem Visier |
| brain@0.5 | (0.18, 0.3, -0.05) | (-0.3, 0.15, -0.55) | 60 | mitten im Gehirn |
| brain@1 | (-0.35, 0.55, -0.85) | (0, 0, -3) | 55 | hinten aus dem Gehirn, Blick zu den Knoten |
| cables@0.45 | (-8.5, 3, -3) | (0, 0.2, -4.5) | 45 | Übersicht: Gehirn links, Knoten rechts |
| cables@1 | (0, 0.55, -6.6) | (0, 0.5, -10) | 42 | auf den Website-Knoten zu |
| dna@0.12 | (0, 0.5, -9.7) | (0, 0.5, -14) | 50 | im Knoten, Helix beginnt |
| dna@0.6 | (0.5, 0.7, -22) | (0, 0.5, -27) | 50 |  |
| dna@0.85 | (0, 0.5, -29.5) | (0, 0.5, -36) | 42 |  |
| dna@1 | (0, 0.5, -31) | (0, 0.5, -36) | 40 | Website-Gerüst füllt das Bild |
| outro@0 (Schnitt) | (0, 0, 4.6) | (0, -0.2, 0) | 34 |  |
| outro@1 | (-1.9, 0.15, 8.6) | (-1.1, -0.45, 0) | 32 | Roboter rechts, Text links; Hochformat zentriert |

Folgen für Szenen: Der Roboter ist ab `zoom@1` nicht mehr sichtbar (Kamera im Kopf). Im Beat `brain` fliegt die Kamera durch das
Gehirn und hinten hinaus. Kabel und Knoten müssen aus beiden Blickrichtungen gut aussehen (von hinten aus dem Gehirn und von der Seite).

## 6. Look, Bloom und Farbe

Bild-Pipeline: Szene rendert linear in HalfFloat (HDR) -> UnrealBloom -> OutputPass (ACES Filmic + sRGB) -> FxPass.

**Bloom steuern**

- Leuchten entsteht über Helligkeit, nicht über Extra-Passes. Schwelle `bloomThreshold` 0.72 (linear, vor dem Tonemapping).
- Leuchtende Teile: Farbe über 1 setzen, z. B. `palette.signal.clone().multiplyScalar(3)` in `MeshBasicMaterial` oder im eigenen Shader.
  Faustregel: 1.5 = sanfter Schein, 3 = deutlicher Glow, 5 = sehr hell (Funken, Impulse). Flächen unter ~0.7 leuchten nicht.
- Additive Partikel (`AdditiveBlending`, `depthWrite: false`) summieren sich: bei vielen Punkten die Farbe eher tief halten.
- Pro Szene über `look`: `bloom` (Stärke), `bloomRadius`, `bloomThreshold`.

**Look-Werte** (`BASE_LOOK` in config.js). Eine Szene setzt in `api.look` nur, was sie ändern will, und darf die Werte pro Frame anpassen.

| Schlüssel | Basis | Wirkung |
| --- | --- | --- |
| `exposure` | 1.0 | Belichtung (Tonemapping) |
| `bloom`, `bloomRadius`, `bloomThreshold` | 0.85, 0.55, 0.72 | UnrealBloom |
| `aberration` | 0.006 | chromatische Aberration zum Rand hin (nur Stufe high) |
| `vignette` | 0.75 | Randabdunkelung 0..1 |
| `grain` | 0.045 | Filmkorn (24 Bilder/s), verhindert auch Banding |
| `fogDensity` | 0.035 | `FogExp2` in Hintergrundfarbe |
| `env` | 0.35 | Stärke der Spiegelungen (`scene.environmentIntensity`) |
| `key`, `rim`, `amb` | 1.3, 2.0, 0.12 | warmes Hauptlicht (vorne rechts), Cyan-Kantenlicht (hinten links), Hemisphäre |
| `parallax`, `drift` | 0.22, 0.025 | Maus-Parallax und Schweben der Kamera (im Kopf/Gehirn klein halten) |
| `flash` | 0 | additiver Lichtblitz in Signal-Cyan 0..1 (z. B. beim Eintauchen in die Faser) |
| `fade` | 0 | Abblende zu Schwarz 0..1 (der Director setzt sie um Schnitte selbst) |
| `dim` | 0 | Abdunkeln. main setzt bis 0.62, sobald die normalen Inhalte kommen |

Mischregel: Für jeden Schlüssel zählen nur Module, die ihn setzen, gewichtet mit `weight`. Summe der Gewichte unter 1: Rest kommt aus
`BASE_LOOK`. Über 1: gewichteter Mittelwert. So blenden Looks bei Übergängen weich.

**Farben** (`HEX` in config.js = CSS-Variablen in style.css, gleiche Werte):

| Name | Hex | Einsatz |
| --- | --- | --- |
| `void` | #04060a | Hintergrund, Nebel, Abblende |
| `deep` | #070b12 | tiefe Flächen |
| `ink` | #0d141d | Schale des Roboters, Paneele |
| `steel` | #2a3644 | Kanten, Linien im Schatten |
| `mist` | #8a99a8 | gedämpfte Linien |
| `white` | #e9f2f7 | kühles Weiss |
| `signal` | #46e6ff | **Akzent**: Licht, Daten, Impulse, Kabel |
| `ice` | #bdf6ff | heller Kern von Cyan-Glow |
| `ember` | #ffa45c | **Gegenlicht**: warme Funken, Kerne, das Menschliche (sparsam, etwa 10 %) |
| `emberDeep` | #ff7a2e | tiefes Warm |

Typografie: Geist (Titel 500, eng gesetzt, Laufweite -0.04em) und Geist Mono (Labels, Code, Grossbuchstaben, Laufweite 0.16em).
Für Code-Zeichen in Texturen (DNA): `document.fonts.load('500 64px "Geist Mono"')` abwarten, dann in ein Canvas zeichnen.

## 7. Qualität und Leistung

| Stufe | Wann | DPR | MSAA | Partikel-Faktor | Aberration |
| --- | --- | --- | --- | --- | --- |
| high | Desktop | bis 2 | 4x, nur wenn DPR unter 1.5 | 1 | ja |
| medium | Touch oder Bildschirm unter 820 px | bis 1.5 | nein | 0.5 | nein |
| low | 2 GB RAM oder 2 Kerne | 1 | nein | 0.25 | nein |

- Bloom läuft immer in halber Auflösung (UnrealBloom intern), Stufe low noch etwas kleiner.
- Adaptive Auflösung: in den ersten 25 s sinkt die DPR in Schritten, wenn ein Frame länger als ~29 ms braucht.
- URL-Parameter: `?q=high|medium|low` erzwingt eine Stufe (ohne Anpassung), `?debug` zeigt FPS, Draw Calls und Modul-Zustände,
  `?nogl` erzwingt den statischen Fallback.
- Budget pro Szene (Stufe high, Richtwerte): höchstens 40 Draw Calls, 600k Dreiecke, 60k Punkte/Instanzen. Mengen immer mit
  `tier.particles` multiplizieren.
- Rendern pausiert bei verstecktem Tab. Im Inhaltsbereich (3D nur Hintergrund) rendert main mit halber Bildrate.

## 8. Konventionen

- **Dateinamen**: `js/scenes/<name>.js`, Name wie in `MODULES`. Hilfsdateien einer Szene als `js/scenes/<name>/*.js` oder
  `js/scenes/<name>-*.js`. Gemeinsame Hilfen nur nach Absprache in `js/lib/`.
- **Farben als Konstanten**: nur `ctx.palette` / `HEX` verwenden, keine neuen Hex-Werte in Szenen. Helligkeit über `multiplyScalar`.
- **Masse**: nur `ctx.anchors`, keine eigenen Positionen für Kopf, Gehirn, Knoten, Helix.
- **Shader**: inline als Template-String mit `/* glsl */`. Gemeinsame Uniforms aus `ctx.shared` einhängen (nicht kopieren).
  Punktgrösse perspektivisch korrekt: `gl_PointSize = worldSize * projectionMatrix[1][1] * uResolution.y * 0.5 / -mvPosition.z`
  und mit `min(..., 64.0)` begrenzen. Nebel in eigenen Shadern selbst lösen (Tiefe ausblenden) oder `fog: true` mit Fog-Chunks.
- **Keine neuen Lichter** in Szenen (wechselnde Lichtanzahl kompiliert alle Shader neu und ruckelt). Licht über `look.key/rim/amb`
  oder Emission/Glow im Material.
- **Transparenz**: `transparent` einmal beim Erzeugen festlegen und danach nur `opacity` ändern (Umschalten kompiliert neu).
- **Alles in create() erzeugen**: Materialien, Geometrien, Texturen. main kompiliert danach alle Shader vor (alle Gruppen sichtbar),
  damit Übergänge nicht ruckeln. Später keine neuen Materialien anlegen.
- **Keine Allokationen pro Frame**: Vektoren, Farben, Arrays im Modul wiederverwenden.
- **Zufall deterministisch** (Seed, z. B. mulberry32), damit jedes Laden gleich aussieht.
- **Keine externen Dateien**: alles prozedural. Keine fremden Modelle, keine CDNs.
- **frustumCulled = false** für Punktwolken mit Shader-Verschiebung (sonst verschwinden sie am Rand).
- **dispose()**: jede Geometrie, jedes Material, jede Textur, jedes DOM-Label wieder entfernen.
- **Beschriftungen** im 3D (z. B. "E-Mail", "Website"): als DOM in `ctx.overlay` mit Klasse `.gl-label`, Position per
  `vector.project(camera)` pro Frame setzen (transform), bei `setActive(false)` ausblenden.
- Sprache in sichtbaren Texten: Deutsch, Sie-Form, ss statt ß, keine Gedankenstriche, keine Emojis.

## 9. HTML und CSS

- Story: `#story` mit 7 Abschnitten `<section class="chapter" data-scene="...">`, darin `.chapter__panel > .chapter__text`.
  Mit 3D (`html.gl`) sind die Abschnitte `--len` vh hoch, das Panel klebt (sticky) und wird über `--o` ein- und ausgeblendet.
- Der Director setzt pro Abschnitt: `--p` (Fortschritt 0..1 nach Scroll, ungedämpft), `--o` (Sichtbarkeit), Klasse `.is-on`.
- Klassen auf `<html>`: `gl` oder `no-gl` (früh im Kopf entschieden: WebGL2, importmap, keine reduzierte Bewegung),
  `reduced`, `is-ready` (Preloader fertig), `is-content` (Inhaltsbereich erreicht, HUD aus).
- Fallback (`no-gl`, `no-js`): kein Canvas, CSS-Poster als Hintergrund, Abschnitte normal hoch, alle Texte sichtbar.
  Optional später: gerendertes Standbild als `assets/img/poster.webp` in `.stage__poster` einbinden.
- Texte in index.html sind vorläufig. Die Integration ersetzt sie aus `studio-texte.md`, Struktur und Klassen bleiben.
- Kontaktformular: Web3Forms (`js/ui.js`), Betreff "Anfrage über jonasgrueter Website", bei Fehler mailto-Link.

## 10. Testen

```
node S/tools/studio_capture.js S/studio/<name> 'studio/?q=high' --steps=12
node S/tools/studio_capture.js S/studio/<name> studio/ --mobile
node S/tools/studio_capture.js S/studio/<name> studio/ --nowebgl
node S/tools/studio_capture.js S/studio/<name> 'studio/dev.html?scene=robot&q=high' --steps=8
```

(`S` = Scratchpad-Ordner der Session.) `?q=high` verhindert, dass die adaptive Auflösung im langsamen SwiftShader die DPR senkt.

dev.html:

- `?scene=particles|robot|brain|cables|dna|all`, `&local=0.4` (Startwert), `&cam=orbit` (ziehen, Mausrad), `&q=high`,
  `&post=0` (ohne Postprocessing), `&play` (läuft selbst), `&scroll=0` (nur Regler).
- Scrollen auf der Testseite fährt `local` von 0 bis 1. Darum tastet `studio_capture.js` mit `--steps=N` das ganze Fenster ab.
- In dev.html laufen Director, Runner und Looks exakt wie auf der Seite (nur ohne Dämpfung, wenn "Daempfung" aus ist).
- Konsole: `window.__dev` (dev.html) und `window.__studio` (index.html) mit `engine`, `director`, `runner`, `ctx`.
  Beispiel: `__dev.setLocal(0.5)`, `__studio.director.beat('zoom')`.

Keine Konsolenfehler und keine Warnungen: studio_capture.js meldet beides. Szenen nicht mit `console.log` im Loop debuggen.
