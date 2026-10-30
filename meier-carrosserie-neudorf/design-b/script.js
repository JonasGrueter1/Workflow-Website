/* Meier Carrosserie, Design B: Kopf, Farbfächer, Einblenden, Bild-Parallaxe, Team-Reihe, Öffnungszeiten, Aktionsleiste */
(function () {
  'use strict';
  window.meierB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Kopf: Linie beim Scrollen ---------- */
  var kopf = document.getElementById('kopf');

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

  /* ---------- Farbfächer: öffnet sich einmal, dann ein Glanz ---------- */
  var faecher = document.getElementById('faecher');
  var buehne = document.querySelector('.buehne');
  function faecherAuf(warten) {
    buehne.classList.add('ist-da');
    setTimeout(function () { faecher.classList.add('offen'); }, warten);
    setTimeout(function () { faecher.classList.add('glanz'); }, warten + 1450);
    setTimeout(function () { faecher.classList.add('fertig'); }, warten + 1500);
  }
  if (faecher && buehne && fx) {
    if (hasIO) {
      /* Öffnet, sobald ein Teil sichtbar ist: am Handy ragt der Fächer schon ins erste Bild */
      var fio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        fio.disconnect();
        faecherAuf(window.scrollY < 40 ? 480 : 160);
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
      fio.observe(faecher);
    } else {
      faecherAuf(420);
    }
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var rvs = document.querySelectorAll('.rv, .rv-bild, .team-reihe');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Bild-Band: dezente Parallaxe ---------- */
  var band = document.querySelector('.band-bild');
  var bandImg = band && band.querySelector('img');
  function parallax() {
    if (!fx || !band) return;
    var r = band.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < -50 || r.top > vh + 50) return;
    var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
    var extra = bandImg.offsetHeight - band.offsetHeight;
    bandImg.style.transform = 'translate3d(0,' + ((0.5 - p) * extra).toFixed(1) + 'px,0)';
  }

  /* ---------- Team-Reihe: Pfeile und Fortschritt ---------- */
  var reihe = document.getElementById('team-reihe');
  var balken = document.getElementById('team-balken');
  var pfeile = document.querySelectorAll('.pfeil');
  function reiheUpdate() {
    if (!reihe) return;
    var max = reihe.scrollWidth - reihe.clientWidth;
    var anteil = reihe.clientWidth / reihe.scrollWidth;
    var p = max > 0 ? reihe.scrollLeft / max : 1;
    if (balken) balken.style.setProperty('--p', (anteil + (1 - anteil) * p).toFixed(3));
    pfeile.forEach(function (b) {
      var dir = +b.getAttribute('data-richtung');
      b.disabled = dir < 0 ? reihe.scrollLeft < 4 : reihe.scrollLeft > max - 4;
    });
  }
  if (reihe) {
    pfeile.forEach(function (b) {
      b.addEventListener('click', function () {
        var karte = reihe.querySelector('.person');
        var schritt = karte ? karte.offsetWidth + 20 : 300;
        var anzahl = Math.max(1, Math.floor(reihe.clientWidth / schritt) - 1);
        reihe.scrollBy({ left: +b.getAttribute('data-richtung') * schritt * anzahl, behavior: fx ? 'smooth' : 'auto' });
      });
    });
    reihe.addEventListener('scroll', function () { window.requestAnimationFrame(reiheUpdate); }, { passive: true });
    window.addEventListener('resize', reiheUpdate);
    reiheUpdate();
  }

  /* ---------- Öffnungszeiten: heute markieren, offen oder geschlossen ---------- */
  (function () {
    var status = document.getElementById('status');
    if (!status) return;
    var tag, minuten;
    try {
      var teile = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var w = {}; teile.forEach(function (t) { w[t.type] = t.value; });
      tag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(w.weekday);
      minuten = (parseInt(w.hour, 10) % 24) * 60 + parseInt(w.minute, 10);
    } catch (e) { return; }
    if (tag < 0 || isNaN(minuten)) return;
    var zeiten = { 1: [[450, 720], [780, 1080]], 2: [[450, 720], [780, 1080]], 3: [[450, 720], [780, 1080]], 4: [[450, 720], [780, 1080]], 5: [[450, 720], [780, 1080]], 6: [[540, 720]] };
    var offen = (zeiten[tag] || []).some(function (z) { return minuten >= z[0] && minuten < z[1]; });
    status.textContent = offen ? 'Jetzt geöffnet' : 'Zurzeit geschlossen';
    status.classList.toggle('offen', offen);
    status.hidden = false;
    document.querySelectorAll('.zeiten tr[data-tage]').forEach(function (tr) {
      if (tr.getAttribute('data-tage').split(',').indexOf(String(tag)) > -1) tr.classList.add('heute');
    });
  })();

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

  /* ---------- Scrollen ---------- */
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    window.requestAnimationFrame(function () {
      tick = false;
      kopf.classList.toggle('gescrollt', window.scrollY > 8);
      parallax();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
