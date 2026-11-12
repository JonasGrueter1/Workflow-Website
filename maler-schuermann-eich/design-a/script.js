/* Erich Schürmann Malergeschäft, Design A: Menü, Pinselstriche, Einblendungen, Bildansicht, Aktionsleiste */
(function () {
  'use strict';
  window.schuermannA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');
  var handy = window.matchMedia('(max-width: 767px)');

  /* Kopf: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var kopfPruefen = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 40); };
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
  window.addEventListener('resize', function () { if (window.innerWidth > 1140) setMenu(false); });

  /* Sanftes Scrollen zu Ankern (nur mit Animationen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!id || id === 'top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: fx ? 'smooth' : 'auto' }); return; }
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Listen Innen/Aussen: am Handy zugeklappt, sonst offen */
  var listen = document.querySelectorAll('.liste');
  var listenSetzen = function () { listen.forEach(function (d) { d.open = !handy.matches; }); };
  listenSetzen();
  if (handy.addEventListener) handy.addEventListener('change', listenSetzen);

  /* Foto-Feld: gewählten Dateinamen anzeigen */
  var foto = document.querySelector('.datei input');
  var fotoName = document.getElementById('foto-name');
  if (foto && fotoName) foto.addEventListener('change', function () {
    if (foto.files && foto.files[0]) fotoName.textContent = foto.files[0].name;
  });

  /* Formular: in der Vorschau nichts absenden */
  var form = document.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Gestaffelte Einblendung innerhalb einer Gruppe */
  document.querySelectorAll('[data-staffel]').forEach(function (gruppe) {
    gruppe.querySelectorAll(':scope > [data-rv]').forEach(function (el, i) { el.style.setProperty('--d', (i % 3) * 0.1 + 's'); });
  });
  document.querySelectorAll('.vorteil-liste li').forEach(function (li, i) { li.style.setProperty('--t', (i * 0.07) + 's'); });
  /* Nach dem Einblenden keine Verzögerung mehr beim Überfahren */
  document.addEventListener('transitionend', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-rv') && el.classList.contains('ist-sichtbar') && e.propertyName === 'opacity') {
      el.style.setProperty('--d', '0s');
    }
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

  /* Bildansicht für die Arbeiten */
  var lb = document.getElementById('lb');
  var bilder = Array.prototype.slice.call(document.querySelectorAll('.galerie .bild'));
  if (lb && typeof lb.showModal === 'function' && bilder.length) {
    var lbBild = document.getElementById('lb-bild');
    var lbText = document.getElementById('lb-text');
    var aktuell = 0;
    var zeigeBild = function (i) {
      aktuell = (i + bilder.length) % bilder.length;
      var a = bilder[aktuell];
      var img = a.querySelector('img');
      lbBild.src = a.getAttribute('href');
      lbBild.alt = img.alt;
      var bt = a.querySelector('.bild-text');
      lbText.textContent = bt.querySelector('strong').textContent + ', ' + bt.lastChild.textContent.trim();
    };
    bilder.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); zeigeBild(i); lb.showModal(); });
    });
    lb.querySelector('.lb-zu').addEventListener('click', function () { lb.close(); });
    lb.querySelector('.lb-vor').addEventListener('click', function () { zeigeBild(aktuell - 1); });
    lb.querySelector('.lb-nach').addEventListener('click', function () { zeigeBild(aktuell + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') zeigeBild(aktuell - 1);
      if (e.key === 'ArrowRight') zeigeBild(aktuell + 1);
    });
    lb.addEventListener('close', function () { if (bilder[aktuell]) bilder[aktuell].focus(); });
  }

  /* Zähler (29, über 30) */
  var zaehle = function (el) {
    var ziel = parseInt(el.getAttribute('data-zahl'), 10);
    var start = null, dauer = 1100;
    var schritt = function (t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      el.textContent = String(Math.round(ziel * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  };

  /* Pinselstriche: nach dem Malen den Endzustand fest setzen */
  document.querySelectorAll('.striche .strich-farbe img').forEach(function (img) {
    img.addEventListener('animationend', function () { img.classList.add('gemalt'); });
  });

  /* Einblendungen beim Scrollen */
  var ziele = document.querySelectorAll('[data-rv], #striche, #vorteil-liste, #zahlen');
  var zeige = function (el) {
    el.classList.add('ist-sichtbar');
    if (el.id === 'zahlen' && fx) el.querySelectorAll('[data-zahl]').forEach(zaehle);
  };
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-sichtbar'); });
    return;
  }
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  ziele.forEach(function (el) { io.observe(el); });
})();
