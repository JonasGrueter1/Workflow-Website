/* Kunz AG, Design A: Kopf, Menü, Einblenden, Hero-Textur, Alte Käserei, grosses Bild, Teamwand, Aktionsleiste */
(function () {
  'use strict';
  window.kunzA = true;
  var d = document;
  var root = d.documentElement;
  var fx = root.classList.contains('fx');
  var mq = function (q) { return window.matchMedia(q).matches; };

  /* Kopf: Schatten beim Scrollen, Aktionsleiste am Handy, Hero-Textur leicht verschieben */
  var kopf = d.getElementById('kopf');
  var aktion = d.getElementById('aktion');
  var heroCta = d.getElementById('hero-cta');
  var hero = d.querySelector('.hero');
  var textur = d.querySelector('.hero-textur');
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.scrollY || 0;
    if (kopf) kopf.classList.toggle('ist-unten', y > 8);
    if (y < 200) [].forEach.call(d.querySelectorAll('.nav a.ist-aktiv'), function (a) { a.classList.remove('ist-aktiv'); });
    if (aktion && heroCta) aktion.classList.toggle('ist-da', heroCta.getBoundingClientRect().bottom < 0);
    /* Parallaxe nur am Desktop und nur, solange der Hero im Bild ist */
    if (fx && textur && hero && !mq('(max-width: 760px)')) {
      var hH = hero.offsetHeight;
      if (y <= hH + 40) textur.style.translate = '0 ' + (Math.min(y, hH) * 0.06).toFixed(1) + 'px';
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
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
    window.addEventListener('resize', function () { if (!mq('(max-width: 980px)')) menuZu(); });
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
    [].forEach.call(d.querySelectorAll('main > section[id]'), function (s) { navIo.observe(s); });
  }

  /* Teamwand: Porträts reihenweise einblenden (Reihe je 60 ms) */
  var wand = d.getElementById('wand');
  function wellen() {
    if (!wand) return;
    [].forEach.call(wand.querySelectorAll('.gruppe'), function (g, gi) {
      var lis = g.querySelectorAll('.kopf-bild');
      var spalten = parseInt(getComputedStyle(g.querySelector('ul')).gridTemplateColumns.split(' ').length, 10) || 3;
      [].forEach.call(lis, function (li, i) {
        var reihe = Math.floor(i / spalten);
        li.style.setProperty('--w', Math.min(gi * 2 + reihe * 2 + (i % spalten) * 0.5, 16));
      });
    });
  }
  wellen();
  window.addEventListener('resize', wellen);

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(d.querySelectorAll('[data-reveal], .ref, .zitat, .erfolge li, .zeitleiste, .zeitleiste li, .k-bilder, .k-linie, .wand'));
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('ist-da');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: nach Sprung an eine Stelle alles darüber zeigen */
    window.addEventListener('hashchange', function () {
      ziele.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('ist-da'); });
    });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Sanftes Springen zu Abschnitten (nur mit Animationen) */
  if (fx) {
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var ziel = d.querySelector(id);
      if (!ziel) return;
      e.preventDefault();
      ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* Alte Käserei am Handy: Umschalter Vorher, Bei der Arbeit, Endresultat */
  var schalter = [].slice.call(d.querySelectorAll('.k-schalter button'));
  var kBilder = [].slice.call(d.querySelectorAll('.k-bild'));
  function zeigeK(k) {
    schalter.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
    kBilder.forEach(function (f) { f.classList.toggle('ist-an', f.getAttribute('data-k') === k); });
  }
  schalter.forEach(function (b) { b.addEventListener('click', function () { zeigeK(b.getAttribute('data-k')); }); });

  /* Referenzen: grosses Bild im Dialog */
  var dlg = d.getElementById('gross');
  if (dlg && typeof dlg.showModal === 'function') {
    var dImg = d.createElement('img');
    var dCap = dlg.querySelector('figcaption');
    var zuletzt = null;
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-gross]');
      if (!a) return;
      e.preventDefault();
      zuletzt = a;
      var klein = a.querySelector('img');
      if (!dImg.parentNode) dlg.querySelector('figure').insertBefore(dImg, dCap);
      dImg.src = a.getAttribute('href');
      dImg.alt = klein ? klein.alt : '';
      var art = a.querySelector('.ref-art');
      var was = a.querySelector('.ref-was');
      dCap.textContent = (art ? art.textContent + ': ' : '') + (was ? was.textContent : '');
      dlg.showModal();
    });
    var zu = function () { dlg.close(); };
    dlg.querySelector('.gross-zu').addEventListener('click', zu);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) zu(); });
    dlg.addEventListener('close', function () { if (zuletzt) zuletzt.focus(); });
  }
})();
