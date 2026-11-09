/* Fahrschule Kern, Design A: Hero-Auftritt, Display, Uferlinie, Scroll-Reveals, Menü, Aktionsleiste, Öffnungszeiten */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  // Staffelung
  ['.fakten-liste', '.karten', '.preis-grid', '.team-grid'].forEach(function (g) {
    each(g + ' > [data-reveal]', function (el, i) { el.style.setProperty('--d', i); });
  });
  each('[data-weg] .schritt', function (s, i) { s.style.setProperty('--i', i); });
  each('.ufer-liste li', function (s, i) { s.style.setProperty('--i', i); });

  // Hero starten
  var start = function () { root.classList.add('ist-geladen'); };
  if (reduced) start(); else requestAnimationFrame(function () { requestAnimationFrame(start); });

  // Scroll-Reveals, Display, Weg, Ufer
  var targets = document.querySelectorAll('[data-reveal], [data-weg], [data-display], [data-ufer]');
  var zeige = function (t) { t.classList.add(t.hasAttribute('data-display') ? 'ist-an' : 'ist-da'); };
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, zeige);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
    window.addEventListener('load', function () {
      Array.prototype.forEach.call(targets, function (t) {
        if (t.getBoundingClientRect().bottom < 0) zeige(t);
      });
    });
  }

  // Kopf mit Linie nach dem Scrollen, Aktionsleiste nach dem Hero
  var kopf = document.getElementById('kopf');
  var leiste = document.getElementById('aktionsleiste');
  var hero = document.querySelector('.hero');
  var tick = false;
  var update = function () {
    tick = false;
    var y = window.scrollY || window.pageYOffset;
    if (kopf) kopf.classList.toggle('ist-gescrollt', y > 8);
    if (leiste && hero) {
      var nachHero = hero.getBoundingClientRect().bottom < 80;
      var kontakt = document.getElementById('kontakt');
      var imKontakt = kontakt && kontakt.getBoundingClientRect().top < window.innerHeight * 0.6 && kontakt.getBoundingClientRect().bottom > 0;
      leiste.classList.toggle('ist-sichtbar', nachHero && !imKontakt);
    }
  };
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  // Menü Handy
  var btn = document.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  if (btn && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('ist-offen', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('ist-offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Weiches Scrollen zu Ankern
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  // Heutigen Tag in den Öffnungszeiten hervorheben (Zeitzone Zürich)
  try {
    var tag = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Zurich' }).format(new Date());
    var nr = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[tag];
    var row = document.querySelector('.zeiten tr[data-tag="' + nr + '"]');
    if (row) row.classList.add('ist-heute');
  } catch (err) { /* ohne Hervorhebung */ }
})();
