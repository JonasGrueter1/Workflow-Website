/* Fahrschule Dino, Design B «Zwei Spuren»: Kopf, Einblenden, Strasse, Mittellinie, Aktionsleiste */
(function () {
  'use strict';
  window.dinoB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Kopf: dunkler Hintergrund nach 40 px ---------- */
  var kopf = document.getElementById('kopf');

  /* ---------- Anker-Links sanft scrollen ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var rvs = document.querySelectorAll('.rv, .kontakt');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Senkrechte Mittellinie zeichnet sich mit dem Scrollen ---------- */
  var spuren = document.querySelector('.spuren');
  var linie = document.querySelector('.mittellinie span');
  var linieP = 0;
  function linieUpdate() {
    if (!fx || !spuren || !linie || linieP >= 1) return;
    var r = spuren.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = clamp((vh * 0.8 - r.top) / (r.height * 0.85), 0, 1);
    if (p <= linieP) return; /* einmal gezeichnet, bleibt sie stehen */
    linieP = p;
    linie.style.setProperty('--p', p.toFixed(4));
  }

  /* ---------- Aktionsleiste am Handy: erscheint, sobald die Hero-Knöpfe weg sind ---------- */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta && hasIO) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      aktion.classList.toggle('zeigen', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* ---------- Scroll-Schleife (ein rAF pro Frame) ---------- */
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      tick = false;
      kopf.classList.toggle('gescrollt', window.scrollY > 40);
      linieUpdate();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Strasse: die gelbe Mittellinie faehrt auf den Betrachter zu ----------
     Zentralperspektive wie in den SVG-Daten: k = f / (f + d), X = cx + x*k, Y = vy + h*k.
     Hoechstens 3 Zyklen, nur solange der Hero sichtbar ist, danach Stillstand in der Grundstellung. */
  if (!fx) return;
  var hero = document.querySelector('.hero');
  var ZYKLEN = 3, DAUER = 1600, START = 1150;

  function aktiveStrasse() {
    var svgs = document.querySelectorAll('.strasse-svg');
    for (var i = 0; i < svgs.length; i++) {
      if (svgs[i].getBoundingClientRect().width > 0) return svgs[i];
    }
    return null;
  }

  function fahren(svg) {
    var ds = svg.dataset;
    var f = +ds.f, h = +ds.h, cx = +ds.cx, vy = +ds.vy, w = +ds.w, L = +ds.l, P = +ds.p;
    var striche = svg.querySelectorAll('.s-mitte polygon');
    var n = striche.length, total = n * P;
    var r1 = function (v) { return Math.round(v * 10) / 10; };

    function setzen(o) {
      for (var i = 0; i < n; i++) {
        var d0 = ((i * P - o + L) % total + total) % total - L;
        var d1 = d0 + L;
        var k0 = f / (f + d0), k1 = f / (f + d1);
        var y0 = vy + h * k0, y1 = vy + h * k1;
        striche[i].setAttribute('points',
          r1(cx - w / 2 * k0) + ',' + r1(y0) + ' ' + r1(cx + w / 2 * k0) + ',' + r1(y0) + ' ' +
          r1(cx + w / 2 * k1) + ',' + r1(y1) + ' ' + r1(cx - w / 2 * k1) + ',' + r1(y1));
      }
    }

    var gesamt = ZYKLEN * DAUER;
    var vergangen = 0, letzt = 0, laeuft = false, sichtbar = true, fertig = false;
    var ease = function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; };

    function frame(now) {
      if (!laeuft) return;
      if (letzt) vergangen += Math.min(64, now - letzt);
      letzt = now;
      var t = clamp(vergangen / gesamt, 0, 1);
      setzen(ease(t) * ZYKLEN * P);
      if (t >= 1) { laeuft = false; fertig = true; setzen(0); return; }
      requestAnimationFrame(frame);
    }
    function start() {
      if (laeuft || fertig || !sichtbar || document.hidden) return;
      laeuft = true; letzt = 0;
      requestAnimationFrame(frame);
    }
    function stopp() { laeuft = false; }

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        sichtbar = entries[0].isIntersecting;
        if (sichtbar) start(); else stopp();
      }, { threshold: 0.15 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopp(); else start(); });
    setTimeout(start, START);
  }

  /* Auftritt der Strasse: Klasse erst nach dem ersten Bild setzen, damit die Übergänge laufen */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.querySelectorAll('.strasse').forEach(function (s) { s.classList.add('los'); });
    });
  });

  var strasse = aktiveStrasse();
  if (strasse) fahren(strasse);
})();
