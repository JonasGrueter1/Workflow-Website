/* Fahrschule Eng, Design B: Kopf, Menü, Reveals, Laufbahn, L-Schild, Aktionsleiste */
(function () {
  'use strict';
  window.engB = true;

  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var mqFein = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* Kopf: nach 40 px fest */
  var kopf = document.getElementById('kopf');
  function kopfZustand() { kopf.classList.toggle('is-fest', window.scrollY > 40); }

  /* Menü auf kleinen Bildschirmen */
  var knopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('kopf-nav');
  function menu(auf) {
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    knopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('is-offen', auf);
    kopf.classList.toggle('menu-offen', auf);
  }
  if (knopf && nav) {
    knopf.addEventListener('click', function () { menu(knopf.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href').charAt(0) === '#' && !a.hasAttribute('data-soon')) menu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') { menu(false); knopf.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) menu(false); });
  }

  /* Scroll-Reveals */
  var ziele = [].slice.call(document.querySelectorAll('.rv, .preis, .plan-zeile'));
  var offen = [];
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
    offen = ziele.slice();
  } else {
    ziele.forEach(function (el) { el.classList.add('is-in'); });
  }
  /* Sicherheitsnetz: Was schon über dem Bildschirm liegt (schnelles Scrollen, Sprung per Anker), wird gezeigt */
  function nachholen() {
    if (!offen.length) return;
    var vh = window.innerHeight;
    offen = offen.filter(function (el) {
      if (el.classList.contains('is-in')) return false;
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('is-in'); return false; }
      return true;
    });
  }

  /* Anker weich anfahren (ohne CSS scroll-behavior, damit Sprünge per Skript sofort sind) */
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

  /* Laufbahn: Linie zeichnet sich mit dem Scrollen, Stationen bleiben an */
  var laufbahn = document.getElementById('laufbahn');
  var stationen = laufbahn ? [].slice.call(laufbahn.querySelectorAll('.station')) : [];
  var linie = laufbahn ? laufbahn.querySelector('.linie') : null;
  var innen = laufbahn ? laufbahn.querySelector('.laufbahn-in') : null;
  var zaehler = document.getElementById('zaehler-nr');
  var maxP = fx ? 0 : 1;
  var anteile = [];

  function linieMessen() {
    if (!linie || !stationen.length) return;
    var basis = innen.getBoundingClientRect();
    var mitte = function (el) {
      var r = el.querySelector('.punkt').getBoundingClientRect();
      return { x: r.left + r.width / 2 - basis.left, y: r.top + r.height / 2 - basis.top };
    };
    var a = mitte(stationen[0]);
    var b = mitte(stationen[stationen.length - 1]);
    if (mqDesk.matches) {
      linie.style.left = a.x + 'px'; linie.style.width = (b.x - a.x) + 'px';
      linie.style.top = (a.y - 2) + 'px'; linie.style.height = '4px';
      anteile = stationen.map(function (s) { return (mitte(s).x - a.x) / Math.max(1, b.x - a.x); });
    } else {
      linie.style.left = (a.x - 2) + 'px'; linie.style.width = '4px';
      linie.style.top = a.y + 'px'; linie.style.height = (b.y - a.y) + 'px';
      anteile = stationen.map(function (s) { return (mitte(s).y - a.y) / Math.max(1, b.y - a.y); });
    }
    linie.style.right = 'auto'; linie.style.bottom = 'auto';
  }

  function laufbahnZustand() {
    if (!laufbahn) return;
    var p;
    var r = laufbahn.getBoundingClientRect();
    var vh = window.innerHeight;
    if (mqDesk.matches) {
      var weg = Math.max(1, r.height - vh);
      p = (-r.top + vh * 0.1) / (weg * 0.82);
    } else {
      var lr = linie.getBoundingClientRect();
      p = (vh * 0.72 - lr.top) / Math.max(1, lr.height);
    }
    p = Math.min(1, Math.max(0, p));
    if (p > maxP) maxP = p;
    linie.style.setProperty('--fortschritt', maxP.toFixed(4));
    var an = 0;
    stationen.forEach(function (s, i) {
      if (maxP >= anteile[i] - 0.005) { s.classList.add('is-an'); an = i + 1; }
    });
    if (zaehler) zaehler.textContent = (an < 10 ? '0' : '') + Math.max(1, an);
  }

  /* L-Schild: Parallaxe beim Scrollen, sanftes Kippen mit der Maus */
  var hero = document.querySelector('.hero');
  var parallax = document.querySelector('.schild-parallax');
  var kipp = document.querySelector('.schild-kipp');
  function schildZustand() {
    if (!fx || !parallax) return;
    var h = hero.offsetHeight;
    var y = Math.min(window.scrollY, h);
    var k = mqDesk.matches ? 1 : 0.5;
    parallax.style.setProperty('--py', (y * 0.14 * k).toFixed(1) + 'px');
    parallax.style.setProperty('--sy', (y / h * 28 * k).toFixed(2) + 'deg');
  }
  if (fx && hero && kipp) {
    hero.addEventListener('pointermove', function (e) {
      if (!mqFein.matches) return;
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      kipp.style.setProperty('--ty', (nx * 16).toFixed(2) + 'deg');
      kipp.style.setProperty('--tx', (-ny * 12).toFixed(2) + 'deg');
    });
    hero.addEventListener('pointerleave', function () {
      kipp.style.setProperty('--ty', '0deg'); kipp.style.setProperty('--tx', '0deg');
    });
  }

  /* Aktionsleiste mobil: erst sichtbar, wenn die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  var kontakt = document.getElementById('kontakt');
  if (aktion && heroKnoepfe && 'IntersectionObserver' in window) {
    /* ausgeblendet, solange die Hero-Knöpfe oder der Kontaktbereich mit eigenen Knöpfen zu sehen sind */
    var heroWeg = false, kontaktDa = false;
    var setzeAktion = function () { aktion.classList.toggle('is-sichtbar', heroWeg && !kontaktDa); };
    new IntersectionObserver(function (e) {
      var r = e[0].boundingClientRect;
      heroWeg = !e[0].isIntersecting && r.bottom < 0;
      setzeAktion();
    }).observe(heroKnoepfe);
    if (kontakt) {
      new IntersectionObserver(function (e) {
        kontaktDa = e[0].isIntersecting;
        setzeAktion();
      }, { rootMargin: '0px 0px -35% 0px' }).observe(kontakt);
    }
  } else if (aktion) {
    aktion.classList.add('is-sichtbar');
  }

  /* Scroll-Schleife */
  var geplant = false;
  function tick() {
    geplant = false;
    kopfZustand();
    nachholen();
    laufbahnZustand();
    schildZustand();
  }
  function planen() { if (!geplant) { geplant = true; raf(tick); } }
  window.addEventListener('scroll', planen, { passive: true });
  window.addEventListener('resize', function () { linieMessen(); planen(); });
  window.addEventListener('load', function () { linieMessen(); planen(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { linieMessen(); planen(); });
  linieMessen();
  tick();
})();
