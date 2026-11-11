/* Fahrschule Kukaq Beqir, Design A «Es lohnt sich»: Hero, Kombi-Rechnung, Kursdaten, Einblenden, Menü, Aktionsleiste */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var hasIO = 'IntersectionObserver' in window;

  /* Hero-Auftritt, sobald die Schriften bereit sind */
  var gestartet = false;
  var start = function () {
    if (gestartet) return;
    gestartet = true;
    requestAnimationFrame(function () { root.classList.add('ist-geladen'); });
  };
  if (!reduced && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 900);
  } else {
    start();
  }

  /* Kursdaten: vergangene Termine ausblenden (Datum in Europe/Zurich) */
  var heute = (function () {
    try {
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      var d = new Date();
      var z = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    }
  })();
  each(document.querySelectorAll('[data-termine]'), function (liste) {
    var sichtbar = 0;
    each(liste.querySelectorAll('li[data-datum]'), function (li) {
      if (li.getAttribute('data-datum') < heute) li.hidden = true; else sichtbar++;
    });
    if (!sichtbar) {
      liste.hidden = true;
      var leer = liste.nextElementSibling;
      if (leer && leer.classList.contains('termine-leer')) leer.hidden = false;
    }
  });

  /* Kombi-Rechnung: Zeilen erscheinen, Summe zählt bis 900, wird durchgestrichen, Kombi 780 schiebt sich ein */
  var rechnung = document.getElementById('rechnung');
  if (rechnung) {
    var zahl = rechnung.querySelector('.r-zahl');
    var ziel = parseInt(zahl.getAttribute('data-ziel'), 10) || 900;
    var fertig = function () {
      zahl.textContent = String(ziel);
      rechnung.classList.add('laeuft', 'durch', 'kombi-da');
    };
    if (reduced || !hasIO) {
      fertig();
    } else {
      zahl.textContent = '0';
      var zaehlen = function (dauer, danach) {
        var t0 = null;
        var schritt = function (t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / dauer);
          var e = 1 - Math.pow(1 - p, 3);
          zahl.textContent = String(Math.round(ziel * e));
          if (p < 1) requestAnimationFrame(schritt); else danach();
        };
        requestAnimationFrame(schritt);
      };
      var abspielen = function () {
        rechnung.classList.add('laeuft');
        setTimeout(function () {
          zaehlen(600, function () {
            setTimeout(function () {
              rechnung.classList.add('durch');
              setTimeout(function () { rechnung.classList.add('kombi-da'); }, 300);
            }, 100);
          });
        }, 700);
      };
      var ro = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (en) {
          if (en.isIntersecting) { ro.disconnect(); abspielen(); }
        });
      }, { threshold: 0.35 });
      ro.observe(rechnung);
    }
  }

  /* Gestaffeltes Einblenden: Geschwister in derselben Gruppe bekommen eine Verzögerung */
  var reveals = document.querySelectorAll('[data-reveal]');
  each(reveals, function (el) {
    var geschwister = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
    var idx = geschwister.indexOf(el);
    if (idx > 0) el.style.setProperty('--i', Math.min(idx, 6));
  });
  if (reduced || !hasIO) {
    each(reveals, function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-da'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    each(reveals, function (el) { io.observe(el); });
  }

  /* Sanftes Scrollen zu Ankern (nur ohne Wunsch nach reduzierter Bewegung) */
  if (!reduced) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var ziel = document.querySelector(id);
      if (!ziel) return;
      e.preventDefault();
      var kopfH = document.getElementById('kopf').offsetHeight;
      var y = ziel.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - kopfH - 12;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* Kopf: Schatten beim Scrollen, Menü am Handy, aktiver Anker */
  var kopf = document.getElementById('kopf');
  var menuBtn = kopf.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  var setzeMenu = function (offen) {
    kopf.classList.toggle('ist-offen', offen);
    menuBtn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  };
  menuBtn.addEventListener('click', function () { setzeMenu(!kopf.classList.contains('ist-offen')); });
  each(nav.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { setzeMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('ist-offen')) { setzeMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (kopf.classList.contains('ist-offen') && !kopf.contains(e.target)) setzeMenu(false);
  });

  var anker = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var ziele = anker.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var hero = document.querySelector('.hero');
  var leiste = document.getElementById('aktionsleiste');
  var tick = false;
  var aktualisieren = function () {
    tick = false;
    var y = window.scrollY || window.pageYOffset;
    kopf.classList.toggle('ist-gescrollt', y > 8);
    if (leiste && hero) leiste.classList.toggle('ist-sichtbar', y > hero.offsetHeight * 0.55);
    var marke = y + window.innerHeight * 0.35;
    var aktiv = -1;
    ziele.forEach(function (z, i) { if (z && z.getBoundingClientRect().top + y <= marke) aktiv = i; });
    anker.forEach(function (a, i) { a.classList.toggle('ist-aktiv', i === aktiv); });
  };
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(aktualisieren); }
  }, { passive: true });
  window.addEventListener('resize', aktualisieren);
  aktualisieren();
})();
