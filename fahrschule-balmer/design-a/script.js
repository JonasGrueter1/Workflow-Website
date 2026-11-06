/* Fahrschule Balmer, Design A: Menü, Scroll-Reveals, Kundenstimmen */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menü am Handy */
  var kopf = document.getElementById('kopf');
  var menueKnopf = kopf && kopf.querySelector('.kopf-menue');
  function menue(offen) {
    if (!kopf || !menueKnopf) return;
    kopf.classList.toggle('offen', offen);
    menueKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menueKnopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (menueKnopf) {
    menueKnopf.addEventListener('click', function () { menue(!kopf.classList.contains('offen')); });
    kopf.querySelectorAll('.kopf-nav a').forEach(function (a) {
      a.addEventListener('click', function () { menue(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); menueKnopf.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (kopf.classList.contains('offen') && !kopf.contains(e.target)) menue(false);
    });
  }

  /* Sanftes Scrollen zu Ankern auf der Seite */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Schatten unter dem Kopfband (Desktop) */
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      if (kopf) kopf.classList.toggle('gescrollt', window.scrollY > 8);
      tick = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Scroll-Reveals */
  var items = [].slice.call(document.querySelectorAll('[data-reveal]'));
  function zeigen(el) { el.classList.add('is-in'); }
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(zeigen);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { zeigen(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: was beim Laden schon oberhalb liegt (Sprung per Anker), sofort zeigen */
    window.addEventListener('load', function () {
      items.forEach(function (el) {
        if (el.getBoundingClientRect().bottom < 0) { zeigen(el); io.unobserve(el); }
      });
    });
  }

  /* Kundenstimmen: lange Texte kürzen, mit «Weiterlesen» öffnen */
  var knoepfe = [].slice.call(document.querySelectorAll('.weiter'));
  function kuerzen() {
    knoepfe.forEach(function (btn) {
      var text = document.getElementById(btn.getAttribute('aria-controls'));
      if (!text || btn.getAttribute('aria-expanded') === 'true') return;
      text.classList.add('gekuerzt');
      var lang = text.scrollHeight > text.clientHeight + 4;
      if (!lang) text.classList.remove('gekuerzt');
      btn.hidden = !lang;
    });
  }
  knoepfe.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = document.getElementById(btn.getAttribute('aria-controls'));
      var offen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', offen ? 'false' : 'true');
      text.classList.toggle('gekuerzt', offen);
      btn.firstChild.nodeValue = offen ? 'Weiterlesen' : 'Weniger anzeigen';
    });
  });
  kuerzen();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(kuerzen);
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(kuerzen, 150); });

  /* Kundenstimmen am Handy: Punkte zeigen die aktuelle Karte */
  var liste = document.getElementById('stimmen-liste');
  var punkte = [].slice.call(document.querySelectorAll('.stimmen-punkte i'));
  if (liste && punkte.length) {
    var karten = [].slice.call(liste.children);
    var aktiv = -1;
    function markieren() {
      var links = liste.getBoundingClientRect().left;
      var best = 0, dist = Infinity;
      karten.forEach(function (k, i) {
        var d = Math.abs(k.getBoundingClientRect().left - links - parseFloat(getComputedStyle(liste).paddingLeft || 0));
        if (d < dist) { dist = d; best = i; }
      });
      if (liste.scrollLeft + liste.clientWidth >= liste.scrollWidth - 4) best = karten.length - 1;
      if (best === aktiv) return;
      aktiv = best;
      punkte.forEach(function (p, i) { p.classList.toggle('aktiv', i === best); });
    }
    var st = false;
    liste.addEventListener('scroll', function () {
      if (st) return; st = true;
      requestAnimationFrame(function () { markieren(); st = false; });
    }, { passive: true });
    markieren();
  }

  root.classList.add('bereit');
})();
