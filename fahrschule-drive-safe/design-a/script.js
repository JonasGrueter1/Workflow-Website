/* Fahrschule Drive Safe, Design A: Scroll-Reveals, Kopfzeile, Aktionsleiste */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var reveals = [].slice.call(d.querySelectorAll('[data-reveal]'));

  function zeigeAlle() { reveals.forEach(function (el) { el.classList.add('is-in'); }); }

  var reduziert = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduziert || !('IntersectionObserver' in window)) {
    zeigeAlle();
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
    /* Notausgang: bei Sprung ans Seitenende oder Druck alles zeigen */
    window.addEventListener('beforeprint', zeigeAlle);
  }

  /* Weiches Scrollen nur bei Klick auf Anker (nicht global, damit Sprünge sofort gehen) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = d.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  var kopf = d.querySelector('.kopf');
  var leiste = d.querySelector('.aktionsleiste');
  var hero = d.querySelector('.hero-knoepfe');
  var tick = false;

  function aktualisieren() {
    tick = false;
    var y = window.scrollY || root.scrollTop;
    if (kopf) kopf.classList.toggle('is-scrolled', y > 8);
    if (leiste && hero) {
      var unten = hero.getBoundingClientRect().bottom;
      leiste.classList.toggle('is-visible', unten < 0);
    }
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(aktualisieren); }
  }, { passive: true });
  aktualisieren();
})();
