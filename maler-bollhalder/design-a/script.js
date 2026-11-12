/* Malergeschäft Marc Bollhalder, Design A: Menü, Einblendungen, Haus zum Einfärben, Foto-Kacheln, Aktionsleiste */
(function () {
  'use strict';
  window.bollhalderA = true;

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
  menu.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && !a.hasAttribute('data-soon')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1020) setMenu(false); });

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

  /* Formular: in der Vorschau nichts absenden */
  var form = document.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Foto-Kacheln: Vorschau des gewählten Bildes, nichts wird hochgeladen */
  document.querySelectorAll('.foto input[type="file"]').forEach(function (input) {
    var kachel = input.closest('.foto');
    var img = null;
    var url = null;
    input.addEventListener('change', function () {
      var datei = input.files && input.files[0];
      if (url) { URL.revokeObjectURL(url); url = null; }
      if (img) { img.remove(); img = null; }
      if (datei && /^image\//.test(datei.type)) {
        url = URL.createObjectURL(datei);
        img = document.createElement('img');
        img.src = url;
        img.alt = 'Vorschau: ' + datei.name;
        kachel.appendChild(img);
        kachel.classList.add('hat-bild');
      } else {
        kachel.classList.remove('hat-bild');
      }
    });
  });

  /* Haus zum Einfärben */
  var haus = document.getElementById('haus');
  var status = document.getElementById('haus-status');
  var auswahl = { fassade: 'Sand', laeden: 'Grün', tuer: 'Holz' };
  var statusSetzen = function () {
    status.textContent = 'Fassade ' + auswahl.fassade + ', Fensterläden ' + auswahl.laeden + ', Tür ' + auswahl.tuer;
  };
  document.querySelectorAll('.farbreihe').forEach(function (reihe) {
    var ziel = document.getElementById(reihe.getAttribute('data-ziel'));
    var knoepfe = reihe.querySelectorAll('button');
    knoepfe.forEach(function (btn) {
      btn.addEventListener('click', function () {
        knoepfe.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        ziel.style.fill = btn.getAttribute('data-farbe');
        auswahl[reihe.getAttribute('data-ziel')] = btn.getAttribute('data-name');
        statusSetzen();
        if (haus) haus.classList.add('zeichnet', 'gefuellt', 'fertig');
      });
    });
  });
  var hausZeichnen = function () {
    if (!haus || haus.classList.contains('zeichnet')) return;
    haus.classList.add('zeichnet');
    setTimeout(function () { haus.classList.add('gefuellt'); }, 950);
    setTimeout(function () { haus.classList.add('fertig'); }, 2200);
  };

  /* Gestaffelte Einblendung innerhalb einer Gruppe */
  document.querySelectorAll('[data-staffel]').forEach(function (gruppe) {
    var n = 0;
    gruppe.querySelectorAll('[data-rv]').forEach(function (el) {
      if (el.closest('[data-staffel]') === gruppe) { el.style.setProperty('--d', (n % 4) * 0.09 + 's'); n++; }
    });
  });

  /* Aktionsleiste Handy: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta) {
    var wartet = false;
    var aktionPruefen = function () {
      wartet = false;
      var r = heroCta.getBoundingClientRect();
      aktion.classList.toggle('ist-da', r.bottom < 70 || r.top > window.innerHeight - 110);
    };
    window.addEventListener('scroll', function () { if (!wartet) { wartet = true; requestAnimationFrame(aktionPruefen); } }, { passive: true });
    window.addEventListener('resize', aktionPruefen);
    aktionPruefen();
  }

  /* Einblendungen beim Scrollen */
  var ziele = document.querySelectorAll('[data-rv]');
  var zeige = function (el) { el.classList.add('ist-sichtbar'); };
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(zeige);
    if (haus) haus.classList.add('zeichnet', 'gefuellt', 'fertig');
    return;
  }
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  ziele.forEach(function (el) { io.observe(el); });

  if (haus) {
    var hio = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) { hausZeichnen(); hio.disconnect(); } });
    }, { threshold: 0.3 });
    hio.observe(haus);
  }
})();
