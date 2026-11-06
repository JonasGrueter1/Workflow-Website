/* Fahrschule Mühlemann, Design B «Porträt» */
(function () {
  'use strict';

  var root = document.documentElement;
  window.bPortraet = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hero-Auftritt erst, wenn die Schrift bereit ist (höchstens 700 ms warten) */
  var bereit = function () { root.classList.add('bereit'); };
  if (document.fonts && document.fonts.ready && !reduce) {
    var t = setTimeout(bereit, 700);
    document.fonts.ready.then(function () { clearTimeout(t); requestAnimationFrame(bereit); });
  } else {
    bereit();
  }
  /* Sicherheitsnetz: nie unsichtbar bleiben */
  setTimeout(bereit, 1600);

  /* Einblenden beim Scrollen */
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* Sanftes Scrollen zu den Abschnitten (nur bei Klick, nicht für Skripte) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'inhalt') ziel.setAttribute('tabindex', '-1');
  });

  /* Menü am Handy */
  var kopf = document.getElementById('kopf');
  var btn = kopf.querySelector('.rund-menu');
  var menu = document.getElementById('menu');
  var setMenu = function (offen) {
    btn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    btn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    kopf.classList.toggle('menu-offen', offen);
    menu.hidden = !offen;
  };
  btn.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href').charAt(0) === '#' && a.getAttribute('href').length > 1) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); }
  });

  /* Aktionsleiste erst zeigen, wenn die Hero-Knöpfe aus dem Bild sind */
  var leiste = document.querySelector('.leiste');
  var heroKnoepfe = document.querySelector('.hero .knoepfe');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      leiste.classList.toggle('ist-sichtbar', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (leiste) {
    leiste.classList.add('ist-sichtbar');
  }

  /* Dezente Parallaxe der zwei Autos (nur Desktop, nur transform) */
  var par = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var desk = window.matchMedia('(min-width: 900px)');
  if (par.length && !reduce) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      par.forEach(function (img) {
        if (!desk.matches) { img.style.transform = ''; return; }
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p = Math.max(-1, Math.min(1, p));
        var y = p * 20 * parseFloat(img.getAttribute('data-parallax'));
        img.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(1.08)';
      });
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }
})();
