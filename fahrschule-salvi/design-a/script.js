/* Fahrschule Salvi, Design A: Menü, Kopf, Reveals, Prüfungsorte-Karte, Preistreppe */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;

  /* Menü mobil */
  var kopf = document.getElementById('kopf');
  var knopf = kopf && kopf.querySelector('.kopf-menue');
  function menue(offen) {
    if (!kopf || !knopf) return;
    kopf.classList.toggle('offen', offen);
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    knopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (knopf) {
    knopf.addEventListener('click', function () { menue(!kopf.classList.contains('offen')); });
    kopf.querySelectorAll('.kopf-nav a').forEach(function (a) {
      a.addEventListener('click', function () { menue(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); knopf.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (kopf.classList.contains('offen') && !kopf.contains(e.target)) menue(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1080 && kopf.classList.contains('offen')) menue(false);
    });
  }

  /* Sanftes Scrollen zu Ankern */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Linie unter dem Kopf beim Scrollen */
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      if (kopf) kopf.classList.toggle('gescrollt', window.scrollY > 6);
      tick = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Beobachter: einmal auslösen, wenn sichtbar */
  function einmal(els, fn, opts) {
    if (!els.length) return;
    if (reduce || !hatIO) { els.forEach(fn); return; }
    var offen = els.slice();
    function erledigt(el) {
      var i = offen.indexOf(el);
      if (i < 0) return;
      offen.splice(i, 1);
      io.unobserve(el);
      fn(el);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) erledigt(en.target); });
    }, opts || { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: was schon oberhalb liegt (Sprung per Anker), sofort zeigen */
    function nachholen() {
      if (!offen.length) return;
      offen.slice().forEach(function (el) {
        if (el.getBoundingClientRect().bottom < 0) erledigt(el);
      });
    }
    window.addEventListener('load', nachholen);
    window.addEventListener('scroll', function () { requestAnimationFrame(nachholen); }, { passive: true });
  }

  /* Scroll-Reveals mit leichtem Versatz innerhalb einer Gruppe */
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
  einmal(reveals, function (el) {
    if (el.classList.contains('is-in')) return;
    var geschw = el.parentElement ? [].slice.call(el.parentElement.children).filter(function (c) { return c.hasAttribute('data-reveal'); }) : [];
    var idx = Math.max(0, geschw.indexOf(el));
    el.style.transitionDelay = reduce ? '0s' : Math.min(idx, 5) * 70 + 'ms';
    el.classList.add('is-in');
    setTimeout(function () { el.style.transitionDelay = ''; }, 1400);
  });

  /* Aktionsleiste mobil: erst zeigen, wenn die Knöpfe im Hero aus dem Bild sind */
  var aktion = document.querySelector('.aktion');
  var heroKnoepfe = document.querySelector('.hero-knoepfe');
  if (aktion && heroKnoepfe && hatIO) {
    aktion.classList.add('ist-weg');
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        aktion.classList.toggle('ist-weg', en.isIntersecting);
      });
    }, { threshold: 0 }).observe(heroKnoepfe);
  }

  /* Karte: Puls, dann vier Linien nacheinander */
  var karte = document.getElementById('karte');
  if (karte) {
    einmal([karte], function (el) {
      el.classList.add('zeichnen');
      setTimeout(function () { el.classList.add('fertig'); }, reduce ? 0 : 2400);
    }, { threshold: 0.3 });

    /* Liste und Karte verbinden: Ort hervorheben */
    var teile = karte.querySelectorAll('[data-ort]');
    function fokus(ort) {
      karte.classList.toggle('hat-fokus', !!ort);
      teile.forEach(function (t) { t.classList.toggle('ist-fokus', t.getAttribute('data-ort') === ort); });
      document.querySelectorAll('.orte-liste li').forEach(function (li) {
        li.classList.toggle('ist-aktiv', li.getAttribute('data-ort') === ort);
      });
    }
    document.querySelectorAll('.orte-liste li[data-ort]').forEach(function (li) {
      li.addEventListener('mouseenter', function () { if (karte.classList.contains('fertig')) fokus(li.getAttribute('data-ort')); });
      li.addEventListener('mouseleave', function () { fokus(null); });
    });
  }

  /* Preistreppe: Stufen wachsen, Preise zählen von 93 herunter */
  var treppe = document.getElementById('treppe');
  if (treppe) {
    var zahlen = [].slice.call(treppe.querySelectorAll('[data-zahl]'));
    einmal([treppe], function (el) {
      el.classList.add('wachsen');
      if (reduce) return;
      zahlen.forEach(function (z, i) {
        var ziel = parseInt(z.getAttribute('data-zahl'), 10);
        var start = 93;
        if (ziel === start) return;
        var t0 = null, dauer = 900, warte = 250 + i * 80;
        z.textContent = start;
        function schritt(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, Math.max(0, (ts - t0 - warte) / dauer));
          var e = 1 - Math.pow(1 - p, 3);
          z.textContent = Math.round(start + (ziel - start) * e);
          if (p < 1) requestAnimationFrame(schritt);
        }
        requestAnimationFrame(schritt);
      });
    }, { threshold: 0.25 });
  }
})();
