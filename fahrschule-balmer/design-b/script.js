/* Fahrschule Balmer, Design B: Kopf, Menü, Einblenden, Paket-Wähler, Kundenstimmen */
(function () {
  'use strict';
  window.balB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');

  /* Hero erst starten, wenn die Schriften bereit sind (höchstens 600 ms warten) */
  var hero = document.querySelector('.hero');
  if (hero) {
    var gestartet = false;
    var starten = function () { if (gestartet) return; gestartet = true; hero.classList.add('los'); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(starten);
    setTimeout(starten, 600);
  }

  /* Kopf: Hintergrund nach dem ersten Scrollen */
  var kopf = document.querySelector('.kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü (Tablet und Handy) */
  var menuKnopf = document.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  var menuZu = function () {
    nav.classList.remove('ist-offen');
    menuKnopf.setAttribute('aria-expanded', 'false');
    menuKnopf.setAttribute('aria-label', 'Menü öffnen');
  };
  menuKnopf.addEventListener('click', function () {
    var offen = !nav.classList.contains('ist-offen');
    nav.classList.toggle('ist-offen', offen);
    menuKnopf.setAttribute('aria-expanded', String(offen));
    menuKnopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('ist-offen')) { menuZu(); menuKnopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('ist-offen') && !e.target.closest('.kopf')) menuZu();
  });

  /* Weiches Scrollen zu Abschnitten (nicht bei reduzierter Bewegung) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    if (id === 'top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: fx ? 'smooth' : 'auto' }); return; }
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('[data-r], .tage');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* Paket-Wähler (ARIA-Tabs) mit rollender Zahl */
  var liste = document.querySelector('.segmente');
  if (liste) {
    var tabs = Array.prototype.slice.call(liste.querySelectorAll('[role="tab"]'));
    var rollen = document.querySelectorAll('.tacho .rolle');
    var waehlen = function (index, fokus) {
      tabs.forEach(function (tab, i) {
        var aktiv = i === index;
        tab.setAttribute('aria-selected', String(aktiv));
        tab.tabIndex = aktiv ? 0 : -1;
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (aktiv) {
          panel.hidden = false;
          panel.classList.remove('ist-neu'); void panel.offsetWidth; panel.classList.add('ist-neu');
        } else {
          panel.hidden = true;
        }
      });
      liste.style.setProperty('--n', index);
      var preis = tabs[index].getAttribute('data-preis');
      for (var k = 0; k < rollen.length; k++) rollen[k].style.setProperty('--d', preis.charAt(k));
      if (fokus) tabs[index].focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { waehlen(i, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); waehlen(n, true); }
      });
    });
    waehlen(0, false);
    document.querySelectorAll('.paket.ist-neu').forEach(function (p) { p.classList.remove('ist-neu'); });
  }

  /* Kundenstimmen: eine grosse Stimme, Pfeile, Punkte, Wischen */
  var folien = Array.prototype.slice.call(document.querySelectorAll('.folie'));
  var steuer = document.querySelector('.stimmen-steuer');
  var punkteBox = document.querySelector('.punkte');
  if (folien.length && steuer && punkteBox) {
    var aktuell = 0;
    var zahl = steuer.querySelector('.stimmen-zahl b');
    var punkte = folien.map(function (f, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Stimme ' + (i + 1) + ' von ' + folien.length);
      b.setAttribute('aria-controls', f.id);
      b.addEventListener('click', function () { zeigen(i); });
      punkteBox.appendChild(b);
      return b;
    });
    var zeigen = function (i) {
      aktuell = (i + folien.length) % folien.length;
      folien.forEach(function (f, k) {
        var an = k === aktuell;
        f.classList.toggle('ist-aktiv', an);
        f.setAttribute('aria-hidden', String(!an));
      });
      punkte.forEach(function (p, k) { p.setAttribute('aria-current', String(k === aktuell)); });
      zahl.textContent = (aktuell < 9 ? '0' : '') + (aktuell + 1);
    };
    steuer.hidden = false;
    punkteBox.hidden = false;
    steuer.querySelectorAll('[data-schritt]').forEach(function (b) {
      b.addEventListener('click', function () { zeigen(aktuell + Number(b.getAttribute('data-schritt'))); });
    });
    var buehne = document.querySelector('.stimmen-buehne');
    var startX = null, startY = null;
    buehne.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    buehne.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) zeigen(aktuell + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
    zeigen(0);
  }
})();
