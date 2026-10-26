/* Design A «Kompass»: Menü, Einblenden, Grafik, Kompassnadeln, Parallaxe */
(function () {
  'use strict';

  var doc = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Kopf und Menü */
  var kopf = $('#kopf');
  var nav = $('#nav');
  var menuBtn = $('.rund-menu');
  var setMenu = function (offen) {
    nav.classList.toggle('is-open', offen);
    menuBtn.setAttribute('aria-expanded', String(offen));
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Sanftes Scrollen zu Ankern (nur bei Klick, damit programmatisches Scrollen unverändert bleibt) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Aktionsleiste erst nach dem Hero */
  var leiste = $('.leiste');
  var heroCta = $('.hero-cta');
  var schwelle = function () { return heroCta ? heroCta.getBoundingClientRect().bottom + window.scrollY - 40 : 300; };
  var grenze = schwelle();
  window.addEventListener('resize', function () { grenze = schwelle(); });

  /* Zähler */
  var zaehle = function (el) {
    var ziel = parseFloat(el.getAttribute('data-count'));
    var start = parseFloat(el.getAttribute('data-from') || '0');
    if (ruhig) { el.textContent = ziel.toFixed(1); return; }
    var dauer = 1100, t0 = null;
    var schritt = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (start + (ziel - start) * e).toFixed(1);
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  };
  var zaehler = $$('[data-count]');
  if (!ruhig && hatIO) zaehler.forEach(function (el) { el.textContent = parseFloat(el.getAttribute('data-from') || '0').toFixed(1); });

  /* Einblenden beim Scrollen */
  var zeige = function (el) {
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(zaehle);
  };
  var ziele = $$('[data-reveal], .chart, [data-rose], .spitze');
  if (hatIO && !ruhig) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Angebot: Kompassnadel zeigt auf die Karte unter dem Zeiger */
  var akNadel = $('.ak-nadel');
  var dreh = 0;
  var zeigeAuf = function (grad) {
    var diff = ((grad - dreh) % 360 + 540) % 360 - 180;
    dreh += diff;
    akNadel.style.setProperty('--nr', dreh + 'deg');
  };
  $$('.ang-karte').forEach(function (k) {
    var g = parseFloat(k.getAttribute('data-dir'));
    k.addEventListener('pointerenter', function () { zeigeAuf(g); });
    k.addEventListener('focusin', function () { zeigeAuf(g); });
  });
  var rg = $('[data-rose]');
  if (rg) rg.addEventListener('pointerleave', function () { zeigeAuf(0); });

  /* Weg zum Führerausweis: Nadel dreht sich auf den erreichten Schritt */
  var schritte = $$('.weg-liste li');
  var dNadel = $('.d-nadel');
  var dFort = $('.d-fort');
  var zahlen = $$('.d-zahlen text');
  var wsNr = $('.ws-nr b');
  var wsTitel = $('.ws-titel');
  var aktiv = 0;
  var setzeSchritt = function (n) {
    if (n === aktiv) return;
    aktiv = n;
    dNadel.style.setProperty('--a', (-135 + (n - 1) * 45) + 'deg');
    dFort.style.strokeDashoffset = String(270 - (n - 1) * 45);
    zahlen.forEach(function (z, i) {
      z.classList.toggle('is-an', i < n);
      z.classList.toggle('is-jetzt', i === n - 1);
    });
    schritte.forEach(function (li, i) { li.classList.toggle('is-erreicht', i < n); });
    wsNr.textContent = String(n);
    wsTitel.textContent = $('h3', schritte[n - 1]).textContent;
  };
  if (schritte.length) {
    if (hatIO) {
      var wio = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) {
          if (e.isIntersecting) setzeSchritt(parseInt(e.target.getAttribute('data-step'), 10));
        });
      }, { rootMargin: '-38% 0px -52% 0px', threshold: 0 });
      schritte.forEach(function (li) { wio.observe(li); });
      setzeSchritt(1);
    } else {
      setzeSchritt(7);
    }
  }

  /* Gutschein: Wert wählen */
  var gsZahl = $('[data-gs-zahl]');
  $$('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      gsZahl.textContent = chip.getAttribute('data-wert');
      gsZahl.classList.remove('is-neu');
      void gsZahl.offsetWidth;
      gsZahl.classList.add('is-neu');
    });
  });
  var tilt = $('[data-tilt]');
  if (tilt && !ruhig && window.matchMedia('(hover: hover)').matches) {
    var buehne = tilt.parentNode;
    buehne.addEventListener('pointermove', function (e) {
      var r = buehne.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    });
    buehne.addEventListener('pointerleave', function () {
      tilt.style.setProperty('--ry', '0deg');
      tilt.style.setProperty('--rx', '0deg');
    });
  }

  /* Scroll: Kopf, Leiste, Parallaxe */
  var bergHinten = $('.berg-hinten');
  var bilder = $$('[data-parallax]');
  var ring = $('.ich-ring');
  var navLinks = $$('.nav ul a');
  var sektionen = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var wartet = false;
  var aktualisiere = function () {
    wartet = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    kopf.classList.toggle('is-scrolled', y > 8);
    if (leiste) leiste.classList.toggle('is-weg', y < grenze - 64);
    var aktivNav = -1, besteTop = -Infinity;
    sektionen.forEach(function (s, i) {
      if (!s) return;
      var t = s.getBoundingClientRect().top;
      if (t < vh * 0.4 && t > besteTop && s.getBoundingClientRect().bottom > vh * 0.2) { besteTop = t; aktivNav = i; }
    });
    navLinks.forEach(function (a, i) { a.classList.toggle('is-aktiv', i === aktivNav); });
    if (ruhig) return;
    if (bergHinten && y < vh * 1.2) bergHinten.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)';
    bilder.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.setProperty('--py', (p * -26).toFixed(1) + 'px');
    });
    if (ring) {
      var rr = ring.getBoundingClientRect();
      if (rr.bottom > 0 && rr.top < vh) ring.style.transform = 'rotate(' + ((rr.top - vh / 2) * 0.06).toFixed(2) + 'deg)';
    }
  };
  var onScroll = function () { if (!wartet) { wartet = true; requestAnimationFrame(aktualisiere); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  aktualisiere();
})();
