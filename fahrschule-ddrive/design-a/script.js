/* D’Drive Fahrschule, Design A: Kopf, Menü, Einblenden, Zähler, CHF 19, Reifenspur im Weg ab 2027 */
(function () {
  'use strict';

  var html = document.documentElement;
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Farbe nach dem Scrollen ---------- */
  var kopf = document.getElementById('kopf');
  var onScrollKopf = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 12); };
  onScrollKopf();
  window.addEventListener('scroll', onScrollKopf, { passive: true });

  /* ---------- Handy-Menü ---------- */
  var knopf = kopf.querySelector('.menue-knopf');
  var nav = document.getElementById('menue');
  var setMenue = function (offen) {
    kopf.classList.toggle('menue-offen', offen);
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    document.body.style.overflow = offen ? 'hidden' : '';
  };
  knopf.addEventListener('click', function () { setMenue(knopf.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && a.getAttribute('href').charAt(0) === '#' && a.getAttribute('href').length > 1) setMenue(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('menue-offen')) { setMenue(false); knopf.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 980 && kopf.classList.contains('menue-offen')) setMenue(false); });

  /* ---------- Sanftes Scrollen zu Ankern (nur bei Klick, nicht bei Scroll-Befehlen) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2 || a.hasAttribute('data-soon')) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    var y = ziel.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 200 : kopf.offsetHeight + 12);
    window.scrollTo({ top: Math.max(0, y), behavior: ruhig ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Zähler für die Preise ---------- */
  var zaehle = function (el) {
    var ziel = parseInt(el.getAttribute('data-zahl'), 10);
    if (ruhig || !ziel) { el.textContent = String(ziel); return; }
    var start = null, dauer = 650;
    el.textContent = '0';
    var schritt = function (t) {
      if (start === null) start = t;
      var x = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - x, 3);
      el.textContent = String(Math.round(ziel * e));
      if (x < 1) requestAnimationFrame(schritt); else el.textContent = String(ziel);
    };
    requestAnimationFrame(schritt);
  };

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal], .station'));
  var zeige = function (el) {
    if (el.classList.contains('ist-da')) return;
    el.classList.add('ist-da');
    [].forEach.call(el.querySelectorAll('[data-zahl]'), function (z) { setTimeout(function () { zaehle(z); }, 150); });
  };
  if (!hatIO || ruhig) {
    reveals.forEach(zeige);
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Weg ab 2027: Spur füllt sich mit dem Scrollen, Räder drehen beim Erreichen ---------- */
  var strecke = document.querySelector('[data-strecke]');
  if (strecke && !ruhig) {
    var stationen = [].slice.call(strecke.querySelectorAll('.station'));
    var senkrecht = window.matchMedia('(max-width: 1099px)');
    var spur = strecke.querySelector('.strecke-spur');
    var laeuft = false;
    var rechne = function () {
      laeuft = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var r = spur.getBoundingClientRect();
      var p;
      if (senkrecht.matches) {
        p = (vh * 0.62 - r.top) / Math.max(1, r.height);
      } else {
        p = (vh * 0.86 - r.top) / (vh * 0.5);
      }
      p = Math.max(0, Math.min(1, p));
      strecke.style.setProperty('--p', p.toFixed(4));
      stationen.forEach(function (st) {
        var rr = st.querySelector('.st-rad').getBoundingClientRect();
        var pos = senkrecht.matches
          ? (rr.top + rr.height / 2 - r.top) / Math.max(1, r.height)
          : (rr.left + rr.width / 2 - r.left) / Math.max(1, r.width);
        st.classList.toggle('ist-erreicht', p >= pos - 0.01);
      });
    };
    var plane = function () { if (!laeuft) { laeuft = true; requestAnimationFrame(rechne); } };
    strecke.style.setProperty('--p', '0');
    rechne();
    window.addEventListener('scroll', plane, { passive: true });
    window.addEventListener('resize', plane);
  }

  /* ---------- Aktionsleiste ausblenden, wenn Kontakt oder Fusszeile sichtbar ---------- */
  var aktion = document.querySelector('.aktion');
  var ziele = [document.querySelector('.hero-knoepfe'), document.getElementById('kontakt'), document.querySelector('.fuss')];
  if (aktion && hatIO) {
    var sichtbar = new Set();
    var io2 = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) sichtbar.add(e.target); else sichtbar.delete(e.target); });
      aktion.classList.toggle('ist-weg', sichtbar.size > 0);
    }, { threshold: 0 });
    ziele.forEach(function (z) { if (z) io2.observe(z); });
  }
})();
