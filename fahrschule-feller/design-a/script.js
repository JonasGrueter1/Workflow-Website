/* Fahrschule Feller, Design A: Hero-Auftritt, Scroll-Reveals, Menü, Aktionsleiste */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // H1 wortweise in Masken teilen (Text bleibt für Screenreader gleich)
  var h1 = document.querySelector('[data-split]');
  if (h1) {
    var n = 0;
    var split = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part;
            inner.style.setProperty('--i', n++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) { split(c); }
      });
    };
    split(h1);
  }

  // Schritte nummerieren für die Staffelung
  Array.prototype.forEach.call(document.querySelectorAll('[data-weg] .schritt'), function (s, i) { s.style.setProperty('--i', i); });

  // Hero starten
  var start = function () { root.classList.add('ist-geladen'); };
  if (reduced) start(); else requestAnimationFrame(function () { requestAnimationFrame(start); });

  // Scroll-Reveals
  var targets = document.querySelectorAll('[data-reveal], [data-jahr], [data-weg]');
  var showAll = function () { Array.prototype.forEach.call(targets, function (t) { t.classList.add('ist-da'); }); };
  if (reduced || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
    // Sicherheitsnetz: was beim Laden schon oberhalb liegt (z. B. Anker-Sprung), sofort zeigen
    window.addEventListener('load', function () {
      Array.prototype.forEach.call(targets, function (t) {
        if (t.getBoundingClientRect().bottom < 0) t.classList.add('ist-da');
      });
    });
  }

  // Menü Handy
  var btn = document.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  if (btn && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('ist-offen', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('ist-offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Weiches Scrollen zu Ankern (nur ohne reduzierte Bewegung)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  // Aktionsleiste erst nach dem Hero (dort stehen die Knöpfe schon)
  var bar = document.getElementById('aktionsleiste');
  var hero = document.querySelector('.hero-knoepfe');
  if (bar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      bar.classList.toggle('ist-sichtbar', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(hero);
  } else if (bar) { bar.classList.add('ist-sichtbar'); }
})();
