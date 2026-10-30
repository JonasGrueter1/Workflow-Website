/* Fahrschule KuDu, Design B «Schlaufe» */
(function () {
  'use strict';
  window.kuduBBereit = true;

  var doc = document.documentElement;
  var reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- Menü (Handy) ---------- */
  var burger = document.querySelector('.burger');
  var menue = document.getElementById('menue');
  function menueSetzen(offen) {
    menue.classList.toggle('offen', offen);
    burger.setAttribute('aria-expanded', offen ? 'true' : 'false');
    burger.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    doc.classList.toggle('menue-offen', offen);
    if (offen) {
      var erster = menue.querySelector('a');
      if (erster) setTimeout(function () { erster.focus(); }, 60);
    }
  }
  if (burger && menue) {
    burger.addEventListener('click', function () { menueSetzen(!menue.classList.contains('offen')); });
    menue.addEventListener('click', function (e) { if (e.target.closest('a') && !desktop.matches) menueSetzen(false); });
    document.addEventListener('keydown', function (e) {
      if (!menue.classList.contains('offen')) return;
      if (e.key === 'Escape') { menueSetzen(false); burger.focus(); return; }
      if (e.key === 'Tab') {
        var fokus = [burger].concat([].slice.call(menue.querySelectorAll('a, button')));
        var i = fokus.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); fokus[fokus.length - 1].focus(); }
        else if (!e.shiftKey && i === fokus.length - 1) { e.preventDefault(); fokus[0].focus(); }
      }
    });
    var mqWechsel = function () { if (desktop.matches) menueSetzen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', mqWechsel); else desktop.addListener(mqWechsel);
  }

  /* ---------- Kopf und Aktionsleiste ---------- */
  var kopf = document.querySelector('.kopf');
  var aktion = document.querySelector('.aktion');
  function kopfPruefen() {
    var y = window.scrollY || window.pageYOffset;
    kopf.classList.toggle('gescrollt', y > 8);
    if (aktion) aktion.classList.toggle('sichtbar', y > window.innerHeight * 0.45);
  }

  /* ---------- Motto Wort für Wort ---------- */
  var motto = document.querySelector('[data-woerter]');
  if (motto && !reduziert) {
    var satz = motto.textContent.trim();
    var woerter = satz.split(/\s+/);
    var nurSr = document.createElement('span');
    nurSr.className = 'sr';
    nurSr.textContent = satz;
    motto.textContent = '';
    motto.appendChild(nurSr);
    woerter.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'wort';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--w', i);
      s.textContent = w;
      motto.appendChild(s);
      if (i < woerter.length - 1) motto.appendChild(document.createTextNode(' '));
    });
  }

  /* ---------- Zähler ---------- */
  function zaehlen(el) {
    var ziel = parseInt(el.getAttribute('data-zaehlen'), 10);
    if (reduziert || !ziel) { el.textContent = ziel; return; }
    var start = null, dauer = 1100;
    el.textContent = '0';
    function schritt(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / dauer);
      el.textContent = Math.round(ziel * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }

  /* ---------- Einblenden ---------- */
  var zeigen = [].slice.call(document.querySelectorAll('[data-reveal]'));
  var mottoSek = document.querySelector('.motto');
  if (mottoSek) zeigen.push(mottoSek);
  function sichtbar(el) {
    el.classList.add('ist-da');
    var z = el.querySelector('[data-zaehlen]');
    if (z) zaehlen(z);
  }
  var offen = zeigen.slice();
  var io = null;
  if ('IntersectionObserver' in window && !reduziert) {
    io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeigeJetzt(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    zeigen.forEach(function (el) { io.observe(el); });
  } else {
    zeigen.forEach(sichtbar);
    offen = [];
  }
  function zeigeJetzt(el) {
    var i = offen.indexOf(el);
    if (i < 0) return;
    offen.splice(i, 1);
    if (io) io.unobserve(el);
    sichtbar(el);
  }
  /* Sicherheitsnetz bei schnellem Scrollen: alles, was schon über dem unteren Rand liegt, zeigen */
  function nachzuegler() {
    if (!offen.length) return;
    var h = window.innerHeight;
    offen.slice().forEach(function (el) {
      if (el.getBoundingClientRect().top < h * 0.92) zeigeJetzt(el);
    });
  }

  /* Anker weich anfahren */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (a.classList.contains('skip')) { ziel.setAttribute('tabindex', '-1'); ziel.focus({ preventScroll: true }); }
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Die Schlaufenlinie ---------- */
  function f(n) { return Math.round(n * 10) / 10; }

  function Spur(wurzel, svg, modus, optionen) {
    this.wurzel = wurzel;
    this.svg = svg;
    this.weg = svg.querySelector('.spur-weg');
    this.tinte = svg.querySelector('.spur-tinte');
    this.modus = modus;
    this.opt = optionen || {};
    this.aktuell = 0;
    this.ziel = 0;
    this.len = 0;
    this.aktiv = false;
  }

  Spur.prototype.knotenListe = function () {
    var m = this.modus;
    return [].slice.call(this.wurzel.querySelectorAll('[data-knot]')).filter(function (k) {
      return k.getAttribute('data-knot').indexOf(m) > -1;
    });
  };

  /* Schlaufen nach unten (verlängerte Zykloide), side 1 = Bauch nach rechts */
  Spur.prototype.schlaufen = function (p, anzahl, r, d, side) {
    var teile = 64 * anzahl, s = '', x = p.x, y = p.y;
    for (var i = 1; i <= teile; i++) {
      var t = Math.PI + 2 * Math.PI * anzahl * i / teile;
      var laengs = r * (t - Math.PI) - d * Math.sin(t);
      var quer = d * (1 + Math.cos(t)) * side;
      x = p.x + quer; y = p.y + laengs;
      s += ' L' + f(x) + ' ' + f(y);
    }
    return { d: s, ende: { x: p.x, y: p.y + 2 * Math.PI * r * anzahl } };
  };

  Spur.prototype.bauen = function () {
    var knoten = this.knotenListe();
    var rb = this.wurzel.getBoundingClientRect();
    if (!rb.height || knoten.length < 2) { this.aus(); return; }
    var W = this.wurzel.offsetWidth, H = this.wurzel.offsetHeight;
    this.svg.setAttribute('width', W);
    this.svg.setAttribute('height', H);
    this.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    this.oben = rb.top + (window.scrollY || window.pageYOffset);

    var handy = !desktop.matches;
    var wurzel = this.wurzel;
    /* Position ohne CSS-Transformationen (Einblend-Animationen verschieben sonst die Punkte) */
    var pts = knoten.map(function (k) {
      var x = k.offsetWidth / 2, y = k.offsetHeight / 2, el = k;
      while (el && el !== wurzel) {
        x += el.offsetLeft; y += el.offsetTop;
        var op = el.offsetParent;
        if (op && op !== wurzel && !wurzel.contains(op)) { op = null; }
        if (op && op !== wurzel) { x += op.clientLeft; y += op.clientTop; }
        el = op;
      }
      return { x: x, y: y, el: k };
    });
    var d = 'M' + f(pts[0].x) + ' ' + f(pts[0].y);
    var cur = { x: pts[0].x, y: pts[0].y };
    var self = this;
    pts.forEach(function (p, i) {
      if (i > 0) {
        if (Math.abs(p.x - cur.x) < 0.75) {
          d += ' L' + f(cur.x) + ' ' + f(p.y);
        } else {
          var dy = Math.max(24, p.y - cur.y);
          var k = dy * 0.62;
          d += ' C' + f(cur.x) + ' ' + f(cur.y + k) + ' ' + f(p.x) + ' ' + f(p.y - k) + ' ' + f(p.x) + ' ' + f(p.y);
        }
        cur = { x: p.x, y: p.y };
      }
      var n = parseInt(p.el.getAttribute('data-loops') || '0', 10);
      if (n) {
        var a = function (name, std) {
          var v = handy && p.el.getAttribute('data-' + name + '-m');
          return parseFloat(v || p.el.getAttribute('data-' + name) || std);
        };
        var res = self.schlaufen(cur, n, a('r', 8), a('d', 22), a('side', 1));
        d += res.d;
        cur = res.ende;
      }
    });
    this.weg.setAttribute('d', d);
    this.tinte.setAttribute('d', d);
    this.len = this.tinte.getTotalLength();
    this.tinte.style.strokeDasharray = f(this.len) + ' ' + f(this.len + 10);

    /* Hüllkurve: welche Länge ist erreicht, wenn der Stift auf Höhe y ist */
    var n = Math.max(20, Math.ceil(this.len / 6));
    this.lens = []; this.ys = []; this.px = []; this.py = [];
    var maxY = -1e9;
    for (var j = 0; j <= n; j++) {
      var L = this.len * j / n;
      var pt = this.tinte.getPointAtLength(L);
      if (pt.y > maxY) maxY = pt.y;
      this.lens.push(L); this.ys.push(maxY); this.px.push(pt.x); this.py.push(pt.y);
    }
    /* Länge bis zu jedem sichtbaren Knoten */
    this.marken = [];
    var ab = 0;
    for (var q = 0; q < pts.length; q++) {
      var best = -1, bestD = 1e9;
      for (var s2 = ab; s2 < this.lens.length; s2++) {
        var dx = this.px[s2] - pts[q].x, dyy = this.py[s2] - pts[q].y;
        var dist = dx * dx + dyy * dyy;
        if (dist < bestD) { bestD = dist; best = s2; }
        if (bestD < 16 && dist > 400) break;
      }
      if (best < 0) best = ab;
      ab = best;
      pts[q].len = this.lens[best];
      if (pts[q].el.classList.contains('knoten')) this.marken.push({ el: pts[q].el, len: this.lens[best] });
      if (this.opt.introKnoten && pts[q].el.classList.contains(this.opt.introKnoten)) this.introLen = this.lens[best];
    }
    this.aktiv = true;
    this.svg.parentNode && this.wurzel.classList.add('spur-bereit');
    if (reduziert) { this.aktuell = this.len; this.malen(this.len); return; }
    this.ziel = this.zielBerechnen();
    if (this.introFertig !== false) this.aktuell = this.ziel;
    this.malen(this.aktuell);
  };

  Spur.prototype.aus = function () {
    this.aktiv = false;
    this.weg.removeAttribute('d');
    this.tinte.removeAttribute('d');
    this.wurzel.classList.remove('spur-bereit');
    (this.marken || []).forEach(function (m) { m.el.classList.remove('erreicht'); });
  };

  Spur.prototype.zielBerechnen = function () {
    var y = (window.scrollY || window.pageYOffset) + window.innerHeight * 0.62 - this.oben;
    var ys = this.ys, lo = 0, hi = ys.length - 1;
    if (y < ys[0]) return 0;
    if (y >= ys[hi]) return this.len;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (ys[mid] <= y) lo = mid; else hi = mid - 1;
    }
    var L = this.lens[lo];
    if (this.introLen && this.introFertig) L = Math.max(L, this.introLen);
    return L;
  };

  Spur.prototype.malen = function (laenge) {
    this.tinte.style.strokeDashoffset = f(Math.max(0, this.len - laenge));
    for (var i = 0; i < this.marken.length; i++) {
      var m = this.marken[i];
      var an = laenge >= m.len - 2;
      if (an !== m.an) { m.el.classList.toggle('erreicht', an); m.an = an; }
    }
  };

  /* Seite (Desktop) und Weg (Handy) */
  var seite = document.querySelector('.seite');
  var seitenSpur = seite && new Spur(seite, seite.querySelector('.spur-ebene'), 'd', { introKnoten: 'knoten-held-ende' });
  var wegListe = document.querySelector('.weg-liste');
  var wegSpur = wegListe && new Spur(wegListe, wegListe.querySelector('.weg-spur'), 'm');

  if (seitenSpur && !reduziert) seitenSpur.introFertig = false;

  function spurenBauen() {
    try {
      if (desktop.matches) {
        if (wegSpur) { wegSpur.aus(); wegSpur.svg.style.display = 'none'; }
        if (seitenSpur) { seitenSpur.svg.style.display = 'block'; seitenSpur.bauen(); }
        doc.classList.toggle('spur-an', !!(seitenSpur && seitenSpur.aktiv));
        doc.classList.remove('spur-m-an');
      } else {
        if (seitenSpur) { seitenSpur.aus(); seitenSpur.svg.style.display = 'none'; }
        if (wegSpur) { wegSpur.svg.style.display = 'block'; wegSpur.bauen(); }
        doc.classList.toggle('spur-m-an', !!(wegSpur && wegSpur.aktiv));
        doc.classList.remove('spur-an');
      }
    } catch (err) {
      /* Fallback: gestrichelte Linie aus dem CSS bleibt sichtbar */
      doc.classList.remove('spur-an', 'spur-m-an');
    }
    anstossen();
  }

  /* Intro: Linie im Hero zeichnet sich beim Laden */
  var introStart = null, introDauer = 1700, introVerzoegerung = 900, ladeZeit = performance.now();
  function introFortschritt(t) {
    var p = (t - ladeZeit - introVerzoegerung) / introDauer;
    p = Math.max(0, Math.min(1, p));
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  var laeuft = false;
  function schleife(t) {
    laeuft = false;
    var weiter = false;
    [seitenSpur, wegSpur].forEach(function (s) {
      if (!s || !s.aktiv || reduziert) return;
      if (s.introFertig === false) {
        var p = introFortschritt(t);
        var il = (s.introLen || 0) * p;
        s.aktuell = il;
        s.malen(il);
        if (p >= 1) { s.introFertig = true; }
        weiter = true;
        return;
      }
      s.ziel = s.zielBerechnen();
      var diff = s.ziel - s.aktuell;
      if (Math.abs(diff) > 0.6) {
        s.aktuell += diff * 0.16;
        weiter = true;
      } else {
        s.aktuell = s.ziel;
      }
      s.malen(s.aktuell);
    });
    if (weiter) anstossen();
  }
  function anstossen() {
    if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); }
  }

  var bauTimer;
  function spaeterBauen() { clearTimeout(bauTimer); bauTimer = setTimeout(spurenBauen, 140); }

  var nachTimer;
  window.addEventListener('scroll', function () {
    kopfPruefen(); anstossen();
    clearTimeout(nachTimer); nachTimer = setTimeout(nachzuegler, 90);
  }, { passive: true });
  window.addEventListener('resize', spaeterBauen);
  window.addEventListener('load', spurenBauen);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(spurenBauen);
  if ('ResizeObserver' in window && seite) {
    var letzteHoehe = 0;
    new ResizeObserver(function () {
      var h = seite.offsetHeight;
      if (Math.abs(h - letzteHoehe) > 2) { letzteHoehe = h; spaeterBauen(); }
    }).observe(seite);
  }
  var mqBauen = function () { spurenBauen(); };
  if (desktop.addEventListener) desktop.addEventListener('change', mqBauen); else desktop.addListener(mqBauen);

  kopfPruefen();
  spurenBauen();
})();
