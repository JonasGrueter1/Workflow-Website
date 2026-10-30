/* Fahrschule Bolliger, Design A: Kopf, Menü, Einblenden, Preis-Reiter */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopf mit Schatten beim Scrollen */
  var hd = document.querySelector('.hd');
  var onScroll = function () { hd.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menü auf schmalen Bildschirmen */
  var nav = document.getElementById('nav');
  var burger = document.querySelector('.burger');
  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  };
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Sanftes Scrollen nur für Anker im Menü und in der Seite */
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

  /* Einblenden beim Scrollen */
  var items = document.querySelectorAll('.rv');
  var showAll = function () { items.forEach(function (el) { el.classList.add('is-in'); }); };
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    showAll();
  }

  /* Dezente Parallaxe des Flottenfotos (nur grosse Bildschirme, ohne reduzierte Bewegung) */
  var heroImg = document.querySelector('.hero-photo img');
  if (heroImg && !reduce && window.matchMedia('(min-width: 1061px)').matches) {
    heroImg.classList.add('px');
    var ticking = false;
    var parallax = function () {
      ticking = false;
      var y = Math.min(window.scrollY, 380);
      heroImg.style.setProperty('--py', (y * 0.07).toFixed(1) + 'px');
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(parallax); }
    }, { passive: true });
  }

  /* Aktionsleiste erst zeigen, wenn die Knöpfe im Hero aus dem Bild sind */
  var bar = document.querySelector('.actionbar');
  var heroCta = document.querySelector('.hero-cta');
  if (bar && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-on', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (bar) {
    bar.classList.add('is-on');
  }

  /* Preis-Reiter mit gleitender Markierung */
  var tablist = document.querySelector('.tabs');
  if (tablist) {
    var tabs = [].slice.call(tablist.querySelectorAll('[role="tab"]'));
    var tabBar = tablist.querySelector('.tab-bar');
    var moveBar = function (tab) {
      tabBar.style.transform = 'translateX(' + tab.offsetLeft + 'px) scaleX(' + (tab.offsetWidth / 100) + ')';
    };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        if (on && !reduce) {
          panel.querySelectorAll('.rows li').forEach(function (li, n) { li.style.setProperty('--n', n); });
          panel.classList.remove('is-anim'); void panel.offsetWidth; panel.classList.add('is-anim');
        }
      });
      moveBar(tab);
      if (focus) tab.focus();
      var l = tab.offsetLeft - 16, r = tab.offsetLeft + tab.offsetWidth + 16;
      if (l < tablist.scrollLeft || r > tablist.scrollLeft + tablist.clientWidth) {
        tablist.scrollTo({ left: Math.max(0, l), behavior: reduce ? 'auto' : 'smooth' });
      }
    };
    tabs.forEach(function (t, i) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = i !== 0;
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var current = function () { return tablist.querySelector('[aria-selected="true"]'); };
    var sync = function () { tabBar.style.transition = 'none'; moveBar(current()); void tabBar.offsetWidth; tabBar.style.transition = ''; };
    var edge = function () { tablist.classList.toggle('at-end', tablist.scrollLeft + tablist.clientWidth >= tablist.scrollWidth - 4); };
    tablist.addEventListener('scroll', edge, { passive: true });
    sync(); edge();
    window.addEventListener('resize', function () { sync(); edge(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  }
})();
