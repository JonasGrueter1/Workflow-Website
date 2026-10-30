/* Fahrschule KuDu, Design B «Schlaufe» */
(function () {
  'use strict';
  window.kuduB = true;

  var d = document.documentElement;
  var fx = d.classList.contains('fx');
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function q(s, c) { return (c || document).querySelector(s); }
  function qa(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Rand beim Scrollen ---------- */
  var kopf = q('.kopf');
  function kopfRand() { kopf.classList.toggle('gescrollt', window.scrollY > 8); }
  kopfRand();
  window.addEventListener('scroll', kopfRand, { passive: true });

  /* ---------- Menü auf kleinen Bildschirmen ---------- */
  var menue = q('#menue'), knopf = q('.menue-knopf'), zu = q('.menue-zu');
  var zuTimer;
  function fokusierbar() { return qa('a[href], button:not([disabled])', menue).filter(function (el) { return el.offsetParent !== null; }); }
  function oeffnen() {
    clearTimeout(zuTimer);
    menue.hidden = false;
    document.body.classList.add('menue-offen');
    knopf.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { requestAnimationFrame(function () { menue.classList.add('offen'); }); });
    var f = fokusierbar(); if (f[1]) f[1].focus();
    document.addEventListener('keydown', taste);
  }
  function schliessen(ohneFokus) {
    menue.classList.remove('offen');
    document.body.classList.remove('menue-offen');
    knopf.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', taste);
    zuTimer = setTimeout(function () { menue.hidden = true; }, fx ? 260 : 0);
    if (!ohneFokus) knopf.focus();
  }
  function taste(e) {
    if (e.key === 'Escape') { e.preventDefault(); schliessen(); return; }
    if (e.key !== 'Tab') return;
    var f = fokusierbar(); if (!f.length) return;
    var erst = f[0], letzt = f[f.length - 1];
    if (e.shiftKey && document.activeElement === erst) { e.preventDefault(); letzt.focus(); }
    else if (!e.shiftKey && document.activeElement === letzt) { e.preventDefault(); erst.focus(); }
  }
  knopf.addEventListener('click', oeffnen);
  zu.addEventListener('click', function () { schliessen(); });
  qa('.menue-liste a', menue).forEach(function (a) {
    a.addEventListener('click', function () { schliessen(true); });
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches && !menue.hidden) schliessen(true); });

  /* ---------- Sanft zu Ankern scrollen (nur bei Klick, nicht per CSS) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || e.defaultPrevented) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    try { history.pushState(null, '', '#' + id); } catch (err) {}
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
  });

  /* ---------- Aktionsleiste: erst nach den Hero-Knöpfen zeigen ---------- */
  var aktion = q('#aktion'), heroKnoepfe = q('.hero-knoepfe');
  if (aktion && heroKnoepfe && hasIO) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var vorbei = !en.isIntersecting && en.boundingClientRect.top < 0;
        aktion.classList.toggle('sichtbar', vorbei);
      });
    }).observe(heroKnoepfe);
  } else if (aktion) {
    aktion.classList.add('sichtbar');
  }

  /* ---------- Motto Wort für Wort ---------- */
  var motto = q('[data-woerter]');
  if (motto && fx) {
    var woerter = motto.textContent.trim().split(/\s+/);
    motto.textContent = '';
    woerter.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'wort'; s.style.setProperty('--i', i); s.textContent = w;
      motto.appendChild(s);
      if (i < woerter.length - 1) motto.appendChild(document.createTextNode(' '));
    });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveal = qa('[data-reveal]');
  var zeichnen = qa('.stueck-ziel');
  if (motto) reveal.push(motto);
  if (fx && hasIO) {
    reveal.forEach(function (el) {
      if (!el.hasAttribute('data-reveal')) return;
      var geschw = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
      var i = geschw.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-sichtbar'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.concat(zeichnen).forEach(function (el) { io.observe(el); });
  } else {
    reveal.concat(zeichnen).forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* ---------- Die Schlaufenlinie (ab 1024 px) ---------- */
  var main = q('#inhalt');
  var ebene = q('.linie', main);
  var svg = q('.linie-svg', ebene);
  var spur = q('.linie-spur', svg), strich = q('.linie-strich', svg);
  var mq = window.matchMedia('(min-width: 1024px)');
  var L = { x: -1, y: 0 }, D = { x: 0, y: 1 };
  var st = null, raf = 0, intro = (fx && !reduce) ? 0 : 1, introLaeuft = false;

  function r1(n) { return Math.round(n * 10) / 10; }
  function rel(el) {
    var x = 0, y = 0, e = el;
    while (e && e !== main) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function mitte(el) { var r = rel(el); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

  /* Schlaufe als Zykloide: Eintritt und Austritt laufen in Fahrtrichtung, die Schlaufe schwingt zu einer Seite */
  function schlaufe(P, dir, n, b, a, seite) {
    var nx = -dir.y * seite, ny = dir.x * seite;
    var schritte = 12 * n, T0 = -Math.PI / 2, h = (2 * Math.PI * n) / schritte, out = '';
    function pt(t) { var u = a * (t - T0) + b * Math.cos(t), v = -b * Math.sin(t) - b; return [P.x + dir.x * u + nx * v, P.y + dir.y * u + ny * v]; }
    function dv(t) { var du = a - b * Math.sin(t), dd = -b * Math.cos(t); return [dir.x * du + nx * dd, dir.y * du + ny * dd]; }
    for (var i = 0; i < schritte; i++) {
      var t0 = T0 + i * h, t1 = t0 + h, p0 = pt(t0), p1 = pt(t1), d0 = dv(t0), d1 = dv(t1);
      out += 'C' + r1(p0[0] + d0[0] * h / 3) + ' ' + r1(p0[1] + d0[1] * h / 3) + ' ' + r1(p1[0] - d1[0] * h / 3) + ' ' + r1(p1[1] - d1[1] * h / 3) + ' ' + r1(p1[0]) + ' ' + r1(p1[1]);
    }
    var e = pt(T0 + 2 * Math.PI * n);
    return { d: out, end: { x: e[0], y: e[1] } };
  }
  function bogen(p0, t0, p1, t1) {
    var dx = p1.x - p0.x, dy = p1.y - p0.y;
    var k0 = Math.max(16, Math.abs(dx * t0.x + dy * t0.y) * 0.55);
    var k1 = Math.max(16, Math.abs(dx * t1.x + dy * t1.y) * 0.55);
    return 'C' + r1(p0.x + t0.x * k0) + ' ' + r1(p0.y + t0.y * k0) + ' ' + r1(p1.x - t1.x * k1) + ' ' + r1(p1.y - t1.y * k1) + ' ' + r1(p1.x) + ' ' + r1(p1.y);
  }

  function knoten() {
    var foto = q('.hero-foto'), text = q('.hero-text'), hinweis = q('.hero-hinweis');
    var punkte = qa('.spur-punkt', main);
    if (!foto || !text || !hinweis || !punkte.length) return null;
    var ph = rel(foto), tx = rel(text), hi = rel(hinweis);
    var laneX = mitte(punkte[0]).x;
    /* Hero: die Linie kommt hinter dem Foto hervor, legt eine Schlaufe um die Ecke, läuft unter den Knöpfen nach links */
    var eb = 34, ea = 8;
    var yA = Math.max(ph.y + ph.h - eb, hi.y + hi.h + 60);
    var n = [];
    n.push({ x: ph.x + 110, y: yA, t: L, intro: true });
    n.push({ x: ph.x + Math.PI * ea, y: yA, t: L, intro: true, loop: [1, eb, ea, 1] });
    n.push({ x: laneX, y: yA + 150, t: D, intro: true, introEnde: true });
    qa('.spur-punkt, .station-punkt, .schlaufe-marke', main).forEach(function (el) {
      var c = mitte(el);
      if (el.classList.contains('spur-punkt')) {
        if (el.classList.contains('spur-ziel')) {
          var sek = rel(el.closest('.sek'));
          n.push({ x: laneX, y: sek.y + 26, t: D, loop: [1, 26, 6, 1] });
        }
        n.push({ x: laneX, y: c.y, t: D, el: el });
        var wk = el.closest('.weg-kopf');
        if (wk) { var k = rel(wk); n.push({ x: laneX, y: k.y + k.h + 6, t: D }); }
      } else if (el.classList.contains('station-punkt')) {
        n.push({ x: c.x, y: c.y, t: D, el: el });
      } else {
        n.push({ x: c.x, y: c.y, t: D, loop: [2, 26, 7, 1] });
      }
    });
    return n;
  }

  function bauen() {
    if (!mq.matches || !ebene) { abbauen(); return; }
    d.classList.add('linie-an');
    var n = knoten();
    if (!n) { abbauen(); return; }
    var w = main.offsetWidth, h = main.offsetHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    var pfad = 'M' + r1(n[0].x) + ' ' + r1(n[0].y), cur = n[0], curT = n[0].t;
    var praefix = [], introPfad = '';
    for (var i = 0; i < n.length; i++) {
      var k = n[i];
      if (i > 0) pfad += bogen(cur, curT, k, k.t);
      cur = k; curT = k.t;
      if (k.el) praefix.push({ el: k.el, d: pfad });
      if (k.loop) { var s = schlaufe(k, k.t, k.loop[0], k.loop[1], k.loop[2], k.loop[3]); pfad += s.d; cur = s.end; }
      if (k.introEnde) introPfad = pfad;
    }
    /* Längen messen */
    strich.setAttribute('d', introPfad);
    var introLen = strich.getTotalLength();
    var punkte = praefix.map(function (p) { strich.setAttribute('d', p.d); return { el: p.el, len: strich.getTotalLength() }; });
    strich.setAttribute('d', pfad);
    spur.setAttribute('d', pfad);
    var total = strich.getTotalLength();
    /* Tabelle: welche Länge erreicht welche Höhe */
    var anz = Math.ceil(total / 8), ls = new Float32Array(anz + 1), ys = new Float32Array(anz + 1), max = -Infinity;
    for (var j = 0; j <= anz; j++) {
      var l = total * j / anz, p = strich.getPointAtLength(l);
      max = Math.max(max, p.y); ls[j] = l; ys[j] = max;
    }
    strich.style.strokeDasharray = total + ' ' + total;
    st = { total: total, introLen: introLen, punkte: punkte, ls: ls, ys: ys, top: main.getBoundingClientRect().top + window.scrollY };
    if (intro < 1 && !introLaeuft) introStarten();
    planen();
  }
  function abbauen() {
    d.classList.remove('linie-an');
    st = null;
    qa('.ist-da', main).forEach(function (el) { el.classList.remove('ist-da'); });
  }
  function laengeBeiHoehe(y) {
    var ys = st.ys, ls = st.ls, lo = 0, hi = ys.length - 1;
    if (y < ys[0]) return 0;
    if (y >= ys[hi]) return st.total;
    while (lo < hi) { var m = (lo + hi) >> 1; if (ys[m] >= y) hi = m; else lo = m + 1; }
    if (lo === 0) return 0;
    var y0 = ys[lo - 1], y1 = ys[lo];
    return ls[lo - 1] + (y1 > y0 ? (y - y0) / (y1 - y0) : 1) * (ls[lo] - ls[lo - 1]);
  }
  function zeichnenJetzt() {
    raf = 0;
    if (!st) return;
    var len;
    if (!fx || reduce) len = st.total;
    else {
      var stift = window.scrollY + window.innerHeight * 0.64 - st.top;
      len = Math.max(laengeBeiHoehe(stift), st.introLen * intro);
    }
    strich.style.strokeDashoffset = st.total - len;
    for (var i = 0; i < st.punkte.length; i++) {
      var p = st.punkte[i];
      p.el.classList.toggle('ist-da', len >= p.len - 2);
    }
  }
  function planen() { if (!raf) raf = requestAnimationFrame(zeichnenJetzt); }
  function introStarten() {
    introLaeuft = true;
    var start = null, dauer = 1700, verz = 950;
    function schritt(t) {
      if (start === null) start = t;
      var x = Math.min(1, Math.max(0, (t - start - verz) / dauer));
      intro = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      planen();
      if (x < 1) requestAnimationFrame(schritt); else { intro = 1; introLaeuft = false; }
    }
    requestAnimationFrame(schritt);
  }

  var bauTimer;
  function spaeterBauen() { clearTimeout(bauTimer); bauTimer = setTimeout(bauen, 120); }
  if (ebene) {
    bauen();
    window.addEventListener('scroll', function () { if (st) planen(); }, { passive: true });
    window.addEventListener('resize', spaeterBauen);
    window.addEventListener('load', spaeterBauen);
    mq.addEventListener('change', bauen);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(spaeterBauen);
    if ('ResizeObserver' in window) {
      var letzteH = 0;
      new ResizeObserver(function () {
        var hh = main.offsetHeight;
        if (Math.abs(hh - letzteH) > 2) { letzteH = hh; spaeterBauen(); }
      }).observe(main);
    }
  }
})();
