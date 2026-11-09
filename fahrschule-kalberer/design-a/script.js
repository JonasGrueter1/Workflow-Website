/* Fahrschule Kalberer, Design A: Kopf, Menü, Hero-Auftritt, Scroll-Reveals, Parallaxe, VKU-Datum */
(function () {
  'use strict';
  window.kalbA = true;

  var d = document.documentElement;
  var fx = d.classList.contains('fx');
  var kopf = document.getElementById('kopf');
  var knopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('nav');

  /* Hero-Auftritt starten */
  if (fx) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { d.classList.add('bereit'); });
    });
  }

  /* Kopf bekommt beim Scrollen eine Linie, Fotoband leichte Parallaxe (nur Desktop) */
  var band = document.querySelector('[data-parallax]');
  var gross = window.matchMedia('(min-width: 961px)');
  var tick = false;
  function beimScrollen() {
    kopf.classList.toggle('gescrollt', window.scrollY > 8);
    if (fx && band && gross.matches) {
      var r = band.parentNode.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); /* -1 bis 1 */
        band.style.transform = 'translate3d(0,' + (p * -22).toFixed(1) + 'px,0)';
      }
    } else if (band) {
      band.style.transform = '';
    }
    tick = false;
  }
  beimScrollen();
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(beimScrollen); }
  }, { passive: true });
  window.addEventListener('resize', beimScrollen);

  /* Menü am Handy */
  function menu(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    knopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (knopf && nav) {
    knopf.addEventListener('click', function () { menu(!kopf.classList.contains('offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('offen')) { menu(false); knopf.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (kopf.classList.contains('offen') && !kopf.contains(e.target)) menu(false);
    });
  }

  /* SMS: Ohne JavaScript rufen diese Knöpfe an, mit JavaScript öffnen sie direkt die Nachrichten-App */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-sms]');
    if (!a) return;
    e.preventDefault();
    window.location.href = 'sms:' + a.getAttribute('data-sms');
  });

  /* Sanft zu den Ankern scrollen */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* VKU: Nach dem letzten Kursabend stehen die nächsten Daten auf Anfrage */
  var ende = new Date(2026, 11, 14, 22, 0, 0);
  if (new Date() > ende) {
    var titel = document.querySelector('[data-vku-titel]');
    var kal = document.querySelector('.vku-kal');
    if (titel) titel.textContent = 'Nächste VKU-Daten auf Anfrage';
    if (kal) kal.style.display = 'none';
    var vku = document.querySelector('.vku');
    if (vku) vku.style.gridTemplateColumns = '1fr';
  }

  /* Aktionsleiste am Handy: erst sichtbar, wenn die Hero-Knöpfe weggescrollt sind */
  var aktion = document.querySelector('.aktion');
  var heroKnoepfe = document.querySelector('.hero-knoepfe');
  if (aktion && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      aktion.classList.toggle('versteckt', e[0].isIntersecting);
    }).observe(heroKnoepfe);
  }

  /* Schritte nummerieren für die gestaffelte Animation */
  document.querySelectorAll('.weg .schritt').forEach(function (s, i) { s.style.setProperty('--i', i); });

  /* Scroll-Reveals */
  var ziele = document.querySelectorAll('.rv, .weg-wrap');
  function zeige(el) { el.classList.add('ist-da'); }
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(zeige);
    return;
  }
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  ziele.forEach(function (el) { io.observe(el); });
})();
