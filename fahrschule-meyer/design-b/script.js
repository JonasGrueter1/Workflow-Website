/* Design B: Kopfzeile beim Scrollen, Einblenden beim Scrollen, aktiver Abschnitt im Menü */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kopfzeile bekommt beim Scrollen eine Papierfläche mit Haarlinie
  var kopf = document.querySelector('.kopf');
  var wartet = false;
  var setKopf = function () {
    wartet = false;
    if (kopf) kopf.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  setKopf();
  window.addEventListener('scroll', function () {
    if (!wartet) { wartet = true; window.requestAnimationFrame(setKopf); }
  }, { passive: true });

  // Einblenden: Elemente mit data-anim bekommen .is-in, sobald sie sichtbar werden.
  // Mehrere gleichzeitig sichtbare Elemente erscheinen leicht nacheinander (--d).
  var items = [].slice.call(document.querySelectorAll('[data-anim]'));
  var zeigen = function (el) { el.classList.add('is-in'); };

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(zeigen);
  } else {
    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--d', (k * 110) + 'ms');
        k += 1;
        zeigen(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  // Dezente Parallaxe: die ferne Hügelkette mit Sonne bewegt sich langsamer als die Seite
  var fern = document.querySelector('.huegel-fern');
  var land = document.querySelector('.landschaft');
  if (fern && land && !reduce && 'IntersectionObserver' in window) {
    var tiefe = parseFloat(fern.getAttribute('data-tiefe')) || 20;
    var aktiv = false;
    var geplant = false;
    var setzen = function () {
      geplant = false;
      var r = land.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      p = Math.max(-1, Math.min(1, p));
      fern.style.transform = 'translate3d(0,' + (-p * tiefe).toFixed(1) + 'px,0)';
    };
    var beimScrollen = function () {
      if (aktiv && !geplant) { geplant = true; window.requestAnimationFrame(setzen); }
    };
    new IntersectionObserver(function (entries) {
      aktiv = entries[0].isIntersecting;
      if (aktiv) setzen();
    }).observe(land);
    window.addEventListener('scroll', beimScrollen, { passive: true });
    window.addEventListener('resize', beimScrollen);
  }

  // Sanftes Scrollen zu Ankern (nur bei Klick, damit Skripte und Tests sofort springen können)
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (window.history && history.pushState) history.pushState(null, '', '#' + id);
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
  });

  // Aktiver Abschnitt in der Navigation (Desktop)
  var links = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  if ('IntersectionObserver' in window && links.length) {
    var zuLink = {};
    links.forEach(function (a) {
      var ziel = document.getElementById(a.getAttribute('href').slice(1));
      if (ziel) zuLink[ziel.id] = a;
    });
    var spion = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var a = zuLink[entry.target.id];
        links.forEach(function (l) { l.removeAttribute('aria-current'); });
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(zuLink).forEach(function (id) { spion.observe(document.getElementById(id)); });
    // Abschnitte ohne Menüpunkt (Brief, Abholung) heben die Markierung wieder auf
    [].slice.call(document.querySelectorAll('main > section:not([id])')).forEach(function (s) { spion.observe(s); });
  }
})();
