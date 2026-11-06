/* Fahrschule Elfat, Design B: Begrüssung in vier Sprachen, Autolinie, Einblenden, Laufband, Menü */
(function () {
  'use strict';
  window.elfatBereit = true;

  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kopf = document.getElementById('kopf');
  var hero = document.querySelector('.hero');

  /* Kopf: Schatten beim Scrollen */
  var schatten = function () { kopf.classList.toggle('is-schatten', window.scrollY > 8); };
  schatten();
  window.addEventListener('scroll', schatten, { passive: true });

  /* Menü am Handy */
  var menuKnopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('nav');
  var menu = function (auf) {
    nav.classList.toggle('is-offen', auf);
    menuKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menuKnopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  };
  menuKnopf.addEventListener('click', function () { menu(!nav.classList.contains('is-offen')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-offen')) { menu(false); menuKnopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-offen') && !e.target.closest('.kopf')) menu(false);
  });

  /* Sanftes Scrollen zu Ankern (ohne CSS scroll-behavior, damit Tests und reduzierte Bewegung sauber laufen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Hero: Begrüssung Willkommen, Welcome, Mirë se vini, Dobrodošli und zurück auf Willkommen */
  var worte = [].slice.call(document.querySelectorAll('.gruss-wort'));
  var anzeige = [].slice.call(document.querySelectorAll('.sprachwahl li'));
  var zeige = function (neu, alt) {
    var el = worte[neu];
    if (alt !== undefined) {
      worte[alt].classList.remove('is-on');
      worte[alt].classList.add('is-weg');
    }
    el.style.transition = 'none';
    el.classList.remove('is-weg', 'is-on');
    void el.offsetWidth;
    el.style.transition = '';
    if (alt !== undefined) el.classList.add('is-zurueck');
    el.classList.add('is-on');
    anzeige.forEach(function (li, k) { li.classList.toggle('is-on', k === neu); });
  };

  var start = function () {
    if (hero.classList.contains('is-bereit')) return;
    hero.classList.add('is-bereit');
    if (ruhig || worte.length < 4) return;
    var folge = [[1, 850], [2, 1650], [3, 2450], [0, 3250]];
    var vorher = 0;
    folge.forEach(function (schritt) {
      setTimeout(function () { zeige(schritt[0], vorher); vorher = schritt[0]; }, schritt[1]);
    });
  };

  if (ruhig) {
    hero.classList.add('is-bereit');
  } else {
    var los = function () { requestAnimationFrame(function () { requestAnimationFrame(start); }); };
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 450); })]).then(los);
    } else {
      los();
    }
  }

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(document.querySelectorAll('[data-r], [data-gruppe]'));
  if (!('IntersectionObserver' in window) || ruhig) {
    ziele.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  }

  /* Aktionsleiste am Handy erst zeigen, wenn die Knöpfe im Hero aus dem Bild sind */
  var leiste = document.querySelector('.aktionsleiste');
  var heroKnoepfe = document.querySelector('.hero-knoepfe');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    leiste.classList.add('is-weg');
    new IntersectionObserver(function (e) {
      leiste.classList.toggle('is-weg', e[0].isIntersecting);
    }).observe(heroKnoepfe);
  }

  /* Laufband: sichtbarer Knopf zum Anhalten (WCAG 2.2.2) */
  var band = document.querySelector('[data-band]');
  var bandKnopf = document.querySelector('[data-band-knopf]');
  if (band && bandKnopf) {
    bandKnopf.addEventListener('click', function () {
      var pause = !band.classList.contains('is-pause');
      band.classList.toggle('is-pause', pause);
      bandKnopf.setAttribute('aria-pressed', pause ? 'true' : 'false');
      bandKnopf.querySelector('span').textContent = pause ? 'Weiterlaufen' : 'Anhalten';
    });
  }
})();
