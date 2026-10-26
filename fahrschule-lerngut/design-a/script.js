/* Fahrschule LernGut, Design A: Menü, Kopfzeile, Einblenden beim Scrollen, sanfte Parallaxe.
   Ohne JavaScript bleibt alles sichtbar (versteckt wird nur über html.js). */
(function () {
  'use strict';
  window.lgReady = true;

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menü auf kleinen Bildschirmen */
  var burger = doc.querySelector('.burger');
  var nav = doc.getElementById('nav');
  function setMenu(open) {
    if (!burger || !nav) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
  }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 980) setMenu(false); });
  }

  /* Sanft zu Ankern scrollen (nur bei normaler Bewegung) */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && doc.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Einblenden beim Scrollen */
  var targets = doc.querySelectorAll('[data-reveal], [data-pop], .duo-amp, .contact');
  function show(el) {
    el.classList.add(el.classList.contains('contact') ? 'is-lit' : 'is-in');
  }
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* Kopfzeile mit Linie, sobald gescrollt; Sonnenstrahlen mit leichter Parallaxe */
  var top = doc.querySelector('.top');
  var sun = doc.querySelector('.hero-sun');
  var hero = doc.querySelector('.hero');
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.pageYOffset || root.scrollTop;
    if (top) top.classList.toggle('is-scrolled', y > 8);
    if (sun && !reduce && hero && y < hero.offsetHeight + 200) {
      sun.style.setProperty('--py', (y * 0.22).toFixed(1) + 'px');
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(frame); }
  }, { passive: true });
  frame();
})();
