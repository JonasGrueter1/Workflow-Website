/* Maler Schmid GmbH, Design A: Menü, Einblendungen, Zeitleiste, Aktionsleiste */
(function () {
  'use strict';
  window.schmidA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');

  /* Kopf: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var kopfPruefen = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  kopfPruefen();
  window.addEventListener('scroll', kopfPruefen, { passive: true });

  /* Menü (Tablet und Mobil) */
  var menuBtn = document.querySelector('.kopf-menu');
  var menu = document.getElementById('menu');
  var setMenu = function (offen) {
    menuBtn.setAttribute('aria-expanded', String(offen));
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    menu.hidden = !offen;
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1020) setMenu(false); });

  /* Sanftes Scrollen zu Ankern (nur mit Animationen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Formular: in der Vorschau nichts absenden */
  var form = document.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Gestaffelte Einblendung innerhalb einer Gruppe */
  document.querySelectorAll('[data-staffel]').forEach(function (gruppe) {
    var kinder = gruppe.querySelectorAll(':scope > [data-rv]');
    kinder.forEach(function (el, i) { el.style.setProperty('--d', (i % 4) * 0.08 + 's'); });
  });
  document.querySelectorAll('.zeitleiste li').forEach(function (li, i) { li.style.setProperty('--n', i); });

  /* Aktionsleiste mobil: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta) {
    var wartet = false;
    var aktionPruefen = function () {
      wartet = false;
      var r = heroCta.getBoundingClientRect();
      aktion.classList.toggle('ist-da', r.bottom < 70 || r.top > window.innerHeight - 110);
    };
    window.addEventListener('scroll', function () { if (!wartet) { wartet = true; requestAnimationFrame(aktionPruefen); } }, { passive: true });
    window.addEventListener('resize', aktionPruefen);
    aktionPruefen();
  }

  /* Einblendungen beim Scrollen */
  var ziele = document.querySelectorAll('[data-rv], #zeitleiste');
  var zeige = function (el) {
    if (el.id === 'zeitleiste') el.classList.add('laeuft');
    else el.classList.add('ist-sichtbar');
  };
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(zeige);
    return;
  }
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  ziele.forEach(function (el) { io.observe(el); });
})();
