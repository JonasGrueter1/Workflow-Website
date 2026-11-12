/* Malerei Sinini, Design B: Kopf, Menü, Hero-Rolle, Vorher/Nachher, Einblenden, Galerie, Aktionsleiste */
(function () {
  'use strict';
  window.sininiB = true;

  var d = document.documentElement;
  var fx = d.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Kopf: Hintergrund beim Scrollen */
  var kopf = $('#kopf');
  var onScroll = function () { kopf.classList.toggle('gescrollt', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü Mobil */
  var knopf = $('.menue-knopf');
  var setMenue = function (offen) {
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    knopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    kopf.classList.toggle('offen', offen);
    document.body.classList.toggle('menue-offen', offen);
  };
  knopf.addEventListener('click', function () { setMenue(knopf.getAttribute('aria-expanded') !== 'true'); });
  $$('#menue a[href^="#"]').forEach(function (a) {
    if (!a.hasAttribute('data-soon')) a.addEventListener('click', function () { setMenue(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('offen')) { setMenue(false); knopf.focus(); }
  });
  var breit = window.matchMedia('(min-width: 960px)');
  var aufBreit = function () { if (breit.matches) setMenue(false); };
  if (breit.addEventListener) breit.addEventListener('change', aufBreit); else if (breit.addListener) breit.addListener(aufBreit);

  /* Weiches Scrollen zu den Ankern (nur mit Bewegung) */
  if (fx) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      var ziel = id === 'top' ? document.body : document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      var y = id === 'top' ? 0 : ziel.getBoundingClientRect().top + window.scrollY - kopf.offsetHeight - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* Hero-Auftritt */
  var hero = $('.hero');
  var start = function () { hero.classList.add('an'); };

  /* Vorher / Nachher */
  var vor = $('#vn-vorher'), nach = $('#vn-nachher'), rahmen = $('.vn-rahmen');
  var beruehrt = false, autoTimer = null;
  [vor, nach].forEach(function (r) {
    r.addEventListener('change', function () { beruehrt = true; clearTimeout(autoTimer); });
  });
  rahmen.addEventListener('click', function () {
    beruehrt = true; clearTimeout(autoTimer);
    (vor.checked ? nach : vor).checked = true;
  });

  if (fx) {
    /* Start mit "Vorher" ohne Übergang, danach einmal automatisch zu "Nachher" */
    rahmen.classList.add('still');
    vor.checked = true;
    void rahmen.offsetWidth;
    requestAnimationFrame(function () {
      rahmen.classList.remove('still');
      requestAnimationFrame(start);
    });
    var autoWechsel = function () {
      autoTimer = setTimeout(function () { if (!beruehrt) nach.checked = true; }, 2300);
    };
    if (hasIO) {
      var vnIO = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { autoWechsel(); vnIO.disconnect(); }
      }, { threshold: 0.4 });
      vnIO.observe(rahmen);
    } else {
      autoWechsel();
    }
  } else {
    start();
  }

  /* Einblenden beim Scrollen */
  var ziele = $$('[data-zeigen]');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (x.isIntersecting) { x.target.classList.add('sichtbar'); io.unobserve(x.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    ziele.forEach(function (z) { io.observe(z); });
  } else {
    ziele.forEach(function (z) { z.classList.add('sichtbar'); });
  }

  /* Arbeiten: Punkte unter der wischbaren Bildstrecke (Mobil) */
  var wrap = $('.raster-wrap'), werke = $$('.werk'), punkte = $('#punkte');
  if (wrap && punkte && werke.length) {
    werke.forEach(function (w, i) {
      var p = document.createElement('span');
      p.addEventListener('click', function () {
        wrap.scrollTo({ left: w.offsetLeft - (wrap.clientWidth - w.offsetWidth) / 2, behavior: fx ? 'smooth' : 'auto' });
      });
      if (i === 0) p.className = 'aktiv';
      punkte.appendChild(p);
    });
    var dots = $$('span', punkte), tick = false;
    var aktualisieren = function () {
      tick = false;
      var mitte = wrap.scrollLeft + wrap.clientWidth / 2, best = 0, abst = Infinity;
      werke.forEach(function (w, i) {
        var m = w.offsetLeft + w.offsetWidth / 2, a = Math.abs(m - mitte);
        if (a < abst) { abst = a; best = i; }
      });
      dots.forEach(function (p, i) { p.classList.toggle('aktiv', i === best); });
    };
    wrap.addEventListener('scroll', function () {
      if (!tick) { tick = true; requestAnimationFrame(aktualisieren); }
    }, { passive: true });
  }

  /* Aktionsleiste Mobil: erst wenn die Hero-Knöpfe aus dem Bild sind */
  var aktion = $('#aktion'), heroKnoepfe = $('#hero-knoepfe');
  if (aktion && heroKnoepfe && hasIO) {
    new IntersectionObserver(function (es) {
      var x = es[0];
      aktion.classList.toggle('zeigen', !x.isIntersecting && x.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
