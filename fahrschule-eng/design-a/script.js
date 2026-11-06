/* Fahrschule Eng, Design A: Menü, Kopfzeile, Einblendungen, Weg-Linie, Aktionsleiste */
(function () {
  'use strict';
  window.engA = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var kopf = document.querySelector('.kopf');

  /* Kopfzeile: feine Linie nach dem ersten Scrollen */
  function kopfLinie() { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); }
  kopfLinie();
  window.addEventListener('scroll', kopfLinie, { passive: true });

  /* Menü am Handy */
  var knopf = document.querySelector('.menu-knopf');
  var menu = document.getElementById('menu');
  function menuZu() {
    knopf.setAttribute('aria-expanded', 'false');
    knopf.setAttribute('aria-label', 'Menü öffnen');
    menu.hidden = true;
  }
  if (knopf && menu) {
    knopf.addEventListener('click', function () {
      var offen = knopf.getAttribute('aria-expanded') === 'true';
      if (offen) { menuZu(); return; }
      knopf.setAttribute('aria-expanded', 'true');
      knopf.setAttribute('aria-label', 'Menü schliessen');
      menu.hidden = false;
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { menuZu(); knopf.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900 && !menu.hidden) menuZu(); });
  }

  /* Einblenden beim Scrollen */
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* Der Weg zum Führerschein: Linie zeichnet sich mit dem Scrollen, Kreise füllen sich */
  var weg = document.querySelector('.weg');
  if (weg) {
    var schritte = [].slice.call(weg.querySelectorAll('.schritt'));
    var stand = fx ? 0 : 1;
    var ende = function () {
      var letzter = schritte[schritte.length - 1];
      if (letzter) weg.style.setProperty('--ende', Math.max(0, letzter.offsetHeight - 26) + 'px');
    };
    var zeichne = function () {
      var r = weg.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      var p = (vh * 0.78 - r.top) / (r.height * 0.85 + vh * 0.12);
      p = Math.max(0, Math.min(1, p));
      if (p > stand) stand = p; /* nur vorwärts, die Linie bleibt gezeichnet */
      weg.style.setProperty('--p', stand.toFixed(3));
      schritte.forEach(function (s, i) {
        var schwelle = schritte.length > 1 ? i / (schritte.length - 1) : 0;
        if (stand >= schwelle - 0.02) s.classList.add('an');
      });
    };
    ende();
    window.addEventListener('resize', ende);
    if (fx) {
      var geplant = false;
      var tick = function () { geplant = false; zeichne(); };
      window.addEventListener('scroll', function () { if (!geplant) { geplant = true; requestAnimationFrame(tick); } }, { passive: true });
      window.addEventListener('resize', zeichne);
      zeichne();
    } else {
      weg.style.setProperty('--p', '1');
      schritte.forEach(function (s) { s.classList.add('an'); });
    }
  }

  /* Aktionsleiste am Handy: erscheint, sobald die Knöpfe im Hero aus dem Bild sind */
  var aktion = document.querySelector('.aktion');
  var heroCta = document.querySelector('.hero-cta');
  var kontakt = document.getElementById('kontakt');
  if (aktion && heroCta && 'IntersectionObserver' in window) {
    /* ausgeblendet, solange die Knöpfe im Hero oder der Kontaktbereich zu sehen sind */
    var heroWeg = false, kontaktDa = false;
    var setze = function () { aktion.classList.toggle('zeigen', heroWeg && !kontaktDa); };
    new IntersectionObserver(function (eintraege) {
      var e = eintraege[0];
      heroWeg = !e.isIntersecting && e.boundingClientRect.top < 0;
      setze();
    }).observe(heroCta);
    if (kontakt) {
      new IntersectionObserver(function (eintraege) {
        kontaktDa = eintraege[0].isIntersecting;
        setze();
      }, { rootMargin: '0px 0px -35% 0px' }).observe(kontakt);
    }
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
