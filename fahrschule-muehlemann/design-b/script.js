/* Fahrschule Mühlemann, Design B «Porträt»: Hero-Auftritt, Scroll-Reveals, Parallaxe, Menü */
(function () {
  'use strict';
  window.mbBereit = true;

  var doc = document;
  var root = doc.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hero-Auftritt: erst wenn die Schriften da sind, damit nichts springt */
  var gestartet = false;
  function heroStart() {
    if (gestartet) return;
    gestartet = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add('ist-bereit'); });
    });
    setTimeout(function () { root.classList.add('hero-fertig'); }, 2400);
  }
  if (ruhig) {
    root.classList.add('ist-bereit', 'hero-fertig');
  } else {
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(heroStart);
    setTimeout(heroStart, 650);
  }

  /* Scroll-Reveals: alles, was den unteren Rand erreicht hat (oder schon darüber liegt), wird sichtbar */
  var offen = [].slice.call(doc.querySelectorAll('.rv, .rv-bild'));
  function zeigen() {
    if (!offen.length) return;
    var grenze = window.innerHeight * 0.9;
    offen = offen.filter(function (el) {
      if (el.getBoundingClientRect().top < grenze) { el.classList.add('ist-da'); return false; }
      return true;
    });
  }
  if (ruhig) {
    offen.forEach(function (el) { el.classList.add('ist-da'); });
    offen = [];
  }

  /* Parallaxe der Fahrzeugbilder (nur Desktop, nur transform) */
  var plxMq = window.matchMedia('(min-width: 900px)');
  var plx = [].slice.call(doc.querySelectorAll('.plx'));
  function parallaxe() {
    if (ruhig || !plxMq.matches) return;
    var vh = window.innerHeight;
    plx.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      p = Math.max(-1, Math.min(1, p));
      img.style.transform = 'translate3d(0,' + (p * 20).toFixed(1) + 'px,0)';
    });
  }
  plxMq.addEventListener && plxMq.addEventListener('change', function () {
    if (!plxMq.matches) plx.forEach(function (img) { img.style.transform = ''; });
  });

  /* Aktiver Anker in der Navigation */
  var navLinks = [].slice.call(doc.querySelectorAll('.nav a[href^="#"]'));
  var ziele = navLinks.map(function (a) { return doc.querySelector(a.getAttribute('href')); });
  function aktiv() {
    var mitte = window.innerHeight * 0.35, treffer = -1;
    ziele.forEach(function (sec, i) {
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.top <= mitte && r.bottom > mitte) treffer = i;
    });
    navLinks.forEach(function (a, i) { a.classList.toggle('ist-aktiv', i === treffer); });
  }

  /* Preisliste: Leitpunkte nur zeigen, wenn genug Platz bleibt (sonst stehen am Handy nur zwei Punkte da) */
  var preisZeilen = [].slice.call(doc.querySelectorAll('.preisliste li'));
  function leitpunkte() {
    preisZeilen.forEach(function (li) {
      li.classList.remove('ohne-punkte');
      var punkte = li.querySelector('.p-punkte');
      if (punkte && punkte.offsetWidth < 36) li.classList.add('ohne-punkte');
    });
  }
  leitpunkte();
  window.addEventListener('resize', leitpunkte);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(leitpunkte);

  var geplant = false;
  function tick() {
    geplant = false;
    zeigen();
    parallaxe();
    aktiv();
  }
  function planen() {
    if (!geplant) { geplant = true; requestAnimationFrame(tick); }
  }
  window.addEventListener('scroll', planen, { passive: true });
  window.addEventListener('resize', planen);
  window.addEventListener('load', planen);
  tick();

  /* Sanftes Scrollen zu Ankern (per JS, damit programmatisches Scrollen sofort reagiert) */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = doc.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (id === '#inhalt') { ziel.setAttribute('tabindex', '-1'); ziel.focus({ preventScroll: true }); }
  });

  /* Menü */
  var knopf = doc.querySelector('.menu-knopf');
  var menu = doc.getElementById('menu');
  if (knopf && menu) {
    var schliessen = function (fokus) {
      knopf.setAttribute('aria-expanded', 'false');
      knopf.setAttribute('aria-label', 'Menü öffnen');
      menu.classList.remove('ist-offen');
      doc.body.classList.remove('menu-auf');
      setTimeout(function () { if (knopf.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, ruhig ? 0 : 300);
      if (fokus) knopf.focus();
    };
    var oeffnen = function () {
      menu.hidden = false;
      knopf.setAttribute('aria-expanded', 'true');
      knopf.setAttribute('aria-label', 'Menü schliessen');
      doc.body.classList.add('menu-auf');
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('ist-offen'); }); });
      var erster = menu.querySelector('a');
      if (erster) erster.focus({ preventScroll: true });
    };
    knopf.addEventListener('click', function () {
      if (knopf.getAttribute('aria-expanded') === 'true') schliessen(false); else oeffnen();
    });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href').charAt(0) === '#' && !a.hasAttribute('data-soon')) schliessen(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') schliessen(true);
    });
  }
})();
