# Studio: Architektur und Schnittstellen (Version 4)

Immersive Website von Jonas Grüter. Diese Datei ist der Vertrag zwischen Fundament und Szenen-Entwicklern.
Wer eine Szene baut, ändert nur seine Datei `js/scenes/<name>.js`. Alles andere läuft über die Schnittstellen unten.

## 1. Dateien

```
studio/
  index.html            Seite: echte HTML-Inhalte, importmap, Canvas fix im Hintergrund, Preloader
  impressum.html        Impressum (statisch, ohne 3D, gleiche style.css, Klasse .legal)
  datenschutz.html      Datenschutzerklärung nach revDSG (Hoster, Web3Forms, Gmail, Ausland, Rechte)
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
  js/scenes/*.js        backdrop, particles, robot, brain, cables, dna (je ein Szenen-Modul, Hilfsdateien <name>-*.js)
  js/scenes/backdrop*.js Hintergrund hinter allem (Kapitel 12): backdrop.js Einstieg, -glsl (Shader), -noise (Rausch-Volumen)
  js/scenes/robot*.js   Android-Bueste (Kapitel 11): robot.js Einstieg, robot-mesh/-layout/-materials/-mech/-env/-geometry,
                        robot-mesh-worker.js (Catmull-Clark im Web Worker)
  assets/robot/         bust.bin: Netz der Android-Bueste (MakeHuman CC0, offline aufbereitet, 76 KB)
  assets/fonts/         Geist (variabel 300..700) und Geist Mono (variabel 400..600), latin, woff2, OFL
  vendor/               three r170 (ES-Module, nur die 12 genutzten Addons) und GSAP 3.12.5 + ScrollTrigger (UMD)
../_config.yml          am Repo-Root: Jekyll veroeffentlicht ARCHITEKTUR.md, dev.html und js/dev.js nicht
```

Ablauf pro Frame (js/main.js):

1. `engine.updatePointer` (Maus geglättet)
2. `director.content` (Inhaltsbereich 0..1, gedämpft), `director.pullScroll()` und `director.update(dt)`: global, Beats,
   Modul-Zustände, Kamerapose
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
| `director` | `director.beat('zoom')` -> `{ start, end, p, w }`, `director.module('robot')`, `director.global`, `director.cutFade`, `director.cuts`, `director.content` (Inhaltsbereich 0..1) |
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
- **Der Kopf des Roboters steht im Ursprung**, das Gesicht zeigt nach +Z (Augen der Android-Bueste bei y ≈ 0, z ≈ 0.6).
- Alle Werte stehen in `js/config.js` unter `ANCHORS`. Nie Zahlen doppelt hart codieren.

| Anker | Wert | Bedeutung |
| --- | --- | --- |
| `head.center` | (0, 0, 0) | Kopfmitte |
| `head.radii` | (0.82, 1.0, 0.92) | Halbachsen des Kopf-Ellipsoids (Breite 1.64, Höhe 2.0, Tiefe 1.84) |
| Augen | (±0.30, 0, 0.60) | Landmarken `eyeL`/`eyeR` aus `bust.bin` (kein eigener Anker, `robot-mesh.js` liefert `lm`) |
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
  0 |   [z -36]  ~~~~~~~~~~~~~~~~~~~~~~~~~~  (z -10)  ( brain )|Gesicht ..... Kamera Start (0, 0.35, 15.5)
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
| intro | 120 | 0.0000 | 0.1111 | Hero: Partikel-Büste (Android-Form, Augen und Plattenlinien, atmet, folgt der Maus), Titel, Buttons |
| robot | 180 | 0.1111 | 0.2778 | Partikel formen die Android-Büste (Hologramm, dann fest), Dreiviertelansicht, Maus-Reaktion |
| zoom | 170 | 0.2778 | 0.4352 | Profil mit offenem Hinterkopf und Kabeln, Röntgen-Scan, Gehirn in der Hardware, Kamera kreist nach vorne rechts oben |
| brain | 150 | 0.4352 | 0.5741 | Dreiviertelansicht des Gehirns in der Röntgen-Schale, Eintauchen, Flug hinten hinaus |
| cables | 190 | 0.5741 | 0.7500 | Kabel werden gezogen, Übersicht von schräg oben, Knoten der Werkzeuge |
| dna | 210 | 0.7500 | 0.9444 | Flug in den Website-Knoten, Helix aus Code, Website-Gerüst |
| outro | 160 | 0.9444 | 1.0000 | Schnitt mit Lichtblitz, Roboter wieder ganz und ruhig, Kontakt |

Version 2 (Rückmeldung Art Director): Strecke von 1420 auf 1180 vh gekürzt, damit die Leistungen früher kommen.

Formel: `start = top / (storyHeight - vh)`, `end = (top + height) / (storyHeight - vh)`, der letzte Beat endet bei 1.
`director.beat(name)` liefert `p` (0..1 im Beat, gedämpft) und `w` (Gewicht mit Überblendung `BEAT_FADE` = 0.02).

### Fenster der Module

In `MODULES` als `'beat@p'` definiert (p = Punkt im Beat). Nominal:

| Modul | Hauptfenster (local 0..1) | weitere Fenster | global nominal |
| --- | --- | --- | --- |
| backdrop | intro@0 bis outro@1 | | 0 bis 1 (immer aktiv, Gewicht 1, Kapitel 12) |
| particles | intro@0 bis robot@0.7 | | 0.0000 bis 0.2278 |
| robot | robot@0 bis brain@0.6 | outro@0 bis outro@1 | 0.1111 bis 0.5185, 0.9444 bis 1 |
| brain | zoom@0.3 bis cables@1 | | 0.3250 bis 0.7500 |
| cables | brain@0.7 bis dna@0.3 | | 0.5324 bis 0.8083 |
| dna | dna@0 bis dna@1 | | 0.7500 bis 0.9444 |

- Ein Modul ist aktiv, solange eines seiner Fenster Gewicht > 0 hat (Rampe `MODULE_FADE` = 0.015 an beiden Enden).
- Für genaues Timing innerhalb der Geschichte lieber `ctx.director.beat('zoom').p` verwenden als `local`.
  Beispiel Roboter: Schale transparent machen mit `beat('zoom').p`, Ausklang mit `beat('outro').p`.
- Fenster nur in `config.js` ändern und hier nachführen.

## 5. Kamerapfad

`CAMERA_KEYS` in config.js: Keyframes an Beats verankert, `pos` (Position), `look` (Blickziel), `fov` (vertikal, Grad).

- Pro Schnitt-Abschnitt (Shot) je eine `CatmullRomCurve3` (centripetal) für Position und Blickziel.
- Zeit -> Kurve über Bogenlänge und monotone kubische Interpolation: die Geschwindigkeit bleibt über Keyframes stetig, kein Ruckeln.
- `cut: true` startet einen neuen Shot (harter Schnitt). Der Director liefert dafür `cutFade` (0..1, `CUT_FADE` 0.008 je Seite, etwa 9 vh).
  Der Runner macht daraus einen kurzen Lichtblitz (`flash`, Belichtung, Bloom), keine Abblende zu Schwarz.
  Zurzeit gibt es einen Schnitt: Ende DNA -> Ausklang beim Roboter.
- `posM` / `lookM`: eigene Werte fürs Hochformat (Seitenverhältnis unter 0.85), abgestimmt für Handys (0.46 bis 0.59).
  Zusätzlich wird im Hochformat das FOV erweitert (`PORTRAIT`), damit horizontal genug Bild bleibt. Im Hochformat gilt
  mindestens der Faktor von 0.59 (`PORTRAIT.minPortrait` 2.0): Tablets im Hochformat (z. B. 768 x 1024) sind dadurch
  gleich gerahmt wie Handys, nur mit mehr Rand links und rechts (vorher stiess der Kopf dort oben an die Kopfzeile).
