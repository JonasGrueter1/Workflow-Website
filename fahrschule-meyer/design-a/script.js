/* Fahrschule Meyer, Design A: Kopf, Menü, Einblenden, Aktionsleiste */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Gestaffelte Reihenfolge für Listen */
  [].forEach.call(doc.querySelectorAll('[data-stagger], .menu-liste'), function (list) {
    [].forEach.call(list.children, function (child, i) { child.style.setProperty('--i', i); });
  });

  /* Kopf wird beim Scrollen dunkelrot */
  var kopf = doc.getElementById('kopf');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      kopf.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü am Handy */
  var btn = doc.querySelector('.kopf-menu');
  var menu = doc.getElementById('menu');
  var label = btn && btn.querySelector('.kopf-menu-text');
  function setMenu(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (label) label.textContent = open ? 'Schliessen' : 'Menü';
    body.classList.toggle('menu-offen', open);
    if (open) {
      menu.hidden = false;
      window.requestAnimationFrame(function () { menu.classList.add('is-open'); });
      var first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
    }
  }
  if (btn && menu) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1080 && btn.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* Sanftes Springen zu den Abschnitten (nur bei Klick, nicht bei Skript-Scrollen) */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && doc.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'inhalt') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* Einblenden beim Scrollen */
  var items = [].slice.call(doc.querySelectorAll('[data-rv], [data-rk]'));
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Aktionsleiste am Handy: erst zeigen, wenn die Knöpfe im Plakat aus dem Bild sind */
  var aktion = doc.getElementById('aktion');
  var heroBtns = doc.getElementById('held-knoepfe');
  if (aktion && heroBtns && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      aktion.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(heroBtns);
  } else if (aktion) {
    aktion.classList.add('is-on');
  }
})();
