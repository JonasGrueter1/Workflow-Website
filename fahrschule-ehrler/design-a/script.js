/* Fahrschule Ehrler, Design A: Kopf, Einblenden, Treppe, Reiter, Parallaxe, Aktionsleiste */
(function () {
  'use strict';
  window.ehrlerA = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: feine Linie, sobald gescrollt ---------- */
  var kopf = document.getElementById('kopf');

  /* ---------- Anker-Links: sanft scrollen ---------- */
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

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = Array.prototype.slice.call(document.querySelectorAll('.rv, .treppe, .stufe'));
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-da'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Reiter Motorrad-Grundkurs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.reiter-knopf'));
  var marke = document.querySelector('.reiter-marke');
  function markeSetzen(btn) {
    if (!marke || !btn) return;
    marke.style.width = btn.offsetWidth + 'px';
    marke.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
  }
  function waehlen(btn, fokus) {
    tabs.forEach(function (t) {
      var an = t === btn;
      t.setAttribute('aria-selected', an ? 'true' : 'false');
      t.tabIndex = an ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !an;
      panel.classList.remove('wechsel');
      if (an) { void panel.offsetWidth; panel.classList.add('wechsel'); }
    });
    markeSetzen(btn);
    if (fokus) btn.focus();
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) { panel.hidden = i !== 0; panel.tabIndex = 0; }
      t.addEventListener('click', function () { waehlen(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === 'Home') n = tabs[0];
        else if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); waehlen(n, true); }
      });
    });
    markeSetzen(tabs[0]);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      markeSetzen(document.querySelector('.reiter-knopf[aria-selected="true"]'));
    });
    window.addEventListener('resize', function () {
      markeSetzen(document.querySelector('.reiter-knopf[aria-selected="true"]'));
    });
  }

  /* ---------- Parallaxe Motorrad-Band (nur ab 768 px) ---------- */
  var band = document.querySelector('[data-parallax]');
  var mqBreit = window.matchMedia('(min-width: 768px)');
  function parallaxe() {
    if (!band) return;
    if (!fx || !mqBreit.matches) { band.style.transform = ''; return; }
    var r = band.parentNode.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); /* -1 bis 1 */
    p = Math.max(-1, Math.min(1, p));
    band.style.transform = 'translate3d(0,' + (p * 24).toFixed(1) + 'px,0)';
  }

  /* ---------- Aktionsleiste am Handy: erscheint, sobald die Hero-Knöpfe vorbei sind ---------- */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  function aktionUpdate() {
    if (!aktion || !heroCta) return;
    var r = heroCta.getBoundingClientRect();
    aktion.classList.toggle('zeigen', r.bottom < 0);
  }
  if (aktion && !heroCta) aktion.classList.add('zeigen');

  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    window.requestAnimationFrame(function () {
      tick = false;
      kopf.classList.toggle('gescrollt', window.scrollY > 8);
      aktionUpdate();
      parallaxe();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