- Danach kommen Maus-Parallax (`look.parallax`, Einheiten) und ruhiges Schweben (`look.drift`).
- Dämpfung: `global` folgt dem Scroll mit `lambda` 4.2 (bei grossen Sprüngen schneller). Die Szenen bekommen immer den gedämpften Wert.

Verlauf (Version 1, von der Integration abgestimmt). Grundsatz: Solange ein Text-Panel links steht, sitzt das Motiv rechts
der Mitte (Blickziel nach links versetzt); im Hochformat steht der Text unten, darum dort das Motiv in der oberen Bildhälfte
(`posM`/`lookM`).

| Key | pos | look | fov | Hochformat | Notiz |
| --- | --- | --- | --- | --- | --- |
| intro@0 | (0.15, 0.32, 13.4) | (-1.75, -0.3, 0) | 30 | pos (0, 0.35, 11), look (0, -3.25, 0) | Hero: Partikel-Büste rechts neben dem Text, Hochformat oberes Drittel |
| intro@1 | (0.6, 0.3, 12) | (-0.9, -0.3, 0) | 31 | pos (0.5, 0.3, 9.6), look (0, -2.1, 0) | |
| robot@0.5 | (4.2, 0.75, 7.4) | (-0.98, -0.69, 0.58) | 31 | look (0.18, -2.8, 0.3) | Android-Büste Dreiviertelansicht von rechts vorne (+x), Gesicht zum Text, Büste rechts |
| robot@1 | (6.3, 0.55, 3.9) | (-0.54, -0.63, 0.78) | 32 | look (0.24, -2.48, 0.05) | kreist auf derselben Seite weiter |
| zoom@0.22 | (7.0, 0.45, -2.3) | (0.23, -0.46, 0.61) | 30 | pos (7, 0.5, -2.3), look (0.18, -1.89, -0.35) | Profil von schräg hinten: Gesicht zum Text, rechts offener Hinterkopf mit Kabeln |
| zoom@0.38 | (6.6, 0.55, -1.9) | (0.19, -0.41, 0.59) | 31 | pos (6.6, 0.6, -1.95), look (0.2, -1.8, -0.35) | ruhig, solange der Text steht; Scan beginnt |
| zoom@0.6 | (4.3, 0.95, 0.6) | (-0.07, -0.16, 0.33) | 34 | pos (3.9, 0.95, 0.55), look (0.22, -0.92, -0.06) | Röntgen seitlich: Gehirn in der Hardware, nie frontal; Hochformat enger auf Kopf und Hals |
| zoom@0.8 | (3.2, 1.15, 1.7) | (-0.2, 0.04, 0.26) | 37 | pos (3.3, 1.2, 1.85), look (0.22, -0.8, 0.04) | |
| zoom@1 | (2.3, 1.35, 2.55) | (-0.44, 0.14, 0.26) | 40 | pos (2.3, 1.5, 3), look (0.22, -0.9, 0.19) | Dreiviertelansicht vorne rechts oben |
| brain@0.3 | (1.62, 1.2, 2.18) | (-0.42, 0.12, 0.21) | 40 | pos (1.9, 1.35, 2.6), look (0.18, -0.7, 0.15) | Text links, Gehirn rechts (seit dem Einbau der Android-Büste von rechts) |
| brain@0.55 | (0.5, 0.52, 0.42) | (-0.15, 0.22, -0.5) | 54 | | Eintauchen durch Schale und Rinde |
| brain@0.78 | (0.02, 0.32, -0.25) | (0.25, -0.05, -1) | 58 | | mitten im Gehirn, roll 6°: Kabelaustritt nicht in der Bildmitte |
| brain@1 | (-0.35, 0.55, -0.85) | (0, 0, -3) | 55 | | hinten aus dem Gehirn, roll 2.5° |
| cables@0.1 | (-2.3, 1.75, -0.1) | (0.55, 0.78, -3.9) | 52 | | Aufstieg, Kalender-Knoten bleibt unter der Kopfzeile |
| cables@0.3 | (-6.8, 5.94, 2.23) | (1.5, 0.5, -5) | 46 | look (1.5, -3, -5) | Übersicht schräg oben: Gehirn unten rechts, Kabel nach links, Text rechts |
| cables@0.5 | (-7.4, 6.35, 1.86) | (1.7, 0.4, -5.2) | 45 | look (1.7, -3, -5.2) | ruhiges Driften, solange der Text steht |
| cables@0.8 | (-4.4, 3.15, -2.9) | (1.2, 1.0, -7.4) | 44 | | Kalender-Knoten unter der Kopfzeile |
| cables@1 | (-1.9, 1.05, -7.6) | (0.15, 0.5, -11.2) | 44 | pos (-1.2, 1.2, -7), look (0.1, -0.4, -11.5) | auf den Website-Knoten zu, leicht von links |
| dna@0.1 | (-2.75, 0.95, -11) | (0.5, 0.45, -15.9) | 46 | pos (-2.1, 1.6, -9.6), look (0.35, -0.9, -15) | Helix von aussen (zTrack -9.9) |
| dna@0.21 | (-0.55, 0.62, -9.5) | (-1, 0.5, -16) | 50 | pos (-0.4, 0.75, -9.4), look (0, 0.1, -16) | vor dem Anfang der Helix, Eintauchen entlang der Achse (zTrack -10) |
| dna@0.33 | (0.2, 0.56, -15) | (-1.55, 0.55, -20.5) | 50 | look (0, 0.5, -20.5) | Fluchtpunkt der Helix rechts, Text links |
| dna@0.58 | (0.1, 0.48, -28) | (0, 0.33, -36) | 43 | | Gerüst entsteht, früh gross im Bild |
| dna@0.74 | (0, 0.44, -29.25) | (0, 0.3, -36) | 41 | pos (0, 0.5, -28.85), look (0, -0.5, -36) | Gerüst fertig oben im Bild, darunter die Angebotszeile |
| dna@1 | (0, 0.42, -29.45) | (0, 0.3, -36) | 41 | pos (0, 0.5, -29.05), look (0, -0.5, -36) | |
| outro@0 (Schnitt) | (0.5, 0.05, 4.5) | (-0.22, -0.27, 0.03) | 34 | pos (0.5, 0.2, 6.6), look (0.01, -1.95, 0.09) | Gesicht nah, die Augen erwachen im Lichtblitz |
| outro@1 | (3.7, -0.3, 7.9) | (-1.19, -0.75, 0.56) | 31 | pos (3.9, 0.2, 9.6), look (0.06, -2.95, 0.15) | ruhige Dreiviertelansicht leicht von unten, Büste rechts, Blick wandert zum Kontakt; Hochformat: Kopf kleiner gerahmt, oben |

**Lens-Shift für andere Seitenverhältnisse:** Die Keys sind für 1440 x 900 komponiert (Text links endet bei ~41 % der Breite,
rechts beginnt er bei ~59 %). Der Director misst bei jedem Refresh, wie weit die Text-Panels tatsächlich reichen
(`_measureClearance`), und verschiebt das Bild über `camera.filmOffset` seitlich um die Differenz (höchstens 15 %,
gewichtet mit der Sichtbarkeit `--o` des Panels, gedämpft). Ergebnis: Auf Tablets quer oder 1280 x 800 bleibt das Motiv
neben dem Text, ohne eigene Keys. Im Hochformat ist der Shift 0 (Text unten). Szenen, die `vector.project(camera)` nutzen,
sind automatisch richtig.

Hinweis: `dna-build.js` liest die z-Werte der `dna@`-Keys (wann die Kamera welche Stelle der Helix passiert). Neue dna-Keys
darum mit z auf der Linie der bestehenden setzen. Steht die Kamera ausserhalb der Helix (Ansicht von aussen), zählt statt pos.z
der Wert `zTrack` (die Werte müssen über die Keys fallen). `roll` (Grad) neigt die Kamera um die Blickachse.

### Text-Panels

