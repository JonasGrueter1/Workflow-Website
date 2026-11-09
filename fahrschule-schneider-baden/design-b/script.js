/* Fahrschule Schneider, Design B: Animationen und Schaltkulisse (Vanilla JS) */
(function () {
  'use strict';
  window.schneiderB = true;
  var root = document.documentElement;
  var fx = root.classList.contains('fx');

  /* Kopfzeile und Aktionsleiste */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var hero = document.querySelector('.hero');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (kopf) kopf.classList.toggle('ist-unten', y > 24);
    if (aktion && hero) aktion.classList.toggle('zeigen', y > hero.offsetHeight * 0.55);
    if (fx) zeichneRoute();
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* Scroll-Reveals, gestaffelt pro Gruppe */
  var rvs = [].slice.call(document.querySelectorAll('.rv'));
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', Math.min(n++ * 90, 360) + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('in'); });
  }

  /* Schaltkulisse: Tabs Handschaltung / Automat */
  var tabs = [].slice.call(document.querySelectorAll('.schalter .tab'));
  var gasse = document.querySelector('.gasse');
  function waehle(tab, fokus) {
    tabs.forEach(function (t) {
      var an = t === tab;
      t.setAttribute('aria-selected', an ? 'true' : 'false');
      t.tabIndex = an ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !an;
      if (an && fx) { panel.classList.remove('wechsel'); void panel.offsetWidth; panel.classList.add('wechsel'); }
    });
    if (gasse) {
      gasse.setAttribute('data-modus', tab.id === 'tab-auto' ? 'auto' : 'hand');
      if (fx) { gasse.classList.remove('fahrt'); void gasse.getBoundingClientRect(); gasse.classList.add('fahrt'); }
    }
    if (fokus) tab.focus();
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { waehle(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = tabs.length - 1;
        if (j < 0) return;
        e.preventDefault();
        waehle(tabs[j], true);
      });
    });
    /* Startzustand ohne Animation, dann beim Sichtbarwerden einmal in den ersten Gang */
    tabs.forEach(function (t) {
      var p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = t.getAttribute('aria-selected') !== 'true';
    });
    if (fx && gasse && 'IntersectionObserver' in window) {
      var gio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { gasse.classList.add('fahrt'); gio.disconnect(); }
      }, { threshold: 0.5 });
      gio.observe(gasse);
    }
  }

  /* Fahrstrecke: am Desktop an den Scroll gekoppelt, am Handy beim Sichtbarwerden */
  var route = document.getElementById('route');
  var zug = route && route.querySelector('.r-zug');
  var marker = route ? [].slice.call(route.querySelectorAll('.r-marker circle')) : [];
  var etappen = route ? [].slice.call(route.querySelectorAll('.etappe')) : [];
  var liste = route && route.querySelector('.etappen');
  var schwellen = [0.12, 0.31, 0.5, 0.69, 0.88];
  var mq = window.matchMedia('(min-width: 901px)');
  function zeichneRoute() {
    if (!route || !zug || !mq.matches) return;
    var r = route.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = (vh * 0.86 - r.top) / (vh * 0.5 + r.height * 0.3);
    p = Math.max(0, Math.min(1, p));
    zug.style.strokeDashoffset = (1 - p).toFixed(4);
    schwellen.forEach(function (s, i) {
      var an = p >= s;
      if (marker[i]) marker[i].classList.toggle('an', an);
      if (etappen[i]) etappen[i].classList.toggle('an', an);
    });
  }
  if (fx && liste && 'IntersectionObserver' in window) {
    var lio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { liste.classList.add('in'); lio.disconnect(); }
    }, { threshold: 0.15 });
    lio.observe(liste);
  }
  if (mq.addEventListener) mq.addEventListener('change', function () { if (fx) zeichneRoute(); });

  onScroll();
})();
