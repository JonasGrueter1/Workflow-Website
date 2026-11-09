/* Fahrschule Kern, Design B «Die Linie» */
(function () {
  'use strict';
  window.kernB = true;

  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');
  var NS = 'http://www.w3.org/2000/svg';
  var desktop = window.matchMedia('(min-width: 900px)');

  function px(name) {
    return parseFloat(getComputedStyle(doc).getPropertyValue(name)) || 0;
  }
  function setPath(svg, d) {
    var paths = svg.querySelectorAll('path');
    for (var i = 0; i < paths.length; i++) paths[i].setAttribute('d', d);
  }
  function setLength(svg) {
    var p = svg.querySelector('.s-rand');
    var len = Math.ceil(p.getTotalLength()) + 2;
    svg.style.setProperty('--len', len + 'px');
    var els = svg.querySelectorAll('.s-rand, .s-belag, .s-maske');
    for (var i = 0; i < els.length; i++) els[i].style.setProperty('--len', len);
    return len;
  }

  /* ---------- Kopf und Aktionsleiste ---------- */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var hero = document.querySelector('.hero');
  function onScrollKopf() {
    var y = window.scrollY || window.pageYOffset;
    kopf.classList.toggle('ist-unten', y > 30);
    if (aktion) aktion.classList.toggle('zeigen', y > Math.min(420, hero.offsetHeight * 0.5));
  }

  /* ---------- Hero-Strasse ---------- */
  var heroSvg = document.getElementById('heroStrasse');
  var autoBild = document.querySelector('.hero-auto-bild');
  var heroText = document.querySelector('.hero-text');
  var fakten = document.querySelector('.fakten');
  function baueHeroStrasse() {
    var W = hero.clientWidth, H = hero.clientHeight;
    var hr = hero.getBoundingClientRect();
    var ar = autoBild.getBoundingClientRect();
    var tr = heroText.getBoundingClientRect();
    var fr = fakten.getBoundingClientRect();
    var R = px('--rx');
    var rw = px('--rw');
    var d;
    /* Höhe der Räder: hier liegt die Strasse unter dem Tesla */
    var yc = ar.top - hr.top + ar.height * (desktop.matches ? 0.87 : 0.84);
    if (desktop.matches) {
      /* Strasse kommt von rechts unter dem Auto, schwingt nach unten links und biegt in die Spur */
      /* Die Kurve darf Lead, Knöpfe und Fakten nicht kreuzen */
      var unten = tr.bottom - hr.top;
      var rechts = 0;
      [heroText.querySelector('.lead'), heroText.querySelector('.knoepfe .btn:last-child')].forEach(function (el) {
        if (el) rechts = Math.max(rechts, el.getBoundingClientRect().right - hr.left);
      });
      var xs = ar.left - hr.left + ar.width * 0.16;
      var fl = fakten.firstElementChild.getBoundingClientRect();
      var fz = fakten.lastElementChild.getBoundingClientRect();
      if (fl.left - hr.left < xs) {
        unten = Math.max(unten, fr.bottom - hr.top);
        rechts = Math.max(rechts, fz.right - hr.left);
      }
      var yb = Math.max(unten + 70, yc + 120);
      yb = Math.min(yb, H - rw * 1.6);
      var xc = Math.max(R + 260, xs - 240, rechts + rw);
      if (xc > xs - 90) xs = xc + 90;
      var k = Math.min(150, (xs - xc) * 0.65);
      var t = Math.min(150, (H - yb) * 0.85);
      d = 'M' + (W + rw * 2) + ' ' + (yc - 30) +
        ' C' + (W * 0.86) + ' ' + (yc - 30) + ' ' + (W * 0.74) + ' ' + yc + ' ' + xs + ' ' + yc +
        ' C' + (xs - k) + ' ' + yc + ' ' + (xc + k) + ' ' + yb + ' ' + xc + ' ' + yb +
        ' L' + (R + t) + ' ' + yb +
        ' C' + (R + t * 0.45) + ' ' + yb + ' ' + R + ' ' + (yb + t * 0.55) + ' ' + R + ' ' + (yb + t) +
        ' L' + R + ' ' + (H + 2);
    } else {
      var y0 = Math.min(yc, fr.top - hr.top - rw * 1.4);
      var tm = Math.max(40, Math.min(70, (fr.top - hr.top) - y0));
      d = 'M' + (W + rw * 2) + ' ' + (y0 - 12) +
        ' C' + (W * 0.8) + ' ' + (y0 - 12) + ' ' + (W * 0.62) + ' ' + y0 + ' ' + (W * 0.45) + ' ' + y0 +
        ' L' + (R + tm) + ' ' + y0 +
        ' C' + (R + tm * 0.45) + ' ' + y0 + ' ' + R + ' ' + (y0 + tm * 0.55) + ' ' + R + ' ' + (y0 + tm) +
        ' L' + R + ' ' + (H + 2);
    }
    heroSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    heroSvg.setAttribute('preserveAspectRatio', 'none');
    setPath(heroSvg, d);
    setLength(heroSvg);
  }

  /* ---------- Weg: Strasse schwenkt in die Mitte ---------- */
  var weg = document.getElementById('weg');
  var wegSvg = document.getElementById('wegStrasse');
  var liste = weg.querySelector('.weg-liste');
  var halte = [].slice.call(weg.querySelectorAll('.halt'));
  var wegMaske = wegSvg.querySelector('.s-maske');
  var wegLen = 0, proben = [];

  function baueWegStrasse() {
    if (!desktop.matches) {
      weg.classList.remove('hat-kurve');
      return;
    }
    weg.classList.add('hat-kurve');
    var W = weg.clientWidth, H = weg.clientHeight;
    var sr = weg.getBoundingClientRect();
    var lr = liste.getBoundingClientRect();
    var R = px('--rx');
    var cx = lr.left - sr.left + lr.width / 2;
    var y1 = lr.top - sr.top - 190;
    var y2 = lr.bottom - sr.top + 40;
    var k = 150;
    var d = 'M' + R + ' -2 L' + R + ' ' + y1 +
      ' C' + R + ' ' + (y1 + k * 0.7) + ' ' + cx + ' ' + (y1 + k * 0.5) + ' ' + cx + ' ' + (y1 + k * 1.2) +
      ' L' + cx + ' ' + y2 +
      ' C' + cx + ' ' + (y2 + k * 0.7) + ' ' + R + ' ' + (y2 + k * 0.5) + ' ' + R + ' ' + (y2 + k * 1.2) +
      ' L' + R + ' ' + (H + 2);
    wegSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    setPath(wegSvg, d);
    wegLen = setLength(wegSvg);
    wegMaske.style.strokeDasharray = wegLen + ' ' + wegLen;
    /* Länge entlang des Pfads für jede Höhe (Pfad läuft nur nach unten) */
    var p = wegSvg.querySelector('.s-rand');
    proben = [];
    var n = 160;
    for (var i = 0; i <= n; i++) {
      var l = wegLen * i / n;
      proben.push([p.getPointAtLength(l).y, l]);
    }
    for (var j = 0; j < halte.length; j++) {
      var hp = halte[j].querySelector('.halt-punkt').getBoundingClientRect();
      halte[j]._y = hp.top + hp.height / 2 - sr.top;
    }
  }
  function laengeBei(y) {
    if (!proben.length) return 0;
    if (y <= proben[0][0]) return 0;
    for (var i = 1; i < proben.length; i++) {
      if (proben[i][0] >= y) {
        var a = proben[i - 1], b = proben[i];
        var f = b[0] === a[0] ? 1 : (y - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * f;
      }
    }
    return wegLen;
  }
  function wegFortschritt() {
    if (!fx || !weg.classList.contains('hat-kurve')) return;
    var sr = weg.getBoundingClientRect();
    var kopfY = window.innerHeight * 0.62 - sr.top;
    var l = laengeBei(kopfY);
    wegMaske.style.strokeDashoffset = (wegLen - l);
    for (var j = 0; j < halte.length; j++) {
      if (halte[j]._y < kopfY + 8) halte[j].classList.add('ist-an');
    }
  }

  /* ---------- Parallaxe Tremola ---------- */
  var band = document.querySelector('[data-parallax]');
  var bandImg = band && band.querySelector('img');
  function parallaxe() {
    if (!fx || !bandImg || !desktop.matches) { if (bandImg) bandImg.style.transform = ''; return; }
    var r = band.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    bandImg.style.transform = 'translate3d(0,' + (p * -40).toFixed(1) + 'px,0)';
  }

  /* ---------- Einblenden ---------- */
  function vorbereiten() {
    var gruppen = document.querySelectorAll('.kapitel');
    for (var g = 0; g < gruppen.length; g++) {
      var rs = gruppen[g].querySelectorAll('.r');
      for (var i = 0; i < rs.length; i++) rs[i].style.setProperty('--i', Math.min(i, 4));
    }
  }
  function beobachten() {
    var ziele = document.querySelectorAll('.r, .spur, .halt');
    if (!fx || !('IntersectionObserver' in window)) {
      for (var i = 0; i < ziele.length; i++) ziele[i].classList.add('on', 'ist-an');
      return;
    }
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        var el = e.target;
        if (el.classList.contains('spur')) {
          if (e.isIntersecting) {
            el.classList.add('on');
            if (!el._gefahren) {
              el._gefahren = true;
              setTimeout(function () { el.classList.add('faehrt'); }, 900);
            }
          }
          return;
        }
        if (!e.isIntersecting) return;
        if (el.classList.contains('halt')) {
          if (!weg.classList.contains('hat-kurve')) el.classList.add('ist-an');
        } else {
          el.classList.add('on');
        }
        if (!el.classList.contains('halt')) io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    for (var j = 0; j < ziele.length; j++) io.observe(ziele[j]);
  }

  /* ---------- Heute geöffnet ---------- */
  function heute() {
    var tag;
    try {
      var name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', weekday: 'short' }).format(new Date());
      tag = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[name];
    } catch (e) { tag = ((new Date().getDay() + 6) % 7) + 1; }
    var zeilen = document.querySelectorAll('#zeiten [data-tage]');
    for (var i = 0; i < zeilen.length; i++) {
      if (zeilen[i].getAttribute('data-tage').split(' ').indexOf(String(tag)) > -1) zeilen[i].classList.add('heute');
    }
  }

  /* ---------- Start ---------- */
  var tick = false;
  function aufScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      tick = false;
      onScrollKopf();
      wegFortschritt();
      parallaxe();
    });
  }
  var rz;
  function aufbauen() {
    baueHeroStrasse();
    baueWegStrasse();
    wegFortschritt();
    parallaxe();
  }

  /* Sanftes Springen zu Ankern (nur mit Animationen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || !fx) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    window.scrollTo({ top: ziel.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 70), behavior: 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  vorbereiten();
  heute();
  aufbauen();
  beobachten();
  onScrollKopf();
  window.addEventListener('scroll', aufScroll, { passive: true });
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(aufbauen, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(aufbauen);
  window.addEventListener('load', aufbauen);

  if (fx) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { doc.classList.add('los'); });
    });
  }
})();
