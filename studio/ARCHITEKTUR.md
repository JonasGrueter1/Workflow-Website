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
| intro | 120 | 0.0000 | 0.1111 | Hero: Partikel-Büste (zu zwei Dritteln geformt, Visier-Linie, atmet, folgt der Maus), Titel, Buttons |
| robot | 180 | 0.1111 | 0.2778 | Partikel formen den Roboter, Maus-Reaktion |
| zoom | 170 | 0.2778 | 0.4352 | Kopf rechts, Schale wird transparent, Kamera kreist nach vorne links oben |
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
- `posM` / `lookM`: eigene Werte fürs Hochformat (Seitenverhältnis unter 0.85). Zusätzlich wird im Hochformat das FOV
  erweitert (`PORTRAIT`), damit horizontal genug Bild bleibt.
- Danach kommen Maus-Parallax (`look.parallax`, Einheiten) und ruhiges Schweben (`look.drift`).
- Dämpfung: `global` folgt dem Scroll mit `lambda` 4.2 (bei grossen Sprüngen schneller). Die Szenen bekommen immer den gedämpften Wert.

Verlauf (Version 1, von der Integration abgestimmt). Grundsatz: Solange ein Text-Panel links steht, sitzt das Motiv rechts
der Mitte (Blickziel nach links versetzt); im Hochformat steht der Text unten, darum dort das Motiv in der oberen Bildhälfte
(`posM`/`lookM`).

| Key | pos | look | fov | Hochformat | Notiz |
| --- | --- | --- | --- | --- | --- |
| intro@0 | (0.15, 0.32, 13.4) | (-1.75, -0.3, 0) | 30 | pos (0, 0.35, 11), look (0, -3.25, 0) | Hero: Partikel-Büste rechts neben dem Text, Hochformat oberes Drittel |
| intro@1 | (0.6, 0.3, 12) | (-0.9, -0.3, 0) | 31 | pos (0.5, 0.3, 9.6), look (0, -2.1, 0) | |
| robot@0.5 | (3.6, 0.9, 8.2) | (-0.32, -0.45, 0.14) | 32 | look (0, -0.45, 0) | Roboter leicht rechts |
| robot@1 | (1.8, 0.45, 5.6) | (-0.5, -0.15, 0.16) | 33 | pos (1.8, 0.45, 6.4), look (0, -1.5, 0) | |
| zoom@0.35 | (1.0, 0.32, 4.3) | (-0.58, 0.02, 0.14) | 36 | pos (0.5, 0.4, 4.6), look (0, -1.15, 0) | Kopf rechts, Text links, Scan beginnt |
| zoom@0.5 | (-1.5, 0.95, 3.7) | (-0.45, 0.12, 0) | 38 | pos (-1.3, 0.5, 3.9), look (-0.05, -0.8, 0) | schon seitlich: Gehirn nie frontal (zwei Hälften) |
| zoom@0.7 | (-2.0, 1.35, 3.1) | (-0.3, 0.12, 0) | 39 | pos (-1.6, 0.8, 2.85), look (-0.04, -0.6, -0.05) | |
| zoom@1 | (-2.15, 1.5, 2.85) | (-0.7, 0.12, -0.12) | 40 | pos (-1.68, 1.21, 2.3), look (-0.03, -0.46, -0.1) | Dreiviertelansicht vorne links oben, Hochformat: Kopf ~70 % der Breite |
| brain@0.3 | (-1.62, 1.2, 2.18) | (-0.58, 0.16, -0.12) | 40 | pos (-1.6, 1.15, 2.2), look (-0.03, -0.45, -0.1) | Text links, Gehirn rechts |
| brain@0.55 | (-0.5, 0.52, 0.42) | (0.15, 0.22, -0.5) | 54 | | Eintauchen durch Schale und Rinde |
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
| outro@0 (Schnitt) | (0, 0, 4.6) | (0, -0.2, 0) | 34 | pos (0, 0.2, 6.5), look (0, -2.25, 0) | Augen leuchten schon im Lichtblitz |
| outro@1 | (-1.9, 0.15, 8.6) | (-1.1, -0.45, 0) | 32 | pos (0, 0.4, 9), look (0, -3.1, 0) | Roboter rechts, Text links; Hochformat: Kopf oben, Text unten |

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
([0, 0, 0.45, 0.7]: Hero-Text bis etwa intro@0.5), `cables` ([0.14, 0.24, 0.46, 0.6]: Text erst, wenn die Übersicht steht),
`dna` ([0.02, 0.12, 0.4, 0.54]: weg, bevor das Gerüst entsteht). Das letzte Panel (outro) bleibt stehen und scrollt mit dem
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

