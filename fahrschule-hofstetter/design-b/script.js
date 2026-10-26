/* Fahrschule Hofstetter, Design B: Startampel, Strecke, Einblenden, Boxenfunk */
(function () {
  'use strict';

  var root = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* Kopf: Hintergrund nach dem ersten Scrollen */
  var kopf = document.querySelector('.kopf');
  var kopfCheck = function () { kopf.classList.toggle('is-scrolled', window.scrollY > 10); };
  kopfCheck();
  window.addEventListener('scroll', kopfCheck, { passive: true });

  /* Sanftes Scrollen zu den Abschnitten (nur bei Klick auf einen Anker) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && id !== 'main' ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', '#' + id);
  });

  /* Startampel: fünf Lichterpaare gehen an, dann alle aus, Start */
  var pods = document.querySelectorAll('.pod');
  var licht = document.querySelector('.hero-licht');
  if (ruhig || !pods.length) {
    root.classList.add('is-go');
  } else {
    var t0 = 140, schritt = 110, halten = 170;
    Array.prototype.forEach.call(pods, function (pod, i) {
      setTimeout(function () {
        Array.prototype.forEach.call(pod.children, function (l) { l.classList.add('is-an'); });
        if (licht) licht.style.opacity = String((i + 1) / 5);
      }, t0 + i * schritt);
    });
    setTimeout(function () {
      root.classList.add('is-go');
      if (licht) { licht.style.transition = 'opacity .6s ease-out'; licht.style.opacity = '0'; }
    }, t0 + (pods.length - 1) * schritt + halten);
  }

  /* Einblenden beim Scrollen */
  var boxen = document.querySelectorAll('.boxen .box');
  Array.prototype.forEach.call(boxen, function (b, i) { b.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); });
  var rv = document.querySelectorAll('.rv');
  if (!ruhig && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(rv, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(rv, function (el) { el.classList.add('is-in'); });
  }

  /* Aktionsleiste am Handy: sichtbar, solange der rote Hero-Knopf nicht ganz im Bild ist (auf kleinen Handys
     schon beim Laden, sonst nach dem Scrollen), ausgeblendet im Ziel-Band mit Nummer und E-Mail.
     Gemessen wird bei jedem Scrollbild, damit auch Sprünge (Anker, Neuladen) stimmen. */
  var leiste = document.querySelector('.leiste');
  var heroBtn = document.querySelector('.hero-cta .btn');
  var zielK = document.querySelector('#ziel .ziel-kontakt');
  /* Lage im Layout ohne transform (der Knopf gleitet beim Auftritt noch ein paar Pixel nach oben) */
  var layoutRect = function (el) {
    var y = 0, n = el;
    while (n) { y += n.offsetTop; n = n.offsetParent; }
    var top = y - (window.pageYOffset || 0);
    return { top: top, bottom: top + el.offsetHeight };
  };
  if (leiste) {
    var leisteWartet = false;
    var leistePruefen = function () {
      leisteWartet = false;
      var vh = window.innerHeight;
      var vz = document.querySelector('.vz-bar');
      var vzr = vz ? vz.getBoundingClientRect() : null;
      var unten = vzr && vzr.height ? vzr.top : vh;
      var oben = kopf ? kopf.getBoundingClientRect().bottom : 0;
      var r = heroBtn ? layoutRect(heroBtn) : null;
      var ctaDa = r ? r.top >= oben && r.bottom <= unten + 1 : false;
      var z = zielK ? zielK.getBoundingClientRect() : null;
      var zielDa = z ? z.top < vh * 0.65 && z.bottom > 0 : false;
      leiste.classList.toggle('is-da', !ctaDa && !zielDa);
    };
    var leisteTick = function () { if (!leisteWartet) { leisteWartet = true; raf(leistePruefen); } };
    window.addEventListener('scroll', leisteTick, { passive: true });
    window.addEventListener('resize', leisteTick);
    window.addEventListener('load', leistePruefen);
    setTimeout(leistePruefen, 0);
    setTimeout(leistePruefen, 1200);
  }

  /* Die Runde zum Ausweis: Strecke aus den Sektormarken bauen und mit dem Scrollen zeichnen */
  var strecke = document.querySelector('[data-strecke]');
  if (strecke) {
    var svg = strecke.querySelector('.strecke-svg');
    var bahn = svg.querySelector('.strecke-bahn');
    var mitte = svg.querySelector('.strecke-mitte');
    var linie = svg.querySelector('.strecke-linie');
    var ehrenBahn = svg.querySelector('.strecke-ehren-bahn');
    var ehren = svg.querySelector('.strecke-ehren');
    var punkt = svg.querySelector('.strecke-punkt');
    var startLinie = svg.querySelector('.strecke-start');
    var sektoren = Array.prototype.slice.call(strecke.querySelectorAll('[data-sektor]'));
    var messer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var hauptLen = 0, ehrenLen = 0, marken = [], gebaut = false, letzteBreite = 0, quer = false;

    var n = function (v) { return Math.round(v * 10) / 10; };
    var laenge = function (d) { messer.setAttribute('d', d); return messer.getTotalLength(); };

    var bauen = function () {
      var box = strecke.getBoundingClientRect();
      if (!box.width) return;
      letzteBreite = window.innerWidth;
      svg.setAttribute('viewBox', '0 0 ' + n(box.width) + ' ' + n(box.height));
      if (!messer.parentNode) svg.appendChild(messer);
      var pts = sektoren.map(function (s) {
        var r = s.querySelector('.sektor-mk').getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      quer = window.matchMedia('(min-width: 1100px)').matches;
      var haupt = pts.slice(0, pts.length - 1);
      var e = pts[pts.length - 1];
      var prev, d, teile = [];

      if (quer) {
        prev = { x: 0, y: n((haupt[0].y + haupt[1].y) / 2) };
        d = 'M' + prev.x + ' ' + prev.y;
        haupt.forEach(function (p) {
          var dx = (p.x - prev.x) * 0.55;
          d += 'C' + n(prev.x + dx) + ' ' + n(prev.y) + ' ' + n(p.x - dx) + ' ' + n(p.y) + ' ' + n(p.x) + ' ' + n(p.y);
          teile.push(d); prev = p;
        });
      } else {
        prev = { x: haupt[0].x, y: Math.max(-20, haupt[0].y - 44) };
        d = 'M' + n(prev.x) + ' ' + n(prev.y);
        haupt.forEach(function (p, i) {
          var dy = (p.y - prev.y) * 0.5, s = i === 0 ? 0 : (i % 2 ? 1 : -1) * 18;
          d += 'C' + n(prev.x + s) + ' ' + n(prev.y + dy) + ' ' + n(p.x + s) + ' ' + n(p.y - dy) + ' ' + n(p.x) + ' ' + n(p.y);
          teile.push(d); prev = p;
        });
      }
      if (startLinie) {
        var s0 = quer ? { x: 0, y: n((haupt[0].y + haupt[1].y) / 2) } : { x: n(haupt[0].x), y: n(Math.max(-20, haupt[0].y - 44)) };
        startLinie.setAttribute('transform', 'translate(' + (quer ? s0.x + 10 : s0.x) + ' ' + (quer ? s0.y : s0.y + 10) + ')' + (quer ? '' : ' rotate(90)'));
      }
      bahn.setAttribute('d', d);
      mitte.setAttribute('d', d);
      linie.setAttribute('d', d);
      hauptLen = laenge(d);
      marken = teile.map(laenge);

      /* Ehrenrunde: Verbindung zur WAB-Marke und eine Schleife um sie herum */
      var z = haupt[haupt.length - 1], r = quer ? 30 : 22, ed;
      if (quer) {
        var ex = e.x, ey = e.y - r, dx2 = (ex - z.x) * 0.55;
        ed = 'M' + n(z.x) + ' ' + n(z.y) + 'C' + n(z.x + dx2) + ' ' + n(z.y) + ' ' + n(ex - dx2) + ' ' + n(ey) + ' ' + n(ex) + ' ' + n(ey) +
          'A' + r + ' ' + r + ' 0 0 1 ' + n(e.x) + ' ' + n(e.y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + n(e.x) + ' ' + n(e.y - r);
      } else {
        var lx = e.x - r, dy2 = (e.y - z.y) * 0.5;
        ed = 'M' + n(z.x) + ' ' + n(z.y) + 'C' + n(z.x + 18) + ' ' + n(z.y + dy2) + ' ' + n(lx) + ' ' + n(e.y - dy2) + ' ' + n(lx) + ' ' + n(e.y) +
          'A' + r + ' ' + r + ' 0 0 0 ' + n(e.x + r) + ' ' + n(e.y) + 'A' + r + ' ' + r + ' 0 0 0 ' + n(lx) + ' ' + n(e.y);
      }
      ehrenBahn.setAttribute('d', ed);
      ehren.setAttribute('d', ed);
      ehrenLen = laenge(ed);
      marken.push(hauptLen + ehrenLen * 0.35);

      linie.style.strokeDasharray = hauptLen + ' ' + (hauptLen + 10);
      ehren.style.strokeDasharray = ehrenLen + ' ' + (ehrenLen + 10);
      gebaut = true;
      zeichnen();
    };

    var zeichnen = function () {
      if (!gebaut) return;
      var p;
      if (ruhig) {
        p = 1;
      } else {
        var r = strecke.getBoundingClientRect(), vh = window.innerHeight;
        var anfang = quer ? 0.88 : 0.72, ende = quer ? 0.82 : 0.42;
        p = (vh * anfang - r.top) / (r.height + vh * anfang - vh * ende);
        p = Math.max(0, Math.min(1, p));
      }
      var gesamt = hauptLen + ehrenLen, s = p * gesamt;
      var sh = Math.min(s, hauptLen), se = Math.max(0, s - hauptLen);
      linie.style.strokeDashoffset = String(hauptLen - sh);
      ehren.style.strokeDashoffset = String(ehrenLen - se);
      var pt = s <= hauptLen ? linie.getPointAtLength(sh) : ehren.getPointAtLength(Math.min(se, ehrenLen));
      punkt.setAttribute('transform', 'translate(' + n(pt.x) + ' ' + n(pt.y) + ')');
      strecke.classList.toggle('is-aktiv', p > 0.001);
      sektoren.forEach(function (sek, i) { sek.classList.toggle('is-lit', s >= marken[i] - 1); });
    };

    var wartet = false;
    var tick = function () { if (wartet) return; wartet = true; raf(function () { wartet = false; zeichnen(); }); };
    if (!ruhig) window.addEventListener('scroll', tick, { passive: true });

    var rt;
    window.addEventListener('resize', function () {
      if (window.innerWidth === letzteBreite) { tick(); return; }
      clearTimeout(rt); rt = setTimeout(bauen, 120);
    });
    bauen();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bauen);
    window.addEventListener('load', bauen);
  }

  /* Boxenfunk: Pfeile für die Kartenreihe */
  var track = document.querySelector('.funk-track');
  var knoepfe = document.querySelectorAll('[data-funk]');
  if (track && knoepfe.length) {
    var schrittBreite = function () {
      var k = track.querySelector('.funk-karte');
      return k ? k.getBoundingClientRect().width + 14 : track.clientWidth * 0.8;
    };
    var status = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      knoepfe[0].disabled = track.scrollLeft <= 2;
      knoepfe[1].disabled = track.scrollLeft >= max;
    };
    Array.prototype.forEach.call(knoepfe, function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: Number(b.getAttribute('data-funk')) * schrittBreite(), behavior: ruhig ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { raf(status); }, { passive: true });
    window.addEventListener('resize', status);
    status();
  }
})();
