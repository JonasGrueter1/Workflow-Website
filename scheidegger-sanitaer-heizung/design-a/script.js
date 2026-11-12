/* Scheidegger Sanitär-Heizung AG, Design A: Kopf, Menü, Einblenden, Zeitleiste, Zähler, Aktionsleiste */
(function () {
  'use strict';
  window.schA = true;
  var d = document;
  var root = d.documentElement;
  var fx = root.classList.contains('fx');

  /* Kopf: Schatten beim Scrollen, Aktionsleiste am Handy */
  var kopf = d.getElementById('kopf');
  var aktion = d.getElementById('aktion');
  var heroCta = d.getElementById('hero-cta');
  var kontakt = d.getElementById('kontakt');

  /* Menü am Handy */
  var menuBtn = d.querySelector('.kopf-menu');
  var menu = d.getElementById('menu');
  function menuZu() {
    if (!menu || !menuBtn) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Menü öffnen');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      if (menuBtn.getAttribute('aria-expanded') === 'true') { menuZu(); return; }
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Menü schliessen');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { menuZu(); menuBtn.focus(); } });
  }

  /* Aktiver Menüpunkt */
  var navLinks = [].slice.call(d.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var navIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = d.querySelector(a.getAttribute('href')); if (s) navIo.observe(s); });
  }

  /* Zeitleiste: Linie an die Scrollposition gebunden, Punkte springen auf, sobald die Linie sie erreicht */
  var zl = d.getElementById('zeitleiste');
  var zlLinie = d.getElementById('zl-fortschritt');
  var zlEintraege = zl ? [].slice.call(zl.querySelectorAll('.zl-eintrag')) : [];
  var zlPunkte = [];
  var zlSichtbar = false;
  function zlMessen() {
    if (!zl) return;
    var spur = zl.querySelector('.zl-spur');
    var oben = spur.getBoundingClientRect().top;
    zlPunkte = zlEintraege.map(function (li) {
      var p = li.querySelector('.zl-punkt').getBoundingClientRect();
      return (p.top + p.height / 2) - oben;
    });
  }
  function zlZeichnen() {
    if (!zl || !zlLinie) return;
    var spur = zl.querySelector('.zl-spur');
    var r = spur.getBoundingClientRect();
    var ziel = window.innerHeight * 0.62;
    var p = Math.max(0, Math.min(1, (ziel - r.top) / r.height));
    zlLinie.style.setProperty('--p', p.toFixed(4));
    var stand = p * r.height;
    zlEintraege.forEach(function (li, i) { li.classList.toggle('ist-erreicht', stand >= zlPunkte[i] - 2); });
  }
  if (zl) {
    if (!fx) {
      zlEintraege.forEach(function (li) { li.classList.add('ist-erreicht'); });
    } else {
      zlMessen();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { zlSichtbar = es[0].isIntersecting; if (zlSichtbar) zlZeichnen(); }, { rootMargin: '10% 0px 10% 0px' }).observe(zl);
      } else { zlSichtbar = true; }
      window.addEventListener('resize', function () { zlMessen(); zlZeichnen(); }, { passive: true });
      window.addEventListener('load', function () { zlMessen(); zlZeichnen(); });
    }
  }

  /* Gemeinsamer Takt für alles, was am Scrollen hängt */
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.scrollY || 0;
    if (kopf) kopf.classList.toggle('ist-unten', y > 8);
    if (y < 200) navLinks.forEach(function (a) { a.classList.remove('ist-aktiv'); });
    if (aktion && heroCta) {
      var r = heroCta.getBoundingClientRect();
      var weg = r.bottom < 0;
      /* Im Kontaktbereich mit Formular stört die Leiste nur */
      if (weg && kontakt) {
        var k = kontakt.getBoundingClientRect();
        if (k.top < window.innerHeight * 0.55 && k.bottom > window.innerHeight * 0.4) weg = false;
      }
      aktion.classList.toggle('ist-da', weg);
    }
    if (fx && zlSichtbar) zlZeichnen();
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Zähler 50+ zählt einmal hoch */
  function zaehlen(el) {
    var ziel = parseInt(el.getAttribute('data-ziel'), 10) || 0;
    if (!fx) { el.textContent = ziel; return; }
    var start = null, dauer = 800;
    el.textContent = '0';
    function schritt(t) {
      if (start === null) start = t;
      var x = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - x, 3);
      el.textContent = Math.round(ziel * e);
      if (x < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }

  /* Sanftes Scrollen zu Ankern (nur per Klick, damit Skripte und Zurück-Taste sofort springen) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = d.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
  });

  /* Lehrlinge-Punkte: Reihenfolge für das Auffüllen */
  [].forEach.call(d.querySelectorAll('.lehrlinge i'), function (el, i) { el.style.setProperty('--n', i); });

  /* Formular: nur Vorschau, kein Versand */
  var form = d.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(d.querySelectorAll('[data-reveal]'));
  var zaehler = [].slice.call(d.querySelectorAll('.zaehler'));
  function fertig(el) {
    el.classList.add('ist-da');
    /* Karten: Hover-Zeichnen erst nach dem ersten Zeichnen erlauben */
    if (el.classList.contains('karte')) setTimeout(function () { el.classList.add('ist-fertig'); }, 1400);
    [].forEach.call(el.querySelectorAll('.zaehler'), zaehlen);
  }
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-da', 'ist-fertig'); });
    zaehler.forEach(function (el) { el.textContent = el.getAttribute('data-ziel'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { fertig(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
  }
})();
