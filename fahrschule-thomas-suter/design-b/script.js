/* Fahrschule Thomas Suter, Design B: Kopfzeile, Menü, Einblenden beim Scrollen, Aktionsleiste */
(function () {
  'use strict';
  window.suterB = true;
  var h = document.documentElement;
  var bewegung = h.classList.contains('fx');

  /* Kopfzeile bekommt nach dem ersten Scrollen eine Fläche */
  var kopf = document.getElementById('kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 16); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü auf schmalen Bildschirmen */
  var knopf = kopf.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  var setMenue = function (offen) {
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menue.hidden = !offen;
    kopf.classList.toggle('menue-offen', offen);
  };
  knopf.addEventListener('click', function () { setMenue(menue.hidden); });
  menue.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href').charAt(0) === '#' && a.getAttribute('href').length > 1) setMenue(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menue.hidden) { setMenue(false); knopf.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1080 && !menue.hidden) setMenue(false); });

  /* Weiches Scrollen zu Ankern (nur mit Bewegung) */
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

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('.rv, .rv-bild, .kursblatt, .zeitleiste');
  var zeigen = function (el) { el.classList.add('ist-sichtbar'); };
  if (!bewegung || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(ziele, zeigen);
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      var n = 0;
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains('rv') && !el.classList.contains('station')) {
          el.style.transitionDelay = Math.min(n, 6) * 80 + 'ms';
          n++;
        }
        zeigen(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(ziele, function (el) { io.observe(el); });
  }

  /* Aktionsleiste auf schmalen Bildschirmen: ausgeblendet, solange die Knöpfe im Hero oder der Kontaktbereich
     im freien Teil des Bildschirms stehen (unten liegen Aktions- und Vorschau-Leiste), sonst sichtbar */
  var leiste = document.getElementById('aktionen');
  var ziele = [document.getElementById('hero-knoepfe'), document.getElementById('kontakt')].filter(Boolean);
  if (leiste && ziele.length && 'IntersectionObserver' in window) {
    var sichtbar = {};
    var aktionIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { sichtbar[e.target.id] = e.isIntersecting; });
      var weg = Object.keys(sichtbar).some(function (k) { return sichtbar[k]; });
      leiste.classList.toggle('ist-da', !weg);
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });
    ziele.forEach(function (z) { aktionIO.observe(z); });
  } else if (leiste) {
    leiste.classList.add('ist-da');
  }
})();
