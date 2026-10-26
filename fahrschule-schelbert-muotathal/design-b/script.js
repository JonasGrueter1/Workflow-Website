/* Design B «Passstrasse»: Kopf, Menü, Einblenden beim Scrollen, Parallaxe.
   Ohne JavaScript bleibt alles sichtbar (versteckt wird nur unter html.js). */
(function () {
  'use strict';

  var doc = document.documentElement;
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopf: Hintergrund nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  /* Aktionsleiste (Handy) erst, wenn die Knöpfe im Hero weggescrollt sind */
  var aktion = document.querySelector('.aktion');
  var heroKnoepfe = document.querySelector('.hero-knoepfe');
  var grenze = 300;
  var grenzeMessen = function () {
    if (heroKnoepfe) grenze = heroKnoepfe.getBoundingClientRect().bottom + window.scrollY - 104;
  };
  grenzeMessen();
  window.addEventListener('resize', grenzeMessen);
  window.addEventListener('load', grenzeMessen);
  var kopfPruefen = function () {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    kopf.classList.toggle('ist-gescrollt', y > 8);
    kopf.style.setProperty('--fortschritt', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    if (aktion) aktion.classList.toggle('ist-weg', y < grenze);
  };
  kopfPruefen();

  /* Menü mobil */
  var menue = document.getElementById('menue');
  var burger = document.querySelector('.burger');
  var setMenue = function (offen) {
    menue.classList.toggle('ist-offen', offen);
    doc.classList.toggle('menue-offen', offen);
    burger.setAttribute('aria-expanded', String(offen));
    burger.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  };
  if (burger && menue) {
    burger.addEventListener('click', function () {
      var offen = burger.getAttribute('aria-expanded') !== 'true';
      setMenue(offen);
      if (offen) { var erster = menue.querySelector('a'); if (erster) window.setTimeout(function () { erster.focus({ preventScroll: true }); }, 60); }
    });
    menue.addEventListener('click', function (e) { if (e.target.closest('a')) setMenue(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setMenue(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100) setMenue(false); });
  }

  /* Weiches Scrollen nur für Anker im Menü und auf der Seite (nicht global, damit Werkzeuge sauber scrollen) */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('data-soon')) return;
    var id = link.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (window.history && history.pushState) history.pushState(null, '', '#' + id);
  });

  /* Einblenden: alles mit data-reveal oder data-anim bekommt .ist-sichtbar */
  var ziele = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], [data-anim]'));
  var zeigen = function (el, verzoegerung) {
    if (verzoegerung) el.style.setProperty('--d', verzoegerung + 'ms');
    el.classList.add('ist-sichtbar');
  };
  if (ruhig || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { zeigen(el, 0); });
  } else {
    var beobachter = new IntersectionObserver(function (eintraege) {
      var neu = eintraege.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      neu.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      neu.forEach(function (el, i) {
        zeigen(el, Math.min(i, 6) * 90);
        beobachter.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    ziele.forEach(function (el) { beobachter.observe(el); });
  }

  /* Parallaxe: Hero-Foto, Foto «Über mich», Anhänger-Foto beim Wischen */
  var heroIn = document.querySelector('.hero-bild-in');
  var luca = document.querySelector('.luca-bild');
  var lucaImg = luca && luca.querySelector('img');
  var rahmen = document.querySelector('.flotte-rahmen');
  var foto = document.querySelector('.karte-foto');
  var fotoImg = foto && foto.querySelector('img');
  var geplant = false;

  var parallaxe = function () {
    geplant = false;
    var h = window.innerHeight;
    var y = window.scrollY;
    if (heroIn && y < h * 1.3) heroIn.style.transform = 'translate3d(0,' + (y * 0.2).toFixed(1) + 'px,0)';
    if (lucaImg) {
      var r = luca.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) {
        var p = (r.top + r.height / 2 - h / 2) / h;
        lucaImg.style.transform = 'scale(1.08) translate3d(0,' + (p * -28).toFixed(1) + 'px,0)';
      }
    }
  };
  var wischen = function () {
    if (!fotoImg) return;
    var r = foto.getBoundingClientRect();
    var p = (r.left + r.width / 2 - window.innerWidth / 2) / window.innerWidth;
    fotoImg.style.transform = 'scale(1.12) translate3d(' + (p * -26).toFixed(1) + 'px,0,0)';
  };
  var anfordern = function () {
    if (!geplant) { geplant = true; window.requestAnimationFrame(parallaxe); }
  };

  window.addEventListener('scroll', function () {
    kopfPruefen();
    if (!ruhig) anfordern();
  }, { passive: true });

  if (!ruhig) {
    window.addEventListener('resize', anfordern);
    anfordern();
    if (rahmen) {
      rahmen.addEventListener('scroll', function () { window.requestAnimationFrame(wischen); }, { passive: true });
      wischen();
    }
  }
})();