Ein Panel klebt im Abschnitt, bis dieser `len - 100` vh gescrollt ist (`pinOut`), danach scrollt es weg. Standard: Einblenden
bei p 0.02 bis 0.12, Ausblenden von `pinOut - 0.06` bis 40 vh nach `pinOut` (der Text scrollt sichtbar nach oben weg, so gibt
es kaum Strecken ohne Text). Eigene Fenster über `BEATS[].text = [ein0, ein1, aus0, aus1]` (p im Beat): `intro`
([0, 0, 0.28, 0.5]: Hero-Text bis etwa intro@0.42, weg, bevor er unter die Kopfzeile scrollt), `brain` ([0.02, 0.12, 0.22, 0.36]:
ganz weg, bevor die Kamera eintaucht), `cables` ([0.14, 0.24, 0.46, 0.6]: Text erst, wenn die Übersicht steht),
`dna` ([0.02, 0.12, 0.4, 0.54]: weg, bevor das Gerüst entsteht).

**Hochformat (Version 4):** Die Strecke ist dort rund 28 % kürzer (CSS `.gl .chapter { height: calc(var(--len) * 0.72vh) }`,
der Director misst die echten Höhen). Panels ohne eigenes Fenster blenden erst bei p 0.84 bis 0.97 aus: der Text bleibt
stehen, bis er mit dem Abschnitt nach oben wegscrollt und das nächste Panel kommt (kaum Bilder ohne Satz). Eigene
Hochformat-Fenster über `BEATS[].textM` (brain [0.02, 0.12, 0.3, 0.42], cables [0.1, 0.2, 0.8, 0.94]). Oben rechts unter
der Kopfzeile steht während der Story der Link `.story-skip` "Animation überspringen" (auf #leistungen). Das letzte Panel (outro) bleibt stehen und scrollt mit dem
Inhalt weg. In unsichtbaren Panels haben Links und Buttons `tabindex="-1"` (kein Tab-Fokus), das setzt `ui.panel()`.
Kein `inert`: Überschriften und Texte bleiben im Accessibility-Baum, Screenreader lesen alle Kapitel.

**Angebotszeile (Kapitel Code):** `#offer` im Abschnitt `dna`, fix unten in der Mitte (nur mit 3D). `ui.setOffer(p)` blendet
sie bei dna-Fortschritt (Scroll, ungedämpft) 0.8 bis 0.985 ein: "Ihr erster Entwurf ist kostenlos. Danach erhalten Sie eine
Fixpreis-Offerte." mit Button "Kostenlosen Entwurf anfragen". Die Kamera-Keys dna@0.74 und dna@1 lassen darunter Platz.

**Abdunkeln hinter dem Text (Scrim):** Der Director misst die Lage jedes `.chapter__text` im klebenden Panel und liefert
`director.scrim` (Mitte und halbe Grösse in UV, Stärke = `--o` x `BEATS[].scrim`). Der FxPass dunkelt dort das Bild weich ab
(Neuronen, Code-Zeichen hinter dem Text). Dazu der CSS-Verlauf `.chapter__text::before` (0.78) und im Hochformat ein
linearer Verlauf vom unteren Rand (`.chapter__panel::before`). Die Kabel-Labels weichen derselben Zone aus. Die Wörter steigen per GSAP aus einer Maske auf (`js/ui.js`, `panel()`); `gsap.ticker.lagSmoothing(0)`
sorgt dafür, dass das in echter Zeit läuft, auch wenn ein 3D-Frame länger dauert.

Folgen für Szenen (Android-Büste siehe Kapitel 11): Der Röntgen-Wechsel ist ein Scan: eine helle, dünne Linie läuft von zoom@0.3 bis zoom@0.84 von oben nach
unten (`uScanY`, Kopf bis ~zoom@0.64), darüber Röntgen-Hologramm, darunter noch Schale. Im Röntgen bleiben nur Kopf und Hals
(Hologramm der Schultern blendet aus, Hals auf 30 %). Das Hologramm bleibt leise um das Gehirn, bis die Kamera bei brain@~0.45
eintaucht (Fenster robot bis brain@0.6). Die Rumpf-Unterkante blendet über die Deckkraft aus (Rumpf-Material transparent). Im Beat `brain` fliegt die Kamera danach durch das
Gehirn und hinten hinaus. Kabel und Knoten müssen aus beiden Blickrichtungen gut aussehen (von hinten aus dem Gehirn und von der Seite).

## 6. Look, Bloom und Farbe

Bild-Pipeline: Szene rendert linear in HalfFloat (HDR) -> UnrealBloom -> OutputPass (ACES Filmic + sRGB) -> FxPass
(FXAA ohne MSAA bei DPR unter 1.6, Aberration, Scrim hinter dem Text, Vignette, Blitz, Abblende, Abdunkeln, Korn).

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
| `fogDensity` | 0.035 | `FogExp2`, Farbe = Nebelfarbe der aktuellen Farbwelt (`fogColor`, setzt backdrop.js) |
| `env` | 0.35 | Stärke der Spiegelungen (`scene.environmentIntensity`) |
| `key`, `rim`, `amb` | 1.3, 2.0, 0.12 | warmes Führungslicht in Ember (links vorne), Cyan-Kantenlicht (rechts hinten), Hemisphäre. Nur der Roboter nutzt Lichter (Android-Büste: key nur 0.14 bis 0.45, rim 1.4 bis 1.8; der Glanz kommt aus ihrer eigenen Studio-Umgebung) |
| `rimWarm` | 0 | Farbe des Kantenlichts: 0 Signal-Cyan, 1 warmes Gold (engine mischt `lights.rim.color`, ohne Allokation). Ausklang 0.85 |
| `parallax`, `drift` | 0.22, 0.025 | Maus-Parallax und Schweben der Kamera (im Kopf/Gehirn klein halten) |
| `flash` | 0 | additiver Lichtblitz 0..1, klein in Signal-Cyan, ab ~0.3 weisser (Schnitt) |
| `fade` | 0 | Abblende zu Schwarz 0..1 (am Schnitt nur leicht, der Runner setzt dort vor allem `flash`) |
| `dim` | 0 | Abdunkeln. main setzt bis 0.62, sobald die normalen Inhalte kommen |

Mischregel: Für jeden Schlüssel zählen nur Module, die ihn setzen, gewichtet mit `weight`. Summe der Gewichte unter 1: Rest kommt aus
`BASE_LOOK`. Über 1: gewichteter Mittelwert. So blenden Looks bei Übergängen weich.

**Farben** (`HEX` in config.js = CSS-Variablen in style.css, gleiche Werte):

| Name | Hex | Einsatz |
| --- | --- | --- |
| `void` | #04060a | Clear-Farbe (vom Hintergrund-Modul überdeckt), Abblende |
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

| Stufe | Wann | DPR | MSAA | Partikel-Faktor | Aberration | Roboter |
| --- | --- | --- | --- | --- | --- | --- |
| high | Desktop (Maus, Fenster ab 760 px, auch 1280 x 800) | bis 2, Budget 3.5 MP | 4x, nur wenn DPR unter 1.5 | 1 | ja | Büste 2 x Catmull-Clark (~69k Ecken), 112 Kabel, Klarlack 1.0 (Rauheit 0.06), Muskel-Innenstruktur, Hologramm auf Stufe 1 |
| medium | Touch (`pointer: coarse`) oder Fenster unter 760 px | bis 1.5 | nein, dafür FXAA | 0.5 | nein | 1 x Catmull-Clark, 44 Kabel, ohne Klarlack (Grundschicht glatter, 0.2), ohne Rillen und Innenstruktur (`AB_CHEAP`), Fresnel und Fasern im Gel bleiben |
| low | 2 GB RAM oder 2 Kerne | 1 | nein, FXAA | 0.25 | nein | wie medium |

- Bloom läuft immer in halber Auflösung (UnrealBloom intern), Stufe low noch etwas kleiner.
- Pixelbudget: DPR höchstens `sqrt(3.5e6 / (Breite x Höhe))` (mindestens 1), z. B. 1440 x 900 mit DPR 2 -> 1.64.
- Adaptive Auflösung, dauernd aktiv (je 1 s gemessen): über ~29 ms pro Frame zuerst MSAA aus, dann DPR-Skala in Schritten
  bis 0.5 runter; mit Reserve (unter ~19 ms, 4 s lang) langsam um 0.1 wieder rauf, nach jedem Absenken 20 s Pause (Hysterese).
  Grundtakt: in den ersten 45 Bildern wird der Median des Bildabstands gemessen. Liegt er eng um 33 ms (iOS-Stromsparmodus,
  Chrome-Energiesparen, Android Battery Saver drosseln requestAnimationFrame auf 30 Hz), gilt 30 Hz als Basis: dann erst
  über 1.2 x Basis (40 ms) senken und unter 1.05 x Basis wieder anheben. Sonst würde die Auflösung ohne Grund aufs Minimum fallen.
- MSAA nur auf `composer.renderTarget1` (dort rendert die Szene), `renderTarget2` bekommt nur fertige Vollbild-Passes (0 Samples).
  FXAA läuft ohne MSAA bis DPR 1.75 (z. B. MacBook 1440 x 900 bei DPR 1.64, dort ist MSAA aus).
- Langsamer Start (Version 4): iOS liefert kein `navigator.deviceMemory`, jedes iPhone landet auf medium. Liegt der Median
  der ersten 45 Bilder (nicht gedrosselt) über 45 ms, rendert die Engine sofort wie Stufe low (`engine.slowStart`: MSAA aus,
  DPR-Skala 0.62). Die Szenen bleiben auf ihrer Stufe (ein Umbau zur Laufzeit wäre teurer als der Gewinn).
- Ladezeit (Version 4): Catmull-Clark der Büste läuft im Web Worker (`robot-mesh-worker.js`, Ergebnisse als Transferables),
  Stufe 1 für alle, Stufe 2 nur auf high. Fällt der Worker aus (kein Modul-Worker, Fehler, 9 s ohne Antwort), rechnet der
  Hauptthread. Ohne `KHR_parallel_shader_compile` kompiliert `engine.warmup()` Szene für Szene mit einem Bild Pause
  dazwischen (kein langer Block). Die Mechanik-Materialien teilen Programme (Schlüssel nur aus kind und '-scan').
- Sicherheitsnetze in `main.js`, alle führen in denselben statischen Fallback (`toFallback`: Loop und ScrollTrigger weg,
  Director und Szenen entsorgt, Overlay geleert, GSAP-Stile entfernt, Panels bedienbar):
  Start über 15 s, WebGL-Kontext verloren, FPS-Wächter (trotz kleinster Auflösung 3 s lang unter 20 fps).
- Notausgang im Kopf von index.html: läuft `main.js` nach 20 s (Tests 75 s) nicht (`window.__studioMain` fehlt, z. B. Netzabbruch
  oder Parse-Fehler), wechselt die Seite selbst auf `no-gl` und blendet den Preloader aus. Für `[data-reveal]` gibt es eine
  CSS-Sicherung (nach 3 s sichtbar), solange `html.ui-on` fehlt (das setzt ui.js beim Start).
- Software-Rendering (SwiftShader, llvmpipe, Microsoft Basic Render, `failIfMajorPerformanceCaveat`) bekommt schon im Kopf
  von index.html den Fallback. Ausnahmen für Tests: `navigator.webdriver` (Playwright), `?q=...` oder `?gl` setzen
  `html[data-gl-force]` (Software-GL erlaubt, kein FPS-Wächter, Start-Netz 60 s). `?glcheck` prüft auch in Tests streng.
- URL-Parameter: `?q=high|medium|low` erzwingt eine Stufe (ohne Anpassung), `?debug` zeigt FPS, Draw Calls und Modul-Zustände,
  `?nogl` erzwingt den statischen Fallback.
- Budget pro Szene (Stufe high, Richtwerte): höchstens 40 Draw Calls, 600k Dreiecke, 60k Punkte/Instanzen. Mengen immer mit
  `tier.particles` multiplizieren.
- Hintergrund (backdrop, immer aktiv): 1 Draw Call, 1 Dreieck, pro Bildpunkt höchstens 5 Zugriffe auf das 32³-Rausch-Volumen
  (high), 4 (medium), 2 (low). Details Kapitel 12.
- Gemessen auf der ganzen Seite (Version 3, 30.10.2026, `renderer.info` pro Bild inklusive Bloom und Post-Passes):

  | Stelle | high (Desktop 1440 x 900) | medium (iPhone 13) |
  | --- | --- | --- |
  | Hero (intro) | 20 Draw Calls, 2k Dreiecke, 37k Punkte | 19 Calls, 19k Punkte |
  | Übergang Partikel zu Büste (robot@0.3) | 34 Calls, 635k Dreiecke, 37k Punkte | 32 bis 41 Calls, 91k bis 167k |
  | Büste fest (robot@0.75) | 45 Calls, 528k | 42 Calls, 136k |
  | Röntgen (zoom@0.45 bis 0.75) | 48 bis 51 Calls, 766k bis 773k, 59k Punkte | 48 bis 50 Calls, 229k, 30k Punkte |
  | Im Gehirn (brain@0.75) | 29 Calls, 143k, 61k Punkte | |
  | Ausklang | 42 Calls, 526k | 42 Calls, 136k |

  Das Röntgen ist die teuerste Stelle (Büste, Gehirn und Gehirn-Hardware gleichzeitig). Pro Frame keine Allokationen
  (Director, Runner, Szenen und Mechanik verwenden ihre Objekte wieder).
- `vendor/three/addons` enthält seit Version 4 nur noch die 12 genutzten Dateien (vorher rund 890 KB Ballast).
- Seitengewicht beim ersten Laden (mit 3D, ungezippt): rund 1.7 MB inklusive `bust.bin` (76 KB), davon three.js 690 KB,
  GSAP 115 KB, Schriften 52 KB. GitHub Pages liefert gzip: rund 0.57 MB über die Leitung. Poster und `og.jpg` lädt nur der
  Fallback bzw. ein Link-Vorschau-Dienst.
- Rendern pausiert bei verstecktem Tab. Im Inhaltsbereich (3D nur abgedunkelter Hintergrund, `contentDim` über 0.98) wird ein
  letztes Bild gerendert und dann angehalten, bis man wieder in die Story scrollt. Karten und Formular verzichten dort auf
  `backdrop-filter`.
- Ladekette: Der Kopf von index.html legt mit 3D `modulepreload`-Links für three.js, Engine, Addons und alle Szenen an
  (alles parallel statt als Kette). Im Fallback wird nichts davon geladen.

## 8. Konventionen

- **Dateinamen**: `js/scenes/<name>.js`, Name wie in `MODULES`. Hilfsdateien einer Szene als `js/scenes/<name>/*.js` oder
  `js/scenes/<name>-*.js`. Gemeinsame Hilfen nur nach Absprache in `js/lib/`.
- **Farben als Konstanten**: nur `ctx.palette` / `HEX` verwenden, keine neuen Hex-Werte in Szenen. Helligkeit über `multiplyScalar`.
- **Masse**: nur `ctx.anchors`, keine eigenen Positionen für Kopf, Gehirn, Knoten, Helix.
- **Shader**: inline als Template-String mit `/* glsl */`. Gemeinsame Uniforms aus `ctx.shared` einhängen (nicht kopieren).
  Punktgrösse perspektivisch korrekt: `gl_PointSize = worldSize * projectionMatrix[1][1] * uResolution.y * 0.5 / -mvPosition.z`
  und mit `min(..., 64.0)` begrenzen. Nebel in eigenen Shadern selbst lösen (Tiefe ausblenden) oder `fog: true` mit Fog-Chunks.
- **Hintergrund**: kein eigener Hintergrund in Szenen (keine Kugeln, Flächen oder `scene.background`). Den Raum hinter
  dem Motiv zeichnet nur `backdrop.js` (Kapitel 12). Braucht eine Szene eine andere Stimmung, wird ihre Farbwelt in
  `BACKDROPS` (config.js) angepasst. Seit Version 3 gibt es keine Ausnahme mehr (Nebelkugel der Partikel und eigener
  Lichtkegel der Büste sind entfernt).
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
- Hochformat-Layout (Text unten, Fortschrittsbalken oben statt HUD) gilt bei `max-width: 760px` **oder** Seitenverhältnis
  unter 0.85 (`max-aspect-ratio: 17/20`), also genau dann, wenn auch die Kamera ihre Hochformat-Werte nimmt.
- Klassen auf `<html>`: `gl` oder `no-gl` (früh im Kopf entschieden: WebGL2, importmap, keine reduzierte Bewegung),
  `reduced`, `is-ready` (Preloader fertig), `is-content` (Inhaltsbereich erreicht, HUD aus), `ui-on` (ui.js läuft).
- Weiches Scrollen: `scroll-behavior: smooth` nur ohne 3D (`html:not(.gl)`). Mit 3D verfälscht es die Messung von ScrollTrigger
  beim Refresh (Handy drehen). Anker-Links scrollen dort per JS weich (`ui.initAnchors`, Fokus geht ans Ziel).
- Drehen des Handys: `ignoreMobileResize: true` bleibt (Adressleiste löst keinen Refresh aus), main.js misst bei jeder
  Breitenänderung und bei `screen.orientation` 'change' selbst neu (`ScrollTrigger.refresh()`, 150 ms entprellt).
- Überschriften mit `data-split`: ganzer Satz als `aria-label`, die Wort-Spans sind `aria-hidden` (VoiceOver liest sonst Wort für Wort).
- Über mich: Platz für ein Porträt ist vorbereitet (auskommentierter `<figure class="portrait">` in index.html, CSS steht).
  Foto `assets/img/jonas.webp` (4:5) muss Jonas liefern. Arbeitsproben echter Entwürfe nur mit Freigabe des Betriebs.
- Version 4: Skip-Link "Zum Inhalt springen" auf `main#inhalt` (H1 und Hero-Buttons zuerst). Navigation: genau ein aktiver
  Link (letzter sichtbarer Abschnitt) mit `aria-current="true"`. Ergebnis im Fallbeispiel ist ein `div` (kein `aside` in
  `main`). Formular: "Firma (freiwillig)", unter dem Telefon der Hinweis auf den Rückruf, unter dem Formular und im Footer
  Links auf `impressum.html` und `datenschutz.html`. Farb-Echos der Abschnitte blenden oben weich ein (`mask-image`).
  Ausklang im Hochformat: die Fläche hinter dem Kontakt-Text läuft unten über rund 140 px weich aus.
- Fallback (`no-gl`, `no-js`, reduzierte Bewegung): kein Canvas, jeder Abschnitt ist mindestens bildschirmhoch und zeigt sein
  Posterbild (`.chapter__poster`, `assets/img/poster-<beat>.webp`, im Hochformat `poster-<beat>-m.webp`) mit Verlauf für
  die Lesbarkeit. Die Poster sind echte Renderings der Szenen (ohne UI und ohne Korn) und werden nur im Fallback geladen.
  Neu erzeugen: `S/tools/make_posters.sh`, danach als WebP nach `assets/img/` (siehe Kapitel 10).
- Texte in index.html stammen aus `studio-texte.md` (Version 1) und `studio-texte-v2.md` (Version 2, wo nötig geschärft).
  `assets/img/og.jpg` ist das Vorschaubild für Links (1200 x 630).
- Inhaltsbereich (`.content`, Version 2): Leistungen `#leistungen`, KI im Betrieb `#ki-beispiele` (vier Branchen-Karten),
  Warum ich `#warum`, Ablauf `#ablauf` (Schritte als `<dl>`), Fallbeispiel `#fallbeispiel` (Zähler `data-count`, zählen
  einmal in 1.2 s hoch, `initCounters`), Werkzeuge `#werkzeuge`, Über mich `#ueber-mich`, Fragen `#fragen`, Kontakt
  `#kontakt`. Knöpfe mit `data-thema` wählen im Formular das Thema vor (`initTopicLinks`).
- Fragen: Akkordeon nach WAI-ARIA-Muster (`initFaq`): Knopf mit `aria-expanded`/`aria-controls`, Enter/Leertaste,
  Pfeiltasten, Pos1/Ende; geschlossene Antworten `visibility: hidden`. Ohne JS sind alle offen. Ein Link auf `#faq-...`
  öffnet die Frage.
- Blende der Story-Panels: `--oo = clamp(0, (--o - 0.2) / 0.6, 1)` macht sie steil (Text ist voll da oder weg, nie lange
  halb transparent über dem Bild). Im Ausklang liegt die Deckkraft auf `.chapter__text` statt auf dem Panel: ein Vorfahre
  mit opacity unter 1 würde zur "Backdrop Root" und der Blur der Karte sähe das 3D-Bild nicht mehr.
- Inhaltsbereich mit 3D: `.stage::after` (bei `html.is-content`) legt einen dunklen Schleier über die Szene, zusätzlich zu
  `look.dim` (main.js, bis 0.62). `.content` deckt ab 22 vh zu 92 %, ab 40 vh ganz. Karten und Formular sind feste Flächen
  ohne Blur. Farb-Tokens für Text: #eef4f8 (Text), #c4d0da (Fliesstext, mindestens 11.7:1), #9aa9b6 (Nebentext, 7.6:1),
  #d3dee6 (Story-Text).
- Kontaktformular: Web3Forms (`js/ui.js`), Betreff "Anfrage über jonasgrueter Website", bei Fehler oder nach 15 s ohne
  Antwort (AbortController) mailto-Link. Die Status-Region (`role=status`) bleibt immer im DOM, nur der Text wechselt.
  Ohne JS sendet das Formular direkt an Web3Forms (`action`, `method=POST`, versteckte Felder `access_key`, `subject`).
- Mobiles Menü: offen sind `main`, Footer, HUD und Skip-Link `inert`, der Fokus springt auf den ersten Link, Esc schliesst
  und gibt den Fokus an den Menü-Knopf zurück. Im Handy-Kopf steht neben dem Menü die Pill "Kontakt".
- Hero: Hauptbutton "Kostenlosen Entwurf anfragen" (#kontakt), zweiter Button "Direkt zu den Leistungen" (#leistungen,
  Sprung an der 3D-Strecke vorbei), darunter die Mono-Zeile "Kostenloser Entwurf vorab · Fixpreis · Persönlich betreut".
- Eigener Cursor: nur ein dekorativer Ring, der Systemzeiger bleibt sichtbar.

## 10. Testen

```
node S/tools/studio_capture.js S/studio/<name> 'studio/?q=high' --steps=12
node S/tools/studio_capture.js S/studio/<name> studio/ --mobile
node S/tools/studio_capture.js S/studio/<name> studio/ --nowebgl
node S/tools/studio_capture.js S/studio/<name> 'studio/dev.html?scene=robot&q=high' --steps=8
node S/tools/story_shots.js S/studio/<name> robot@0.3,zoom@0.35,cables@0.4 [--mobile] [--clean] [--nograin] [--vp=1200x630]
S/tools/make_posters.sh      # Poster (Desktop, Hochformat) und OG-Hintergrund rendern
python3 S/lead/convert_posters.py && node S/studio/og/render.js   # PNG -> WebP-Poster, OG-Bild (danach og.png -> og.jpg)
node S/lead/techcheck.js S/lead/tech   # Tab-Reihenfolge, Kontextverlust, Handy-Menue, Formular-Timeout, ?glcheck
```

Poster (Reihenfolge in make_posters.sh = intro, robot, zoom, brain, cables, dna, outro): intro@0.45, robot@0.95, zoom@0.85,
brain@0.3, cables@0.4, dna@0.4, outro@0.7, OG-Hintergrund intro@0.45 (Partikel-Büste, 1200 x 630).

Design-Abnahmen immer mit fester Stufe aufnehmen (`studio/?q=high` Desktop, `studio/?q=medium` Handy): sonst senkt die
adaptive Auflösung in SwiftShader die DPR auf 0.6 bis 0.75 und die Bilder sind weicher als auf echten Geräten.

Playwright setzt `navigator.webdriver`: Die Seite nimmt darum auch in SwiftShader die 3D-Strecke (`data-gl-force`), ohne
FPS-Wächter. Echte Besucher mit Software-Rendering bekommen den Fallback; das prüft `?glcheck`.

`story_shots.js` springt direkt an `beat@p` (ohne Daempfung) und macht je ein Bild, ideal fuer Kamera-Feinarbeit.

SwiftShader-Eigenheiten (keine Fehler der Seite, mit Version 3 geprüft): Nach einem grossen Sprung (z. B. von brain direkt
nach outro@0.1) zeigt das nächste Standbild manchmal noch ein älteres Bild aus der GPU-Warteschlange (Code-Gerüst statt
Büste); direkt geladen oder mit längerer Wartezeit stimmt es. Ebenso bleiben `[data-reveal]`-Blöcke nach einem Sprung in
den Inhaltsbereich ein paar Sekunden unsichtbar, weil ein Screenshot in SwiftShader rund 30 s dauert und die Zeitachse der
CSS-Übergänge solange steht. `studio_capture.js` wartet darum bis 240 s auf jedes Bild.

(`S` = Scratchpad-Ordner der Session.) `?q=high` verhindert, dass die adaptive Auflösung im langsamen SwiftShader die DPR senkt.

dev.html:

- `?scene=backdrop|particles|robot|brain|cables|dna|all` oder mehrere mit Komma (`scene=robot,brain` für den Röntgen-Zoom: die erste
  Szene bestimmt `local` und bleibt aktiv, die weiteren laufen in ihren Fenstern), `&local=0.4` (Startwert), `&at=zoom@0.4`
  (fester Punkt der Story), `&cam=orbit` (ziehen, Mausrad) oder `&cam=fix&pos=x,y,z&tgt=x,y,z&fov=30`, `&q=high`,
  `&post=0` (ohne Postprocessing), `&play` (läuft selbst), `&scroll=0` (nur Regler). Der Hintergrund (`backdrop`) läuft
  wie auf der Seite immer mit, `&bg=0` schaltet ihn ab. `?scene=backdrop` allein fährt mit dem Regler durch alle Farbwelten
  (Kamerapfad der Seite). Szene robot zusätzlich: `&ab=mech|debug|glass|nobloom|nokey|noenv` (Diagnose).
- Scrollen auf der Testseite fährt `local` von 0 bis 1. Darum tastet `studio_capture.js` mit `--steps=N` das ganze Fenster ab.
- In dev.html laufen Director, Runner und Looks exakt wie auf der Seite (nur ohne Dämpfung, wenn "Daempfung" aus ist).
- Konsole: `window.__dev` (dev.html) und `window.__studio` (index.html) mit `engine`, `director`, `runner`, `ctx`.
  Beispiel: `__dev.setLocal(0.5)`, `__studio.director.beat('zoom')`. Für Standbilder: `__dev.freeze(true)`,
  `__dev.setAt('robot@0.9')`, `__dev.setCam('fix')`, `__dev.fix.pos.set(...)`, `__dev.advance(3)` (Zeit vorspulen, rendert
  das letzte Bild).

Keine Konsolenfehler und keine Warnungen: studio_capture.js meldet beides. Szenen nicht mit `console.log` im Loop debuggen.

## 11. Szene robot: Android-Büste

Jonas hat am 30.10.2026 Variante B gewählt: weisse, glänzende Android-Büste mit türkis-transparenten Muskelteilen, offenem
Hinterkopf mit Schädelgitter und Kabelbündeln. Der frühere Helm-Roboter und Variante A sind entfernt.

| Datei | Inhalt |
| --- | --- |
| `robot.js` | Einstieg (create), Ablauf pro Beat, Look, Hintergrund-Schalter |
| `robot-mesh.js` | `bust.bin` laden (einmal, Promise im Cache), Gesichtsausdruck (Lider, Mundwinkel), Catmull-Clark, Normalen |
| `robot-layout.js` | Fugen und Öffnungen als Felder (GLSL): Gesichtsplatten, Lidfuge, Hinterkopf-Fenster, Glaskappe, Brustplatte |
| `robot-materials.js` | Schale (Klarlack, Spaltmass als feine Rinne mit Fase), Muskel-Gel, Innenschale, Glas, Hologramm, Mechanik |
| `robot-mech.js` | Augen (Blick folgt dezent der Kamera, Hornhaut mit Glanzlicht), Hals, Schädelgitter, Kabel, Ohrmodul |
| `robot-env.js` | eigene Studio-Umgebung, nur für die Spiegelungen (PMREM). Den Raum dahinter zeichnet backdrop.js |
| `robot-geometry.js` | `makeHeadShape`: Kopfform für brain.js (Gehirn-Hardware sitzt an der Innenseite der Schale) |
| `particles-shape.js` | Zielpunkte der Partikel-Büste (gleiches Netz, gleicher Drehpunkt `HEAD_PIVOT` wie robot.js) |

- **Hintergrund:** keiner in der Szene. Das Studio-Gegenlicht hinter der Büste kommt aus der Farbwelt `robot` von
  backdrop.js (Kapitel 12). Der frühere eigene Lichtkegel (`buildBackdrop`, `ROBOT.ownBackdrop`, `?robotbg`) ist in
  Version 3 entfernt.
- Ablauf: Aufbau im Beat robot (Hologramm robot@0.08 bis 0.26, dann von unten fest bis robot@0.64, Augen schalten bei
  robot@0.64 bis 0.74 ein), Röntgen-Scan im Beat zoom (`robotScan`, gleiche Formel wie brain-hardware.js), Ausklang im
  Beat outro (Augen leuchten im Lichtblitz).
- Spaltmasse: keine verworfenen Pixel mehr (früher schwarzer Strich). Die Fuge ist eine Rinne (Halbbreite 0.0021 Einheiten)
  mit Fase und weichem Schatten; ist sie schmaler als ein Bildpunkt (Handy), wird sie heller statt breiter. Die Lidfuge ist
  nur eine halb so tiefe Falte (`lSeamK`).
- Poster (Fallback) und OG-Bild am 30.10.2026 mit der Android-Büste neu gerendert (Kapitel 10, `make_posters.sh`), für
  Version 3 nach den letzten Änderungen (Hero-Linien, Kern, Flachbandkabel) noch einmal.
- Budget der Szene allein (gemessen in dev.html, Version 4): high 44 Draw Calls, rund 441k Dreiecke (vorher 526k, Gel nur in
  den Öffnungen); im Röntgen mit Gehirn rund 579k (vorher 796k).
- Eintauchen ins Gehirn: Die Mechanik (Schädelgitter, Kabel, Hals, alle Materialien aus `makeMechMaterial`) löst sich von
  brain@0.4 bis 0.58 mit Rauschen und feiner Leuchtkante auf (`uMechFade`). Ohne das standen Gitter und Kabel von innen
  gross im Bild und verschwanden am Ende des Fensters (brain@0.6 plus Rampe, rund brain@0.71) schlagartig.
- Übergang Partikel zu Büste: gleiche Form (`particles-shape.js` tastet dieselbe Büste ab), gleicher Drehpunkt und dieselbe
  Kopfbewegung. Partikel treten zurück, sobald das Hologramm erscheint (robot@0.05 bis 0.22), und gehen an der Abtastebene
  (robot@0.26 bis 0.64) in die feste Schale über. Im Hero zeichnen hellere Linien-Partikel Fugen, Augenringe und
  Plattenkanten nach, die Pupillen leuchten ruhig; der Kern im Kopf ist bei fertiger Form auf ein Drittel gedimmt.
- Kabel im Nacken: siehe Version 4 unten (Fächer aus vier Steckerleisten statt sieben Strängen).

### Version 4 (Runde 1 der Prüfer, 30.10.2026)

- **Schale:** weisse Glanzschale (Albedo um 0.85, kaum Blaustich), Klarlack 1.0 mit Rauheit 0.06 (nur high; medium ohne
  Klarlack, Grundschicht 0.2). Helligkeit auf der Seite gemessen: Stirn rund 207, Wange 191 (vorher 113 und 88, Ziel
  mindestens 161 wie `final-1-front.png`). Licht (`robot-env.js`): Führungsfläche jetzt **rechts vorne** (die Kamera der Seite
  steht fast immer bei +x), Aufheller links, zwei schmale, harte Streifen (oben links 14, hinten rechts 11) für lange
  Glanzlinien. Belichtung robot 1.13, Ausklang 1.12 (Handy 1.2). Die Schale wird bei 1.45 begrenzt, Bloom-Schwelle 1.5:
  scharfe Glanzlinien ohne Lichthof um die Silhouette.
- **Kanten:** Öffnungen mit weicher Deckung über etwa einen Bildpunkt (`abOpenA`, `abDeepA`) statt `discard`. Innenseite der
  Schale hell (`uShellIn`), direkt an jeder Öffnung eine helle Wandfläche (0.012 bis 0.024): wirkt wie ein Formteil mit
  Materialstärke statt Papier.
- **Fugen:** immer dunkle Rinne mit hellem Grat. Leuchten nur als kurzer Impuls von oben nach unten (zoom@0.24 bis 0.31,
  `uEdgeY`), danach aus.
- **Ohrmodul:** Drehprofil umgedreht (vorher zeigten Vorderseiten und Normalen nach innen, man sah durch das Loch der
  Ohrmuschel ins Dunkle: "schwarzer Aufkleber"). Jetzt helle Keramik mit Stufe, 128 Segmente, Gitter in gebürstetem Metall.
- **Muskel-Gel:** dunkler Kern, helle Fresnel-Kanten (0.5), zweite Faserlage tiefer im Gel (Parallaxe), feinere Glanzlichter
  (Rauheit 0.12). Halsmuskeln mit schmalen Sehnen und Chrom-Hülsen an Schädel und Brustbein. Das Gel-Netz entsteht nur dort,
  wo die Schale offen ist (`openFieldJS`/`deepOpenJS` in robot-layout.js, gleiche Formeln wie GLSL, plus Rand 0.075).
- **Hinterkopf:** vier Steckerleisten am Kamm (Graphit, Chromrahmen, Status-Punkt), daraus fächern 112 (medium 44) Kabel nach
  hinten und unten auf: eigene Lage, eigener Durchhang (Buckel früh, bis rund 0.38), 4 Rillenschläuche, Chromstecker, zwei
  Schellen um die mittleren Gruppen, unten im Rückenschlitz zusammen. Kabel beginnen hinter der Innenschale (keine offenen
  Enden zwischen den Stäben). Gitterstäbe mit Lochreihe und Chrom-Manschetten (`lattice`), Querstreben in Chrom, drei kleine
  Platinen (`board`). Glaskappe mit sichtbarer Kante oben und unten. Dünne Kabel (`cable`, `hose`, `rubber`) werden im
  Vertex-Shader um etwa einen halben Bildpunkt aufgeweitet (`uRes`): kein Moiré und kein Flimmern in der Ferne.
- **Hologramm:** Rückseiten zeichnen keine Linien mehr (vorher schienen die Schulterblatt-Fugen als zwei Kreise durch die
  Brust), Lidfuge fast unsichtbar (keine "Taucherbrille"). Netz auf Stufe 1 (spart auf high rund 100k Dreiecke).
- **Partikel-Hero:** kein leuchtender Kern mehr. Linien (Gesichtsplatten, Plattenkanten, Rand der Hinterkopf-Öffnung) doppelt
  so hell wie die Flächen, Kantenlicht von rechts hinten, Kabel als Linienpunkte im Fächer, die langsam nach hinten unten
  wegfliessen (`KIND.cable` 1.25). Augen ohne Ringlinie.
- **Ausklang:** Kantenlicht gold (`look.rimWarm` 0.85), Farbwelt outro neutraler (base #07080a, mid #151210, Gold nur als
  Horizont und Gegenlicht rechts). Blick erst zur Kamera, ab outro@0.32 langsam zum Kontakt (links neben der Kamera, im
  Hochformat darunter), der Kopf dreht leicht mit (`ms.gazeAt`). Handy: heller (Belichtung 1.2, key 0.36).
- **Röntgen im Hochformat:** der Rumpf blendet im Röntgen nach unten aus (`uFall` bis y -1.75), nur Kopf und Hals.
- **Gehirn (brain.js, brain-hardware.js):** Eintauchen brain@0.35 bis 0.95 mit halbem Bloom, Schwelle 1.12, Netz 45 %
  dunkler, nur drei Erregungswellen voll (die Welle aus dem Kern 1.05 statt 1.7). Elektroden-Stifte, -Köpfe und -Scheiben in
  Chrom (vorher Gold), Lüfterkappe ohne Ember. Nahe Hardware blendet beim Eintauchen früher aus (`uHwNear` bis 0.2 / 0.68).
- Testwerkzeug: `S/studio-v4/tools/pres.js <out> name=beat@p[|pos|tgt|fov]` rendert dev.html mit fester Kamera oder dem
  Kamerapfad (`name=robot@0.9` ohne Kamera = Pfad), `S/studio-v4/tools/lum.py` misst Helligkeit in einem Kasten.

### Quellen und Lizenzen (CREDITS)

- Grundmodell: **MakeHuman** (Grundnetz `base.obj` hm08, Targets, Skelett und Gewichte), ausdrücklich als **CC0 1.0**
  freigegeben (September 2020, MakeHuman-Lizenz Abschnitt C "The license for the bundled assets"). Keine Namensnennung
  nötig, festgehalten trotzdem: Manuel Bastioni, Data Collection AB, Joel Palmius, Jonas Hauquier.
  Quelle: https://github.com/makehumancommunity/makehuman (Ordner `makehuman/data/`).
- Verwendete Targets (Auszug): macrodetails jung weiblich (caucasian 0.75, asian 0.25), athletisch-schlank, flache Brust,
  Nase, Wangenknochen, Kinn, Kiefer, Lippen, Schläfen, Brauenbogen; Arme per Skinning um 27 Grad gesenkt, Mundhöhle und
  Ohrmuschel entfernt, Lippen geschlossen, Ambient Occlusion pro Ecke offline gerechnet. Ergebnis `assets/robot/bust.bin`
  (76 KB, quantisiert). Die vollständige Liste mit Gewichten liegt bei den Aufbereitungs-Skripten im Scratchpad
  (`S/android/android-b/CREDITS.md`, Skripte `scripts/`, `scripts2/`).
- three.js r170 (MIT), schon unter `vendor/`. Keine weiteren Bibliotheken, keine weiteren Downloads.
- Alles andere ist eigener Code (prozedural): Platten, Fugen, Muskeln, Mechanik, Kabel, Augen, Licht, Hintergrund.
- Nicht verwendet: Kopf-Scan Lee Perry-Smith (CC BY 3.0).

## 12. Hintergrund (backdrop)

Rückmeldung Version 2: "alles in dem klassischen schwarzen Hintergrund". Seit dem 30.10.2026 zeichnet ein einziges Modul den
Raum hinter allen Szenen, mit einer eigenen Farbwelt pro Kapitel und weichen Übergängen. Keine Szene hat mehr einen eigenen
Hintergrund (Kapitel 8).

| Datei | Inhalt |
| --- | --- |
| `backdrop.js` | Einstieg (create), Farbwelten mischen, Dynamik pro Beat, Licht-Richtungen aus der Kamera, Uniforms |
| `backdrop-glsl.js` | Vertex- und Fragment-Shader, Stufen über `#define BD_Q` (2 high, 1 medium, 0 low) |
| `backdrop-noise.js` | Rausch-Volumen 32 x 32 x 32 RGBA (128 KB, Seed fest), geglättet gelesen: ein Zugriff = vier Rauschwerte |

**Aufbau.** Ein Vollbild-Dreieck (`ShaderMaterial`, deckend, ohne Tiefentest und Tiefenschreiben, `renderOrder` -50,
`frustumCulled` false). Pro Bildpunkt rechnet der Shader die Welt-Blickrichtung aus `camera.projectionMatrixInverse` (mit
Lens-Shift) und `camera.matrixWorld` (beide direkt als Uniform referenziert). Der Hintergrund dreht sich also mit jeder
Kamerafahrt, liegt aber unendlich weit weg; nur Boden und Code-Tunnel haben echte Parallaxe. Er geht wie alles andere durch
Bloom, Tonemapping und den FxPass. Sonst zeichnet keine Szene einen Hintergrund (die Nebelkugel von particles.js ist seit
Version 3 entfernt, das spart im Intro einen Vollbild-Pass).

**Farbwelten** (`BACKDROPS` in config.js, Farben sRGB-Hex, Mengen 0..1):

| Farbwelt | Stimmung | base / mid / hi | Bausteine | Dynamik (backdrop.js) |
| --- | --- | --- | --- | --- |
| intro | Tiefsee-Petrol | #03121a / #072a35 / #1f6f7c | Nebel, Lichtstrahlen von oben (Richtung Lichtkegel der Partikel), Staub, Sterne, warmer Dunst unten rechts | Strahlen schimmern |
| robot | kühles Fotostudio passend zur Büste (gedämpftes Schieferblau wie in ihren Renderings) | #080c12 / #121b26 / #4d6b85 | weiches Gegenlicht hinter dem Kopf, leiser Dunst, breite Lichtbahnen von oben rechts | Lichtbahnen atmen mit der Büste (5.2 s) |
| zoom | Scan-Labor | #060f17 / #0d212c / #3a87a0 | wie Studio, dazu Messraster, Messkreis um den Kopf, Scanlinie | Raster ab zoom@0.4, Scanlinie läuft auf Höhe des Röntgen-Scans (gleiche Formel wie `robotScan`) |
| brain | Biolumineszenz | #090518 / #1b0c33 / #7c36b0 | violetter Nebel, dessen Schwaden selbst leuchten (#6a2fd8 bis #b8338a, Ränder #2fb7b0), Sporen, Bokeh | leiser, solange die Kamera im Gehirn ist (brain@0.45 bis 0.98) |
| cables | Glasfaser-Blau | #030916 / #0a1a33 / #2a63b8 | tiefe Ebene weit unten (y -9) mit Punktraster und Lichtpaketen, Bokeh, Sterne, Licht hinter dem Website-Knoten | |
| dna | Code-Raum Grün-Türkis | #02100e / #05302a / #17a888 | leiser Code-Regen auf der Tunnelwand (Zylinder r 5.5 um die Helix-Achse), Lichtkern beim Gerüst (-z) | Lichtkern und Code steigen mit dem Gerüst (dna@0.45 bis 0.75) |
| outro | Morgenlicht | #07080a / #151210 / #e0a05a | Gold nur als Horizont und Gegenlicht hinter der rechten Schulter (horizonGlow 0.42, glowSize 1.15), leise Strahlen, wenig Goldstaub, oben kühl | Sonnenaufgang über outro@0 bis 0.8 (Horizont 0.4 -> 1) |
| inhalt | Ruhe | #05080d / #0a0f16 / #2a1c12 | nur Verlauf und ein Rest Wärme, Muster auf 10 % (`detail` 0.1) | |

**Licht-Anker** (Weltpunkte, linear gemischt, pro Frame zur Richtung von der Kamera aus umgerechnet): `glowAt` + `glowShift`
(Gegenlicht-Halo hinter dem Motiv, Verschiebung im Bild als Anteil, x rechts, y oben), `rayAt` (Quelle der Lichtstrahlen,
meist ausserhalb des Bildes), `accentAt` (Akzent-Dunst). Weil der Halo an einem Punkt beim Motiv hängt, bleibt das Licht
hinter der Büste, wenn die Kamera kreist. Kompositionsregel: helle Teile nur auf der Seite des Motivs, nie hinter der Textspalte.

**Mischung** (ohne Allokationen pro Frame): Gewicht pro Beat mit weicher Kante `BACKDROP_FADE` = 0.035 global (rund 38 vh)
um jede Beat-Grenze, als Partition der Eins. Am Schnitt (`director.cuts`, Ende dna -> outro) wechselt die Farbwelt hart,
versteckt im Lichtblitz des Runners. Im Inhaltsbereich mischt `director.content` (setzt main.js, gedämpft) zur Farbwelt
`inhalt`; danach friert main.js das Bild ohnehin ein. Farben werden linear gemischt, Zahlen und Punkte ebenso; die Dynamik pro
Beat wirkt als Faktor auf die Werte der jeweiligen Farbwelt.

**Was das Modul ausserhalb setzt:** nur `scene.fog.color` (Nebelfarbe der Farbwelt, entfernte Objekte mit `fog: true` laufen
in den Hintergrund statt gegen Schwarz). Lichtfarben, Looks und Belichtung der anderen Szenen bleiben unberührt (das Modul hat
keinen `look`). Eigene Looks pro Beat (BEAT_LOOKS aus dem Konzept Version 2) waren nicht nötig: Belichtung, Bloom und
Vignette der Szenen passen zu den Farbwelten, die Android-Büste bleibt so, wie Jonas sie freigegeben hat.

**Lesbarkeit.** Der Shader liest `director.scrim` und macht Muster (Nebel, Strahlen, Punkte, Raster) in der Textzone bis
75 % leiser; der FxPass dunkelt dort zusätzlich ab. Helligkeit linear vor dem Tonemapping: Flächen bis etwa 0.06, nur
Halo-Kern, Lichtpakete, Sterne und Bokeh werden heller. Gemessen am 30.10.2026 (Desktop 1440 x 900, Panels ausgeblendet,
Scrim aktiv, relative Leuchtdichte im Textblock, Kontrast für Fliesstext #d3dee6 gegen den 95-%-Wert): robot 12.7:1,
zoom 12.6:1, brain 11.6:1, cables 14.2:1, dna 12.0:1; Weiss gegen das Mittel überall mindestens 14:1. Im Hero liegt der
Titel teilweise über der Partikel-Büste (Vordergrund), der Kontakt im Ausklang steht in seinem eigenen Panel.

**Qualität.** high: alle Bausteine, Nebel 3 Rauschzugriffe, Strahlen 2. medium (Handy): Nebel 2, Strahlen 2, ohne die
dritte Nebelschicht. low: Verlauf, 1 Nebelschicht, Strahlen einfach, ohne Staub, ohne Lichtpakete und ohne Code-Zeichen
(nur gemittelte Deckung). Immer 1 Draw Call. Falls ein Handy das nicht schafft: Hintergrund in halber Auflösung in ein eigenes
RenderTarget rechnen und hochskalieren (weich genug, noch nicht nötig).

**Ändern.** Stimmung einer Szene: nur `BACKDROPS` in config.js. Neue Bausteine: Uniform in `backdrop-glsl.js`, Schlüssel in
`BASE`, `NUMS` oder `COLORS` von backdrop.js, Wert in den Farbwelten. Testen: `dev.html?scene=backdrop` (alle Farbwelten
über den Regler), `dev.html?scene=all&at=brain@0.3`, Vergleich ohne Hintergrund `&bg=0`.

**Poster:** Fallback-Poster (`assets/img/poster-*.webp`, Desktop und Hochformat) und OG-Bild am 30.10.2026 mit den neuen
Farbwelten neu gerendert (`S/tools/make_posters.sh`, Kapitel 10). Nebeneinander sind die sieben Kapitel klar unterscheidbar.
Für Version 3 (Integration) nochmals neu gerendert, zusammen mit dem OG-Bild.