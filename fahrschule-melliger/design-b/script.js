/* Fahrschule Rolf Melliger, Design B «Bilanz»: Kopf, Menü, Einblenden, Anzeigetafel, Aktionsleiste */
(function () {
  'use strict';
  window.mellB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: weisser Hintergrund beim Scrollen ---------- */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  var tick = false;
  function kopfUpdate() {
    tick = false;
    kopf.classList.toggle('gescrollt', window.scrollY > 8);
    /* Aktionsleiste mobil: nach dem ersten Scrollen da, ausser die Hero-Knöpfe sind gerade selbst im Bild */
    if (aktion && heroCta) {
      var r = heroCta.getBoundingClientRect();
      var ctaImBild = r.bottom > 0 && r.top < window.innerHeight - 40;
      aktion.classList.toggle('zeigen', window.scrollY > 240 && !ctaImBild);
    }
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(kopfUpdate); }
  }, { passive: true });
  kopfUpdate();

  /* ---------- Hero: nach dem Auftritt die Animationen entfernen (Endzustand = Grundstil) ---------- */
  var heroBild = document.querySelector('.hero-bild');
  if (fx && heroBild) {
    var heroFertig = function () { heroBild.classList.add('fertig'); };
    heroBild.addEventListener('animationend', function (e) {
      if (e.target.classList.contains('plakette')) heroFertig();
    });
    setTimeout(heroFertig, 2600);
  }

  /* ---------- Menü mobil ---------- */
  var knopf = kopf.querySelector('.menu-knopf');
  var menu = document.getElementById('menu');
  function menuSetzen(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    knopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (knopf && menu) {
    knopf.addEventListener('click', function () { menuSetzen(!kopf.classList.contains('offen')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuSetzen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('offen')) { menuSetzen(false); knopf.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (kopf.classList.contains('offen') && !kopf.contains(e.target)) menuSetzen(false);
    });
  }

  /* ---------- Anker-Links: sanft scrollen ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Einblenden beim Scrollen (inkl. Anzeigetafel und Jubiläumszahl) ---------- */
  var rvs = document.querySelectorAll('.rv, .jubi-preis');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Aktiver Menüpunkt im Kopf ---------- */
  var navLinks = document.querySelectorAll('.kopf-nav a[href^="#"]');
  if (hasIO && navLinks.length) {
    var ziele = [];
    navLinks.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) ziele.push({ a: a, el: el });
    });
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        ziele.forEach(function (z) {
          if (z.el === e.target) z.a.classList.toggle('aktiv', e.isIntersecting);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ziele.forEach(function (z) { navIO.observe(z.el); });
  }

})();
