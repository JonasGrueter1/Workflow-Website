/* Schreinerei HB Design, Design B: Kopfzeile, Menü, Zeichenbühne, Register, Zeitleiste, Einblendungen */
(function () {
  'use strict';
  window.hbDesignB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var kopf = document.getElementById('kopf');
  var menueKnopf = kopf ? kopf.querySelector('.menue-knopf') : null;

  /* Hero-Auftritt starten */
  window.requestAnimationFrame(function () { root.classList.add('geladen'); });

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
    document.addEventListener('click', function (e) {
      if (kopf.classList.contains('ist-offen') && !kopf.contains(e.target)) menue(false);
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100) menue(false); });
  }

  /* Aktionsleiste mobil: erscheint, sobald die Knöpfe im Hero weggescrollt sind */
  var leiste = document.querySelector('.aktion');
  var heroKnoepfe = document.querySelector('.hero .knoepfe');
  var tick = false;
  function leisteZustand() {
    tick = false;
    if (leiste && heroKnoepfe) leiste.classList.toggle('ist-da', heroKnoepfe.getBoundingClientRect().bottom < 0);
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(leisteZustand); }
  }, { passive: true });
  window.addEventListener('resize', leisteZustand);
  leisteZustand();

  /* Zeichenbühne: erst der Plan, dann das fertige Möbel */
  var buehne = document.getElementById('buehne');
  var schalter = document.querySelectorAll('.buehne-schalter button');
  var uhr = [];
  function knoepfe(ansicht) {
    schalter.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ansicht') === ansicht ? 'true' : 'false'); });
  }
  function warte(fn, ms) { uhr.push(setTimeout(fn, ms)); }
  function stopp() { uhr.forEach(clearTimeout); uhr = []; }
  function zeitfaktor() { return window.matchMedia('(max-width: 999px)').matches ? 0.74 : 1; }
  function setze(z) { if (buehne) buehne.setAttribute('data-zustand', z); }

  function zeichnen(danachFoto) {
    if (!buehne) return;
    stopp();
    buehne.classList.remove('nach-zeichnung');
    setze('start');
    knoepfe('plan');
    void buehne.offsetWidth; /* Neustart der Übergänge erzwingen */
    warte(function () {
      setze('zeichnen');
      if (danachFoto) {
        warte(function () {
          buehne.classList.add('nach-zeichnung');
          setze('foto');
          knoepfe('foto');
        }, 2350 * zeitfaktor());
      } else {
        warte(function () { setze('plan'); }, 2700 * zeitfaktor());
      }
    }, 40);
  }

  if (buehne) {
    if (fx) {
      var foto = buehne.querySelector('.buehne-foto');
      var gestartet = false;
      var los = function () { if (gestartet) return; gestartet = true; zeichnen(true); };
      /* Erst zeichnen, wenn das Foto geladen ist, damit die Überblendung sicher klappt */
      if (foto && foto.complete && foto.naturalWidth) setTimeout(los, 150);
      else if (foto) {
        foto.addEventListener('load', function () { setTimeout(los, 150); });
        foto.addEventListener('error', function () { setze('plan'); knoepfe('plan'); gestartet = true; });
        setTimeout(los, 1600);
      }
    } else {
      setze('foto');
    }
    schalter.forEach(function (b) {
      b.addEventListener('click', function () {
        var ansicht = b.getAttribute('data-ansicht');
        if (ansicht === 'plan') {
          if (fx) zeichnen(false);
          else { stopp(); setze('plan'); knoepfe('plan'); }
        } else {
          stopp();
          buehne.classList.remove('nach-zeichnung');
          setze('foto');
          knoepfe('foto');
        }
      });
    });
  }

  /* Register: Vorschaubild zur Zeile, die man überfährt oder fokussiert */
  var zeilen = document.querySelectorAll('.zeile');
  var bilder = document.querySelectorAll('.vorschau-bild');
  var legende = document.getElementById('vorschau-legende');
  function zeige(zeile) {
    var key = zeile.getAttribute('data-bild');
    zeilen.forEach(function (z) { z.classList.toggle('ist-aktiv', z === zeile); });
    bilder.forEach(function (b) { b.classList.toggle('ist-aktiv', b.getAttribute('data-bild') === key); });
    if (legende) legende.textContent = zeile.getAttribute('data-legende') || '';
  }
  zeilen.forEach(function (z) {
    z.addEventListener('mouseenter', function () { zeige(z); });
    z.addEventListener('focus', function () { zeige(z); });
  });
  if (zeilen.length && window.matchMedia('(min-width: 1000px)').matches) zeige(zeilen[0]);

  /* Sanftes Scrollen nur bei Klicks auf Anker (nicht per CSS, damit Skripte sofort springen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    var y = id === 'top' ? 0 : ziel.getBoundingClientRect().top + window.scrollY - (kopf ? kopf.offsetHeight : 0) - 12;
    window.scrollTo({ top: y, behavior: fx ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id !== 'top' && ziel.focus) { ziel.setAttribute('tabindex', '-1'); ziel.focus({ preventScroll: true }); }
  });

  /* Einblenden beim Scrollen */
  var reveal = document.querySelectorAll('[data-reveal]');
  var leiste2 = document.getElementById('zeitleiste');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach(function (el) { io.observe(el); });

    if (leiste2) {
      var io2 = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) {
          if (e.isIntersecting) { leiste2.classList.add('ist-aktiv'); io2.disconnect(); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
      io2.observe(leiste2);
    }
  } else {
    reveal.forEach(function (el) { el.classList.add('ist-sichtbar'); });
    if (leiste2) leiste2.classList.add('ist-aktiv');
  }
  if (!fx && leiste2) leiste2.classList.add('ist-aktiv');
})();
