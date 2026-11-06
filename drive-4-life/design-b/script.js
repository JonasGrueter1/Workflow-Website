/* Drive 4 Life, Design B: Kopf, Menü, Einblenden, Kapitel-Stapel, Wörter, Preistafel, Weg-Linie, Aktionsleiste */
(function () {
  'use strict';
  window.__d4lB = true;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var hasIO = 'IntersectionObserver' in window;
  var ruhig = function () { return reduce.matches; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Kopf ---------- */
  var kopf = document.getElementById('kopf');
  function kopfUpdate(y) { kopf.classList.toggle('gescrollt', y > 40); }

  /* ---------- Menü ---------- */
  var menu = document.getElementById('menu');
  var menuKnopf = document.querySelector('.menu-knopf');
  function menuZu(fokus) {
    if (menu.hidden) return;
    menu.hidden = true;
    menu.classList.remove('offen');
    menuKnopf.setAttribute('aria-expanded', 'false');
    menuKnopf.setAttribute('aria-label', 'Menü öffnen');
    root.style.overflow = '';
    if (fokus) menuKnopf.focus();
  }
  function menuAuf() {
    menu.hidden = false;
    menu.querySelectorAll('.menu-haupt li').forEach(function (li, i) { li.style.setProperty('--n', i); });
    requestAnimationFrame(function () { menu.classList.add('offen'); });
    menuKnopf.setAttribute('aria-expanded', 'true');
    menuKnopf.setAttribute('aria-label', 'Menü schliessen');
    kopf.classList.add('gescrollt');
    root.style.overflow = 'hidden';
    var erster = menu.querySelector('a');
    if (erster) erster.focus();
  }
  menuKnopf.addEventListener('click', function () {
    if (menu.hidden) menuAuf(); else menuZu(false);
  });
  menu.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href').charAt(0) === '#' && !a.hasAttribute('data-soon')) menuZu(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menuZu(true); });
  mqDesk.addEventListener('change', function (e) { if (e.matches) menuZu(false); });

  /* ---------- Anker: sanft scrollen ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id === 'top' ? document.body : document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: ruhig() ? 'auto' : 'smooth' });
    else ziel.scrollIntoView({ behavior: ruhig() ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Einblenden ---------- */
  var rvs = [].slice.call(document.querySelectorAll('[data-rv]'));
  /* gestaffelt: Geschwister mit data-rv im selben Eltern-Element */
  rvs.forEach(function (el) {
    var geschw = [].filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-rv'); });
    var i = geschw.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 80 + 'ms');
  });
  document.querySelectorAll('.gruppe').forEach(function (g) {
    g.querySelectorAll('.zeilen li').forEach(function (li, i) { li.style.setProperty('--z', i); });
  });
  var kapitel = [].slice.call(document.querySelectorAll('.kapitel'));

  function allesZeigen() {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
    kapitel.forEach(function (k) { k.classList.add('ist-da', 'linie-da'); });
  }

  if (hasIO && !ruhig()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-da'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });

    /* Kapitel: Text erscheint, sobald der Textblock zu einem Drittel sichtbar ist */
    var ioK = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.closest('.kapitel').classList.add('ist-da');
        ioK.unobserve(en.target);
      });
    }, { threshold: 0.3 });
    kapitel.forEach(function (k) { ioK.observe(k.querySelector('.k-text')); });

    /* gestrichelte Linie zwischen den Kapiteln (Handy) */
    var ioL = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('linie-da'); ioL.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    kapitel.forEach(function (k, i) { if (i > 0) ioL.observe(k); });
  } else {
    allesZeigen();
  }

  /* ---------- Wörter im Leitsatz werden beim Scrollen hell ---------- */
  var satz = document.querySelector('[data-woerter]');
  var woerter = [];
  if (satz && !ruhig()) {
    var teile = satz.textContent.trim().split(/\s+/);
    satz.textContent = '';
    teile.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      satz.appendChild(s);
      if (i < teile.length - 1) satz.appendChild(document.createTextNode(' '));
    });
    woerter = satz.querySelectorAll('.w');
  }
  function woerterUpdate(vh) {
    if (!woerter.length) return;
    var r = satz.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    var p = clamp((vh * 0.88 - r.top) / (vh * 0.42 + r.height * 0.5), 0, 1);
    var n = woerter.length;
    for (var i = 0; i < n; i++) {
      woerter[i].style.setProperty('--o', (0.18 + 0.82 * clamp(p * (n + 2) - i, 0, 1)).toFixed(3));
    }
  }

  /* ---------- Kapitel-Stapel (Desktop): das untere Bild dunkelt ab und wird kleiner ---------- */
  function stapelUpdate(vh) {
    if (!mqDesk.matches || ruhig()) return;
    for (var i = 0; i < kapitel.length - 1; i++) {
      var r = kapitel[i + 1].getBoundingClientRect();
      var p = clamp(1 - r.top / vh, 0, 1);
      var alt = kapitel[i].__p;
      if (alt === undefined || Math.abs(alt - p) > 0.001) {
        kapitel[i].style.setProperty('--p', p.toFixed(4));
        kapitel[i].__p = p;
      }
    }
  }
  function stapelReset() {
    kapitel.forEach(function (k) { k.style.removeProperty('--p'); k.__p = undefined; });
  }

  /* ---------- Weg: gestrichelte Linie wächst mit dem Scrollen ---------- */
  var schritte = document.querySelector('.schritte');
  function wegUpdate(vh) {
    if (!schritte || ruhig()) return;
    var r = schritte.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    var p = clamp((vh * 0.75 - r.top) / (r.height * 0.9), 0, 1);
    schritte.style.setProperty('--weg', p.toFixed(4));
  }

  /* ---------- Navigation: aktiver Abschnitt ---------- */
  var navLinks = [].slice.call(document.querySelectorAll('.kopf-nav a'));
  var abschnitte = navLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function navUpdate(vh) {
    var aktiv = -1;
    for (var i = 0; i < abschnitte.length; i++) {
      var s = abschnitte[i];
      if (!s) continue;
      var top = s.getBoundingClientRect().top;
      if (top < vh * 0.4) aktiv = i;
    }
    /* «Unterwegs» bleibt aktiv, solange die Kapitel laufen */
    navLinks.forEach(function (a, i) { a.classList.toggle('aktiv', i === aktiv); });
  }

  /* ---------- Aktionsleiste Handy ---------- */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta && hasIO) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      aktion.classList.toggle('zeigen', !en.isIntersecting && en.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* ---------- Preistafel: Desktop immer offen, Handy nur Kategorie B offen ---------- */
  var gruppen = [].slice.call(document.querySelectorAll('.gruppe'));
  function gruppenSetzen() {
    gruppen.forEach(function (g, i) {
      var s = g.querySelector('summary');
      if (mqDesk.matches) { g.open = true; s.setAttribute('tabindex', '-1'); }
      else { g.open = i === 0; s.removeAttribute('tabindex'); }
    });
  }
  gruppen.forEach(function (g) {
    g.querySelector('summary').addEventListener('click', function (e) { if (mqDesk.matches) e.preventDefault(); });
    g.addEventListener('toggle', function () { if (g.open) g.classList.add('ist-da'); });
  });
  gruppenSetzen();
  mqDesk.addEventListener('change', function () { gruppenSetzen(); stapelReset(); tick(); });

  /* ---------- Scroll-Schleife ---------- */
  var laeuft = false;
  function tick() {
    laeuft = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    kopfUpdate(y);
    woerterUpdate(vh);
    stapelUpdate(vh);
    wegUpdate(vh);
    navUpdate(vh);
  }
  function anfordern() { if (!laeuft) { laeuft = true; requestAnimationFrame(tick); } }
  window.addEventListener('scroll', anfordern, { passive: true });
  window.addEventListener('resize', anfordern);
  reduce.addEventListener('change', function () { if (ruhig()) { allesZeigen(); stapelReset(); } anfordern(); });
  tick();
})();
