/* Bollhalder Maler, Design B: Hero und Karte, Einblenden, Kopf, Menü, Aktionsleiste, Foto-Vorschau */
(function () {
  'use strict';
  window.bollhalderB = true;
  var d = document.documentElement;
  var fx = d.classList.contains('fx');
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Hero starten (nach den Schriften, damit nichts springt) ---------- */
  var gestartet = false;
  function heroLos() {
    if (gestartet) return; gestartet = true;
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('hero-los'); }); });
  }
  if (fx) {
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(heroLos); }
    setTimeout(heroLos, 350);
  } else {
    d.classList.add('hero-los');
  }

  /* ---------- Staffel-Index setzen ---------- */
  each(document.querySelectorAll('[data-stagger]'), function (list) {
    each(list.children, function (el, i) { el.style.setProperty('--i', i); });
  });
  each(document.querySelectorAll('[data-index]'), function (spalte) {
    each(spalte.querySelectorAll('li'), function (el, i) { el.style.setProperty('--i', i + 1); });
    var link = spalte.querySelector('.textlink');
    if (link) link.style.setProperty('--i', spalte.querySelectorAll('li').length + 1);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = document.querySelectorAll('[data-reveal], [data-stagger], [data-index], [data-karte]');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        /* Die Karte erst zeichnen, wenn ein guter Teil davon zu sehen ist */
        if (e.target.hasAttribute('data-karte') && e.intersectionRatio < 0.3) return;
        e.target.classList.add('ist-da'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: [0.08, 0.3] });
    each(ziele, function (el) { io.observe(el); });
  } else {
    each(ziele, function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Kopf: Schatten, aktiver Anker, Aktionsleiste ---------- */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var kontakt = document.getElementById('kontakt');
  var hero = document.querySelector('.hero');
  var anker = document.querySelectorAll('.anker a');
  var abschnitte = [];
  each(anker, function (a) {
    var ziel = document.querySelector(a.getAttribute('href'));
    if (ziel) abschnitte.push({ a: a, el: ziel });
  });
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.pageYOffset || d.scrollTop;
    var vh = window.innerHeight;
    if (kopf) kopf.classList.toggle('gescrollt', y > 24);
    var aktiv = null;
    abschnitte.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.top < vh * 0.4 && r.bottom > vh * 0.4) aktiv = s.a;
    });
    each(anker, function (a) { a.classList.toggle('ist-aktiv', a === aktiv); });
    if (aktion) {
      var zeigen = hero ? hero.getBoundingClientRect().bottom < vh * 0.35 : y > vh * 0.6;
      if (kontakt) {
        var k = kontakt.getBoundingClientRect();
        if (k.top < vh * 0.7 && k.bottom > 0) zeigen = false;
      }
      aktion.classList.toggle('zeigen', zeigen);
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menü (Handy und Tablet) ---------- */
  var knopf = document.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  var wort = knopf ? knopf.querySelector('.menue-wort') : null;
  function menueZu() {
    d.classList.remove('menue-offen');
    if (knopf) knopf.setAttribute('aria-expanded', 'false');
    if (wort) wort.textContent = 'Menü';
  }
  if (knopf && menue) {
    knopf.addEventListener('click', function () {
      var offen = !d.classList.contains('menue-offen');
      d.classList.toggle('menue-offen', offen);
      knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
      if (wort) wort.textContent = offen ? 'Schliessen' : 'Menü';
    });
    menue.addEventListener('click', function (e) { if (e.target.closest('a')) menueZu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menueZu(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1180) menueZu(); });
  }

  /* ---------- Sanftes Scrollen zu den Abschnitten (nur bei Klick, nicht global) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Formular: Foto-Vorschau, nichts wird hochgeladen ---------- */
  each(document.querySelectorAll('.foto-kachel'), function (kachel) {
    var input = kachel.querySelector('input[type=file]');
    var bild = null, url = null;
    if (!input) return;
    input.addEventListener('change', function () {
      if (url) { URL.revokeObjectURL(url); url = null; }
      var f = input.files && input.files[0];
      if (f && /^image\//.test(f.type)) {
        url = URL.createObjectURL(f);
        if (!bild) { bild = document.createElement('img'); bild.className = 'foto-vorschau'; kachel.appendChild(bild); }
        bild.src = url; bild.alt = 'Vorschau: ' + f.name;
        kachel.classList.add('hat-bild');
      } else {
        if (bild) { bild.remove(); bild = null; }
        kachel.classList.remove('hat-bild');
      }
    });
  });
  var form = document.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
