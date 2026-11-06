/* Fahrschule Rolf Melliger, Design A: Kopf, Menü, Hero-Auftritt, Scroll-Reveals, Zähler */
(function () {
  'use strict';
  window.mellA = true;

  var d = document.documentElement;
  var fx = d.classList.contains('fx');
  var kopf = document.getElementById('kopf');
  var knopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('nav');

  /* Kopf bekommt beim Scrollen eine Linie */
  var tick = false;
  function kopfStatus() { kopf.classList.toggle('gescrollt', window.scrollY > 8); tick = false; }
  kopfStatus();
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(kopfStatus); }
  }, { passive: true });

  /* Menü mobil */
  function menu(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
  }
  if (knopf && nav) {
    knopf.addEventListener('click', function () { menu(!kopf.classList.contains('offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('offen')) { menu(false); knopf.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (kopf.classList.contains('offen') && !kopf.contains(e.target)) menu(false);
    });
  }

  /* Sanft zu den Ankern scrollen (nur bei Klick, nicht für programmatisches Scrollen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Zähler (40, 41, 3) */
  function zaehle(el) {
    var ziel = parseInt(el.getAttribute('data-zahl'), 10);
    if (!fx || !ziel) { el.textContent = ziel; return; }
    var dauer = 1300, start = null;
    el.textContent = '0';
    function schritt(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(ziel * e);
      if (p < 1) window.requestAnimationFrame(schritt);
    }
    window.requestAnimationFrame(schritt);
  }

  var ziele = document.querySelectorAll('.rv, .vierzig, .bilanz-karte, .inb-liste, .zahlen, .kanaele');

  function zeige(el) {
    el.classList.add('ist-da');
    if (el.classList.contains('zahlen')) el.querySelectorAll('[data-zahl]').forEach(zaehle);
  }

  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(zeige);
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  }

  /* Hero-Auftritt starten, sobald die Schriften bereit sind (höchstens 600 ms warten) */
  var gestartet = false;
  function los() {
    if (gestartet) return;
    gestartet = true;
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { d.classList.add('los'); }); });
  }
  if (fx && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(los);
    setTimeout(los, 600);
  } else {
    d.classList.add('los');
  }
})();
