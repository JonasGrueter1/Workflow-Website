/* Drive 4 Life Fahrschule, Design A: Kopf, Menü, Einblenden, Preis-Reiter, Aktionsleiste */
(function () {
  'use strict';
  window.D4L_READY = true;
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopf: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var onScroll = function () { kopf.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü (Handy und Tablet) */
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  var setMenu = function (open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    menu.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (btn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.kopf')) setMenu(false);
  });

  /* Einblenden beim Scrollen (robust auch bei schnellem Scrollen und Sprüngen) */
  var targets = [].slice.call(document.querySelectorAll('.rv, .zeit, .weg, .band'));
  var reveal = function () {
    var limit = window.innerHeight * 0.92;
    targets = targets.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) { el.classList.add('is-in'); return false; }
      return true;
    });
    if (!targets.length) window.removeEventListener('scroll', onReveal);
  };
  var ticking = false;
  var onReveal = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; reveal(); });
  };
  if (reduce) targets.forEach(function (el) { el.classList.add('is-in'); });
  else {
    window.addEventListener('scroll', onReveal, { passive: true });
    window.addEventListener('resize', onReveal);
    reveal();
  }

  /* Weiches Scrollen nur für Anker-Links */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Preis-Reiter (ARIA Tabs) */
  var tafel = document.querySelector('.tafel');
  var tablist = tafel.querySelector('[role="tablist"]');
  var tabs = [].slice.call(tablist.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var marke = tablist.querySelector('.reiter-marke');
  tablist.hidden = false;
  tafel.classList.add('has-tabs');

  var moveMarke = function (tab) {
    marke.style.width = tab.offsetWidth + 'px';
    marke.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
  };
  var select = function (tab, focus) {
    tabs.forEach(function (t, i) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      if (on && !reduce) {
        panels[i].classList.remove('is-anim');
        void panels[i].offsetWidth;
        panels[i].classList.add('is-anim');
      }
    });
    moveMarke(tab);
    if (focus) tab.focus();
  };
  tabs.forEach(function (t, i) {
    panels[i].tabIndex = 0;
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, j = i;
      if (k === 'ArrowRight') j = (i + 1) % n;
      else if (k === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = n - 1;
      else return;
      e.preventDefault();
      select(tabs[j], true);
    });
  });
  panels.forEach(function (p, i) { p.hidden = i !== 0; });
  moveMarke(tabs[0]);
  window.addEventListener('resize', function () {
    var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    if (cur) moveMarke(cur);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    if (cur) moveMarke(cur);
  });

  /* Links aus den Kacheln öffnen den passenden Reiter */
  [].forEach.call(document.querySelectorAll('[data-tab]'), function (a) {
    a.addEventListener('click', function () {
      var t = document.getElementById('tab-' + a.getAttribute('data-tab'));
      if (t) select(t, false);
    });
  });

  /* Aktionsleiste am Handy erst nach den Hero-Knöpfen zeigen */
  var aktion = document.querySelector('.aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      aktion.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(heroCta);
  } else if (aktion) {
    aktion.classList.add('is-visible');
  }
})();
