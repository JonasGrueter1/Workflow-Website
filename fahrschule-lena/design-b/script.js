/* Fahrschule Lena, Design B «Scheinwerfer»
   Kopfzeile, Menü, Abschnitte anleuchten beim Scrollen, Ablauf-Spur, Kartenneigung.
   Ohne JavaScript ist alles sichtbar und hell. Bei reduzierter Bewegung läuft nichts. */
(function () {
  'use strict';

  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;
  var reduce = mqReduce.matches;

  /* ---------- Kopfzeile ---------- */
  var hd = document.querySelector('[data-hd]');
  var hero = document.querySelector('[data-hero]');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var limit = hero ? Math.max(120, hero.offsetHeight * 0.45) : 120;
      hd.classList.toggle('is-solid', window.scrollY > limit);
      updateSteps();
    });
  }

  /* ---------- Menü ---------- */
  var menu = document.querySelector('[data-menu]');
  var menuBtn = document.querySelector('[data-menu-btn]');
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    menuBtn.querySelector('.sr').textContent = open ? 'Menü schliessen' : 'Menü öffnen';
    root.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100 && !menu.hidden) setMenu(false); });
  }

  /* ---------- Anleuchten und Einblenden ---------- */
  var lit = [].slice.call(document.querySelectorAll('[data-lit]'));
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  if (reduce || !hasIO) {
    lit.forEach(function (el) { el.classList.add('on'); });
    rv.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ioLit = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('on'); ioLit.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -22% 0px', threshold: 0.01 });
    lit.forEach(function (el) { ioLit.observe(el); });

    var ioRv = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        // Geschwister gestaffelt einblenden
        var sibs = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains('rv') && !c.classList.contains('in'); });
        var idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(idx, 5) * 80 + 'ms';
        el.classList.add('in');
        ioRv.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    rv.forEach(function (el) { ioRv.observe(el); });
  }

  /* ---------- Sanft zu den Abschnitten scrollen ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Ablauf: Lichtspur ---------- */
  var steps = document.querySelector('[data-steps]');
  var stepItems = steps ? [].slice.call(steps.children) : [];
  function updateSteps() {
    if (!steps || reduce) return;
    var r = steps.getBoundingClientRect();
    var mark = window.innerHeight * 0.62;
    var p = (mark - r.top) / Math.max(1, r.height);
    p = Math.max(0, Math.min(1, p));
    steps.style.setProperty('--p', p.toFixed(3));
    for (var i = 0; i < stepItems.length; i++) {
      var li = stepItems[i];
      li.classList.toggle('pass', li.offsetTop + 22 <= p * r.height + 4);
    }
  }
  if (steps && reduce) stepItems.forEach(function (li) { li.classList.add('pass'); });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- Führerausweis: leichte Neigung mit der Maus ---------- */
  var tilt = document.querySelector('[data-tilt]');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (tilt && fine.matches && !reduce) {
    var stage = tilt.parentNode;
    var raf = 0, tx = 0, ty = 0;
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        tilt.style.transform = 'rotateY(' + (tx * 9).toFixed(2) + 'deg) rotateX(' + (-ty * 7).toFixed(2) + 'deg)';
      });
    });
    stage.addEventListener('pointerleave', function () { tilt.style.transform = ''; });
  }
})();
