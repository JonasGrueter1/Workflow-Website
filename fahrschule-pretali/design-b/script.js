/* Fahrschule Pretali, Design B: Kopfzeile, Menü, Einblenden, Aktionsleiste */
(function () {
  'use strict';
  window.pretaliB = true;
  var h = document.documentElement;
  var bewegung = h.classList.contains('fx');

  /* Kopfzeile bekommt nach dem ersten Scrollen eine Linie */
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

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('.rv, .rv-bild, .kap-kopf, .preise, .weg, .stimme');
  if (!bewegung || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(ziele, function (el) { el.classList.add('ist-sichtbar'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('ist-sichtbar');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(ziele, function (el) { io.observe(el); });
  }

  /* Aktionsleiste am Handy: erscheint, sobald die Knöpfe im Hero aus dem Bild sind */
  var aktionen = document.getElementById('aktionen');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  if (aktionen && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (eintraege) {
      var e = eintraege[0];
      aktionen.classList.toggle('ist-da', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (aktionen) {
    aktionen.classList.add('ist-da');
  }
})();
