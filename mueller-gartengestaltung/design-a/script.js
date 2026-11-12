/* R. Müller Gartengestaltung GmbH, Design A: Bewegung, Menü, Galerie, Formular (Vanilla JS) */
(function () {
  'use strict';
  window.muellerA = true;

  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');
  var start = Date.now();

  /* Kopf: Schatten beim Scrollen */
  var kopf = document.getElementById('kopf');
  function kopfSchatten() { kopf.classList.toggle('ist-gescrollt', window.scrollY > 12); }
  kopfSchatten();

  /* Menü am Handy */
  var knopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('nav');
  function menu(auf) {
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    nav.classList.toggle('ist-offen', auf);
  }
  if (knopf && nav) {
    knopf.addEventListener('click', function () { menu(knopf.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('ist-offen')) { menu(false); knopf.focus(); } });
  }

  /* Sanftes Scrollen zu Ankern (nur bei Klick, nicht für automatisches Scrollen) */
  if (fx) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      var ziel = id && document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* Einblenden beim Scrollen */
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  if (!('IntersectionObserver' in window) || !fx) {
    rv.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (Date.now() - start > 1600) e.target.classList.add('spaet');
        e.target.classList.add('ist-da');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  }

  /* Blütenband und Zitat-Band: an die Scrollposition gebunden, nur solange sichtbar */
  var spur = document.getElementById('band-spur');
  var band = spur && spur.parentNode;
  var zitatBild = document.querySelector('.zitat-bild');
  var zitat = zitatBild && zitatBild.parentNode;
  var sichtbar = { band: true, zitat: false };
  var geplant = false;

  function takt() {
    geplant = false;
    var y = window.scrollY;
    kopfSchatten();
    if (!fx) return;
    if (spur && sichtbar.band) {
      var max = Math.max(0, Math.min(spur.scrollWidth * 0.15, spur.scrollWidth - band.clientWidth));
      var x = Math.min(max, y * 0.55);
      spur.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
    }
    if (zitatBild && sichtbar.zitat && window.innerWidth >= 768) {
      var r = zitat.getBoundingClientRect();
      var p = (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2 + r.height / 2);
      p = Math.max(-1, Math.min(1, p));
      zitatBild.style.transform = 'translate3d(0,' + (p * 32).toFixed(1) + 'px,0)';
    }
  }
  function anfordern() { if (!geplant) { geplant = true; window.requestAnimationFrame(takt); } }
  window.addEventListener('scroll', anfordern, { passive: true });
  window.addEventListener('resize', anfordern, { passive: true });
  if ('IntersectionObserver' in window) {
    var bio = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.target === band) sichtbar.band = e.isIntersecting;
        if (e.target === zitat) sichtbar.zitat = e.isIntersecting;
      });
      anfordern();
    });
    if (band) bio.observe(band);
    if (zitat) bio.observe(zitat);
  } else {
    sichtbar.zitat = true;
  }
  anfordern();

  /* Aktionsleiste Handy: erscheint, sobald die Knöpfe im Willkommen-Beet weg sind */
  var aktion = document.getElementById('aktion');
  var knoepfe = document.querySelector('.knoepfe');
  if (aktion && knoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      var unten = e[0].boundingClientRect.top < 0;
      aktion.classList.toggle('ist-da', !e[0].isIntersecting && unten);
    }).observe(knoepfe);
  } else if (aktion) {
    aktion.classList.add('ist-da');
  }

  /* Galerie: Bild gross im Dialog */
  var lupe = document.getElementById('lupe');
  var links = [].slice.call(document.querySelectorAll('.g-link'));
  if (lupe && typeof lupe.showModal === 'function' && links.length) {
    var bild = document.getElementById('lupe-bild');
    var titel = document.getElementById('lupe-titel');
    var art = document.getElementById('lupe-art');
    var zahl = document.getElementById('lupe-zahl');
    var aktuell = 0, ausloeser = null;

    var zeigen = function (n) {
      aktuell = (n + links.length) % links.length;
      var a = links[aktuell];
      var vorschau = a.querySelector('img');
      bild.src = a.getAttribute('href');
      bild.alt = vorschau ? vorschau.alt : '';
      titel.textContent = a.getAttribute('data-titel');
      art.textContent = a.getAttribute('data-art');
      zahl.textContent = (aktuell + 1) + ' / ' + links.length;
    };
    links.forEach(function (a, n) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        ausloeser = a;
        zeigen(n);
        lupe.showModal();
      });
    });
    lupe.querySelector('.lupe-zu').addEventListener('click', function () { lupe.close(); });
    lupe.querySelector('.lupe-zurueck').addEventListener('click', function () { zeigen(aktuell - 1); });
    lupe.querySelector('.lupe-weiter').addEventListener('click', function () { zeigen(aktuell + 1); });
    lupe.addEventListener('click', function (e) { if (e.target === lupe) lupe.close(); });
    lupe.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') zeigen(aktuell - 1);
      if (e.key === 'ArrowRight') zeigen(aktuell + 1);
    });
    lupe.addEventListener('close', function () { if (ausloeser) ausloeser.focus(); });
  }

  /* Formular: im Entwurf wird noch nichts gesendet */
  var form = document.getElementById('offerte');
  var status = document.getElementById('f-status');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = 'Danke. In der fertigen Website geht Ihre Anfrage direkt an mueller.rosenau@bluewin.ch. In diesem Entwurf wird noch nichts gesendet.';
    });
  }
})();
