/* Fahrschule Kalberer, Design B «Wegweiser» */
(function () {
  'use strict';
  var root = document.documentElement;
  var fx = root.classList.contains('fx');

  /* ---------- Scroll-Reveal ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('.rv, .schritte'));
  if ('IntersectionObserver' in window && fx) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Auswahl «Ich möchte ...» ---------- */
  var chips = [].slice.call(document.querySelectorAll('.chip'));
  var panels = [].slice.call(document.querySelectorAll('.panel'));
  var tafeln = [].slice.call(document.querySelectorAll('.tafel[data-wahl]'));
  var aktuell = 'auto';

  function waehle(wahl, opts) {
    opts = opts || {};
    if (!wahl) return;
    var wechsel = wahl !== aktuell;
    aktuell = wahl;
    chips.forEach(function (c) {
      var an = c.getAttribute('data-wahl') === wahl;
      c.setAttribute('aria-checked', an ? 'true' : 'false');
      c.tabIndex = an ? 0 : -1;
      if (an && opts.fokus) c.focus();
      if (an && c.scrollIntoView && opts.chipZeigen) {
        var leiste = c.parentNode;
        if (leiste.scrollWidth > leiste.clientWidth) leiste.scrollTo({ left: c.offsetLeft - 18, behavior: fx ? 'smooth' : 'auto' });
      }
    });
    panels.forEach(function (p) {
      var an = p.getAttribute('data-panel') === wahl;
      p.classList.toggle('is-aktiv', an);
      p.classList.remove('is-neu');
      if (an && wechsel && fx) { void p.offsetWidth; p.classList.add('is-neu'); }
    });
    if (opts.markieren !== false) {
      tafeln.forEach(function (t) { t.classList.toggle('is-aktiv', t.getAttribute('data-wahl') === wahl); });
    }
  }

  chips.forEach(function (c, i) {
    c.addEventListener('click', function () { waehle(c.getAttribute('data-wahl')); });
    c.addEventListener('keydown', function (e) {
      var d = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1;
      else if (e.key === 'Home') d = -i;
      else if (e.key === 'End') d = chips.length - 1 - i;
      if (!d) return;
      e.preventDefault();
      var n = chips[(i + d + chips.length) % chips.length];
      waehle(n.getAttribute('data-wahl'), { fokus: true, chipZeigen: true });
    });
  });

  var ziel = document.querySelector('.chips') || document.getElementById('wegweiser');
  tafeln.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      waehle(t.getAttribute('data-wahl'), { chipZeigen: true });
      if (ziel) ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#wegweiser');
    });
  });

  // Sanftes Springen zu Ankern (ohne scroll-behavior im CSS)
  [].forEach.call(document.querySelectorAll('a[href^="#"]:not([data-soon]):not([data-wahl])'), function (a) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    a.addEventListener('click', function (e) {
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      if (id === 'inhalt') el.setAttribute('tabindex', '-1'), el.focus({ preventScroll: true });
    });
  });

  // Direktaufruf mit #p-... (z.B. geteilter Link)
  var m = /^#p-(\w+)/.exec(location.hash);
  if (m) waehle(m[1]);

  /* ---------- Aktionsleiste: erscheint, sobald die Knöpfe im Hero weg sind ---------- */
  var leiste = document.querySelector('.aktionen');
  var heroKnoepfe = document.querySelector('.hero-cta');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var weg = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
      leiste.classList.toggle('ist-da', weg);
    }).observe(heroKnoepfe);
  } else if (leiste) { leiste.classList.add('ist-da'); }

  /* ---------- VKU-Termin: nach dem letzten Kursabend ---------- */
  var vku = document.querySelector('[data-vku-ende]');
  if (vku) {
    var ende = new Date(vku.getAttribute('data-vku-ende') + 'T22:00:00');
    if (new Date() > ende) {
      var d = vku.querySelector('.vku-datum');
      if (d) d.textContent = 'Nächste Daten auf Anfrage';
      [].forEach.call(document.querySelectorAll('.vku-daten'), function (el) { el.textContent = 'nächste Daten auf Anfrage'; });
      var t = document.getElementById('vku-titel');
      if (t) t.textContent = 'Der VKU in Schmerikon.';
    }
  }

  /* ---------- Leichte Parallaxe der Fahrzeugfotos (nur breite Bildschirme) ---------- */
  if (fx && window.matchMedia('(min-width: 961px)').matches) {
    var bilder = [].slice.call(document.querySelectorAll('.foto-rahmen'));
    var laeuft = false;
    var rechne = function () {
      laeuft = false;
      var vh = window.innerHeight;
      bilder.forEach(function (r) {
        var b = r.getBoundingClientRect();
        if (b.bottom < -50 || b.top > vh + 50) return;
        var mitte = (b.top + b.height / 2 - vh / 2) / vh; // -1 .. 1
        r.firstElementChild.style.setProperty('--px', (mitte * -18).toFixed(1) + 'px');
      });
    };
    window.addEventListener('scroll', function () {
      if (!laeuft) { laeuft = true; requestAnimationFrame(rechne); }
    }, { passive: true });
    rechne();
  }

  /* SMS: Ohne JavaScript rufen diese Knöpfe an, mit JavaScript öffnen sie direkt die Nachrichten-App */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-sms]');
    if (!a) return;
    e.preventDefault();
    window.location.href = 'sms:' + a.getAttribute('data-sms');
  });
})();
