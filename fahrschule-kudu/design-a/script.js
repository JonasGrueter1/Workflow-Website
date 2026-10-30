/* Fahrschule KuDu, Design A: Menü, Einblenden, Zählwerke, Aktionsleiste.
   Ohne JavaScript bleibt alles sichtbar (versteckt wird nur unter html.js). */
(function () {
  'use strict';

  var root = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kopf = document.getElementById('kopf');
  var menue = document.getElementById('menue');
  var burger = document.querySelector('.burger');
  var main = document.getElementById('inhalt');
  var fuss = document.querySelector('.fuss');
  var aktion = document.querySelector('.aktion');

  /* Menü am Handy: Überlagerung mit Fokusfalle und Escape */
  var handy = window.matchMedia('(max-width: 899px)');
  function fokusierbar() {
    return [].slice.call(kopf.querySelectorAll('a[href], button')).filter(function (el) {
      return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    });
  }
  function oeffnen() {
    menue.classList.add('ist-offen');
    root.classList.add('menue-offen');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menü schliessen');
    if (main) main.inert = true;
    if (fuss) fuss.inert = true;
    if (aktion) aktion.inert = true;
    var erster = menue.querySelector('a');
    if (erster) setTimeout(function () { erster.focus(); }, 60);
  }
  function schliessen(zurueck) {
    if (!menue.classList.contains('ist-offen')) return;
    menue.classList.remove('ist-offen');
    root.classList.remove('menue-offen');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menü öffnen');
    if (main) main.inert = false;
    if (fuss) fuss.inert = false;
    if (aktion) aktion.inert = false;
    if (zurueck) burger.focus();
  }
  if (burger && menue) {
    burger.addEventListener('click', function () {
      if (menue.classList.contains('ist-offen')) schliessen(true); else oeffnen();
    });
    menue.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && handy.matches) schliessen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!menue.classList.contains('ist-offen')) return;
      if (e.key === 'Escape') { e.preventDefault(); schliessen(true); return; }
      if (e.key === 'Tab') {
        var f = fokusierbar();
        var erster = f[0], letzter = f[f.length - 1];
        if (e.shiftKey && document.activeElement === erster) { e.preventDefault(); letzter.focus(); }
        else if (!e.shiftKey && document.activeElement === letzter) { e.preventDefault(); erster.focus(); }
      }
    });
    var wechsel = function () { if (!handy.matches) schliessen(false); };
    if (handy.addEventListener) handy.addEventListener('change', wechsel); else handy.addListener(wechsel);
  }

  /* Zählwerke: Beträge zählen schnell hoch */
  function zaehlen(el, dauer) {
    var ziel = parseInt(el.getAttribute('data-zaehle'), 10);
    if (!ziel || ruhig || el.dataset.gezaehlt) return;
    el.dataset.gezaehlt = '1';
    el.style.width = el.getBoundingClientRect().width + 'px';
    var start = null;
    function schritt(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(ziel * e));
      if (p < 1) requestAnimationFrame(schritt);
      else { el.textContent = String(ziel); el.style.width = ''; }
    }
    el.textContent = '0';
    requestAnimationFrame(schritt);
  }

  /* Einblenden: alles, was den unteren Rand des Bildschirms erreicht hat oder darüber liegt.
     So bleibt auch nach schnellem Springen (Anker, Ende-Taste) nichts versteckt. */
  var offen = [].slice.call(document.querySelectorAll('[data-reveal], .pruef-raster'));
  function zeigen(el) {
    el.classList.add('ist-sichtbar');
    [].forEach.call(el.querySelectorAll('[data-zaehle]'), function (z) {
      zaehlen(z, z.classList.contains('riesig') ? 600 : 700);
    });
  }
  function pruefen() {
    var grenze = window.innerHeight * 0.92;
    offen = offen.filter(function (el) {
      if (el.getBoundingClientRect().top < grenze) { zeigen(el); return false; }
      return true;
    });
  }

  /* Aktionsleiste am Handy erst zeigen, wenn die Hero-Knöpfe aus dem Bild sind */
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  function leiste() {
    if (!aktion || !heroKnoepfe) return;
    aktion.classList.toggle('ist-da', heroKnoepfe.getBoundingClientRect().bottom <= 0);
  }

  var tick = false;
  function scrollen() {
    tick = false;
    if (kopf) kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
    if (offen.length) pruefen();
    leiste();
  }
  function anstossen() { if (!tick) { tick = true; requestAnimationFrame(scrollen); } }
  window.addEventListener('scroll', anstossen, { passive: true });
  window.addEventListener('resize', anstossen);
  window.addEventListener('load', anstossen);
  scrollen();

  /* Kategorienkarte: neigt sich am Computer leicht zur Maus */
  var box = document.querySelector('.ausweis-box');
  var tilt = box && box.querySelector('.ausweis-tilt');
  if (tilt && !ruhig && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    box.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--tx', (x * 18).toFixed(2) + 'deg');
      tilt.style.setProperty('--ty', (-y * 14).toFixed(2) + 'deg');
    });
    box.addEventListener('pointerleave', function () {
      tilt.style.setProperty('--tx', '0deg');
      tilt.style.setProperty('--ty', '0deg');
    });
  }

  /* Sanftes Scrollen nur für Klicks auf Anker (nicht global, damit Scrollen per Skript sofort springt) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
  });
})();
