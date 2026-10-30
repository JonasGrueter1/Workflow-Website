/* Fahrschule Ehrler, Design B «Seeufer» */
(function () {
  'use strict';
  window.ehrlerB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* Kopfzeile: Linie beim Scrollen */
  var kopf = document.getElementById('kopf');
  function onScrollKopf() { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); }
  onScrollKopf();
  window.addEventListener('scroll', onScrollKopf, { passive: true });

  /* Menü am Handy */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  function menu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('ist-offen', open);
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { menu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]:not([data-soon])')) menu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('ist-offen')) { menu(false); menuBtn.focus(); } });
    document.addEventListener('click', function (e) { if (nav.classList.contains('ist-offen') && !e.target.closest('.kopf')) menu(false); });
  }

  /* Aktiver Menüpunkt */
  var links = [].slice.call(document.querySelectorAll('.nav > a[href^="#"]'));
  if ('IntersectionObserver' in window && links.length) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('ist-aktiv'); });
          a.classList.add('ist-aktiv');
        } else {
          a.classList.remove('ist-aktiv');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* Getriebe-Schalter: hebt Golf (Schaltgetriebe) oder Q3 (Automat) hervor */
  var schalter = document.querySelector('.schalter');
  var vergleich = document.querySelector('.vergleich');
  function waehle(auto) {
    if (!schalter || !vergleich) return;
    schalter.setAttribute('data-aktiv', auto);
    vergleich.setAttribute('data-aktiv', auto);
    [].forEach.call(schalter.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-auto') === auto ? 'true' : 'false');
    });
  }
  if (schalter && vergleich) {
    schalter.setAttribute('data-aktiv', 'golf');
    schalter.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-auto]');
      if (b) waehle(b.getAttribute('data-auto'));
    });
    [].forEach.call(vergleich.querySelectorAll('.auto'), function (art) {
      art.addEventListener('click', function () { waehle(art.getAttribute('data-auto')); });
    });
  }

  /* Weiches Scrollen nur bei Klicks auf Anker (nicht global, damit Sprünge sofort gehen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]:not([data-soon])');
    if (!a || reduce) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(document.querySelectorAll('.rv, .mk, .karte-buehne, .kontakt'));
  function zeige(el) { el.classList.add('ist-da'); }
  if (fx && 'IntersectionObserver' in window) {
    var offen = ziele.slice();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { zeige(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: bei schnellem Scrollen übersprungene Elemente ebenfalls zeigen */
    var pruefen = false;
    function nachholen() {
      pruefen = false;
      var vh = window.innerHeight;
      offen = offen.filter(function (el) {
        if (el.classList.contains('ist-da')) return false;
        if (el.getBoundingClientRect().top < vh * 0.9) { zeige(el); io.unobserve(el); return false; }
        return true;
      });
    }
    window.addEventListener('scroll', function () { if (!pruefen) { pruefen = true; requestAnimationFrame(nachholen); } }, { passive: true });
  } else {
    ziele.forEach(zeige);
  }

  if (reduce) return;

  /* Dezente Parallaxe auf dem Seestrassen-Band (ab 768 px) */
  var band = document.querySelector('.band-bild');
  var bandImg = band && band.querySelector('img');
  var mq = window.matchMedia('(min-width: 768px)');
  var ticking = false;
  function parallax() {
    ticking = false;
    if (!bandImg) return;
    if (!mq.matches) { bandImg.style.transform = ''; return; }
    var r = band.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); /* -1 bis 1 */
    bandImg.style.transform = 'translate3d(0,' + (p * -28).toFixed(1) + 'px,0) scale(1.1)';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  window.addEventListener('resize', parallax);
  parallax();

  /* Gutschein-Karte: leichtes Neigen mit der Maus */
  var buehne = document.querySelector('.karte-buehne');
  var karte = buehne && buehne.querySelector('.karte');
  var fein = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fx && buehne && karte && fein) {
    var bereit = false;
    karte.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'transform' && buehne.classList.contains('ist-da')) { bereit = true; buehne.classList.add('ist-neigbar'); }
    });
    buehne.addEventListener('pointermove', function (e) {
      if (!bereit) return;
      var r = buehne.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      karte.style.transform = 'rotate(-4deg) rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (y * -10).toFixed(2) + 'deg)';
    });
    buehne.addEventListener('pointerleave', function () { if (bereit) karte.style.transform = ''; });
  }

  /* Aktionsleiste am Handy: erscheint, sobald die Hero-Knöpfe vorbei sind */
  var aktion = document.querySelector('.aktion');
  var heroCta = document.querySelector('.hero-cta');
  if (aktion) {
    if (!heroCta) { aktion.classList.add('zeigen'); }
    else {
      var aTick = false;
      var aktionUpdate = function () {
        aTick = false;
        aktion.classList.toggle('zeigen', heroCta.getBoundingClientRect().bottom < 0);
      };
      var aktionScroll = function () { if (!aTick) { aTick = true; window.requestAnimationFrame(aktionUpdate); } };
      window.addEventListener('scroll', aktionScroll, { passive: true });
      window.addEventListener('resize', aktionScroll);
      aktionUpdate();
    }
  }
})();
