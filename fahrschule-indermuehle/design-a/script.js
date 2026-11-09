/* Design A «Sonnenblumen»: Menü, Kopf beim Scrollen, Einblenden, VKU-Datum, Anfrageart */
(function () {
  'use strict';

  var kopf = document.getElementById('kopf');
  var nav = document.getElementById('nav');
  var burger = document.querySelector('.burger');

  var onScroll = function () { kopf.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var setMenu = function (offen) {
    nav.classList.toggle('is-open', offen);
    burger.setAttribute('aria-expanded', String(offen));
    burger.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  };
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Sanft zu Ankern scrollen (nur Klicks, nicht programmatisches Scrollen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Einblenden beim Scrollen */
  var items = document.querySelectorAll('.rv');
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !ruhig) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: Elemente, die beim schnellen Scrollen übersprungen wurden, ebenfalls zeigen */
    var offen = Array.prototype.slice.call(items), tick = false;
    var pruefe = function () {
      tick = false;
      offen = offen.filter(function (el) {
        if (el.classList.contains('is-in')) return false;
        if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-in'); io.unobserve(el); return false; }
        return true;
      });
      if (!offen.length) window.removeEventListener('scroll', plane);
    };
    var plane = function () { if (!tick) { tick = true; requestAnimationFrame(pruefe); } };
    window.addEventListener('scroll', plane, { passive: true });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* VKU-Termin: nach dem letzten Kursabend auf «Nächste Daten auf Anfrage» wechseln */
  var termin = document.querySelector('[data-vku-ende]');
  if (termin) {
    var ende = new Date(termin.getAttribute('data-vku-ende'));
    if (!isNaN(ende) && Date.now() > ende.getTime()) {
      termin.querySelector('[data-vku-datum]').textContent = 'Nächste Daten auf Anfrage';
      termin.querySelector('.termin-label').textContent = 'Verkehrskunde in Endingen';
      termin.querySelector('.btn').textContent = 'Daten anfragen';
    }
  }

  /* Anfrageart vorwählen (Knopf «Anmelden» bei der VKU oder ?art=vku) */
  var select = document.getElementById('f-art');
  var feld = select && select.closest('.feld');
  var waehle = function (wert) {
    if (!select) return;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].text.toLowerCase() === wert.toLowerCase()) {
        select.selectedIndex = i;
        feld.classList.add('is-gesetzt');
        setTimeout(function () { feld.classList.remove('is-gesetzt'); }, 1800);
        return;
      }
    }
  };
  document.querySelectorAll('[data-art]').forEach(function (a) {
    a.addEventListener('click', function () { waehle(a.getAttribute('data-art')); });
  });
  var art = new URLSearchParams(window.location.search).get('art');
  if (art === 'vku') waehle('Ausbildung VKU');

  /* Handy-Aktionsleiste erst zeigen, wenn die Hero-Knöpfe aus dem Bild sind */
  var leiste = document.querySelector('.aktionsleiste');
  var heroKnoepfe = document.querySelector('.hero .knoepfe');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      leiste.classList.toggle('is-sichtbar', !(entries[0].isIntersecting || entries[0].boundingClientRect.top > 0));
    }).observe(heroKnoepfe);
  } else if (leiste) {
    leiste.classList.add('is-sichtbar');
  }

  /* Formular: in der Vorschau wird nichts verschickt */
  var form = document.getElementById('anfrage');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
