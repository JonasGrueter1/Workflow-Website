/* Design B: Menü, Header beim Scrollen, Einblenden */
(function () {
  'use strict';

  var header = document.querySelector('.header');
  var nav = document.getElementById('nav');
  var burger = document.querySelector('.burger');

  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  };
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();

/* Design B: Mittellinie der Strasse im Hero bewegt sich (gleiche Geometrie wie im SVG) */
(function () {
  'use strict';

  var path = document.getElementById('road-dashes');
  if (!path || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var VX = 560, HY = 330, F = 520, H = 330, XCAM = 0.41;
  var SPACING = 1.6, LEN = 0.75, ZMIN = 0.8, ZMAX = 12, SPEED = 1.1;
  var xc = function (z) { return 0.95 * Math.sin(0.12 * z + 0.2); };
  var proj = function (x, z) { return [VX + F * (x - XCAM) / z, HY + H / z]; };
  var strip = function (z0, z1) {
    var a = [], b = [], n = 5;
    for (var k = 0; k <= n; k++) {
      var z = z0 * Math.pow(z1 / z0, k / n);
      a.push(proj(xc(z) - 0.022, z));
      b.push(proj(xc(z) + 0.022, z));
    }
    var pts = a.concat(b.reverse());
    return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + 'Z';
  };

  var phase = 0, last = null, running = true;
  var frame = function (t) {
    if (last !== null) phase = (phase + (t - last) / 1000 * SPEED) % SPACING;
    last = t;
    var d = [];
    for (var k = 0; ; k++) {
      var z = 0.62 + k * SPACING - phase;
      if (z > ZMAX) break;
      var z1 = Math.min(z + LEN, ZMAX);
      if (z1 <= ZMIN || z1 <= Math.max(z, ZMIN)) continue;
      d.push(strip(Math.max(z, ZMIN), z1));
    }
    path.setAttribute('d', d.join(' '));
    if (running) requestAnimationFrame(frame);
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; last = null; requestAnimationFrame(frame); }
      if (!visible) running = false;
    }).observe(path.closest('.hero'));
  }
  requestAnimationFrame(frame);
})();
