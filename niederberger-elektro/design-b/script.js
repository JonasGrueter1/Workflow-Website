/* Niederberger Elektro AG, Design B «Licht an»: Kopf, Menü, Licht an, Kabel, Einblenden, Bürozeiten, Aktionsleiste */
(function () {
  'use strict';
  window.niederbergerB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Kopf: Linie beim Scrollen ---------- */
  var kopf = $('#kopf');
  var gescrollt = false;
  function kopfZustand() {
    var g = window.scrollY > 8;
    if (g !== gescrollt) { gescrollt = g; kopf.classList.toggle('gescrollt', g); }
  }
  window.addEventListener('scroll', kopfZustand, { passive: true });
  kopfZustand();

  /* ---------- Anker-Links: sanft scrollen (nur mit Animation) ---------- */
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

  /* ---------- Handy-Menü ---------- */
  var knopf = $('.menue-knopf');
  var mq = window.matchMedia('(max-width: 760px)');
  function menue(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    document.body.style.overflow = auf ? 'hidden' : '';
  }
  if (knopf) {
    knopf.addEventListener('click', function () { menue(knopf.getAttribute('aria-expanded') !== 'true'); });
    $$('#menue a').forEach(function (a) {
      a.addEventListener('click', function () { if (!a.hasAttribute('data-soon')) menue(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); knopf.focus(); }
    });
    var mqWechsel = function () { if (!mq.matches) menue(false); };
    if (mq.addEventListener) mq.addEventListener('change', mqWechsel); else if (mq.addListener) mq.addListener(mqWechsel);
  }

  /* ---------- Hero: Licht an, eine Lampe nach der anderen ---------- */
  var hero = $('.hero');
  function lichtAn() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('an'); }); });
  }
  if (hero) {
    if (!fx) {
      hero.classList.add('an');
    } else {
      /* Warten, bis die Fotos da sind (höchstens 900 ms), damit das Licht auf ein Bild fällt */
      var bilder = $$('.lampe img', hero);
      var fertig = false;
      var los = function () { if (!fertig) { fertig = true; lichtAn(); } };
      var warten = bilder.map(function (img) {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise(function (ok) { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ok, { once: true }); });
      });
      if (window.Promise && Promise.all) Promise.all(warten).then(los);
      setTimeout(los, 900);
    }
  }

  /* ---------- Kabel: vom Stecker-E zu den drei Bereichen ---------- */
  var kwrap = $('#kabelwrap');
  var svg = $('#kabel');
  var stecker = $('#stecker');
  var feld = $('#kabelfeld');
  var karten = feld ? $$('.bereich', feld) : [];
  var NS = 'http://www.w3.org/2000/svg';

  function offset(el, bis) {
    var x = 0, y = 0, e = el;
    while (e && e !== bis) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function rund(p, r) {
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 1; i < p.length - 1; i++) {
      var a = p[i - 1], b = p[i], c = p[i + 1];
      var d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var rr = Math.min(r, d1 / 2, d2 / 2);
      var ax = b[0] + (a[0] - b[0]) / d1 * rr, ay = b[1] + (a[1] - b[1]) / d1 * rr;
      var bx = b[0] + (c[0] - b[0]) / d2 * rr, by = b[1] + (c[1] - b[1]) / d2 * rr;
      d += ' L' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
    }
    var z = p[p.length - 1];
    return d + ' L' + z[0].toFixed(1) + ' ' + z[1].toFixed(1);
  }
  function pfad(d, cls, extra) {
    var el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d);
    el.setAttribute('class', cls);
    el.setAttribute('pathLength', '1');
    if (extra) el.setAttribute('transform', extra);
    return el;
  }
  function baueKabel() {
    if (!kwrap || !svg || !stecker || karten.length !== 3) return;
    var W = kwrap.clientWidth, H = kwrap.clientHeight;
    var e = offset(stecker, kwrap);
    var k = karten.map(function (el) { return offset(el, kwrap); });
    var xm = e.l + e.w * 28 / 59;
    var eUnten = e.t + e.w * 56 / 59 - 1;
    var nebeneinander = Math.abs(k[1].t - k[0].t) < 4;
    var mantel, adern = [];
    if (nebeneinander) {
      var oben = k[0].t;
      var yJ = oben - 94;
      var ys = [yJ + 50, yJ + 37, yJ + 24]; /* Karte 1 unten, Karte 3 oben: keine Kreuzung */
      var xs = [xm - 5, xm, xm + 5];
      mantel = [[xm, eUnten], [xm, yJ]];
      for (var i = 0; i < 3; i++) {
        var cx = k[i].l + k[i].w / 2;
        adern.push([[xs[i], yJ - 2], [xs[i], ys[i]], [cx, ys[i]], [cx, oben]]);
      }
    } else {
      var yJ2 = k[0].t - 8;
      var xs2 = [xm + 5, xm, xm - 5]; /* Karte 1 zweigt zuerst ab, darum ganz rechts */
      mantel = [[xm, eUnten], [xm, yJ2]];
      for (var j = 0; j < 3; j++) {
        var cy = k[j].t + 39;
        adern.push([[xs2[j], yJ2 - 2], [xs2[j], cy], [k[j].l, cy]]);
      }
    }
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var md = rund(mantel, 16);
    svg.appendChild(pfad(md, 'mantel-schatten', 'translate(0 2)'));
    adern.forEach(function (a) { svg.appendChild(pfad(rund(a, nebeneinander ? 14 : 11), 'ader-schatten', 'translate(0 1.5)')); });
    adern.forEach(function (a) { svg.appendChild(pfad(rund(a, nebeneinander ? 14 : 11), 'ader')); });
    svg.appendChild(pfad(md, 'mantel'));
    svg.appendChild(pfad(md, 'mantel-glanz', 'translate(-1.6 0)'));
    /* Muffe: hier teilt sich das Kabel in drei Adern */
    var mw = nebeneinander ? 20 : 16, mh = nebeneinander ? 12 : 10;
    var muffe = document.createElementNS(NS, 'rect');
    muffe.setAttribute('class', 'muffe');
    muffe.setAttribute('x', (xm - mw / 2).toFixed(1));
    muffe.setAttribute('y', (mantel[1][1] - mh + 2).toFixed(1));
    muffe.setAttribute('width', mw); muffe.setAttribute('height', mh); muffe.setAttribute('rx', 3);
    svg.appendChild(muffe);
  }
  var kabelTimer;
  function kabelNeu() { clearTimeout(kabelTimer); kabelTimer = setTimeout(baueKabel, 120); }
  baueKabel();
  window.addEventListener('resize', kabelNeu);
  window.addEventListener('load', baueKabel);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(baueKabel);
  if ('ResizeObserver' in window && kwrap) new ResizeObserver(kabelNeu).observe(kwrap);

  function kabelZeichnen() {
    kwrap.classList.add('an');
    svg.classList.add('an');
    var neben = karten.length === 3 && Math.abs(karten[1].offsetTop - karten[0].offsetTop) < 4;
    karten.forEach(function (karte, i) {
      if (neben) setTimeout(function () { karte.classList.add('an'); }, 420 + i * 130);
      setTimeout(function () { karte.classList.add('leuchtet'); }, 1500 + i * 90);
    });
  }
  if (kwrap && fx) {
    if (hasIO) {
      var kio = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        kio.disconnect();
        kabelZeichnen();
      }, { rootMargin: '0px 0px -18% 0px' });
      kio.observe(kwrap);
      /* Am Handy liegen die Karten untereinander: jede blendet ein, wenn sie sichtbar wird */
      var cio = new IntersectionObserver(function (en) {
        /* Nebeneinander (Desktop) blendet kabelZeichnen die Karten gestaffelt ein */
        if (Math.abs(karten[1].offsetTop - karten[0].offsetTop) < 4) return;
        en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('an'); cio.unobserve(x.target); } });
      }, { rootMargin: '0px 0px -10% 0px' });
      karten.forEach(function (k) { cio.observe(k); });
    } else {
      kabelZeichnen();
      karten.forEach(function (k) { k.classList.add('an'); });
    }
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = $$('.rv, .team-raster, .stationen');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        x.target.classList.add(x.target.classList.contains('rv') ? 'ist-da' : 'an');
        io.unobserve(x.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); el.classList.add('an'); });
  }

  /* ---------- Bürozeiten: jetzt offen oder geschlossen (Zeit in Emmen) ---------- */
  var status = $('#status');
  function bueroStatus() {
    if (!status || !window.Intl) return;
    try {
      var teile = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var w = {}; teile.forEach(function (t) { w[t.type] = t.value; });
      var tag = w.weekday, min = (parseInt(w.hour, 10) % 24) * 60 + parseInt(w.minute, 10);
      var werktag = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(tag) > -1;
      var text = status.querySelector('.status-text');
      if (werktag && min >= 435 && min < 720) {
        status.className = 'status offen'; text.textContent = 'Büro jetzt geöffnet, bis 12.00 Uhr';
      } else if (werktag && min >= 795 && min < 1020) {
        status.className = 'status offen'; text.textContent = 'Büro jetzt geöffnet, bis 17.00 Uhr';
      } else {
        status.className = 'status zu';
        text.innerHTML = 'Büro jetzt geschlossen. Im Notfall: <a href="tel:+41412896070">041 289 60 70</a>';
      }
      status.hidden = false;
    } catch (e) { /* ohne Status bleibt die Tabelle */ }
  }
  bueroStatus();
  setInterval(bueroStatus, 60000);

  /* ---------- Formular: in der Vorschau nicht absenden ---------- */
  var form = $('#formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- Aktionsleiste am Handy: erscheint nach dem Hero ---------- */
  var aktion = $('#aktion');
  var heroKnoepfe = $('#hero-knoepfe');
  if (aktion && heroKnoepfe && hasIO) {
    new IntersectionObserver(function (en) {
      var x = en[0];
      aktion.classList.toggle('zeigen', !x.isIntersecting && x.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
