/* Fahrschule Pfäffli, Design A: Kopf beim Scrollen, Einblendungen, Karte, leichte Parallaxe, Aktionsleiste */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  root.classList.add('ready');

  /* Kopf: Linie und Schatten, sobald gescrollt wird; Hintergrund im Start leicht verschieben */
  var top = document.getElementById('top');
  var panel = document.querySelector('.hero-panel');
  var parallax = window.matchMedia('(min-width: 960px) and (prefers-reduced-motion: no-preference)');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      top.classList.toggle('is-scrolled', y > 8);
      if (panel && parallax.matches && y < 1000) panel.style.transform = 'translate3d(0,' + (y * -0.05).toFixed(1) + 'px,0)';
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Preiszeilen: Reihenfolge für das gestaffelte Einblenden */
  document.querySelectorAll('.prices .prow').forEach(function (row, i) { row.style.setProperty('--r', i); });

  /* Einblenden beim Scrollen; was gleichzeitig ins Bild kommt, leicht versetzt */
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--d', Math.min(n, 4) * 90 + 'ms');
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
        n++;
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Karte: zeichnet sich, sobald sie gut sichtbar ist */
  var map = document.getElementById('karte');
  if (map) {
    if (hasIO && !reduce) {
      var mio = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { map.classList.add('is-on'); mio.disconnect(); }
      }, { threshold: 0.35 });
      mio.observe(map);
    } else {
      map.classList.add('is-on');
    }
  }

  /* Anker: weich scrollen (nur bei Klicks, nicht bei programmiertem Scrollen) */
  document.querySelectorAll('a[href^="#"]:not([data-soon])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      if (id === 'inhalt') target.focus({ preventScroll: true });
    });
  });

  /* Aktionsleiste am Handy: erscheint, sobald die Knöpfe im Start aus dem Bild sind, und weicht dem Kontaktblock */
  var dock = document.querySelector('.dock');
  var heroBtns = document.getElementById('hero-btns');
  var cta = document.querySelector('.cta');
  if (dock && heroBtns && hasIO) {
    var btnsIn = true, ctaIn = false;
    var setDock = function () { dock.classList.toggle('is-on', !btnsIn && !ctaIn); };
    new IntersectionObserver(function (e) { btnsIn = e[0].isIntersecting; setDock(); }).observe(heroBtns);
    if (cta) new IntersectionObserver(function (e) { ctaIn = e[0].isIntersecting; setDock(); }, { threshold: 0.35 }).observe(cta);
  } else if (dock) {
    dock.classList.add('is-on');
  }
})();
