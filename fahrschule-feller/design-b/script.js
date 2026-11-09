/* Fahrschule Feller, Design B «Zwei Räder» */
(function () {
  'use strict';
  var root = document.documentElement;
  var fx = root.classList.contains('fx');

  /* ---------- Kopf: Hintergrund nach dem Scrollen, Menü am Handy ---------- */
  var kopf = document.getElementById('kopf');
  var menuKnopf = kopf && kopf.querySelector('.kopf-menu');
  function kopfStatus() { if (kopf) kopf.classList.toggle('ist-unten', window.scrollY > 24); }
  kopfStatus();
  window.addEventListener('scroll', kopfStatus, { passive: true });

  function menu(offen) {
    if (!kopf || !menuKnopf) return;
    kopf.classList.toggle('ist-offen', offen);
    menuKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menuKnopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (menuKnopf) {
    menuKnopf.addEventListener('click', function () { menu(!kopf.classList.contains('ist-offen')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  }

  /* ---------- Anker: sanft springen, Menü schliessen ---------- */
  [].forEach.call(document.querySelectorAll('a[href^="#"]:not([data-soon])'), function (a) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    a.addEventListener('click', function (e) {
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      menu(false);
      var y = el.getBoundingClientRect().top + window.scrollY - (id === 'inhalt' ? 0 : (kopf ? kopf.offsetHeight - 1 : 0));
      window.scrollTo({ top: y, behavior: fx ? 'smooth' : 'auto' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      if (id === 'inhalt') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    });
  });

  /* ---------- Scroll-Reveal ---------- */
  var els = [].slice.call(document.querySelectorAll('.rv, .etappen, .schritte'));
  if ('IntersectionObserver' in window && fx) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-sichtbar'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* ---------- Mietrechner ---------- */
  var TARIFE = {
    a:  { name: 'Kat. A und A35kW', gk4: 80, gk2: 50, lektion: 25, halb: 70, tag: 120 },
    a1: { name: 'Kat. A1', gk4: 60, lektion: 20, halb: 60, tag: 100 }
  };
  var DAUER = { gk4: 'Grundkurs à 4 Std.', gk2: 'Grundkurs à 2 Std.', lektion: 'pro Lektion', halb: 'halber Tag', tag: 'ganzer Tag' };
  var form = document.getElementById('rechner');
  var betrag = document.getElementById('betrag');
  var betragText = document.getElementById('betrag-text');
  var licht = document.querySelector('.buehne-licht');
  var tarife = document.getElementById('tarife');
  if (tarife) tarife.removeAttribute('open');

  function wert(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }

  function zeigen(neu, text, animiert) {
    if (!fx || !animiert) { betrag.textContent = neu; betragText.textContent = text; return; }
    betrag.classList.remove('rein');
    betrag.classList.add('raus');
    setTimeout(function () {
      betrag.textContent = neu;
      betragText.textContent = text;
      betrag.classList.remove('raus');
      void betrag.offsetWidth;
      betrag.classList.add('rein');
    }, 190);
  }

  function rechnen(e) {
    var kat = wert('kat');
    var gk2 = form.querySelector('input[value="gk2"]');
    var nurA = kat !== 'a';
    gk2.disabled = nurA;
    if (nurA && gk2.checked) form.querySelector('input[value="gk4"]').checked = true;
    var dauer = wert('dauer');
    var preis = TARIFE[kat][dauer];
    zeigen(preis + '.–', TARIFE[kat].name + ', ' + DAUER[dauer], !!e);
    if (e && e.target && e.target.name === 'kat' && fx && licht) {
      licht.classList.remove('puls'); void licht.offsetWidth; licht.classList.add('puls');
    }
  }
  if (form && betrag) {
    form.addEventListener('change', rechnen);
    rechnen();
  }

  /* ---------- Aktionsleiste Handy: erscheint, wenn die Hero-Knöpfe weg sind ---------- */
  var leiste = document.querySelector('.aktionen');
  var heroKnoepfe = document.querySelector('.hero-cta');
  var kontakt = document.getElementById('kontakt');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    var heroWeg = false, kontaktDa = false;
    var setzen = function () { leiste.classList.toggle('ist-da', heroWeg && !kontaktDa); };
    new IntersectionObserver(function (en) {
      heroWeg = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; setzen();
    }).observe(heroKnoepfe);
    if (kontakt) new IntersectionObserver(function (en) { kontaktDa = en[0].isIntersecting; setzen(); }, { threshold: 0.35 }).observe(kontakt);
  } else if (leiste) { leiste.classList.add('ist-da'); }
})();
