/* Fahrschule Anina Indermühle, Design B «Zielgerade» */
(function () {
  'use strict';

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- VKU-Datum: nach dem Kurs nicht mehr anzeigen ---------- */
  (function () {
    var ende = new Date(2026, 10, 18, 22, 0, 0); // Mi 18.11.2026, 22 Uhr
    if (new Date() > ende) {
      var karte = $('.vku-karte');
      if (karte) karte.classList.add('vorbei');
      $$('[data-vku-datum]').forEach(function (el) { el.textContent = 'Nächste Daten auf Anfrage'; });
    }
  })();

  /* ---------- Einblenden beim Scrollen ---------- */
  var rvs = $$('.rv');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        // sichtbar oder schon überscrollt (schnelles Scrollen, Sprung per Anker)
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    rvs.forEach(function (el) { io.observe(el); });
    // Sicherheitsnetz: was schon über dem unteren Rand liegt, wird gezeigt (IO meldet Sprünge nicht immer)
    var offen = rvs.slice();
    var sweepTick = false;
    window.addEventListener('scroll', function () {
      if (sweepTick || !offen.length) return;
      sweepTick = true;
      setTimeout(function () {
        sweepTick = false;
        var h = window.innerHeight;
        offen = offen.filter(function (el) {
          if (el.classList.contains('ist-da')) return false;
          if (el.getBoundingClientRect().top < h) { el.classList.add('ist-da'); io.unobserve(el); return false; }
          return true;
        });
      }, 150);
    }, { passive: true });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Führerausweis-Karte ---------- */
  var ausweis = $('#ausweis');
  var drehen = $('#drehen');
  var ziel = $('#ziel');
  var kipp = $('#kipp');
  var flipTimer;

  function setzeSeite(hinten) {
    ausweis.classList.toggle('ist-hinten', hinten);
    drehen.setAttribute('aria-pressed', hinten ? 'true' : 'false');
  }
  if (drehen && ausweis) {
    drehen.addEventListener('click', function () {
      clearTimeout(flipTimer);
      setzeSeite(!ausweis.classList.contains('ist-hinten'));
    });
  }

  function zielErreicht() {
    if (!ziel || ziel.classList.contains('ist-da')) return;
    ziel.classList.add('ist-da');
    // Karte zeigt sich und dreht sich danach einmal auf die Rückseite
    flipTimer = setTimeout(function () { setzeSeite(true); }, 1300);
  }
  if (!fx && ziel) ziel.classList.add('ist-da');

  // leichtes Mitkippen mit der Maus (nur Desktop)
  if (fx && kipp && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var box = $('.ausweis-box');
    var bereich = $('.ziel');
    bereich.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      kipp.style.setProperty('--kx', Math.max(-6, Math.min(6, dx * 10)).toFixed(2));
      kipp.style.setProperty('--ky', Math.max(-6, Math.min(6, -dy * 10)).toFixed(2));
    });
    bereich.addEventListener('pointerleave', function () {
      kipp.style.setProperty('--kx', 0);
      kipp.style.setProperty('--ky', 0);
    });
  }

  /* ---------- Die Strecke ---------- */
  var weg = $('#weg');
  var strecke = $('#strecke');
  var etappenListe = $('.etappen');
  var etappen = $$('.etappe');
  var fuell = $('#fuell');
  var quer = window.matchMedia('(min-width: 1024px)');
  var mass = null;
  var maxF = 0;

  if (!fx) {
    etappen.forEach(function (el) { el.classList.add('an'); });
  }

  function messen() {
    if (!fx || !weg) return;
    if (quer.matches) {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var breite = strecke.scrollWidth;
      var weite = Math.max(0, breite - vw);
      var faktor = 1.15; // etwas mehr Scrollweg als Fahrstrecke
      var halten = vh * 0.45; // am Ziel kurz stehen bleiben
      weg.style.setProperty('--weg-h', Math.round(vh + weite * faktor + halten) + 'px');
      mass = {
        weite: weite,
        scrollweg: weite * faktor,
        kopf: vw * 0.38,
        start: vw * 0.26,
        bahn: (strecke.querySelector('.fahrbahn') || {}).offsetWidth || 1,
        punkte: etappen.map(function (el) { return el.offsetLeft + etappenListe.offsetLeft; }),
        ziel: ziel.offsetLeft
      };
    } else {
      weg.style.removeProperty('--weg-h');
      strecke.style.removeProperty('--tx');
      mass = null;
    }
    aktualisieren();
  }

  function aktualisieren() {
    if (!fx || !weg) return;
    if (mass) {
      var oben = weg.getBoundingClientRect().top;
      var t = Math.max(0, Math.min(1, -oben / mass.scrollweg));
      var tx = t * mass.weite;
      strecke.style.setProperty('--tx', tx.toFixed(1));
      var kopf = tx + mass.kopf;
      fuell.style.setProperty('--f', Math.max(0, Math.min(1, (kopf - mass.start) / mass.bahn)).toFixed(4));
      mass.punkte.forEach(function (x, i) { if (kopf >= x - 2) etappen[i].classList.add('an'); });
      if (kopf >= mass.ziel - 4) zielErreicht();
    } else {
      // senkrecht: Füllung folgt dem Scrollen und bleibt stehen, was schon erreicht ist
      var marke = window.innerHeight * 0.62;
      var r = etappenListe.getBoundingClientRect();
      var f = Math.max(0, Math.min(1, (marke - r.top) / r.height));
      if (f > maxF) { maxF = f; etappenListe.style.setProperty('--f', maxF.toFixed(4)); }
      etappen.forEach(function (el) {
        if (!el.classList.contains('an') && el.getBoundingClientRect().top < marke) el.classList.add('an');
      });
      var kb = $('.ausweis-box').getBoundingClientRect();
      if (kb.bottom < window.innerHeight * 0.8) zielErreicht();
    }
  }

  if (fx && weg) {
    etappenListe.style.setProperty('--f', 0);
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { tick = false; aktualisieren(); });
    }, { passive: true });
    var rzTimer;
    window.addEventListener('resize', function () {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(messen, 120);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(messen);
    window.addEventListener('load', messen);
    messen();
  }

  /* ---------- Anfragearten: Betreff im Mail-Knopf ---------- */
  var mailKnopf = $('#mail-knopf');
  var mailArt = $('#mail-art');
  $$('.arten input').forEach(function (inp) {
    inp.addEventListener('change', function () {
      if (!inp.checked) return;
      mailKnopf.href = 'mailto:anina@fahrschule-indermuehle.ch?subject=' + encodeURIComponent('Anfrage: ' + inp.value);
      mailArt.textContent = inp.value;
    });
  });

  /* ---------- Aktionsleiste Handy: erst nach dem Hero ---------- */
  var aktion = $('#aktion');
  var hero = $('.hero');
  if (aktion && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      aktion.classList.toggle('ist-da', !e[0].isIntersecting);
    }, { threshold: 0, rootMargin: '-35% 0px 0px 0px' }).observe(hero);
  } else if (aktion) {
    aktion.classList.add('ist-da');
  }
})();
