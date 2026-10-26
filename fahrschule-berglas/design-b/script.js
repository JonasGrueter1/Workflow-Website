/* Design B «Ladestand»: Kopf, Menü, Einblenden, Akkus, Aktionsleiste */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Kopf: Schatten und Ladebalken für den Lesefortschritt */
  var top = document.querySelector('.top');
  var line = document.querySelector('.charge-line');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (line) line.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (top) top.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* Menü auf kleinen Bildschirmen */
  var nav = document.getElementById('nav');
  var btn = document.querySelector('.menu-btn');
  var setMenu = function (open) {
    if (!nav || !btn) return;
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  };
  if (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(btn.getAttribute('aria-expanded') !== 'true');
    });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setMenu(false); });
  }

  /* Sanftes Scrollen nur bei Klicks auf Anker (nicht global, damit andere Scrollbefehle sofort wirken
     und beim schnellen Springen keine Abschnitte unsichtbar bleiben) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (!id || id.length < 2) return;
    var el = document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', id);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });

  /* Akkus: Zellen durchnummerieren, Startwert der Pro-Lektion-Preise */
  var akkus = document.querySelector('[data-akkus]');
  var plan = [];
  if (akkus) {
    var n = 0;
    akkus.querySelectorAll('.akku').forEach(function (row) {
      var cells = row.querySelectorAll('.bat i');
      var start = n;
      cells.forEach(function (c) { c.style.setProperty('--i', n); n++; });
      var el = row.querySelector('.ppl');
      if (el) {
        plan.push({ el: el, to: parseInt(el.getAttribute('data-to'), 10), at: 250 + (start + cells.length) * 45 });
        if (!reduce && hasIO) el.textContent = '95';
      }
    });
  }
  var countDown = function () {
    plan.forEach(function (p) {
      setTimeout(function () {
        var from = 95, t0 = null, dur = 650;
        var step = function (t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / dur);
          var e = 1 - Math.pow(1 - k, 3);
          p.el.textContent = String(Math.round(from + (p.to - from) * e));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, p.at);
    });
  };

  /* Einblenden beim Scrollen und Auslöser für Grafiken */
  var reveal = document.querySelectorAll('.rv');
  var triggers = document.querySelectorAll('[data-akkus], [data-chain], [data-ring], [data-pack]');
  var live = document.querySelectorAll('[data-live]');
  var fire = function (el) {
    if (el.classList.contains('is-on')) return;
    el.classList.add('is-on');
    if (el === akkus && !reduce) countDown();
  };

  if (hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    reveal.forEach(function (el) { io.observe(el); });

    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { fire(en.target); io2.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.15 });
    triggers.forEach(function (el) { io2.observe(el); });

    var io3 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-live'); io3.unobserve(en.target); }
      });
    }, { threshold: 0.45 });
    live.forEach(function (el) { io3.observe(el); });
  } else {
    live.forEach(function (el) { el.classList.add('is-live'); });
    reveal.forEach(function (el) { el.classList.add('is-in'); });
    triggers.forEach(function (el) { el.classList.add('is-on'); });
  }

  /* Aktionsleiste (Smartphone): erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var bar = document.querySelector('.abar');
  var cta = document.querySelector('[data-hero-cta]');
  if (bar && cta && hasIO) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      bar.classList.toggle('is-shown', !en.isIntersecting && en.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(cta);
  } else if (bar) {
    bar.classList.add('is-shown');
  }
})();
