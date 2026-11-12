/* Scheidegger Design B «Leitung»: Menü, Einblenden, Leitung, Zähler, Aktionsleiste */
(function () {
  'use strict';
  window.schB = true;

  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Menü ---------- */
  var kopf = document.getElementById('kopf');
  var knopf = document.querySelector('.kopf-menu');
  var menu = document.getElementById('menu');
  function menuZu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    knopf.setAttribute('aria-expanded', 'false');
    knopf.setAttribute('aria-label', 'Menü öffnen');
    kopf.classList.remove('offen');
  }
  if (knopf && menu) {
    knopf.addEventListener('click', function () {
      var auf = menu.hidden;
      menu.hidden = !auf;
      knopf.setAttribute('aria-expanded', String(auf));
      knopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
      kopf.classList.toggle('offen', auf);
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menuZu(); knopf.focus(); } });
  }

  /* ---------- Sanftes Scrollen zu Ankern (nicht bei reduzierter Bewegung) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    var y = id === 'top' ? 0 : ziel.getBoundingClientRect().top + window.scrollY - (kopf ? kopf.offsetHeight : 0) - 8;
    window.scrollTo({ top: y, behavior: fx ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Formular: noch nicht angeschlossen ---------- */
  var form = document.getElementById('formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Ohne Animation: alles sofort fertig */
  function allesZeigen() {
    document.querySelectorAll('[data-reveal], .energien, .fragen-liste, .strang').forEach(function (el) { el.classList.add('ist-da'); });
    document.querySelectorAll('.abschnitt').forEach(function (el) { el.classList.add('ist-an'); });
  }

  /* ---------- Zähler ---------- */
  function zaehlen(el) {
    var ziel = parseInt(el.getAttribute('data-ziel'), 10) || 0;
    if (!fx) { el.textContent = ziel; return; }
    var start = null, dauer = 1500;
    el.textContent = '0';
    function schritt(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dauer);
      var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      el.textContent = Math.round(ziel * e);
      if (k < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }

  if (!fx || !hasIO) {
    allesZeigen();
  } else {
    /* Einblenden */
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('ist-da');
        if (e.target.id === 'messer') {
          var z = e.target.querySelector('.zaehler');
          if (z) zaehlen(z);
        }
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    document.querySelectorAll('[data-reveal], .energien, .fragen-liste, .strang').forEach(function (el) { io.observe(el); });

    /* Abzweig: wenn die Abschnittsmarke die 60-%-Linie erreicht */
    var ioMarke = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sec = e.target.closest('.abschnitt');
        if (sec) sec.classList.add('ist-an');
        ioMarke.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
    document.querySelectorAll('.abschnitt .marke-nr').forEach(function (el) { ioMarke.observe(el); });

    /* Leitung: Fluss folgt dem Scrollen (ein rAF-Takt, nur sichtbare Abschnitte) */
    var desktop = window.matchMedia('(min-width: 1024px)');
    var sichtbar = new Set();
    var fluesse = new Map();
    document.querySelectorAll('.abschnitt').forEach(function (sec) {
      var f = sec.querySelector('.l-fluss');
      if (f) fluesse.set(sec, { el: f, wert: -1 });
    });
    var ioSicht = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) sichtbar.add(e.target); else sichtbar.delete(e.target); });
      anstossen();
    }, { rootMargin: '10% 0px 10% 0px' });
    fluesse.forEach(function (_, sec) { ioSicht.observe(sec); });

    var geplant = false;
    function anstossen() { if (!geplant) { geplant = true; requestAnimationFrame(takt); } }
    function takt() {
      geplant = false;
      if (!desktop.matches) return;
      var linie = window.innerHeight * 0.6;
      sichtbar.forEach(function (sec) {
        var f = fluesse.get(sec);
        var r = sec.getBoundingClientRect();
        var k = (linie - r.top) / r.height;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        /* Unterhalb der Seite: letzter Abschnitt füllt sich ganz */
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) k = Math.max(k, 1);
        k = Math.round(k * 1000) / 1000;
        if (k !== f.wert) { f.wert = k; f.el.style.transform = 'scaleY(' + k + ')'; }
      });
      /* Abschnitte über dem Bildschirm sind voll */
      fluesse.forEach(function (f, sec) {
        if (sichtbar.has(sec)) return;
        var r = sec.getBoundingClientRect();
        var k = r.bottom < 0 ? 1 : 0;
        if (k !== f.wert) { f.wert = k; f.el.style.transform = 'scaleY(' + k + ')'; }
      });
    }
    window.addEventListener('scroll', anstossen, { passive: true });
    window.addEventListener('resize', anstossen, { passive: true });
    anstossen();
  }

  /* ---------- Aktiver Menüpunkt ---------- */
  if (hasIO) {
    var navLinks = {};
    document.querySelectorAll('.nav a').forEach(function (a) { navLinks[a.getAttribute('href').slice(1)] = a; });
    var ioNav = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        var a = navLinks[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('ist-aktiv'); });
          a.classList.add('ist-aktiv');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { ioNav.observe(s); });
  }

  /* ---------- Aktionsleiste am Telefon: nach dem Hero einblenden ---------- */
  var aktion = document.getElementById('aktion');
  var hero = document.querySelector('.hero');
  var kontaktSec = document.getElementById('kontakt');
  if (aktion && hero && hasIO) {
    /* Nach dem Hero zeigen, im Kontaktbereich mit Formular wieder ausblenden */
    var heroDa = true, kontaktDa = false;
    var aktionSetzen = function () { aktion.classList.toggle('zeigen', !heroDa && !kontaktDa); };
    new IntersectionObserver(function (eintraege) {
      heroDa = eintraege[0].isIntersecting; aktionSetzen();
    }, { rootMargin: '-35% 0px 0px 0px' }).observe(hero);
    if (kontaktSec) {
      new IntersectionObserver(function (eintraege) {
        kontaktDa = eintraege[0].isIntersecting; aktionSetzen();
      }, { rootMargin: '-40% 0px -45% 0px' }).observe(kontaktSec);
    }
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
