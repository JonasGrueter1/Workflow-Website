/* Fahrschule Rolf Melliger, Design B: Kopfzeile, Menü, Hero-Auftritt, Einblendungen beim Scrollen */
(function () {
  'use strict';
  window.mellingerB = true;

  var root = document.documentElement;
  var kopf = document.getElementById('kopf');
  var menueKnopf = kopf ? kopf.querySelector('.menue-knopf') : null;

  /* Kopfzeile: beim Scrollen weiss mit Schatten.
     Aktionsleiste mobil: erscheint, sobald die Kontakt-Knöpfe im Hero weggescrollt sind
     (per Scroll-Abfrage, damit es auch nach Sprüngen über Anker stimmt). */
  var leiste = document.querySelector('.aktion');
  var heroKnoepfe = document.querySelector('.hero .knoepfe');
  if (leiste && heroKnoepfe) root.classList.add('aktion-wartet');
  var tick = false;
  function kopfZustand() {
    tick = false;
    if (kopf) kopf.classList.toggle('ist-gescrollt', window.scrollY > 12);
    if (leiste && heroKnoepfe) leiste.classList.toggle('ist-da', heroKnoepfe.getBoundingClientRect().bottom < 0);
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(kopfZustand); }
  }, { passive: true });
  window.addEventListener('resize', kopfZustand);
  kopfZustand();

  /* Menü auf schmalen Bildschirmen */
  function menue(auf) {
    if (!kopf || !menueKnopf) return;
    kopf.classList.toggle('ist-offen', auf);
    menueKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menueKnopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (menueKnopf) {
    menueKnopf.addEventListener('click', function () { menue(!kopf.classList.contains('ist-offen')); });
    kopf.querySelectorAll('.kopf-nav a').forEach(function (a) {
      a.addEventListener('click', function () { menue(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('ist-offen')) { menue(false); menueKnopf.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1180) menue(false); });
  }

  /* SMS: Ohne JavaScript öffnen diese Links das Telefon. Auf Smartphone und Tablet
     öffnet sich direkt die Nachrichten-App, am Computer bleibt es beim Anruf-Link. */
  function istTouch() {
    if (root.classList.contains('ist-touch')) return true;
    try { return window.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) { return false; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-sms]');
    if (!a || !istTouch()) return;
    e.preventDefault();
    window.location.href = 'sms:' + a.getAttribute('data-sms');
  });

  /* Sanftes Scrollen nur bei Klicks auf Anker (nicht per CSS, damit Skripte sofort springen) */
  var ruhig = false;
  try { ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', id);
  });

  /* Hero-Auftritt: erst wenn das Foto bereit ist (höchstens 700 ms warten) */
  var gestartet = false;
  function start() {
    if (gestartet) return;
    gestartet = true;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { root.classList.add('ist-bereit'); });
    });
  }
  var foto = document.querySelector('.hero-foto img');
  if (foto && foto.decode && !foto.complete) {
    foto.decode().then(start, start);
  } else {
    start();
  }
  setTimeout(start, 700);

  /* Einblendungen beim Scrollen */
  var ziele = document.querySelectorAll('.zeigen, .tafel, .jubi-preis, .jubilaeum, .haelfte, .chips');

  /* Versatz innerhalb einer Gruppe: Geschwister mit .zeigen nacheinander */
  document.querySelectorAll('.zeigen').forEach(function (el) {
    var i = 0, s = el.previousElementSibling;
    while (s) { if (s.classList.contains('zeigen')) i++; s = s.previousElementSibling; }
    if (i) el.style.setProperty('--i', Math.min(i, 6));
  });

  if (!root.classList.contains('fx') || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-sichtbar'); });
    return;
  }
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('ist-sichtbar');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  ziele.forEach(function (el) { io.observe(el); });
})();
