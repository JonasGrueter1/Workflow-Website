/* PROCAR-DIERIKON, Design A: Kopf, Menü, sanftes Scrollen, Einblenden, Aktionsleiste */
(function () {
  'use strict';
  window.procarA = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Kopf: Linie und Schatten nach dem ersten Scrollen */
  var kopf = $('#kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menü für schmale Bildschirme */
  var menuBtn = $('.menu-btn');
  var nav = $('#nav');
  var setMenu = function (offen) {
    menuBtn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('ist-offen', offen);
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('ist-offen')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('ist-offen') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setMenu(false); });

  /* Sanftes Scrollen zu Ankern (nur bei Klicks) */
  $$('a[href^="#"]:not([data-soon])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var ziel = id === 'top' ? document.body : document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: fx ? 'smooth' : 'auto' });
      } else {
        ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
        if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
        ziel.focus({ preventScroll: true });
      }
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* Einblenden beim Scrollen, gestaffelt pro Gruppe */
  var gruppen = [['.zusagen-liste > .rv', 120], ['.kacheln > .rv', 60], ['.kontakt-raster > .rv', 90], ['.abschnitt-kopf > .rv', 100]];
  gruppen.forEach(function (g) {
    $$(g[0]).forEach(function (el, i) { el.style.setProperty('--d', (i * g[1] / 1000) + 's'); });
  });
  var ziele = $$('.rv').concat($$('.leasing'));
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('ist-da');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Aktionsleiste: erscheint, sobald die Knöpfe im Hero aus dem Bild sind */
  var aktion = $('#aktion');
  var heroKnoepfe = $('#hero-knoepfe');
  if (heroKnoepfe) {
    var aktionPruefen = function () { aktion.classList.toggle('ist-da', heroKnoepfe.getBoundingClientRect().bottom < 0); };
    aktionPruefen();
    window.addEventListener('scroll', aktionPruefen, { passive: true });
    window.addEventListener('resize', aktionPruefen);
  } else {
    aktion.classList.add('ist-da');
  }
})();
