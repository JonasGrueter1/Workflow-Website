/* SoLo-Fahrschule, Design A: Einblenden, Zeitstrahl, Abo-Rechner, Menü, Aktionsleiste */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Einblenden beim Scrollen */
  var targets = [].slice.call(document.querySelectorAll('.rv, [data-zeit], [data-phasen], .gs-foto'));
  var show = function (el) { el.classList.add('is-in'); };
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains('rv')) el.style.transitionDelay = Math.min(n * 0.08, 0.4) + 's';
        n++;
        show(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: nach dem Laden alles zeigen, was schon über dem Sichtbereich liegt */
    window.addEventListener('load', function () {
      targets.forEach(function (el) { if (el.getBoundingClientRect().bottom < 0) show(el); });
    });
  }

  /* Sanftes Scrollen nur bei Klicks auf Anker */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      var el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* Kopfzeile mit Linie nach dem Scrollen */
  var kopf = document.querySelector('.kopf');
  var onScroll = function () { kopf.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü am Handy */
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    var setMenu = function (open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.classList.toggle('is-open', open);
    };
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* Aktionsleiste: nur ausgeblendet, solange die Knöpfe im Startbild sichtbar sind */
  var bar = document.querySelector('.aktion');
  var heroBtns = document.querySelector('.hero-btns');
  if (bar && heroBtns) {
    var barTick = false;
    var checkBar = function () {
      barTick = false;
      var r = heroBtns.getBoundingClientRect();
      /* Bereich über Aktions- und Vorschau-Leiste */
      var limit = window.innerHeight - 150;
      /* Versteckt, solange die Knöpfe im Startbild sichtbar sind oder noch gar nicht gescrollt wurde */
      bar.classList.toggle('is-hidden', r.bottom > 0 && (r.top < limit || window.scrollY < 40));
    };
    window.addEventListener('scroll', function () { if (!barTick) { barTick = true; requestAnimationFrame(checkBar); } }, { passive: true });
    window.addEventListener('resize', checkBar);
    checkBar();
  }

  /* Dezente Parallaxe im Startbild */
  var par = document.querySelector('.hero-par');
  if (par && !reduce) {
    var ticking = false;
    var move = function () {
      ticking = false;
      if (window.innerWidth < 700) { par.style.transform = ''; return; }
      var y = Math.min(window.scrollY, 900);
      par.style.transform = 'translate3d(0,' + (y * 0.08).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
  }

  /* Abo-Rechner: Zahlen zählen kurz hoch */
  var rechner = document.querySelector('[data-rechner]');
  if (rechner) {
    var fmt = function (v) {
      var s = v.toFixed(2).split('.');
      return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'") + '.' + s[1];
    };
    var panel = function (val) { return rechner.querySelector('.p-' + val); };
    var current = (rechner.querySelector('input[name="abo"]:checked') || {}).value || '10';
    var link = rechner.querySelector('[data-abo-link]');
    var texte = {
      '1': 'Hallo Peter, ich interessiere mich für Fahrlektionen.',
      '5': 'Hallo Peter, ich interessiere mich für das Abo mit 5 Lektionen.',
      '10': 'Hallo Peter, ich interessiere mich für das Abo mit 10 Lektionen.',
      '15': 'Hallo Peter, ich interessiere mich für das Abo mit 15 Lektionen.'
    };
    var setLink = function (val) { if (link) link.href = 'https://wa.me/41793597415?text=' + encodeURIComponent(texte[val]); };
    setLink(current);
    rechner.addEventListener('change', function (e) {
      if (!e.target || e.target.name !== 'abo') return;
      var next = e.target.value;
      var from = [].slice.call(panel(current).querySelectorAll('[data-n]')).map(function (s) { return +s.getAttribute('data-n'); });
      var spans = [].slice.call(panel(next).querySelectorAll('[data-n]'));
      current = next;
      setLink(next);
      if (reduce) return;
      var t0 = null, dur = 320;
      var step = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        var ease = 1 - Math.pow(1 - k, 3);
        spans.forEach(function (s, i) {
          var to = +s.getAttribute('data-n');
          var a = from[i] == null ? to : from[i];
          s.textContent = fmt(k === 1 ? to : Math.round(a + (to - a) * ease));
        });
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
})();
