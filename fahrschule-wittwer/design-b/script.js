/* Fahrschule Wittwer, Design B «Nachtfahrt»: Kopf, Menü, Einblenden, Leitlinie, Lichtfleck, Aktionsleiste */
(function () {
  'use strict';

  var doc = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  var zeiger = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* Kopf: dunkler Hintergrund nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  function kopfStatus() { kopf.classList.toggle('ist-gescrollt', window.scrollY > 24); }

  /* Menü (Handy und Tablet) */
  var burger = kopf.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var offen = kopf.classList.toggle('ist-offen');
      burger.setAttribute('aria-expanded', offen ? 'true' : 'false');
      burger.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('ist-offen')) { burger.click(); burger.focus(); }
    });
  }

  /* Einblenden und Reflektoren */
  var revealEls = document.querySelectorAll('[data-reveal]');
  var abschnitte = document.querySelectorAll('.abschnitt');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });

    var ioStrecke = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-erreicht'); ioStrecke.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -35% 0px', threshold: 0 });
    abschnitte.forEach(function (el) { ioStrecke.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
    abschnitte.forEach(function (el) { el.classList.add('ist-erreicht'); });
  }

  /* Leitlinie: Striche laufen gegenläufig zum Scrollen; Hero-Bild mit leichter Parallaxe */
  var striche = document.querySelector('.leitlinie-striche');
  var heroBoxen = document.querySelectorAll('.hero-box');
  var hero = document.querySelector('.hero');
  var periode = 64;
  function periodeLesen() { periode = window.matchMedia('(max-width: 860px)').matches ? 52 : 64; }
  periodeLesen();

  var geplant = false;
  function zeichnen() {
    geplant = false;
    var y = window.scrollY;
    kopfStatus();
    if (ruhig.matches) return;
    if (striche) {
      var v = -((y * 0.6) % periode);
      striche.style.transform = 'translate3d(0,' + v.toFixed(1) + 'px,0)';
    }
    if (hero && y < hero.offsetHeight) {
      var t = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
      heroBoxen.forEach(function (el) { el.style.transform = t; });
    }
  }
  function aufScroll() { if (!geplant) { geplant = true; window.requestAnimationFrame(zeichnen); } }
  window.addEventListener('scroll', aufScroll, { passive: true });
  window.addEventListener('resize', function () { periodeLesen(); aufScroll(); });
  zeichnen();

  /* Karten: Lichtfleck folgt dem Mauszeiger */
  document.querySelectorAll('.karte a').forEach(function (karte) {
    karte.addEventListener('pointermove', function (e) {
      if (!zeiger.matches) return;
      var r = karte.getBoundingClientRect();
      karte.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      karte.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    });
  });

  /* Aktionsleiste am Handy: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var leiste = document.getElementById('aktionsleiste');
  var heroTel = document.querySelector('#hero-knoepfe .knopf');
  if (leiste && heroTel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (eintraege) {
      leiste.classList.toggle('ist-sichtbar', eintraege[0].intersectionRatio < 0.9);
    }, { rootMargin: '0px 0px -84px 0px', threshold: [0, 0.5, 0.9, 1] }).observe(heroTel);
  } else if (leiste) {
    leiste.classList.add('ist-sichtbar');
  }
})();
