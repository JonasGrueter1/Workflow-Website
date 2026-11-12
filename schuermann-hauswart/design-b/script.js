/* Schürmann Hauswart GmbH, Design B «Das ganze Jahr» */
(function () {
  'use strict';
  window.schB = true;

  var d = document;
  var root = d.documentElement;
  var fx = root.classList.contains('fx');

  /* ---------- Aktuelle Jahreszeit im Jahresplan und im Hero ---------- */
  var monat = new Date().getMonth(); // 0 = Januar
  var s = monat >= 2 && monat <= 4 ? 0 : monat >= 5 && monat <= 7 ? 1 : monat >= 8 && monat <= 10 ? 2 : 3;
  var chipTexte = [
    'Jetzt im Frühling: Frühlingsschnitt an Sträuchern',
    'Jetzt im Sommer: Gartenunterhalt',
    'Jetzt im Herbst: Herbstschnitt an Sträuchern',
    'Jetzt im Winter: Schneeräumungen und Splitten'
  ];
  var plan = d.querySelector('[data-plan]');
  if (plan) {
    plan.setAttribute('data-jetzt', String(s));
    var band = plan.querySelector('.plan-jetzt');
    if (band) { band.style.gridColumn = String(s + 1); band.hidden = false; }
    plan.querySelectorAll('.mini i[data-s="' + s + '"]').forEach(function (i) { i.classList.add('jetzt-s'); });
  }
  var chip = d.querySelector('[data-jetzt-chip]');
  if (chip) {
    var t = chip.querySelector('[data-jetzt-text]');
    if (t) t.textContent = chipTexte[s];
    chip.hidden = false;
  }

  if (fx) setTimeout(function () { root.classList.add('held-fertig'); }, 2600);

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = d.querySelectorAll('[data-reveal], [data-block], .plan, .motto');
  if (!('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Sanftes Scrollen zu Ankern (nur wenn Bewegung erlaubt) ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = d.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Menü (schmale Bildschirme) ---------- */
  var kopf = d.getElementById('kopf');
  var menuKnopf = d.querySelector('.menu-knopf');
  function menu(auf) {
    kopf.classList.toggle('offen', auf);
    menuKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    root.style.overflow = auf ? 'hidden' : '';
  }
  if (menuKnopf) {
    menuKnopf.addEventListener('click', function () { menu(!kopf.classList.contains('offen')); });
    d.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && kopf.classList.contains('offen')) { menu(false); menuKnopf.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 900 && kopf.classList.contains('offen')) menu(false); }, { passive: true });
  }

  /* ---------- Aktionsleiste: erscheint, wenn die Hero-Knöpfe weg sind ---------- */
  var aktion = d.querySelector('.aktion');
  var heldKnoepfe = d.getElementById('held-knoepfe');
  if (aktion && heldKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      var weg = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      aktion.classList.toggle('zeigen', weg);
    }).observe(heldKnoepfe);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* ---------- Ein rAF-Takt fürs Scrollen: Kopf-Schatten, aktiver Menüpunkt, Parallaxe ---------- */
  var held = d.querySelector('.held');
  var zeichen = d.querySelector('.held-zeichen');
  var heldSichtbar = true;
  if (held && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { heldSichtbar = e[0].isIntersecting; }).observe(held);
  }
  var navLinks = Array.prototype.slice.call(d.querySelectorAll('.nav-liste a'));
  var abschnitte = navLinks.map(function (a) { return d.querySelector(a.getAttribute('href')); });
  var parallaxe = window.matchMedia('(min-width: 901px)');
  var tick = false;
  function takt() {
    tick = false;
    var y = window.scrollY || window.pageYOffset;
    if (kopf) kopf.classList.toggle('ist-gescrollt', y > 8);
    if (fx && zeichen) {
      zeichen.style.transform = (parallaxe.matches && heldSichtbar) ? 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)' : '';
    }
    var mitte = window.innerHeight * 0.35;
    var aktiv = -1;
    abschnitte.forEach(function (sec, i) { if (sec && sec.getBoundingClientRect().top <= mitte) aktiv = i; });
    navLinks.forEach(function (a, i) { if (i === aktiv) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(takt); } }, { passive: true });
  takt();
})();
