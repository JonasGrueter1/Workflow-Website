/* PROCAR-DIERIKON, Design B: Kopf, Menü, Einblenden, Werkstattauftrag (Start im Bild, Neigung), Aktionsleiste */
(function () {
  'use strict';
  window.procarB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Hintergrund beim Scrollen ---------- */
  var kopf = document.getElementById('kopf');
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      tick = false;
      kopf.classList.toggle('gescrollt', window.scrollY > 8);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menü am Handy ---------- */
  var knopf = kopf.querySelector('.menu-knopf');
  function menu(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
  }
  knopf.addEventListener('click', function () { menu(!kopf.classList.contains('offen')); });
  kopf.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', function () { menu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('offen')) { menu(false); knopf.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) menu(false); });

  /* ---------- Anker-Links: sanft scrollen (nur bei Klick, nur mit Animation) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var rvs = document.querySelectorAll('.rv');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Werkstattauftrag: Abhaken startet, sobald der Auftrag sichtbar ist ---------- */
  var buehne = document.getElementById('buehne');
  if (fx && hasIO) {
    var bio = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { buehne.classList.add('los'); bio.disconnect(); }
    }, { threshold: 0.3 });
    bio.observe(buehne);
  } else {
    buehne.classList.add('los');
  }

  /* ---------- Neigung zum Mauszeiger (nur Desktop mit Maus) ---------- */
  var tilt = document.getElementById('tilt');
  var hero = document.querySelector('.hero');
  var mqMaus = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
  if (fx && tilt && hero) {
    var ziel = { x: 0, y: 0 }, ist = { x: 0, y: 0 }, laeuft = false;
    var schritt = function () {
      ist.x += (ziel.x - ist.x) * 0.12;
      ist.y += (ziel.y - ist.y) * 0.12;
      tilt.style.setProperty('--rx', (-ist.y * 4).toFixed(2) + 'deg');
      tilt.style.setProperty('--ry', (ist.x * 4).toFixed(2) + 'deg');
      if (Math.abs(ziel.x - ist.x) > 0.002 || Math.abs(ziel.y - ist.y) > 0.002) requestAnimationFrame(schritt);
      else laeuft = false;
    };
    var los = function () { if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } };
    hero.addEventListener('pointermove', function (e) {
      if (!mqMaus.matches || e.pointerType !== 'mouse') return;
      var r = tilt.getBoundingClientRect();
      ziel.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
      ziel.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
      los();
    });
    hero.addEventListener('pointerleave', function () { ziel.x = 0; ziel.y = 0; los(); });
    tilt.style.transition = 'none';
  }

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
})();
