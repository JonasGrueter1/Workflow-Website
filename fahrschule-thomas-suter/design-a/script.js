/* Fahrschule Thomas Suter, Design A: Kopf, Menü, Einblenden, gelbe Kurve im Weg ab 2027 */
(function () {
  'use strict';

  var html = document.documentElement;
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Schatten nach dem Scrollen ---------- */
  var kopf = document.getElementById('kopf');
  var onScrollKopf = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  onScrollKopf();
  window.addEventListener('scroll', onScrollKopf, { passive: true });

  /* ---------- Handy-Menü ---------- */
  var knopf = kopf.querySelector('.menue-knopf');
  var nav = document.getElementById('menue');
  var setMenue = function (offen) {
    kopf.classList.toggle('menue-offen', offen);
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    document.body.style.overflow = offen ? 'hidden' : '';
  };
  knopf.addEventListener('click', function () { setMenue(knopf.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href').charAt(0) === '#' && a.getAttribute('href').length > 1) setMenue(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('menue-offen')) { setMenue(false); knopf.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1059 && kopf.classList.contains('menue-offen')) setMenue(false); });

  /* ---------- Sanftes Scrollen nur bei Klicks auf Anker ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Aktiver Anker im Kopf ---------- */
  var anker = [].slice.call(document.querySelectorAll('.kopf-anker a'));
  if (hatIO && anker.length) {
    var abschnitte = anker.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var aktivIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        anker.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    abschnitte.forEach(function (s) { aktivIO.observe(s); });
    var heroAbschnitt = document.getElementById('top');
    if (heroAbschnitt) aktivIO.observe(heroAbschnitt);
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  [].forEach.call(document.querySelectorAll('[data-stagger]'), function (gruppe) {
    [].forEach.call(gruppe.querySelectorAll('[data-reveal]'), function (el, i) { el.style.setProperty('--rd', (i * 90) + 'ms'); });
  });
  var zeige = function (el) { el.classList.add('ist-da'); };
  var beobachte = function (selector, opts, fn) {
    var els = [].slice.call(document.querySelectorAll(selector));
    if (!hatIO || ruhig) { els.forEach(fn || zeige); return; }
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { (fn || zeige)(e.target); io.unobserve(e.target); }
      });
    }, opts || { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  };
  beobachte('[data-reveal]');
  beobachte('.handicap-fotos', { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
  beobachte('.werdegang', { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  /* ---------- Aktionsleiste: ausblenden, solange die Knöpfe im Hero oder der Kontaktbereich sichtbar sind ---------- */
  var aktion = document.querySelector('.aktion');
  var ziele = [document.querySelector('.hero-knoepfe'), document.getElementById('kontakt')].filter(Boolean);
  if (aktion && ziele.length && hatIO) {
    var sichtbar = {};
    aktion.classList.add('ist-weg');
    var aktionIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { sichtbar[e.target.className] = e.isIntersecting; });
      var weg = Object.keys(sichtbar).some(function (k) { return sichtbar[k]; });
      aktion.classList.toggle('ist-weg', weg);
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    ziele.forEach(function (z) { aktionIO.observe(z); });
  }

  /* ---------- Weg ab 2027: gelbe Kurve durch die Stationen ---------- */
  var strecke = document.querySelector('.weg-strecke');
  if (!strecke) return;
  var svg = strecke.querySelector('.weg-linie');
  var pfad = svg.querySelector('path');
  var stationen = [].slice.call(strecke.querySelectorAll('.station'));
  var punkte = stationen.map(function (s) { return s.querySelector('.station-punkt'); });
  var anteile = [];
  var waagrecht = false;
  var gezeichnet = false;

  var baue = function () {
    var box = strecke.getBoundingClientRect();
    var p = punkte.map(function (el) {
      var r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    });
    if (p.length < 2) return;
    waagrecht = Math.abs(p[1].y - p[0].y) < 4;
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    var a = waagrecht ? 22 : 16; // Ausschlag der Welle
    var d = 'M' + p[0].x.toFixed(1) + ' ' + p[0].y.toFixed(1);
    var teile = [];
    for (var i = 0; i < p.length - 1; i++) {
      var s = (i % 2 === 0) ? -1 : 1;
      var c1, c2, seg;
      if (waagrecht) {
        var dx = p[i + 1].x - p[i].x;
        c1 = [p[i].x + dx * 0.32, p[i].y + s * a * 1.3];
        c2 = [p[i].x + dx * 0.68, p[i + 1].y + s * a * 1.3];
      } else {
        var dy = p[i + 1].y - p[i].y;
        c1 = [p[i].x + s * a * 1.3, p[i].y + dy * 0.32];
        c2 = [p[i + 1].x + s * a * 1.3, p[i].y + dy * 0.68];
      }
      seg = 'C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p[i + 1].x.toFixed(1) + ' ' + p[i + 1].y.toFixed(1);
      d += ' ' + seg;
      teile.push('M' + p[i].x + ' ' + p[i].y + ' ' + seg);
    }
    pfad.setAttribute('d', d);
    strecke.classList.add('hat-linie');
    // Anteil der Linie bis zu jedem Punkt messen (für das Gelbwerden der Punkte)
    var gesamt = 0, laengen = [0];
    var mess = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(mess);
    teile.forEach(function (t) { mess.setAttribute('d', t); gesamt += mess.getTotalLength(); laengen.push(gesamt); });
    svg.removeChild(mess);
    anteile = laengen.map(function (l) { return gesamt ? l / gesamt : 0; });
  };

  var setzeFortschritt = function (f) {
    pfad.style.strokeDashoffset = String(1 - f);
    stationen.forEach(function (s, i) {
      var erreicht = f >= anteile[i] - 0.001;
      s.classList.toggle('ist-erreicht', erreicht);
      if (erreicht) s.classList.add('ist-da');
    });
  };

  var bisher = 0; // die Linie zeichnet sich nur vorwärts, einmal gezeichnet bleibt sie
  var scrollWeg = function () {
    if (!waagrecht || ruhig) return;
    var r = strecke.getBoundingClientRect();
    var vh = window.innerHeight;
    var mitte = r.top + 28;
    var f = (vh * 0.9 - mitte) / (vh * 0.34);
    bisher = Math.max(bisher, Math.max(0, Math.min(1, f)));
    setzeFortschritt(bisher);
  };

  var zeichneEinmal = function () {
    if (gezeichnet) return;
    gezeichnet = true;
    strecke.classList.add('zeichnet');
    stationen.forEach(function (s, i) {
      setTimeout(function () { s.classList.add('ist-da', 'ist-erreicht'); }, ruhig ? 0 : Math.round(anteile[i] * 1400 * 0.85));
    });
  };

  var start = function () {
    baue();
    if (ruhig) { pfad.style.strokeDashoffset = '0'; stationen.forEach(function (s) { s.classList.add('ist-da', 'ist-erreicht'); }); return; }
    if (waagrecht) {
      pfad.style.transition = 'none';
      scrollWeg();
    } else if (hatIO) {
      var io = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) { if (e.isIntersecting) { zeichneEinmal(); io.disconnect(); } });
      }, { rootMargin: '0px 0px -18% 0px', threshold: 0.05 });
      io.observe(strecke);
    } else {
      zeichneEinmal();
    }
  };

  var istWaagrechtAlt = null;
  var neuAufbau = function () {
    var vorher = waagrecht;
    baue();
    if (ruhig) return;
    if (waagrecht) {
      pfad.style.transition = 'none';
      strecke.classList.remove('zeichnet');
      scrollWeg();
    } else {
      pfad.style.transition = '';
      pfad.style.strokeDashoffset = '';
      if (vorher !== waagrecht && istWaagrechtAlt !== null) { gezeichnet = false; }
      if (gezeichnet) strecke.classList.add('zeichnet');
      stationen.forEach(function (s) { if (gezeichnet) s.classList.add('ist-da', 'ist-erreicht'); });
      if (!gezeichnet) {
        var r = strecke.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.85) zeichneEinmal();
      }
    }
    istWaagrechtAlt = waagrecht;
  };

  var los = function () {
    start();
    istWaagrechtAlt = waagrecht;
    var raf = 0;
    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; scrollWeg(); });
    }, { passive: true });
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(neuAufbau, 150); });
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(los);
  } else {
    window.addEventListener('load', los);
  }
})();
