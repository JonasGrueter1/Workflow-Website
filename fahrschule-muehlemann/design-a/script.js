/* Fahrschule Mühlemann, Design A: Kopf, Menü, Schalter Handschaltung/Automat, Einblenden, Weg-Linie */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopf: Schatten nach den ersten Pixeln */
  var top = document.getElementById('top');
  var setTop = function () { top.classList.toggle('is-scrolled', window.scrollY > 8); };

  /* Menü (mobil und Tablet) */
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  var setMenu = function (open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
  };
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href').charAt(0) === '#' && a.getAttribute('href').length > 1) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !btn.contains(e.target)) setMenu(false);
    });
  }

  /* Sanftes Scrollen nur für Anker im Seitenkopf und in der Seite */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'inhalt') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  });

  /* Schalter Handschaltung oder Automat (ARIA-Tabs) */
  var sw = document.querySelector('.switch');
  if (sw) {
    var tabs = [].slice.call(sw.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    panels.forEach(function (p, i) {
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', tabs[i].id);
      p.setAttribute('tabindex', '0');
      if (i !== 0) p.setAttribute('aria-hidden', 'true');
    });
    var select = function (idx, focus) {
      tabs.forEach(function (t, i) {
        var on = i === idx;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
        panels[i].classList.toggle('is-active', on);
        panels[i].setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      sw.setAttribute('data-active', idx === 0 ? 'hand' : 'auto');
      if (focus) tabs[idx].focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
  }

  /* Einblenden beim Scrollen, gestaffelt */
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('io');
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        var el = entry.target;
        el.style.setProperty('--rd', Math.min(i, 5) * 80 + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
        setTimeout(function () { el.style.setProperty('--rd', '0ms'); }, 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Weg zum Führerschein: Linie wächst mit dem Scrollen, Punkte füllen sich */
  var wrap = document.getElementById('steps');
  var fill = wrap ? wrap.querySelector('.steps-fill') : null;
  var track = wrap ? wrap.querySelector('.steps-track') : null;
  var steps = wrap ? [].slice.call(wrap.querySelectorAll('.step')) : [];
  var updateSteps = function () {
    if (!wrap || !fill) return;
    if (reduce) {
      fill.style.transform = 'scaleY(1)';
      steps.forEach(function (s) { s.classList.add('is-on'); });
      return;
    }
    var tr = track.getBoundingClientRect();
    var line = window.innerHeight * 0.62;
    var p = (line - tr.top) / Math.max(1, tr.height);
    p = Math.max(0, Math.min(1, p));
    fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    steps.forEach(function (s) {
      var dot = s.querySelector('.step-no').getBoundingClientRect();
      s.classList.toggle('is-on', dot.top + dot.height / 2 <= line + 2);
    });
  };

  /* Aktionsleiste unten (mobil): erst sichtbar, wenn die Knöpfe im Hero aus dem Bild sind */
  var mbar = document.querySelector('.mbar');
  var heroCta = document.querySelector('.hero-cta');
  if (mbar && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      mbar.classList.toggle('is-shown', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(heroCta);
  } else if (mbar) {
    mbar.classList.add('is-shown');
  }

  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { setTop(); updateSteps(); ticking = false; });
  };
  setTop();
  updateSteps();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
