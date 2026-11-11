/* HMplus Holzbau AG, Design B: Auftritt, Einblenden, Zähler, Projekt-Filter, Menü */
(function () {
  'use strict';
  window.hmDesignB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');

  /* Auftritt starten, sobald die Schrift bereit ist (höchstens 600 ms warten) */
  function start() { requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('geladen'); }); }); }
  if (fx && document.fonts && document.fonts.ready) {
    var gestartet = false;
    var los = function () { if (!gestartet) { gestartet = true; start(); } };
    document.fonts.ready.then(los);
    setTimeout(los, 600);
  } else {
    start();
  }

  /* Kopf: Linie beim Scrollen, aktiver Menüpunkt */
  var kopf = document.getElementById('kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menü auf kleinen Bildschirmen */
  var menuKnopf = kopf.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  function menu(auf) {
    kopf.classList.toggle('menu-offen', auf);
    menuKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menuKnopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
    document.body.style.overflow = auf ? 'hidden' : '';
  }
  menuKnopf.addEventListener('click', function () { menu(menuKnopf.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && kopf.classList.contains('menu-offen')) { menu(false); menuKnopf.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 1023 && kopf.classList.contains('menu-offen')) menu(false); });

  /* Weiches Scrollen zu Ankern (nur per Klick, damit Werkzeuge und Tastatur normal scrollen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
  });

  /* Zähler */
  function zaehle(el) {
    var ziel = parseInt(el.getAttribute('data-zahl'), 10);
    if (!fx || !ziel) return;
    var t0 = null, dauer = 1300;
    el.textContent = '0';
    function schritt(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(ziel * e));
      if (p < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }

  /* Einblenden beim Scrollen */
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
  function zeige(el) {
    if (el.classList.contains('ist-sichtbar')) return;
    el.classList.add('ist-sichtbar');
    var z = el.querySelectorAll('[data-zahl]');
    for (var k = 0; k < z.length; k++) zaehle(z[k]);
  }
  if ('IntersectionObserver' in window && fx) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* Aktiver Menüpunkt */
  var links = [].slice.call(document.querySelectorAll('.kopf-nav a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var aktiv = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) aktiv.observe(s); });
    /* Zurück im Hero: kein Menüpunkt aktiv */
    var heroAbschnitt = document.getElementById('top'); if (heroAbschnitt) aktiv.observe(heroAbschnitt);
  }

  /* Projekt-Filter */
  var raster = document.getElementById('projekte');
  var chips = [].slice.call(document.querySelectorAll('.filter .chip'));
  var projekte = [].slice.call(raster.querySelectorAll('.projekt[data-bereich]'));
  var status = document.getElementById('filter-status');
  chips.forEach(function (c) {
    var key = c.getAttribute('data-filter');
    var n = key === 'alle' ? projekte.length : projekte.filter(function (p) { return p.getAttribute('data-bereich') === key; }).length;
    var s = document.createElement('span'); s.className = 'chip-zahl'; s.textContent = n; s.setAttribute('aria-hidden', 'true');
    c.appendChild(s);
  });
  var timer;
  function filtere(key, name) {
    var anwenden = function () {
      var sichtbar = 0;
      projekte.forEach(function (p) {
        var passt = key === 'alle' || p.getAttribute('data-bereich') === key;
        p.hidden = !passt;
        if (passt) { p.style.setProperty('--i', sichtbar); sichtbar++; }
        p.classList.add('ist-sichtbar');
      });
      status.textContent = key === 'alle' ? 'Alle ' + sichtbar + ' Projekte' : sichtbar + (sichtbar === 1 ? ' Projekt' : ' Projekte') + ' im Bereich ' + name;
    };
    clearTimeout(timer);
    if (!fx) { anwenden(); return; }
    raster.classList.add('ist-wechsel');
    timer = setTimeout(function () {
      anwenden();
      void raster.offsetWidth;
      raster.classList.remove('ist-wechsel');
    }, 210);
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      if (c.getAttribute('aria-pressed') === 'true') return;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      filtere(c.getAttribute('data-filter'), c.firstChild.textContent.trim());
    });
  });
})();
