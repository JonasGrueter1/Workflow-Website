/* Schürmann Hauswart GmbH, Design A: Kopf, Menü, Einblenden, Dreiecke im Hero, Aktionsleiste */
(function () {
  'use strict';
  window.schA = true;
  var d = document;
  var root = d.documentElement;
  var fx = root.classList.contains('fx');

  /* Kopf: Linie beim Scrollen, Aktionsleiste am Handy erst nach dem Hero */
  var kopf = d.getElementById('kopf');
  var aktion = d.getElementById('aktion');
  var heroCta = d.getElementById('hero-cta');
  var kontakt = d.getElementById('kontakt');
  var tick = false;

  /* Dreiecke im Hero: leichte Parallaxe, nur Desktop und nur solange der Hero sichtbar ist */
  var tris = [].slice.call(d.querySelectorAll('.tri[data-par]'));
  var hero = d.querySelector('.hero');
  var heroSichtbar = true;
  var gross = window.matchMedia('(min-width: 768px)');

  function parallaxe(y) {
    if (!fx || !heroSichtbar) return;
    var an = gross.matches;
    tris.forEach(function (t) {
      var f = parseFloat(t.getAttribute('data-par')) || 0;
      t.style.transform = an ? 'translate3d(0,' + (y * f).toFixed(1) + 'px,0)' : '';
    });
  }

  function onScroll() {
    tick = false;
    var y = window.scrollY || window.pageYOffset || 0;
    if (kopf) kopf.classList.toggle('ist-unten', y > 8);
    if (y < 200) [].forEach.call(d.querySelectorAll('.nav a.ist-aktiv'), function (a) { a.classList.remove('ist-aktiv'); });
    if (aktion && heroCta) {
      var r = heroCta.getBoundingClientRect();
      var k = kontakt ? kontakt.getBoundingClientRect() : null;
      /* Im Kontaktbereich braucht es die Leiste nicht, das Formular ist schon da */
      var imKontakt = k && k.top < window.innerHeight * 0.55 && k.bottom > 0;
      aktion.classList.toggle('ist-da', r.bottom < 0 && !imKontakt);
    }
    parallaxe(y);
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });

  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (es) { heroSichtbar = es[0].isIntersecting; }).observe(hero);
  }
  onScroll();

  /* Menü am Handy */
  var menuBtn = d.querySelector('.kopf-menu');
  var menu = d.getElementById('menu');
  function menuZu() {
    if (!menu || !menuBtn) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Menü öffnen');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      if (menuBtn.getAttribute('aria-expanded') === 'true') { menuZu(); return; }
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Menü schliessen');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { menuZu(); menuBtn.focus(); } });
  }

  /* Aktiver Menüpunkt */
  var navLinks = [].slice.call(d.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var navIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = d.querySelector(a.getAttribute('href')); if (s) navIo.observe(s); });
  }

  /* Einblenden beim Scrollen, gestaffelt über --i */
  var ziele = [].slice.call(d.querySelectorAll('[data-reveal], .motto-band'));
  function zeigen(el) {
    var i = parseFloat(getComputedStyle(el).getPropertyValue('--i')) || 0;
    if (i > 0) setTimeout(function () { el.classList.add('ist-da'); }, i * 110);
    else el.classList.add('ist-da');
  }
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        zeigen(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Sanftes Scrollen zu den Ankern (per Skript, damit direktes Scrollen ohne Verzögerung bleibt) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && d.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'inhalt' || id === 'kontakt') {
      var f = id === 'kontakt' ? ziel.querySelector('h2') : ziel;
      if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    }
  });

  /* Formular: in der Vorschau nicht absenden (Hinweis kommt über data-soon) */
  var form = d.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
