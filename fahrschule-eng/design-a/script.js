/* Fahrschule Eng, Design A: Kopf, Menü, Einblenden, Aktionsleiste */
(function () {
  'use strict';
  window.engA = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: feine Linie, sobald gescrollt ---------- */
  var kopf = document.getElementById('kopf');
  var kopfTick = false;
  function kopfPruefen() {
    kopfTick = false;
    if (kopf) kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
  }
  window.addEventListener('scroll', function () {
    if (!kopfTick) { kopfTick = true; requestAnimationFrame(kopfPruefen); }
  }, { passive: true });
  kopfPruefen();

  /* ---------- Menü auf schmalen Bildschirmen ---------- */
  var knopf = document.querySelector('.menu-knopf');
  var nav = document.getElementById('nav');
  function menu(auf) {
    if (!knopf || !nav) return;
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    nav.classList.toggle('ist-offen', auf);
  }
  if (knopf && nav) {
    knopf.addEventListener('click', function () { menu(knopf.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') { menu(false); knopf.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (knopf.getAttribute('aria-expanded') === 'true' && !e.target.closest('.kopf')) menu(false);
    });
  }

  /* ---------- Anker-Links: sanft scrollen ---------- */
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

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = Array.prototype.slice.call(document.querySelectorAll('.rv, .weg'));
  function zeigen(el) {
    el.classList.add('ist-da');
    if (!el.classList.contains('rv')) return;
    var fertig = function (e) {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.classList.add('rv-fertig');
      el.removeEventListener('transitionend', fertig);
    };
    el.addEventListener('transitionend', fertig);
  }
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { zeigen(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz bei schnellem Scrollen oder Sprüngen: alles oberhalb des Bildschirmrands zeigen */
    var offen = ziele.slice(), netzTick = false;
    var netz = function () {
      netzTick = false;
      var h = window.innerHeight;
      offen = offen.filter(function (el) {
        if (el.classList.contains('ist-da')) return false;
        if (el.getBoundingClientRect().top < h * 0.96) { zeigen(el); io.unobserve(el); return false; }
        return true;
      });
      if (!offen.length) window.removeEventListener('scroll', netzPlanen);
    };
    var netzPlanen = function () { if (!netzTick) { netzTick = true; requestAnimationFrame(netz); } };
    window.addEventListener('scroll', netzPlanen, { passive: true });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da', 'rv-fertig'); });
  }

  /* ---------- Aktionsleiste: erst, wenn die Hero-Knöpfe aus dem Bild sind ---------- */
  var aktion = document.getElementById('aktion');
  var cta = document.getElementById('hero-cta');
  if (aktion) {
    if (hasIO && cta) {
      var sichtbarCta = true, amEnde = false;
      var setzen = function () { aktion.classList.toggle('ist-sichtbar', !sichtbarCta && !amEnde); };
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          sichtbarCta = en.isIntersecting || en.boundingClientRect.top > 0;
        });
        setzen();
      }).observe(cta);
      /* Im Kontaktbereich stehen die gleichen Knöpfe gross: Leiste dort ausblenden */
      var kontakt = document.querySelector('.kontakt-knoepfe');
      if (kontakt) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { amEnde = en.isIntersecting; });
          setzen();
        }).observe(kontakt);
      }
    } else {
      aktion.classList.add('ist-sichtbar');
    }
  }
})();
