/* Fahrschule Letzi, Design B: Zählwerke, Einblenden beim Scrollen, Kopf und Aktionsleiste. Nur Vanilla-JS. */
(function () {
  'use strict';
  window.letziB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hatIO = 'IntersectionObserver' in window;

  /* Zahl von 0 auf den Zielwert hochzählen (nur mit Bewegung) */
  function zaehle(el, dauer) {
    var ziel = parseInt(el.getAttribute('data-zahl'), 10);
    if (isNaN(ziel)) return;
    if (!fx) { el.textContent = String(ziel); return; }
    var start = null;
    el.textContent = '0';
    function schritt(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(ziel * e));
      if (p < 1) window.requestAnimationFrame(schritt);
    }
    window.requestAnimationFrame(schritt);
  }

  /* Hero: Ziffern zählen hoch, während die Plakatfelder einfahren */
  if (fx) {
    Array.prototype.forEach.call(document.querySelectorAll('.hero .ziffer'), function (el, i) {
      el.textContent = '0';
      window.setTimeout(function () { zaehle(el, 750); }, 500 + i * 120);
    });
  }

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('.zeige, .woche, .treff-liste, .preis-felder, .ausweis-buehne');
  function zeigen(z) {
    z.classList.add('ist-da');
    if (z.classList.contains('preis-felder') && fx) {
      Array.prototype.forEach.call(z.querySelectorAll('.ziffer'), function (el, i) {
        el.textContent = '0';
        window.setTimeout(function () { zaehle(el, 900); }, 120 + i * 100);
      });
    }
  }
  if (fx && hatIO) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        zeigen(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    Array.prototype.forEach.call(ziele, function (z) { io.observe(z); });
  } else {
    Array.prototype.forEach.call(ziele, function (z) { z.classList.add('ist-da'); });
  }

  /* Sanftes Scrollen zu Ankern (nur mit Bewegung, Fokus wandert mit) */
  if (fx) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      if (id === 'top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var ziel = id && document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      ziel.setAttribute('tabindex', '-1');
      ziel.focus({ preventScroll: true });
    });
  }

  /* Ausweis-Karte: kippt am Desktop leicht mit der Maus (nur mit Bewegung und feinem Zeiger) */
  var buehne = document.querySelector('.ausweis-buehne');
  var ausweis = buehne && buehne.querySelector('.ausweis');
  var feinerZeiger = false;
  try { feinerZeiger = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  if (fx && ausweis && feinerZeiger) {
    var kippRaf = 0;
    var kx = 0, ky = 0;
    function kippen() {
      kippRaf = 0;
      ausweis.style.transform = 'rotateX(' + (ky * -7).toFixed(2) + 'deg) rotateY(' + (kx * 9).toFixed(2) + 'deg) translateZ(0)';
    }
    buehne.addEventListener('pointermove', function (e) {
      var r = ausweis.getBoundingClientRect();
      kx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
      ky = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
      buehne.classList.add('kippt');
      if (!kippRaf) kippRaf = window.requestAnimationFrame(kippen);
    });
    buehne.addEventListener('pointerleave', function () {
      buehne.classList.remove('kippt');
      ausweis.style.transform = '';
    });
  }

  /* Kopf bekommt beim Scrollen eine feine Kante */
  var kopf = document.querySelector('.kopf');
  var tick = false;
  function kopfStatus() {
    tick = false;
    if (kopf) kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; window.requestAnimationFrame(kopfStatus); }
  }, { passive: true });
  kopfStatus();

  /* Aktionsleiste am Handy: erscheint, sobald die Knöpfe im Hero aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  var kontaktCta = document.querySelector('.kontakt-cta');
  if (aktion && heroCta && hatIO) {
    var heroSichtbar = true;
    var kontaktSichtbar = false;
    var io2 = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.target === heroCta) heroSichtbar = e.isIntersecting;
        else kontaktSichtbar = e.isIntersecting;
      });
      aktion.classList.toggle('zeigen', !heroSichtbar && !kontaktSichtbar);
    }, { threshold: 0 });
    io2.observe(heroCta);
    if (kontaktCta) io2.observe(kontaktCta);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
