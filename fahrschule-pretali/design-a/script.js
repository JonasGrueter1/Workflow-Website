/* Fahrschule Pretali, Design A «Strassenband»: Menü, Kopfzeile, Einblenden, Aktionsleiste */
(function () {
  'use strict';

  var reduziert = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menü am Handy */
  var kopf = document.getElementById('kopf');
  var menuKnopf = kopf ? kopf.querySelector('.kopf-menu') : null;
  var nav = document.getElementById('kopf-nav');
  var menuZu = function () {
    if (!kopf) return;
    kopf.classList.remove('ist-offen');
    if (menuKnopf) menuKnopf.setAttribute('aria-expanded', 'false');
  };
  if (menuKnopf) {
    menuKnopf.addEventListener('click', function () {
      var offen = kopf.classList.toggle('ist-offen');
      menuKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
  }
  if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf && kopf.classList.contains('ist-offen')) { menuZu(); if (menuKnopf) menuKnopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (kopf && kopf.classList.contains('ist-offen') && !kopf.contains(e.target)) menuZu();
  });

  /* Einblenden beim Scrollen. Zusätzlich prüft jeder Scroll-Schritt, damit bei schnellen Sprüngen nichts unsichtbar bleibt. */
  var offen = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var zeigen = function (el) { el.classList.add('ist-da'); };
  var io = null;
  if (reduziert || !('IntersectionObserver' in window)) {
    offen.forEach(zeigen);
    offen = [];
  } else {
    io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeigen(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    offen.forEach(function (el) { io.observe(el); });
  }
  var nachziehen = function () {
    if (!offen.length) return;
    var grenze = window.innerHeight * 0.94;
    offen = offen.filter(function (el) {
      if (el.classList.contains('ist-da')) return false;
      if (el.getBoundingClientRect().top < grenze) { zeigen(el); if (io) io.unobserve(el); return false; }
      return true;
    });
  };

  /* Sanftes Scrollen bei Klicks auf Anker */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id === '#') return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Kopfzeile mit Linie nach dem ersten Scrollen, Aktionsleiste nach den Hero-Knöpfen */
  var leiste = document.getElementById('aktionsleiste');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  var kontakt = document.getElementById('kontakt');
  var laeuft = false;
  var pruefen = function () {
    laeuft = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (kopf) kopf.classList.toggle('ist-gescrollt', y > 8);
    if (leiste && heroKnoepfe) {
      var nachHero = heroKnoepfe.getBoundingClientRect().bottom < 0;
      var imKontakt = false;
      if (kontakt) {
        var r = kontakt.getBoundingClientRect();
        imKontakt = r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5;
      }
      leiste.classList.toggle('ist-sichtbar', nachHero && !imKontakt);
    }
    nachziehen();
  };
  window.addEventListener('scroll', function () {
    if (!laeuft) { laeuft = true; window.requestAnimationFrame(pruefen); }
  }, { passive: true });
  window.addEventListener('resize', pruefen);
  pruefen();
})();
