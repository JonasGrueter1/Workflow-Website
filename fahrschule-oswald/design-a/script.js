/* Fahrschule Oliver Oswald, Design A «Schräge Flächen»: Menü, Kopfzeile, Wochenansicht (Heute), Einblenden, Aktionsleiste */
(function () {
  'use strict';

  var reduziert = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Menü am Handy */
  var kopf = document.getElementById('kopf');
  var menuKnopf = kopf ? kopf.querySelector('.kopf-menu') : null;
  var nav = document.getElementById('kopf-nav');
  var menuZu = function () {
    if (!kopf) return;
    kopf.classList.remove('ist-offen');
    if (menuKnopf) menuKnopf.setAttribute('aria-expanded', 'false');
  };
  if (menuKnopf) {
    menuKnopf.addEventListener('click', function () {
      var offen = kopf.classList.toggle('ist-offen');
      menuKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
  }
  if (nav) nav.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf && kopf.classList.contains('ist-offen')) { menuZu(); if (menuKnopf) menuKnopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (kopf && kopf.classList.contains('ist-offen') && !kopf.contains(e.target)) menuZu();
  });

  /* Wochenansicht: heutigen Tag (Zeit in Zürich) markieren */
  var tagIndex = new Date().getDay();
  try {
    var kurz = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Zurich' }).format(new Date());
    var i = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(kurz);
    if (i >= 0) tagIndex = i;
  } catch (err) { /* Fallback: Zeit des Geräts */ }
  var heute = document.querySelector('.tag[data-tag="' + tagIndex + '"]');
  if (heute) {
    heute.classList.add('ist-heute');
    var etikett = document.createElement('span');
    etikett.className = 'heute';
    etikett.textContent = 'Heute';
    heute.querySelector('.tag-name').appendChild(etikett);
  }

  /* Einblenden beim Scrollen. Zusätzlich zum Observer prüft jeder Scroll-Schritt, damit bei schnellen
     Sprüngen (Anker, Tastatur) nichts unsichtbar bleibt, was schon über dem unteren Rand liegt. */
  var offen = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], .kante'));
  var zeigen = function (el) { el.classList.add('ist-da'); };
  var io = null;
  if (reduziert || !('IntersectionObserver' in window)) {
    offen.forEach(zeigen);
    offen = [];
  } else {
    io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeigen(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    offen.forEach(function (el) { io.observe(el); });
  }
  var nachziehen = function () {
    if (!offen.length) return;
    var grenze = window.innerHeight * 0.94;
    offen = offen.filter(function (el) {
      if (el.classList.contains('ist-da')) return false;
      if (el.getBoundingClientRect().top < grenze) { zeigen(el); if (io) io.unobserve(el); return false; }
      return true;
    });
  };

  /* Sanftes Scrollen nur bei Klicks auf Anker (nicht global, damit Sprünge sofort ankommen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var ziel = a.getAttribute('href') === '#' ? null : document.querySelector(a.getAttribute('href'));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
  });

  /* Kopfzeile, aktiver Menüpunkt, Aktionsleiste, dezente Parallaxe im Hero */
  var anker = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
  var abschnitte = anker.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var hero = document.querySelector('.hero');
  var leiste = document.getElementById('aktionsleiste');
  var wartet = false;
  var aktualisieren = function () {
    wartet = false;
    var y = window.scrollY || window.pageYOffset;
    if (kopf) kopf.classList.toggle('ist-gescrollt', y > 8);
    if (leiste && hero) leiste.classList.toggle('ist-sichtbar', y > hero.offsetHeight * 0.6);
    if (hero && !reduziert && y < hero.offsetHeight * 1.2) hero.style.setProperty('--par', (y * 0.14).toFixed(1));
    var marke = y + window.innerHeight * 0.35;
    var aktiv = -1;
    abschnitte.forEach(function (z, k) { if (z && z.getBoundingClientRect().top + y <= marke) aktiv = k; });
    anker.forEach(function (a, k) { a.classList.toggle('ist-aktiv', k === aktiv); });
    nachziehen();
  };
  window.addEventListener('scroll', function () {
    if (!wartet) { wartet = true; window.requestAnimationFrame(aktualisieren); }
  }, { passive: true });
  window.addEventListener('resize', aktualisieren);
  aktualisieren();
})();
