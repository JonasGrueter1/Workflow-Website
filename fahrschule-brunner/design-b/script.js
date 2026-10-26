/* Brunner Fahrschule, Design B: Kopf, Einblenden, Kategorienkarte (3D), Wort-Hervorhebung, Aktionsleiste */
(function () {
  'use strict';
  window.brunnerB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Hintergrund beim Scrollen, beim Runterscrollen ausblenden ---------- */
  var kopf = document.getElementById('kopf');
  var lastY = window.scrollY;
  function kopfUpdate(y) {
    kopf.classList.toggle('gescrollt', y > 8);
    if (fx) {
      if (y > lastY + 6 && y > 360) kopf.classList.add('weg');
      else if (y < lastY - 6 || y <= 360) kopf.classList.remove('weg');
    }
    lastY = y;
  }
  kopf.addEventListener('focusin', function () { kopf.classList.remove('weg'); });

  /* ---------- Anker-Links: sanft scrollen (nur bei Klick, nur mit Animation) ---------- */
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
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
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

  /* ---------- Wörter im Satz «Persönlich» werden beim Scrollen hell ---------- */
  var satz = document.querySelector('[data-woerter]');
  var woerter = [];
  if (fx && satz) {
    var text = satz.textContent.trim().split(/\s+/);
    satz.textContent = '';
    text.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      satz.appendChild(s);
      if (i < text.length - 1) satz.appendChild(document.createTextNode(' '));
    });
    woerter = satz.querySelectorAll('.w');
  }
  function woerterUpdate() {
    if (!woerter.length) return;
    var r = satz.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < -100 || r.top > vh + 100) return;
    var p = clamp((vh * 0.9 - r.top) / (vh * 0.45 + r.height * 0.6));
    var n = woerter.length;
    for (var i = 0; i < n; i++) {
      woerter[i].style.setProperty('--o', (0.16 + 0.84 * clamp(p * (n + 1) - i)).toFixed(3));
    }
  }

  /* ---------- Die Karte ---------- */
  var buehne = document.querySelector('.buehne');
  var pin = document.querySelector('.buehne-pin');
  var karte = document.getElementById('karte3d');
  var capV = document.querySelector('.cap-vorne');
  var capH = document.querySelector('.cap-hinten');
  var knopf = document.querySelector('.drehen');

  var BASE = { rx: 12, ry: -14 };
  var cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
  var tgt = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
  var ptr = { x: 0, y: 0 };
  var running = false;
  var zoneOben = null;
  var gedreht = false;

  function setVars(o) {
    karte.style.setProperty('--rx', o.rx.toFixed(3));
    karte.style.setProperty('--ry', o.ry.toFixed(3));
    karte.style.setProperty('--flip', o.flip.toFixed(3));
    karte.style.setProperty('--px', o.px.toFixed(3));
    karte.style.setProperty('--py', o.py.toFixed(3));
    karte.classList.toggle('ist-hinten', o.flip > 110);
  }

  /* Desktop: Drehung an den Scrollfortschritt der Bühne gekoppelt (sticky) */
  function desktopZiel(y) {
    var vh = window.innerHeight;
    var r = buehne.getBoundingClientRect();
    var pinTop = (vh - pin.offsetHeight) / 2;
    var pre = Math.max(1, r.top + y - pinTop);
    var dist = Math.max(1, buehne.offsetHeight - pin.offsetHeight);
    var s = y - pre;
    var k = 1 - clamp(y / (pre + dist * 0.12));
    var f = easeIO(clamp((s - dist * 0.1) / (dist * 0.6)));
    tgt.rx = BASE.rx * k - ptr.y * 6;
    tgt.ry = BASE.ry * k + ptr.x * 6;
    tgt.flip = 180 * f;
    tgt.px = ptr.x;
    tgt.py = ptr.y;

    var vIn = clamp((y - pre * 0.5) / (pre * 0.5 + 1));
    var vOut = clamp((f - 0.06) / 0.24);
    var ov = vIn * (1 - vOut);
    var oh = clamp((f - 0.62) / 0.3);
    capV.style.opacity = ov.toFixed(3);
    capV.style.transform = 'translate3d(' + (-28 * (1 - ov)).toFixed(1) + 'px,-50%,0)';
    capH.style.opacity = oh.toFixed(3);
    capH.style.transform = 'translate3d(' + (28 * (1 - oh)).toFixed(1) + 'px,-50%,0)';

    buehne.classList.toggle('ruhig', y > pre * 0.85 || r.bottom < 0);
  }

  function frame() {
    running = false;
    desktopZiel(window.scrollY);
    var moving = false;
    ['rx', 'ry', 'flip', 'px', 'py'].forEach(function (k) {
      var d = tgt[k] - cur[k];
      if (Math.abs(d) > 0.02) { cur[k] += d * (k === 'flip' ? 0.2 : 0.1); moving = true; }
      else cur[k] = tgt[k];
    });
    setVars(cur);
    if (moving) kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  /* Handy und Tablet: Karte dreht sich, sobald sie die obere Bildhälfte erreicht (oder per Knopf) */
  function mobilSetzen(hinten) {
    gedreht = hinten;
    knopf.setAttribute('aria-pressed', String(hinten));
    setVars({ rx: BASE.rx, ry: BASE.ry, flip: hinten ? 180 : 0, px: cur.px, py: cur.py });
    buehne.classList.toggle('ruhig', hinten);
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
    /* Schimmer wandert leicht mit der Scrollposition */
    cur.py = clamp((mitte - vh / 2) / (vh / 2), -1, 1);
    karte.style.setProperty('--py', cur.py.toFixed(3));
    if (r.bottom < 0 || r.top > vh) buehne.classList.add('ruhig');
    else if (!gedreht) buehne.classList.remove('ruhig');
  }

  function karteReset() {
    capV.removeAttribute('style');
    capH.removeAttribute('style');
    zoneOben = null;
    cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
    ptr = { x: 0, y: 0 };
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
      document.documentElement.addEventListener('pointerleave', function () { ptr.x = 0; ptr.y = 0; kick(); });
    }

    var onMq = function () { karteReset(); scrollen(); };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', onMq); else mqDesk.addListener(onMq);
  }

  /* ---------- Scroll-Schleife ---------- */
  var tick = false;
  function scrollen() {
    var y = window.scrollY;
    kopfUpdate(y);
    woerterUpdate();
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
