/* Drive 4 Life Fahrschule, Design A: Menü, Reiter, Scroll-Reveals, Aktionsleiste */
(function () {
  'use strict';
  window.D4L_READY = true;

  var doc = document.documentElement;
  var kopf = document.getElementById('kopf');
  var reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopf: Schatten nach dem ersten Scrollen */
  function kopfStatus() { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); }
  kopfStatus();
  window.addEventListener('scroll', kopfStatus, { passive: true });

  /* Menü (Handy und Tablet) */
  var knopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('nav');
  function menu(offen) {
    knopf.setAttribute('aria-expanded', String(offen));
    knopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('ist-offen', offen);
  }
  knopf.addEventListener('click', function () { menu(knopf.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') { menu(false); knopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (knopf.getAttribute('aria-expanded') === 'true' && !e.target.closest('.kopf')) menu(false);
  });

  /* Weiches Scrollen nur für Anker-Links (nicht global, damit Skripte normal scrollen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Preise: Reiter nach ARIA-Muster */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.reiter-knopf'));
  var marke = document.querySelector('.reiter-marke');
  function markeSetzen(tab) {
    if (!marke || !tab) return;
    marke.style.setProperty('--w', tab.offsetWidth + 'px');
    marke.style.setProperty('--x', tab.offsetLeft + 'px');
  }
  function waehlen(tab, fokus) {
    tabs.forEach(function (t) {
      var aktiv = t === tab;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', String(aktiv));
      t.tabIndex = aktiv ? 0 : -1;
      if (aktiv) {
        panel.hidden = false;
        panel.classList.remove('ist-neu');
        void panel.offsetWidth;
        panel.classList.add('ist-neu');
      } else {
        panel.hidden = true;
      }
    });
    markeSetzen(tab);
    if (fokus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { waehlen(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); waehlen(n, true); }
    });
  });
  if (tabs.length) {
    tabs.forEach(function (t) {
      if (t.getAttribute('aria-selected') !== 'true') document.getElementById(t.getAttribute('aria-controls')).hidden = true;
    });
    var start = function () { markeSetzen(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); };
    start();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    window.addEventListener('resize', start);
  }

  /* Scroll-Reveals, Zeitleiste und Weg */
  var ziele = document.querySelectorAll('.reveal, .zeitleiste, .weg');
  if (reduziert || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(ziele, function (el) { el.classList.add('ist-sichtbar'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    Array.prototype.forEach.call(ziele, function (el) { io.observe(el); });
  }

  /* Aktive Navigation */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav ul a'));
  if ('IntersectionObserver' in window && links.length) {
    var spy = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* Aktionsleiste am Handy erst zeigen, wenn die Hero-Knöpfe weg sind */
  var leiste = document.getElementById('aktionsleiste');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (eintraege) {
      leiste.classList.toggle('ist-sichtbar', !eintraege[0].isIntersecting);
    }).observe(heroKnoepfe);
  } else if (leiste) {
    leiste.classList.add('ist-sichtbar');
  }

  doc.classList.add('ist-bereit');
})();
