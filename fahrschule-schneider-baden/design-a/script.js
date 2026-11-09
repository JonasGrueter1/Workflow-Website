/* Fahrschule Schneider, Design A */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kopf: Linie nach dem Scrollen, Aktionsleiste nach dem Hero
  var kopf = document.getElementById('kopf');
  var aktion = document.querySelector('.aktion');
  var hero = document.querySelector('.hero');
  var weg = document.getElementById('weg');
  var schritte = weg ? weg.querySelectorAll('.schritt') : [];
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (kopf) kopf.classList.toggle('is-scrolled', y > 8);
    if (aktion && hero) aktion.classList.toggle('is-on', y > hero.offsetHeight * 0.55);

    // Weg ab 2027: Linie folgt dem Scrollen, Nummern füllen sich
    if (weg && !reduce) {
      var r = weg.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.62 - r.top) / r.height;
      p = Math.max(0, Math.min(1, p));
      weg.style.setProperty('--fortschritt', p.toFixed(3));
      for (var i = 0; i < schritte.length; i++) {
        var s = schritte[i].getBoundingClientRect();
        schritte[i].classList.toggle('is-on', s.top + 24 < vh * 0.62);
      }
    }
  }
  // Anker sanft anfahren (nicht per CSS, damit Skripte und Tests sofort springen)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  function requestTick() { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  onScroll();

  if (reduce) {
    for (var k = 0; k < schritte.length; k++) schritte[k].classList.add('is-on', 'is-sicht');
  }

  // Hero-Auftritt: nach dem Ende die Endlage fest setzen (sauberes Neuzeichnen, auch wenn schon weggescrollt)
  document.addEventListener('animationend', function (e) {
    var t = e.target;
    if (t.closest && t.closest('.hero')) t.classList.add('ist-fertig');
  });

  // Einblenden beim Sichtbarwerden (einmalig)
  var ziele = document.querySelectorAll('.zeig, .zeig-brief, .chart, .etappen__liste, .schritt');
  if (!('IntersectionObserver' in window) || reduce) {
    for (var j = 0; j < ziele.length; j++) ziele[j].classList.add('is-in', 'is-sicht');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      if (e.target.classList.contains('schritt')) e.target.classList.add('is-sicht');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  for (var n = 0; n < ziele.length; n++) io.observe(ziele[n]);
})();
