/* Fahrschule Bolliger, Design B: Kopf, Einblenden, Kategorienkarte (3D, Drehung beim Scrollen),
   aktive Kategorie, Parallaxe der Flotte, Aktionsleiste am Handy. Nur Vanilla-JS. */
(function () {
  'use strict';
  window.bolligerB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var mqDesk = window.matchMedia('(min-width: 1200px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var hasIO = 'IntersectionObserver' in window;
  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ---------- Kopf: Hintergrund beim Scrollen, beim Runterscrollen ausblenden ---------- */
  var kopf = document.getElementById('kopf');
  var lastY = window.scrollY;
  function kopfUpdate(y) {
    kopf.classList.toggle('gescrollt', y > 10);
    if (fx) {
      if (y > lastY + 6 && y > 420) kopf.classList.add('weg');
      else if (y < lastY - 6 || y <= 420) kopf.classList.remove('weg');
    }
    lastY = y;
  }
  kopf.addEventListener('focusin', function () { kopf.classList.remove('weg'); });

  /* ---------- Anker-Links: sanft scrollen ---------- */
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
  var rvs = document.querySelectorAll('.rv');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
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

  /* ---------- Die Karte ---------- */
  var spur = document.querySelector('.spur');
  var karte = document.getElementById('karte3d');
  var knopf = document.querySelector('.drehen');
  var kat = document.getElementById('kategorien');
  var zeilen = Array.prototype.slice.call(document.querySelectorAll('.zeile'));
  var kartenZeilen = Array.prototype.slice.call(document.querySelectorAll('.h-tab li'));

  var BASE = { rx: 10, ry: -14 };
  var cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
  var tgt = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
  var ptr = { x: 0, y: 0 };
  var running = false;
  var zoneOben = null;
  var gedreht = false;
  var aktiv = -1;

  function setVars(o) {
    karte.style.setProperty('--rx', o.rx.toFixed(3));
    karte.style.setProperty('--ry', o.ry.toFixed(3));
    karte.style.setProperty('--flip', o.flip.toFixed(3));
    karte.style.setProperty('--px', o.px.toFixed(3));
    karte.style.setProperty('--py', o.py.toFixed(3));
  }

  function setAktiv(i) {
    if (i === aktiv) return;
    aktiv = i;
    kartenZeilen.forEach(function (li, k) { li.classList.toggle('an', k === i); });
    zeilen.forEach(function (z, k) { z.classList.toggle('an', k === i); });
  }

  /* Computer: Drehung an die Lage der Kategorien gekoppelt, danach die aktive Zeile auf der Karte markieren */
  function desktopZiel() {
    var vh = window.innerHeight;
    var r = kat.getBoundingClientRect();
    var f = easeIO(clamp((vh * 0.9 - r.top) / (vh * 0.55)));
    var k = 1 - 0.55 * f;
    tgt.rx = BASE.rx * k - ptr.y * 6;
    tgt.ry = BASE.ry * k + ptr.x * 6;
    tgt.flip = 180 * f;
    tgt.px = ptr.x;
    tgt.py = ptr.y;

    spur.classList.toggle('ruhig', f > 0.02 || r.bottom < 0);

    if (f > 0.97) {
      var mitte = vh / 2 + 30;
      var best = -1, bestD = Infinity;
      zeilen.forEach(function (z, i) {
        var zr = z.getBoundingClientRect();
        if (zr.bottom < vh * 0.18 || zr.top > vh * 0.82) return;
        var d = Math.abs(zr.top + zr.height / 2 - mitte);
        if (d < bestD) { bestD = d; best = i; }
      });
      setAktiv(best);
    } else {
      setAktiv(-1);
    }
  }

  function frame() {
    running = false;
    desktopZiel();
    var moving = false;
    ['rx', 'ry', 'flip', 'px', 'py'].forEach(function (key) {
      var d = tgt[key] - cur[key];
      if (Math.abs(d) > 0.02) { cur[key] += d * (key === 'flip' ? 0.18 : 0.1); moving = true; }
      else cur[key] = tgt[key];
    });
    setVars(cur);
    if (moving) kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  /* Handy und Tablet: Karte dreht sich, sobald sie die obere Bildhälfte erreicht, oder per Knopf */
  function mobilSetzen(hinten) {
    gedreht = hinten;
    knopf.setAttribute('aria-pressed', String(hinten));
    setVars({ rx: BASE.rx, ry: BASE.ry, flip: hinten ? 180 : 0, px: cur.px, py: cur.py });
    spur.classList.toggle('ruhig', hinten);
  }
  function mobilUpdate() {
    var r = karte.getBoundingClientRect();
    var vh = window.innerHeight;
    var mitte = r.top + r.height / 2;
    var oben = mitte < vh * 0.42;
    if (oben !== zoneOben) {
      if (zoneOben !== null || oben) mobilSetzen(oben);
      zoneOben = oben;
    }
    /* Licht auf der Karte wandert leicht mit */
    cur.py = clamp((mitte - vh / 2) / (vh / 2), -1, 1);
    karte.style.setProperty('--py', cur.py.toFixed(3));
    if (r.bottom < 0 || r.top > vh) spur.classList.add('ruhig');
    else if (!gedreht) spur.classList.remove('ruhig');
  }

  function karteReset() {
    zoneOben = null;
    gedreht = false;
    knopf.setAttribute('aria-pressed', 'false');
    cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
    tgt = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
    ptr = { x: 0, y: 0 };
    setAktiv(-1);
    spur.classList.remove('ruhig');
    setVars(cur);
  }

  if (fx && karte) {
    knopf.addEventListener('click', function () { mobilSetzen(!gedreht); });

    if (mqFine.matches) {
      window.addEventListener('pointermove', function (e) {
        if (!mqDesk.matches) return;
        var r = karte.getBoundingClientRect();
        ptr.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
        ptr.y = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
        kick();
      }, { passive: true });
      root.addEventListener('pointerleave', function () { ptr.x = 0; ptr.y = 0; kick(); });
    }

    var onMq = function () { karteReset(); scrollen(); };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', onMq); else mqDesk.addListener(onMq);
  }

  /* ---------- Flotte: leichte Parallaxe ---------- */
  var flotte = document.querySelector('.flotte');
  var flotteImg = flotte && flotte.querySelector('img');
  function flotteUpdate() {
    if (!fx || !flotteImg) return;
    var r = flotte.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < -50 || r.top > vh + 50) return;
    var p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
    flotteImg.style.transform = 'translate3d(0,' + (p * 6).toFixed(2) + '%,0)';
  }

  /* ---------- Scroll-Schleife ---------- */
  var tick = false;
  function scrollen() {
    kopfUpdate(window.scrollY);
    flotteUpdate();
    if (fx && karte) {
      if (mqDesk.matches) kick(); else mobilUpdate();
    }
  }
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; scrollen(); });
  }, { passive: true });
  window.addEventListener('resize', scrollen, { passive: true });
  scrollen();
})();
