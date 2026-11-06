/* Autodrive Fahrschule, Design B «Startkarte»: Kopf, Hero-Auftritt, Startkarte (3D), Weg, Tagesband, Stimmen, Aktionsleiste */
(function () {
  'use strict';
  window.autodriveB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ---------- Kopf ---------- */
  var kopf = document.getElementById('kopf');
  function kopfUpdate() { kopf.classList.toggle('gescrollt', window.scrollY > 40); }

  /* ---------- Anker-Links: sanft scrollen (nur bei Klick, nur mit Animation) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
  });

  /* ---------- Hero-Auftritt: Wörter der H1 Zeile für Zeile ---------- */
  var h1 = document.querySelector('.h1');
  function zeilenZaehlen() {
    var top = null, z = -1;
    h1.querySelectorAll('.w').forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 6) { z++; top = t; }
      w.style.setProperty('--z', z);
    });
  }
  function los() {
    if (root.classList.contains('los')) return;
    zeilenZaehlen();
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('los'); }); });
  }
  if (fx) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(los);
    setTimeout(los, 650);
  } else {
    root.classList.add('los');
  }

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
  if (hasIO && heroCta) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      aktion.classList.toggle('zeigen', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else {
    aktion.classList.add('zeigen');
  }

  /* ---------- Die Startkarte ---------- */
  var buehne = document.querySelector('.buehne');
  var karte = document.getElementById('karte3d');
  var start = document.getElementById('startkarte');
  var knopf = document.querySelector('.drehen');
  var hinweis = document.querySelector('.karte-hinweis');

  var BASE = { rx: 12, ry: -18 };
  var ENDE = { rx: 4, ry: -6 };
  var cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
  var tgt = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
  var ptr = { x: 0, y: 0 };
  var laeuft = false;
  var hinten = false;

  function hintenSetzen(h) {
    if (h === hinten) return;
    hinten = h;
    karte.classList.toggle('ist-hinten', h);
    if (knopf) knopf.setAttribute('aria-pressed', String(h));
  }
  function setVars(o) {
    karte.style.setProperty('--rx', o.rx.toFixed(3));
    karte.style.setProperty('--ry', o.ry.toFixed(3));
    karte.style.setProperty('--flip', o.flip.toFixed(3));
  }

  /* Desktop: Drehung an den Scrollfortschritt gekoppelt, Karte steht (sticky) daneben */
  function desktopZiel() {
    var vh = window.innerHeight;
    var r = start.getBoundingClientRect();
    var f = easeIO(clamp((vh * 0.78 - r.top) / (vh * 0.56)));
    tgt.flip = 180 * f;
    if (hinweis) hinweis.style.setProperty('--hinweis', clamp(1 - f * 4).toFixed(3));
    tgt.rx = BASE.rx + (ENDE.rx - BASE.rx) * f - ptr.y * 6;
    tgt.ry = BASE.ry + (ENDE.ry - BASE.ry) * f + ptr.x * 6;
  }
  function frame() {
    laeuft = false;
    desktopZiel();
    var bewegt = false;
    ['rx', 'ry', 'flip'].forEach(function (k) {
      var d = tgt[k] - cur[k];
      if (Math.abs(d) > 0.03) { cur[k] += d * (k === 'flip' ? 0.16 : 0.1); bewegt = true; }
      else cur[k] = tgt[k];
    });
    setVars(cur);
    if (cur.flip > 150) hintenSetzen(true);
    else if (cur.flip < 60) hintenSetzen(false);
    if (bewegt) kick();
  }
  function kick() { if (!laeuft) { laeuft = true; requestAnimationFrame(frame); } }

  /* Handy und Tablet: Karte dreht sich, wenn sie in die obere Bildhälfte kommt, oder per Knopf */
  var manuell = false;
  function mobilDrehen(h) {
    hintenSetzen(h);
    setVars({ rx: h ? ENDE.rx : BASE.rx, ry: h ? ENDE.ry : BASE.ry, flip: h ? 180 : 0 });
  }
  function mobilUpdate() {
    var r = karte.getBoundingClientRect();
    var vh = window.innerHeight;
    var mitte = r.top + r.height / 2;
    if (r.bottom < 0 || r.top > vh) { manuell = false; }
    if (manuell) return;
    if (!hinten && mitte < vh * 0.5 && r.bottom > 0) mobilDrehen(true);
    else if (hinten && mitte > vh * 0.8) mobilDrehen(false);
  }

  function modus() {
    cur = { rx: BASE.rx, ry: BASE.ry, flip: 0, px: 0, py: 0 };
    ptr = { x: 0, y: 0 };
    manuell = false;
    hintenSetzen(false);
    setVars(cur);
    if (mqDesk.matches) kick(); else mobilUpdate();
  }

  if (fx && karte) {
    knopf.addEventListener('click', function () { manuell = true; mobilDrehen(!hinten); });

    if (mqFine.matches) {
      window.addEventListener('pointermove', function (e) {
        if (!mqDesk.matches) return;
        var r = karte.getBoundingClientRect();
        ptr.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
        ptr.y = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
        kick();
      }, { passive: true });
    }
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', modus);
    else if (mqDesk.addListener) mqDesk.addListener(modus);

    /* Schweben nur, solange die Karte zu sehen ist */
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        buehne.classList.toggle('ruhig', !entries[0].isIntersecting);
      }).observe(document.querySelector('.karte-box'));
    }
  }

  /* ---------- Weg in 8 Schritten: Linie wächst mit dem Scrollen ---------- */
  var wegWrap = document.getElementById('weg-liste');
  var spur = wegWrap.querySelector('.weg-spur');
  var fill = wegWrap.querySelector('.weg-fill');
  var stationen = wegWrap.querySelectorAll('.station');
  function wegMessen() {
    var a = stationen[0].querySelector('.st-nr').getBoundingClientRect();
    var b = stationen[stationen.length - 1].querySelector('.st-nr').getBoundingClientRect();
    var w = wegWrap.getBoundingClientRect();
    spur.style.top = (a.top - w.top + a.height / 2) + 'px';
    spur.style.bottom = 'auto';
    spur.style.height = Math.max(0, b.top - a.top) + 'px';
    spur.style.left = (a.left - w.left + a.width / 2 - 1) + 'px';
  }
  function wegUpdate() {
    var r = spur.getBoundingClientRect();
    var linie = window.innerHeight * 0.62;
    if (r.top > window.innerHeight || r.bottom < -200) return;
    var p = clamp((linie - r.top) / Math.max(1, r.height));
    fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    stationen.forEach(function (st) {
      var n = st.querySelector('.st-nr').getBoundingClientRect();
      st.classList.toggle('erreicht', n.top + n.height / 2 <= linie + 2);
    });
  }

  /* ---------- Stimmen: Pfeile und Fortschritt ---------- */
  var leiste = document.getElementById('leiste');
  var balken = document.getElementById('leiste-balken');
  var navKnoepfe = document.querySelectorAll('.stimmen-nav .rund');
  function leisteUpdate() {
    var max = leiste.scrollWidth - leiste.clientWidth;
    var anteil = clamp(leiste.clientWidth / Math.max(1, leiste.scrollWidth), 0.08, 1);
    var p = max > 0 ? clamp(leiste.scrollLeft / max) : 0;
    balken.style.width = (anteil * 100).toFixed(2) + '%';
    balken.style.transform = 'translateX(' + (p * (1 / anteil - 1) * 100).toFixed(2) + '%)';
    if (navKnoepfe.length) {
      navKnoepfe[0].disabled = leiste.scrollLeft < 4;
      navKnoepfe[1].disabled = leiste.scrollLeft > max - 4;
    }
  }
  navKnoepfe.forEach(function (b) {
    b.addEventListener('click', function () {
      var karteEl = leiste.querySelector('.sk');
      var schritt = karteEl ? karteEl.getBoundingClientRect().width + 16 : 320;
      leiste.scrollBy({ left: Number(b.getAttribute('data-richtung')) * schritt, behavior: fx ? 'smooth' : 'auto' });
    });
  });
  var leisteTick = false;
  leiste.addEventListener('scroll', function () {
    if (leisteTick) return;
    leisteTick = true;
    requestAnimationFrame(function () { leisteTick = false; leisteUpdate(); });
  }, { passive: true });

  /* ---------- Scrollen und Grösse ---------- */
  var tick = false;
  function update() {
    tick = false;
    kopfUpdate();
    if (fx) {
      if (karte) { if (mqDesk.matches) kick(); else mobilUpdate(); }
      wegUpdate();
    }
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (fx) wegMessen();
    leisteUpdate();
    update();
  });

  if (fx) {
    wegMessen();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { wegMessen(); wegUpdate(); });
    window.addEventListener('load', function () { wegMessen(); update(); });
  }
  leisteUpdate();
  update();
})();