Folgen für Szenen: Der Röntgen-Wechsel ist ein Scan: eine helle, dünne Linie läuft von zoom@0.3 bis zoom@0.84 von oben nach
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
| `fogDensity` | 0.035 | `FogExp2` in Hintergrundfarbe |
| `env` | 0.35 | Stärke der Spiegelungen (`scene.environmentIntensity`) |
| `key`, `rim`, `amb` | 1.3, 2.0, 0.12 | warmes Führungslicht in Ember (links vorne), Cyan-Kantenlicht (rechts hinten), Hemisphäre. Nur der Roboter nutzt Lichter (robot und outro: key 1.85 bis 1.95) |
| `parallax`, `drift` | 0.22, 0.025 | Maus-Parallax und Schweben der Kamera (im Kopf/Gehirn klein halten) |
| `flash` | 0 | additiver Lichtblitz 0..1, klein in Signal-Cyan, ab ~0.3 weisser (Schnitt) |
| `fade` | 0 | Abblende zu Schwarz 0..1 (am Schnitt nur leicht, der Runner setzt dort vor allem `flash`) |
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

| Stufe | Wann | DPR | MSAA | Partikel-Faktor | Aberration | Roboter |
| --- | --- | --- | --- | --- | --- | --- |
| high | Desktop (Maus, Fenster ab 760 px, auch 1280 x 800) | bis 2, Budget 3.5 MP | 4x, nur wenn DPR unter 1.5 | 1 | ja | Klarlack, Iridescence |
| medium | Touch (`pointer: coarse`) oder Fenster unter 760 px | bis 1.5 | nein, dafür FXAA | 0.5 | nein | Klarlack nur am Kopf, keine Iridescence |
| low | 2 GB RAM oder 2 Kerne | 1 | nein, FXAA | 0.25 | nein | wie medium |

- Bloom läuft immer in halber Auflösung (UnrealBloom intern), Stufe low noch etwas kleiner.
- Pixelbudget: DPR höchstens `sqrt(3.5e6 / (Breite x Höhe))` (mindestens 1), z. B. 1440 x 900 mit DPR 2 -> 1.64.
- Adaptive Auflösung, dauernd aktiv (je 1 s gemessen): über ~29 ms pro Frame zuerst MSAA aus, dann DPR-Skala in Schritten
  bis 0.5 runter; mit Reserve (unter ~19 ms, 4 s lang) langsam um 0.1 wieder rauf, nach jedem Absenken 20 s Pause (Hysterese).
  Grundtakt: in den ersten 45 Bildern wird der Median des Bildabstands gemessen. Liegt er eng um 33 ms (iOS-Stromsparmodus,
  Chrome-Energiesparen, Android Battery Saver drosseln requestAnimationFrame auf 30 Hz), gilt 30 Hz als Basis: dann erst
  über 1.2 x Basis (40 ms) senken und unter 1.05 x Basis wieder anheben. Sonst würde die Auflösung ohne Grund aufs Minimum fallen.
- MSAA nur auf `composer.renderTarget1` (dort rendert die Szene), `renderTarget2` bekommt nur fertige Vollbild-Passes (0 Samples).
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
- Fallback (`no-gl`, `no-js`, reduzierte Bewegung): kein Canvas, jeder Abschnitt ist mindestens bildschirmhoch und zeigt sein
  Posterbild (`.chapter__poster`, `assets/img/poster-<beat>.webp`, im Hochformat `poster-<beat>-m.webp`) mit Verlauf für
  die Lesbarkeit. Die Poster sind echte Renderings der Szenen (ohne UI und ohne Korn) und werden nur im Fallback geladen.
  Neu erzeugen: `S/tools/make_posters.sh`, danach als WebP nach `assets/img/` (siehe Kapitel 10).
- Texte in index.html stammen aus `studio-texte.md` (Version 1). `assets/img/og.jpg` ist das Vorschaubild für Links (1200 x 630).
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

(`S` = Scratchpad-Ordner der Session.) `?q=high` verhindert, dass die adaptive Auflösung im langsamen SwiftShader die DPR senkt.

dev.html:

- `?scene=particles|robot|brain|cables|dna|all`, `&local=0.4` (Startwert), `&cam=orbit` (ziehen, Mausrad), `&q=high`,
  `&post=0` (ohne Postprocessing), `&play` (läuft selbst), `&scroll=0` (nur Regler).
- Scrollen auf der Testseite fährt `local` von 0 bis 1. Darum tastet `studio_capture.js` mit `--steps=N` das ganze Fenster ab.
- In dev.html laufen Director, Runner und Looks exakt wie auf der Seite (nur ohne Dämpfung, wenn "Daempfung" aus ist).
- Konsole: `window.__dev` (dev.html) und `window.__studio` (index.html) mit `engine`, `director`, `runner`, `ctx`.
  Beispiel: `__dev.setLocal(0.5)`, `__studio.director.beat('zoom')`.

Keine Konsolenfehler und keine Warnungen: studio_capture.js meldet beides. Szenen nicht mit `console.log` im Loop debuggen.
