/* Fahrschule Sandra Schoch, Design A «Nachtfahrt»: Hero, Einblenden, Zähler, Menü, Aktionsleiste, Aktionsdatum */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // Herbst-Aktion: nach Ablauf automatisch die Weiterempfehlung zeigen (zum Testen: ?aktion=vorbei)
  var aktion = document.querySelector('[data-bis]');
  if (aktion) {
    var bis = Date.parse(aktion.getAttribute('data-bis'));
    if ((!isNaN(bis) && Date.now() > bis) || /[?&]aktion=vorbei/.test(location.search)) root.classList.add('aktion-vorbei');
  }

  // Hero starten (Lichtkegel, Linie, Name, Text)
  var start = function () { root.classList.add('ist-geladen'); };
  if (reduced) start(); else requestAnimationFrame(function () { requestAnimationFrame(start); });

  // Zähler 0,0 bis 5,0
  var zaehle = function (el) {
    var ziel = parseFloat((el.getAttribute('data-zaehler') || '0').replace(',', '.'));
    if (reduced || !window.requestAnimationFrame) return;
    var t0 = null, dauer = 700;
    var schritt = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (ziel * e).toFixed(1).replace('.', ',');
      if (p < 1) requestAnimationFrame(schritt);
    };
    el.textContent = '0,0';
    requestAnimationFrame(schritt);
  };

  // Einblenden beim Scrollen
  var targets = document.querySelectorAll('[data-reveal], [data-kante], [data-preise], [data-zeichnen], .bew-band-wrap');
  var zeige = function (t) {
    if (t.classList.contains('ist-da')) return;
    t.classList.add('ist-da');
    var z = t.querySelector && t.querySelector('[data-zaehler]');
    if (z) zaehle(z);
  };
  if (reduced || !('IntersectionObserver' in window)) {
    each(targets, function (t) { t.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    each(targets, function (t) { io.observe(t); });
    // Sicherheitsnetz: was beim Laden schon oberhalb liegt (Anker-Sprung), sofort zeigen
    window.addEventListener('load', function () {
      each(targets, function (t) { if (t.getBoundingClientRect().bottom < 0) zeige(t); });
    });
  }

  // Kopfzeile nach dem Scrollen dunkel hinterlegen
  var kopf = document.getElementById('kopf');
  var onScroll = function () { if (kopf) kopf.classList.toggle('ist-gescrollt', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menü am Handy
  var btn = document.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  if (btn && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('ist-offen', open);
      if (kopf) kopf.classList.toggle('ist-offen', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('ist-offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Bewertungen am Handy: Punkte zeigen die aktuelle Karte
  var band = document.getElementById('bew-band');
  var punkte = document.querySelectorAll('#bew-punkte span');
  if (band && punkte.length) {
    var karten = band.children;
    var aktiv = function () {
      var links = band.getBoundingClientRect().left, best = 0, min = Infinity;
      for (var k = 0; k < karten.length; k++) {
        var d = Math.abs(karten[k].getBoundingClientRect().left - links - 20);
        if (d < min) { min = d; best = k; }
      }
      each(punkte, function (p, k) { p.classList.toggle('ist-aktiv', k === best); });
    };
    var raf = 0;
    band.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(aktiv); }, { passive: true });
  }

  // Aktionsleiste am Handy erst nach den Hero-Knöpfen
  var leiste = document.getElementById('aktionsleiste');
  var heroKnoepfe = document.querySelector('.hero-knoepfe');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      leiste.classList.toggle('ist-sichtbar', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (leiste) { leiste.classList.add('ist-sichtbar'); }
})();
