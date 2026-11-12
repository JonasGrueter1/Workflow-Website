/* Niederberger Bodenbeläge GmbH, Design A: Menü, Dielen, Einblendungen, Musterfächer, Aktionsleiste */
(function () {
  'use strict';
  window.niederbergerA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');

  /* Kopf: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var kopfPruefen = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  kopfPruefen();
  window.addEventListener('scroll', kopfPruefen, { passive: true });

  /* Menü (Tablet und Handy) */
  var menuBtn = document.querySelector('.kopf-menu');
  var menu = document.getElementById('menu');
  var setMenu = function (offen) {
    menuBtn.setAttribute('aria-expanded', String(offen));
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    menu.hidden = !offen;
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1100) setMenu(false); });

  /* Formular: Belag oder Termin vorwählen, wenn ein Knopf auf das Formular zeigt */
  var form = document.querySelector('.formular');
  var waehleBelag = function (wert) {
    if (!form) return;
    form.querySelectorAll('input[name="produkt"]').forEach(function (cb) {
      if (cb.value === wert) cb.checked = true;
    });
  };
  document.addEventListener('click', function (e) {
    var wahl = e.target.closest('[data-belag-wahl]');
    if (wahl) {
      waehleBelag(wahl.getAttribute('data-belag-wahl'));
      var text = wahl.getAttribute('data-text');
      var feld = form && form.querySelector('textarea');
      if (text && feld && !feld.value) feld.value = text;
    }
    if (e.target.closest('[data-termin]')) {
      var t = document.getElementById('termin-wunsch');
      if (t) t.checked = true;
    }
  });
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Sanftes Scrollen zu Ankern (nur mit Animationen) */
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

  /* Dielen: Aufklappen mit weicher Höhe (grid-template-rows 0fr auf 1fr) */
  document.querySelectorAll('.diele').forEach(function (d) {
    var inhalt = d.querySelector('.diele-inhalt');
    var summary = d.querySelector('summary');
    d.addEventListener('toggle', function () {
      if (d.open && !d.classList.contains('ist-offen')) {
        requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ist-offen'); }); });
      } else if (!d.open) {
        d.classList.remove('ist-offen');
      }
    });
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (!d.open) { d.open = true; return; }
      d.classList.remove('ist-offen');
      if (!fx) { d.open = false; return; }
      var fertig = function () {
        inhalt.removeEventListener('transitionend', fertig);
        if (!d.classList.contains('ist-offen')) d.open = false;
      };
      inhalt.addEventListener('transitionend', fertig);
      setTimeout(fertig, 420);
    });
  });

  /* Gestaffelte Einblendung */
  document.querySelectorAll('[data-staffel]').forEach(function (gruppe) {
    gruppe.querySelectorAll(':scope > [data-rv]').forEach(function (el, i) { el.style.setProperty('--d', (i % 4) * 0.1 + 's'); });
  });
  document.querySelectorAll('.haken li, .zeitleiste li').forEach(function (li) {
    li.style.setProperty('--n', Array.prototype.indexOf.call(li.parentNode.children, li));
  });

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('[data-rv], #boden, #haken, #zeitleiste, #faecher');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-da'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Hero: Holz bewegt sich leicht langsamer als die Seite (nur Desktop, nur wenn sichtbar) */
  var holz = document.querySelector('.hero-holz');
  var hero = document.querySelector('.hero');
  if (fx && holz && hero && 'IntersectionObserver' in window) {
    var sichtbar = false, laeuft = false;
    var takt = function () {
      laeuft = false;
      if (!sichtbar || window.innerWidth <= 760) { holz.style.transform = ''; return; }
      holz.style.transform = 'translate3d(0,' + (window.scrollY * 0.16).toFixed(1) + 'px,0)';
    };
    new IntersectionObserver(function (en) { sichtbar = en[0].isIntersecting; takt(); }).observe(hero);
    window.addEventListener('scroll', function () { if (!laeuft) { laeuft = true; requestAnimationFrame(takt); } }, { passive: true });
    window.addEventListener('resize', takt);
  }

  /* Aktionsleiste Handy: erscheint, sobald die Hero-Knöpfe nicht im Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta) {
    var wartet = false;
    var aktionPruefen = function () {
      wartet = false;
      var r = heroCta.getBoundingClientRect();
      aktion.classList.toggle('ist-da', r.bottom < 70 || r.top > window.innerHeight - 150);
    };
    window.addEventListener('scroll', function () { if (!wartet) { wartet = true; requestAnimationFrame(aktionPruefen); } }, { passive: true });
    window.addEventListener('resize', aktionPruefen);
    aktionPruefen();
  }
})();
