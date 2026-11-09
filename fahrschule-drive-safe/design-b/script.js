/* Fahrschule Drive Safe, Design B «Rally» */
(function () {
  'use strict';
  window.driveSafeB = true;

  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');

  /* ---------- Hero-Auftritt ---------- */
  function los() { doc.classList.add('los'); }
  if (fx) {
    var heroImg = document.querySelector('.hero-bild img');
    var gestartet = false;
    var start = function () { if (gestartet) return; gestartet = true; requestAnimationFrame(function () { requestAnimationFrame(los); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    if (heroImg && !heroImg.complete) heroImg.addEventListener('load', start);
    setTimeout(start, 600);
  } else {
    los();
  }

  /* ---------- Scroll-Reveals ---------- */
  var ziele = document.querySelectorAll('.r, .nr, .quote-zahl, .event');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('an'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('an'); });
  }

  /* ---------- Countdown in Tagen (Europe/Zurich) ---------- */
  function heuteZuerich() {
    try {
      var t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      return Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
    } catch (e) {
      var d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
  var heute = heuteZuerich();
  document.querySelectorAll('.countdown[data-datum]').forEach(function (el) {
    var p = el.getAttribute('data-datum').split('-');
    var ziel = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    var tage = Math.round((ziel - heute) / 86400000);
    if (tage < 0) { el.hidden = true; return; }
    var zahl = el.querySelector('.cd-zahl');
    var text = el.querySelector('.cd-text');
    if (tage === 0) { zahl.textContent = 'Heute'; text.textContent = el.closest('.event-games') ? 'ist Anpfiff' : 'ist Start'; }
    else {
      zahl.textContent = String(tage);
      if (tage === 1) text.textContent = text.textContent.replace('Tage', 'Tag');
    }
    el.hidden = false;
  });

  /* ---------- Laufstreifen Bewertungen ---------- */
  var band = document.querySelector('.band');
  if (band && fx) {
    var spur = band.querySelector('.band-spur');
    var liste = spur.querySelector('.band-liste');
    var kopie = liste.cloneNode(true);
    kopie.setAttribute('aria-hidden', 'true');
    kopie.querySelectorAll('a, [tabindex]').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
    spur.appendChild(kopie);
    band.classList.add('laeuft');
  }

  /* ---------- Sanftes Scrollen zu Ankern ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Aktionsleiste Handy ---------- */
  var aktion = document.getElementById('aktion');
  var hero = document.querySelector('.hero');
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.scrollY || window.pageYOffset;
    if (aktion) aktion.classList.toggle('zeigen', y > Math.min(420, hero.offsetHeight * 0.5));
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
