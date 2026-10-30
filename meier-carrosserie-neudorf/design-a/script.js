/* Meier Carrosserie, Design A «Lackierkabine» */
(function () {
  'use strict';

  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopf: Schatten beim Scrollen, Menü am Handy */
  var hd = d.querySelector('.hd');
  var menuBtn = d.querySelector('.menu-btn');
  var nav = d.getElementById('nav');

  function setMenu(open) {
    hd.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (hd && menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(!hd.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hd.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    d.addEventListener('click', function (e) {
      if (hd.classList.contains('is-open') && !hd.contains(e.target)) setMenu(false);
    });
  }

  /* Anker weich anfahren (nur bei Klick, nicht global, damit Skripte normal scrollen) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && d.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Team: Welle von der Mitte des Rasters nach aussen */
  function teamWave() {
    var grid = d.querySelector('.team-grid');
    if (!grid) return;
    var items = [].slice.call(grid.children);
    var g = grid.getBoundingClientRect();
    if (!g.width) return;
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    var cellW = g.width / cols;
    var cx = g.left + g.width / 2;
    items.forEach(function (it) {
      var r = it.getBoundingClientRect();
      var steps = Math.round(Math.abs(r.left + r.width / 2 - cx) / cellW);
      it.style.setProperty('--d', String(steps * 0.6));
    });
  }
  if (!reduce) teamWave();

  /* Scroll-Reveals */
  var rv = [].slice.call(d.querySelectorAll('.rv'));
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  }

  /* Aktionsleiste am Handy: erscheint, sobald die Knöpfe im Hero aus dem Bild sind */
  var ab = d.querySelector('.ab');
  var heroCta = d.querySelector('.hero-cta');
  if (ab && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        ab.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0);
      });
    }).observe(heroCta);
  } else if (ab) {
    ab.classList.add('is-on');
  }

  /* Heute geöffnet: passende Zeile der Öffnungszeiten markieren */
  var today = new Date().getDay();
  [].forEach.call(d.querySelectorAll('.hours tr[data-days]'), function (tr) {
    if (tr.getAttribute('data-days').split(',').indexOf(String(today)) > -1) tr.classList.add('is-today');
  });

  /* Kopf-Schatten und dezente Parallaxe im Kabinenfoto */
  var stage = d.querySelector('.stage');
  var stageImg = stage && stage.querySelector('picture');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (hd) hd.classList.toggle('is-scrolled', y > 8);
    if (!reduce && stage && stageImg) {
      var r = stage.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        var p = (window.innerHeight - r.top) / (window.innerHeight + r.height); // 0 bis 1
        var amp = Math.min(26, r.height * 0.034); // nie mehr als der Zoom-Rand, sonst blitzt eine Kante auf
        stageImg.style.setProperty('--py', ((p - 0.35) * -amp).toFixed(1) + 'px');
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
})();
