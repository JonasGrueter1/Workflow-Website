/* Design A «Tafelbild»: Menü, Kopf, Einblenden beim Scrollen, Tafelzeichnung, Aktionsleiste */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menü auf kleinen Bildschirmen */
  var burger = d.querySelector('.burger');
  var nav = d.getElementById('nav');
  function setMenu(open) {
    if (!burger || !nav) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('is-open', open);
  }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* Sanftes Scrollen nur für Klicks auf Anker im Menü (nicht global, damit andere Scrollbefehle sofort wirken) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = id === '#top' ? d.body : d.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (id === '#top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', id);
    if (id !== '#top') {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  });

  /* Kopf mit Linie, sobald gescrollt */
  var hd = d.getElementById('hd');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (hd) hd.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Fertig gezeichnete Kreidelinien und Autos bleiben danach fest stehen (ohne laufende Animation) */
  d.addEventListener('animationend', function (e) {
    var t = e.target;
    if (t && t.classList && (t.classList.contains('ln') || t.classList.contains('wipe') || t.classList.contains('car'))) {
      t.classList.add('done');
    }
  });

  var reveal = d.querySelectorAll('.rv');
  var board = d.getElementById('board');
  var bar = d.getElementById('actionbar');
  var cta = d.getElementById('hero-cta');

  if (!('IntersectionObserver' in window)) {
    reveal.forEach(function (el) { el.classList.add('is-in'); });
    if (board) board.classList.add('is-drawn');
    if (bar) bar.classList.add('is-on');
    return;
  }

  /* Aktionsleiste auf kleinen Bildschirmen, sobald die Knöpfe im Hero weg sind */
  if (bar && cta) {
    var ao = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var past = !en.isIntersecting && en.boundingClientRect.top < 0;
        bar.classList.toggle('is-on', past);
      });
    }, { threshold: 0 });
    ao.observe(cta);
  }

  /* Weniger Bewegung: alles sofort zeigen */
  if (reduce) {
    reveal.forEach(function (el) { el.classList.add('is-in'); });
    if (board) board.classList.add('is-drawn');
    return;
  }

  /* Einblenden beim Scrollen */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  reveal.forEach(function (el) { io.observe(el); });

  /* Tafel zeichnet sich, sobald sie im Bild ist */
  if (board) {
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          board.classList.add('is-drawn');
          bo.disconnect();
        }
      });
    }, { threshold: 0.3 });
    bo.observe(board);
  }
})();
