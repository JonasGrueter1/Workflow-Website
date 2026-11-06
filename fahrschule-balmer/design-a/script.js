/* Fahrschule Balmer, Design A: Menü, Kopfband, Scroll-Einblendungen */
(function () {
  'use strict';
  window.balA = true;
  var d = document;
  var root = d.documentElement;

  // Kopfband: Schatten nach dem ersten Scrollen
  var kopf = d.getElementById('kopf');
  var onScroll = function () { if (kopf) kopf.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Handy-Menü
  var btn = d.getElementById('menu-btn');
  var nav = d.getElementById('nav');
  if (btn && nav) {
    var setOpen = function (open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
      nav.classList.toggle('is-open', open);
    };
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    d.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !e.target.closest('#nav') && !e.target.closest('#menu-btn')) setOpen(false);
    });
  }

  // Weiches Scrollen zu Ankern (nur per Klick, ohne reduzierte Bewegung)
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var t = id === 'top' ? d.body : d.getElementById(id);
    if (!t) return;
    e.preventDefault();
    if (id !== 'top') [].forEach.call(t.querySelectorAll('[data-r]'), function (el) { el.classList.add('is-in'); });
    var smooth = root.classList.contains('fx');
    if (id === 'top') window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    else t.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  // Scroll-Einblendungen
  var els = [].slice.call(d.querySelectorAll('[data-r]'));
  var showAll = function () { els.forEach(function (el) { el.classList.add('is-in'); }); };
  if (!root.classList.contains('fx') || !('IntersectionObserver' in window)) { showAll(); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  els.forEach(function (el) { io.observe(el); });

  // Sprung über einen Anker: Ziel sofort zeigen
  window.addEventListener('hashchange', function () {
    var t = d.getElementById(location.hash.slice(1));
    if (t) [].forEach.call(t.querySelectorAll('[data-r]'), function (el) { el.classList.add('is-in'); });
  });
})();
