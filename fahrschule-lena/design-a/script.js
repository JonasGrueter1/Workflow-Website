/* Fahrschule Lena, Design A: Kopf beim Scrollen, Einblendungen im Chatverlauf, Aktionsleiste */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.getElementById('top');
  var hero = document.querySelector('.hero');
  var cta = document.getElementById('ich-will');
  var dock = document.querySelector('.dock');
  var deko = document.querySelector('.hero-deko');

  /* Kopf: auf dem Verlauf transparent, danach weiss */
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      top.classList.toggle('is-scrolled', y > 24);
      /* dezente Parallaxe der Rauten im Startbereich */
      if (deko && !reduce && y < window.innerHeight * 1.2) deko.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Hero-Chat: Nachrichten laufen ab, sobald das Chat-Fenster sichtbar ist */
  var chat = document.querySelector('.hero-chat');
  if (chat) {
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { chat.classList.add('is-live'); cio.disconnect(); }
      }, { threshold: 0.3 });
      cio.observe(chat);
    } else {
      chat.classList.add('is-live');
    }
  }

  /* Einblenden: Fragen von rechts, Antworten von links, je 120 ms versetzt */
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        entry.target.style.setProperty('--d', Math.min(i, 3) * 110 + 'ms');
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Anker im Kopf: weich scrollen (nur bei Klick, nicht global) */
  document.querySelectorAll('a[href^="#"]:not([data-soon])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* Aktionsleiste am unteren Rand: erst nach dem Startbereich, nicht beim Schluss-Aufruf */
  if (dock && hero && 'IntersectionObserver' in window) {
    var heroIn = true, ctaIn = false;
    var setDock = function () { dock.classList.toggle('is-on', !heroIn && !ctaIn); };
    new IntersectionObserver(function (e) { heroIn = e[0].isIntersecting; setDock(); }, { rootMargin: '-35% 0px 0px 0px' }).observe(hero);
    if (cta) new IntersectionObserver(function (e) { ctaIn = e[0].isIntersecting; setDock(); }, { threshold: 0.35 }).observe(cta);
  } else if (dock) {
    dock.classList.add('is-on');
  }
})();
