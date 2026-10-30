/* Fahrschule Dino, Design A: Kopfzeile, Einblenden beim Scrollen, Aktionsleiste mobil */
(function () {
  'use strict';
  var root = document.documentElement;

  // Kopfzeile bekommt beim Scrollen eine feine Linie
  var top = document.getElementById('top');
  var onScroll = function () { top.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var items = [].slice.call(document.querySelectorAll('.rv'));
  var showAll = function () { items.forEach(function (el) { el.classList.add('is-in'); }); };

  var bar = document.getElementById('abar');
  if (!('IntersectionObserver' in window)) {
    showAll();
    if (bar) bar.classList.add('is-on');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });

    // Aktionsleiste erst zeigen, wenn die Knöpfe im Hero aus dem Bild sind
    var cta = document.getElementById('hero-cta');
    if (bar && cta) {
      new IntersectionObserver(function (entries) {
        bar.classList.toggle('is-on', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
      }).observe(cta);
    }
  }

  // Sicherheitsnetz: nichts bleibt unsichtbar, falls ein Ereignis ausbleibt
  window.addEventListener('load', function () {
    setTimeout(function () {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    }, 1200);
  });
  // Hero-Auftritt starten, sobald der Ausgangszustand einmal gezeichnet ist
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('go'); }); });

  // Sanftes Scrollen zu den Abschnitten (nur wenn Bewegung erwünscht ist)
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });
})();
