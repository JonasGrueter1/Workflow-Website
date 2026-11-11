/* Fahrschule Keiser, Design B: Kopfzeile, Menü, Einblenden, Zähler, Bewertungen, Lightbox, Aktionsleiste */
(function () {
  'use strict';
  window.keiserB = true;
  var h = document.documentElement;
  var bewegung = h.classList.contains('fx');

  /* Kopfzeile bekommt nach dem ersten Scrollen einen Schatten */
  var kopf = document.getElementById('kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 12); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü auf schmalen Bildschirmen */
  var knopf = kopf.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  var setMenue = function (offen) {
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menue.hidden = !offen;
    document.documentElement.classList.toggle('menue-offen', offen);
  };
  knopf.addEventListener('click', function () { setMenue(menue.hidden); });
  menue.addEventListener('click', function (e) { if (e.target.closest('a')) setMenue(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menue.hidden) { setMenue(false); knopf.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1120 && !menue.hidden) setMenue(false); });

  /* Weiches Scrollen zu Ankern */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: bewegung ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Zähler (zählen einmal hoch, wenn sichtbar) */
  var zaehlen = function (el) {
    var ziel = parseInt(el.getAttribute('data-zaehler'), 10);
    if (!bewegung || !ziel) return;
    var start = null, dauer = 1200;
    el.textContent = '0';
    var schritt = function (t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      el.textContent = String(Math.round(ziel * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  };

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('.rv, .rv-bild, .zitatkarte, .preise, .auto-karte, .kontakt-dekal, [data-zaehler]');
  var zeigen = function (el) {
    el.classList.add('ist-sichtbar');
    if (el.hasAttribute('data-zaehler')) zaehlen(el);
  };
  if (!bewegung || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(ziele, function (el) { el.classList.add('ist-sichtbar'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        zeigen(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(ziele, function (el) { io.observe(el); });
  }

  /* Bewertungen: Pfeile, Tastatur und Wischen, kein automatischer Wechsel */
  var wechsler = document.getElementById('wechsler');
  if (wechsler) {
    var zitate = wechsler.querySelectorAll('.w-zitat');
    var nr = document.getElementById('w-nr');
    var aktiv = 0;
    var gehe = function (richtung) {
      var alt = zitate[aktiv];
      aktiv = (aktiv + richtung + zitate.length) % zitate.length;
      var neu = zitate[aktiv];
      alt.classList.remove('ist-aktiv');
      alt.classList.toggle('raus-links', richtung > 0);
      neu.classList.remove('raus-links');
      if (richtung < 0) {
        /* neues Zitat kommt von links */
        neu.style.transition = 'none';
        neu.classList.add('raus-links');
        void neu.offsetWidth;
        neu.style.transition = '';
        neu.classList.remove('raus-links');
      }
      neu.classList.add('ist-aktiv');
      nr.textContent = String(aktiv + 1);
    };
    Array.prototype.forEach.call(wechsler.querySelectorAll('.w-knopf'), function (b) {
      b.addEventListener('click', function () { gehe(parseInt(b.getAttribute('data-richtung'), 10)); });
    });
    wechsler.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') gehe(1);
      if (e.key === 'ArrowLeft') gehe(-1);
    });
    var x0 = null, y0 = null;
    wechsler.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    wechsler.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) gehe(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  /* Lightbox für den Scan der Auszeichnung */
  var lb = document.getElementById('lightbox');
  var lbLink = document.querySelector('[data-lightbox]');
  if (lb && lbLink && typeof lb.showModal === 'function') {
    lbLink.addEventListener('click', function (e) { e.preventDefault(); lb.showModal(); });
    lb.querySelector('.lb-zu').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }

  /* Aktionsleiste auf dem Handy erscheint, sobald die Knöpfe im Hero weg sind */
  var leiste = document.getElementById('aktionen');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  if (leiste && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (eintraege) {
      var e = eintraege[0];
      leiste.classList.toggle('ist-da', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (leiste) {
    leiste.classList.add('ist-da');
  }
})();
