/* Autodrive Fahrschule, Design B «Startkarte»: Kopf, Titel, Einblenden, Startkarte (3D), Weg, Stimmen, Aktionsleiste */
(function () {
  'use strict';
  window.autodriveB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var hasIO = 'IntersectionObserver' in window;
  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Kopf ---------- */
  var kopf = document.getElementById('kopf');
  function kopfUpdate(y) { kopf.classList.toggle('gescrollt', y > 40); }

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

  /* ---------- Titel: Zeile für Zeile ---------- */
  var h1 = document.querySelector('[data-zeilen]');
  if (fx && h1) {
    var woerter = h1.textContent.trim().split(/\s+/);
    h1.textContent = '';
    woerter.forEach(function (w, i) {
      var aussen = document.createElement('span');
      aussen.className = 'w';
      var innen = document.createElement('span');
      innen.className = 'wi';
      innen.textContent = w;
      aussen.appendChild(innen);
      h1.appendChild(aussen);
      if (i < woerter.length - 1) h1.appendChild(document.createTextNode(' '));
    });
    var starten = function () {
      if (h1.classList.contains('geteilt')) return;
      var top = null, z = -1;
      each(h1.querySelectorAll('.w'), function (s) {
        var t = s.offsetTop;
        if (top === null || t > top + 4) { z++; top = t; }
        s.firstChild.style.setProperty('--z', z);
      });
      h1.classList.add('geteilt');
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(starten);
    setTimeout(starten, 700);
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var zeigen = document.querySelectorAll('.rv, [data-zeigen]');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    each(zeigen, function (el) { io.observe(el); });
  } else {
    each(zeigen, function (el) { el.classList.add('ist-da'); });
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

  /* ---------- Die Startkarte ---------- */
  var duo = document.querySelector('.duo');
  var hero = document.getElementById('hero');
  var start = document.getElementById('startkarte');
  var karte = document.getElementById('karte3d');
  var knopf = document.querySelector('.drehen');
  var hinweis = document.querySelector('.karte-hinweis span');

  var BASE = { rx: 12, ry: -18 };
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
    karte.classList.toggle('ist-hinten', o.flip > 120);
  }

  /* Computer: Drehung an den Scrollweg gekoppelt, die Karte bleibt neben dem Text stehen */
  function desktopZiel() {
    var vh = window.innerHeight;
    var r = start.getBoundingClientRect();
    var f = clamp((vh * 0.92 - r.top) / (vh * 0.62));
    var k = 1 - 0.7 * f;
    tgt.rx = BASE.rx * k - ptr.y * 6;
    tgt.ry = BASE.ry * k + ptr.x * 6;
    tgt.flip = 180 * easeIO(f);
    tgt.px = ptr.x;
    tgt.py = ptr.y;
    if (hinweis) hinweis.style.opacity = (1 - clamp(f * 5)).toFixed(3);
    var h = hero.getBoundingClientRect();
    duo.classList.toggle('ruhig', f > 0.02 || h.bottom < 0);
  }

  function frame() {
    running = false;
    desktopZiel();
    var moving = false;
    ['rx', 'ry', 'flip', 'px', 'py'].forEach(function (k) {
      var d = tgt[k] - cur[k];
      if (Math.abs(d) > 0.02) { cur[k] += d * (k === 'flip' ? 0.18 : 0.1); moving = true; }
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
    duo.classList.toggle('ruhig', hinten);
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
    cur.py = clamp((mitte - vh / 2) / (vh / 2), -1, 1);
    karte.style.setProperty('--py', cur.py.toFixed(3));
    if (r.bottom < 0 || r.top > vh) duo.classList.add('ruhig');
    else if (!gedreht) duo.classList.remove('ruhig');
  }

  function karteReset() {
    zoneOben = null;
    gedreht = false;
    cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
    ptr = { x: 0, y: 0 };
    if (knopf) knopf.setAttribute('aria-pressed', 'false');
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

  /* ---------- Weg: Linie wächst mit dem Scrollen ---------- */
  var weg = document.querySelector('.weg-liste');
  var fill = document.querySelector('.weg-fill');
  var stationen = weg ? weg.querySelectorAll('.station') : [];
  function wegUpdate() {
    if (!fx || !weg) return;
    var r = weg.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.top > vh * 1.2 || r.bottom < -vh * 0.2) {
      if (r.top > vh) { fill.style.transform = 'scaleY(0)'; each(stationen, function (s) { s.classList.remove('an'); }); standSetzen(stationen[0]); }
      return;
    }
    var p = clamp((vh * 0.62 - r.top) / r.height);
    fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    var zuletzt = null;
    each(stationen, function (s) {
      var an = (s.offsetTop + 28) / r.height <= p + 0.001;
      s.classList.toggle('an', an);
      if (an) zuletzt = s;
    });
    standSetzen(zuletzt || stationen[0]);
  }
  var standNr = document.getElementById('weg-nr');
  var standName = document.getElementById('weg-name');
  var standBox = document.querySelector('.weg-stand');
  var standAkt = null, standTimer = 0;
  function standSetzen(s) {
    if (!standBox || !s || s === standAkt) return;
    standAkt = s;
    var nr = s.querySelector('.st-nr').textContent;
    var name = s.querySelector('h3').textContent;
    standBox.classList.add('wechsel');
    clearTimeout(standTimer);
    standTimer = setTimeout(function () {
      standNr.textContent = nr;
      standName.textContent = name;
      standBox.classList.remove('wechsel');
    }, 160);
  }

  /* ---------- Stimmen: Wischleiste mit Pfeilen und Fortschritt ---------- */
  var rail = document.querySelector('.rail');
  var lauf = document.querySelector('.rail-lauf span');
  var railBtns = document.querySelectorAll('[data-rail]');
  function railUpdate() {
    if (!rail) return;
    var max = rail.scrollWidth - rail.clientWidth;
    var anteil = rail.scrollWidth > 0 ? clamp(rail.clientWidth / rail.scrollWidth, 0.08, 1) : 1;
    var p = max > 0 ? rail.scrollLeft / max : 0;
    if (lauf) {
      lauf.style.setProperty('--tw', (anteil * 100).toFixed(2) + '%');
      lauf.style.setProperty('--tx', (p * (1 / anteil - 1) * 100).toFixed(2) + '%');
    }
    each(railBtns, function (b) {
      var dir = Number(b.getAttribute('data-rail'));
      b.disabled = max <= 2 || (dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max - 2);
    });
  }
  if (rail) {
    each(railBtns, function (b) {
      b.addEventListener('click', function () {
        var karteEl = rail.querySelector('.stimme');
        var schritt = karteEl ? karteEl.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
        rail.scrollBy({ left: Number(b.getAttribute('data-rail')) * schritt, behavior: fx ? 'smooth' : 'auto' });
      });
    });
    rail.addEventListener('scroll', function () { requestAnimationFrame(railUpdate); }, { passive: true });
  }

  /* ---------- Scroll-Schleife ---------- */
  var tick = false;
  function scrollen() {
    kopfUpdate(window.scrollY);
    wegUpdate();
    if (fx && karte) {
      if (mqDesk.matches) kick(); else mobilUpdate();
    }
  }
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; scrollen(); });
  }, { passive: true });
  window.addEventListener('resize', function () { scrollen(); railUpdate(); }, { passive: true });
  scrollen();
  railUpdate();
})();
