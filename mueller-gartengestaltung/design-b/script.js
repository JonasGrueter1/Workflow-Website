/* R. Müller Gartengestaltung, Design B: Kopf, Menü, Einblenden, Gartenplan, Aktionsleiste */
(function () {
  'use strict';

  var doc = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var breit = window.matchMedia('(min-width: 1000px)');
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var held = document.querySelector('.held');

  /* ---------- Kopf und Aktionsleiste beim Scrollen ---------- */
  var heldBild = document.querySelector('.held-bild img');
  var takt = false;
  function aufScroll() {
    var y = window.pageYOffset || doc.scrollTop;
    kopf.classList.toggle('fest', y > 80);
    if (aktion && held) aktion.classList.toggle('zeigen', y > held.offsetHeight * 0.55);
    /* leichte Parallaxe im Hero, nur breit und ohne reduzierte Bewegung */
    if (heldBild && !ruhig && window.innerWidth >= 768 && y < held.offsetHeight) {
      heldBild.style.transform = 'translate3d(0,' + (y * 0.14).toFixed(1) + 'px,0)';
    }
    takt = false;
  }
  window.addEventListener('scroll', function () {
    if (!takt) { takt = true; window.requestAnimationFrame(aufScroll); }
  }, { passive: true });
  /* Die Hero-Animation des Bildes nicht durch die Parallaxe überschreiben */
  if (heldBild) {
    heldBild.addEventListener('animationend', function () { heldBild.style.animation = 'none'; aufScroll(); });
  }
  aufScroll();

  /* ---------- Menü am Handy ---------- */
  var menue = document.querySelector('.kopf-menue');
  var nav = document.getElementById('kopf-nav');
  function menueZu() {
    kopf.classList.remove('offen');
    menue.setAttribute('aria-expanded', 'false');
  }
  if (menue && nav) {
    menue.addEventListener('click', function () {
      var offen = kopf.classList.toggle('offen');
      menue.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menueZu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && kopf.classList.contains('offen')) { menueZu(); menue.focus(); } });
  }

  /* ---------- Sanftes Scrollen zu Ankern (per JS, damit Prüfwerkzeuge sofort springen) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = document.querySelectorAll('[data-reveal], .kapitel-nr');
  if (!('IntersectionObserver' in window) || ruhig) {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Gartenplan ---------- */
  var plan = document.getElementById('plan');
  if (!plan) return;
  var blatt = plan.querySelector('.plan-blatt');
  var reihe = document.getElementById('plan-karten');
  var nummern = plan.querySelectorAll('.plan-nr');
  var legende = document.querySelectorAll('.legende button');
  var karten = plan.querySelectorAll('.karte');
  var aktiv = 0;

  function karteVon(nr) { return document.getElementById('karte-' + nr); }

  /* Karte neben die Nummer setzen (nur breit) */
  function platzieren(nr) {
    var karte = karteVon(nr);
    var knopf = plan.querySelector('.plan-nr[data-nr="' + nr + '"]');
    if (!karte || !knopf) return;
    var b = blatt.clientWidth, h = blatt.clientHeight;
    var x = knopf.offsetLeft + knopf.offsetWidth / 2, y = knopf.offsetTop + knopf.offsetHeight / 2;
    var kw = karte.offsetWidth, kh = karte.offsetHeight;
    var links = x > b * 0.52 ? x - kw - 30 : x + 30;
    var oben = Math.max(10, Math.min(y - kh * 0.42, h - kh - 10));
    var sprung = !karte.classList.contains('aktiv');
    if (sprung) karte.style.transition = 'none';
    karte.style.setProperty('--kx', Math.round(links) + 'px');
    karte.style.setProperty('--ky', Math.round(oben) + 'px');
    if (sprung) { void karte.offsetWidth; karte.style.transition = ''; }
  }

  function aktivieren(nr, quelle) {
    nr = String(nr);
    aktiv = nr;
    nummern.forEach(function (n) {
      var an = n.getAttribute('data-nr') === nr;
      n.classList.toggle('aktiv', an);
      n.setAttribute('aria-expanded', an ? 'true' : 'false');
    });
    legende.forEach(function (n) { n.classList.toggle('aktiv', n.getAttribute('data-nr') === nr); });
    if (breit.matches) platzieren(nr);
    karten.forEach(function (k) { k.classList.toggle('aktiv', k.getAttribute('data-nr') === nr); });
    if (!breit.matches && quelle === 'nummer' && reihe) {
      var karte = karteVon(nr);
      var ziel = karte.offsetLeft - parseFloat(getComputedStyle(reihe).paddingLeft || 0);
      reihe.scrollTo({ left: ziel, behavior: ruhig ? 'auto' : 'smooth' });
    }
  }

  nummern.forEach(function (n) {
    n.addEventListener('click', function () { aktivieren(n.getAttribute('data-nr'), 'nummer'); });
    n.addEventListener('mouseenter', function () { if (breit.matches) aktivieren(n.getAttribute('data-nr'), 'maus'); });
    n.addEventListener('focus', function () { if (breit.matches) aktivieren(n.getAttribute('data-nr'), 'fokus'); });
  });
  legende.forEach(function (n) {
    n.addEventListener('click', function () { aktivieren(n.getAttribute('data-nr'), 'legende'); });
    n.addEventListener('mouseenter', function () { aktivieren(n.getAttribute('data-nr'), 'legende'); });
    n.addEventListener('focus', function () { aktivieren(n.getAttribute('data-nr'), 'legende'); });
  });

  /* Handy: beim Wischen durch die Karten die passende Nummer markieren */
  if (reihe && 'IntersectionObserver' in window) {
    var sicht = new IntersectionObserver(function (eintraege) {
      if (breit.matches) return;
      eintraege.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.6) aktivieren(e.target.getAttribute('data-nr'), 'wischen');
      });
    }, { root: reihe, threshold: [0.6] });
    karten.forEach(function (k) { sicht.observe(k); });
  }

  window.addEventListener('resize', function () { if (aktiv && breit.matches) platzieren(aktiv); });

  function fertig() {
    plan.classList.add('fertig');
    if (!aktiv) aktivieren(1, 'start');
  }

  if (ruhig || !('IntersectionObserver' in window)) {
    plan.classList.add('zeichnet');
    fertig();
  } else {
    var planIo = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        planIo.disconnect();
        plan.classList.add('zeichnet');
        window.setTimeout(fertig, 3500);
      });
    }, { threshold: 0.3 });
    planIo.observe(blatt);
  }
})();
