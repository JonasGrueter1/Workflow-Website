/* Fahrschule Mühlemann, Design A: Kopf, Menü, Auftritt, Schalter, Weg-Linie */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hero-Auftritt nach dem ersten Bild */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('ist-geladen'); });
  });

  /* Kopf: Linie beim Scrollen, Aktionsleiste ab dem zweiten Bildschirm */
  var kopf = document.getElementById('kopf');
  var leiste = document.getElementById('aktionsleiste');
  var weg = document.getElementById('schritte');
  var linie = null;
  var schritte = [];
  if (weg) {
    linie = document.createElement('span');
    linie.className = 'weg-fortschritt';
    linie.setAttribute('aria-hidden', 'true');
    weg.insertBefore(linie, weg.firstChild);
    schritte = Array.prototype.slice.call(weg.querySelectorAll('.schritt'));
  }

  function wegAktualisieren() {
    if (!weg || !linie) return;
    var r = weg.getBoundingClientRect();
    var marke = window.innerHeight * 0.62;
    var start = r.top + 22;
    var hoehe = Math.max(1, r.height - 52);
    var p = reduced ? 1 : Math.min(1, Math.max(0, (marke - start) / hoehe));
    linie.style.setProperty('--p', p.toFixed(4));
    var ende = start + p * hoehe;
    schritte.forEach(function (s) {
      var nr = s.querySelector('.nr');
      var nrR = nr.getBoundingClientRect();
      s.classList.toggle('ist-erreicht', reduced || (p > 0.001 && nrR.top + nrR.height / 2 <= ende + 1));
    });
  }

  var geplant = false;
  function beimScrollen() {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(function () {
      geplant = false;
      var y = window.scrollY || window.pageYOffset;
      if (kopf) kopf.classList.toggle('ist-gescrollt', y > 8);
      if (leiste) leiste.classList.toggle('ist-sichtbar', y > window.innerHeight * 0.45);
      wegAktualisieren();
      nachholen();
    });
  }

  /* Scroll-Reveals: IntersectionObserver plus Nachholen für übersprungene Elemente */
  var offen = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  function zeigen(el) { el.classList.add('ist-da'); }
  function nachholen() {
    if (!offen.length) return;
    var h = window.innerHeight;
    offen = offen.filter(function (el) {
      if (el.getBoundingClientRect().top < h * 0.94) { zeigen(el); return false; }
      return true;
    });
  }
  if (reduced || !('IntersectionObserver' in window)) {
    offen.forEach(zeigen);
    offen = [];
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          zeigen(e.target);
          io.unobserve(e.target);
          offen = offen.filter(function (x) { return x !== e.target; });
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    offen.forEach(function (el) { io.observe(el); });
  }

  window.addEventListener('scroll', beimScrollen, { passive: true });
  window.addEventListener('resize', beimScrollen);
  beimScrollen();

  /* Handy-Menü */
  var knopf = document.querySelector('.rund-menu');
  var nav = document.getElementById('nav');
  function menu(auf) {
    if (!knopf || !nav) return;
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    knopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('ist-offen', auf);
  }
  if (knopf && nav) {
    knopf.addEventListener('click', function () { menu(knopf.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
    document.addEventListener('click', function (e) {
      if (knopf.getAttribute('aria-expanded') === 'true' && !e.target.closest('.kopf')) menu(false);
    });
  }

  /* Sanftes Scrollen zu Ankern (nur per Klick, damit Skripte und Prüfwerkzeuge direkt springen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Schalter Handschaltung oder Automat (ARIA-Tabs) */
  var schalter = document.querySelector('.schalter');
  if (schalter) {
    var tabs = Array.prototype.slice.call(schalter.querySelectorAll('[role="tab"]'));
    var waehlen = function (i, fokus) {
      schalter.setAttribute('data-aktiv', String(i));
      tabs.forEach(function (t, k) {
        var an = k === i;
        t.setAttribute('aria-selected', an ? 'true' : 'false');
        t.tabIndex = an ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.toggle('is-aktiv', an);
          if (an) panel.removeAttribute('aria-hidden'); else panel.setAttribute('aria-hidden', 'true');
        }
      });
      if (fokus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { waehlen(i, false); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          waehlen((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
        } else if (e.key === 'Home') { e.preventDefault(); waehlen(0, true); }
        else if (e.key === 'End') { e.preventDefault(); waehlen(tabs.length - 1, true); }
      });
    });
    waehlen(0, false);
  }
})();
