/* Fahrschule Elfat, Design A "Ampel" */
(function () {
  'use strict';

  var reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kopf = document.getElementById('kopf');
  var hero = document.querySelector('.hero');

  /* Kopf: Linie und Schatten beim Scrollen */
  function kopfStatus() { kopf.classList.toggle('gescrollt', window.scrollY > 8); }
  kopfStatus();
  window.addEventListener('scroll', kopfStatus, { passive: true });

  /* Menü am Handy */
  var nav = document.getElementById('nav');
  var menuKnopf = document.querySelector('.rund-menu');
  function menu(offen) {
    nav.classList.toggle('offen', offen);
    menuKnopf.setAttribute('aria-expanded', String(offen));
    menuKnopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  }
  menuKnopf.addEventListener('click', function () { menu(!nav.classList.contains('offen')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('offen')) { menu(false); menuKnopf.focus(); }
  });

  /* Hero: Ampel schaltet einmal Rot, Rot und Gelb, Grün. Danach zeichnet sich die Autolinie. */
  var rot = document.querySelector('.licht-rot');
  var gelb = document.querySelector('.licht-gelb');
  var gruen = document.querySelector('.licht-gruen');
  var lg = document.querySelectorAll('.lg');

  function endzustand() {
    rot.classList.remove('an'); gelb.classList.remove('an'); gruen.classList.add('an');
    for (var i = 0; i < lg.length; i++) lg[i].classList.add('sichtbar', 'an');
    hero.classList.add('los', 'fahrt');
  }

  if (reduziert) {
    endzustand();
  } else {
    requestAnimationFrame(function () { hero.classList.add('los'); });
    var gestartet = false;
    var schalten = function () {
      if (gestartet) return;
      gestartet = true;
      var schritte = [
        [350, function () { rot.classList.add('an'); lg[0].classList.add('sichtbar', 'an'); }],
        [1050, function () { gelb.classList.add('an'); lg[1].classList.add('sichtbar', 'an'); }],
        [1750, function () { rot.classList.remove('an'); gelb.classList.remove('an'); gruen.classList.add('an'); lg[2].classList.add('sichtbar', 'an'); }],
        [1950, function () { hero.classList.add('fahrt'); }]
      ];
      schritte.forEach(function (s) { setTimeout(s[1], s[0]); });
    };
    var ampel = document.getElementById('ampel');
    if ('IntersectionObserver' in window) {
      var ioAmpel = new IntersectionObserver(function (eintraege) {
        if (eintraege[0].isIntersecting) { schalten(); ioAmpel.disconnect(); }
      }, { threshold: 0.3 });
      ioAmpel.observe(ampel);
      setTimeout(schalten, 3500); /* Sicherheitsnetz */
    } else {
      schalten();
    }
  }

  /* Scroll-Reveals */
  var ziele = document.querySelectorAll('.reveal, .orte');
  if (reduziert || !('IntersectionObserver' in window)) {
    for (var i = 0; i < ziele.length; i++) ziele[i].classList.add('sichtbar');
  } else {
    var orte = document.querySelectorAll('.orte .ort');
    for (var k = 0; k < orte.length; k++) orte[k].style.setProperty('--d', (k * 28) + 'ms');
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    for (var j = 0; j < ziele.length; j++) io.observe(ziele[j]);
  }

  /* Aktionsleiste am Handy: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var leiste = document.getElementById('aktionsleiste');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (eintraege) {
      var e = eintraege[0];
      leiste.classList.toggle('zeigen', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else {
    leiste.classList.add('zeigen');
  }
})();

/* Anker sanft anspringen (ohne CSS scroll-behavior, damit Mess-Skripte direkt scrollen können) */
(function () {
  'use strict';
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });
})();
