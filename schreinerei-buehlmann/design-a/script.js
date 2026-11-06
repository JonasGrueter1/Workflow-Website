/* HB Design, Design A: Kopf, Menü, Einblenden, Galerie mit Filter und Lightbox, Aktionsleiste */
(function () {
  'use strict';
  window.hbA = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Kopf: Linie und Schatten nach dem ersten Scrollen */
  var kopf = $('#kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menü für schmale Bildschirme */
  var menuBtn = $('.menu-btn');
  var nav = $('#nav');
  var setMenu = function (offen) {
    menuBtn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('ist-offen', offen);
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('ist-offen')) { setMenu(false); menuBtn.focus(); }
  });

  /* Sanftes Scrollen zu Ankern (nur bei Klicks, damit normales Scrollen nicht verzögert wird) */
  $$('a[href^="#"]:not([data-soon])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var ziel = id === 'top' ? document.body : document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: fx ? 'smooth' : 'auto' });
      } else {
        ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
        if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
        ziel.focus({ preventScroll: true });
      }
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* Einblenden beim Scrollen, gestaffelt pro Gruppe */
  var gruppen = [['.staerken-liste > .rv', 90], ['.kacheln > .rv', 70], ['.galerie > .rv', 50]];
  gruppen.forEach(function (g) {
    $$(g[0]).forEach(function (el, i) { el.style.setProperty('--d', (i * g[1] / 1000) + 's'); });
  });
  var rvEls = $$('.rv');
  var schritte = $('#schritte');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('ist-da');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvEls.forEach(function (el) { io.observe(el); });
    io.observe(schritte);
  } else {
    rvEls.forEach(function (el) { el.classList.add('ist-da'); });
    schritte.classList.add('ist-da');
  }

  /* Galerie: Filter */
  var galerie = $('#galerie');
  var items = $$('.g-item', galerie);
  var chips = $$('.chip');
  var status = $('#filter-status');
  var filterTimer;
  var filtern = function (kat, chip) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
    var zeigen = items.filter(function (it) { return kat === 'alle' || it.getAttribute('data-kat') === kat; });
    status.textContent = zeigen.length + ' Bilder: ' + chip.textContent;
    clearTimeout(filterTimer);
    if (!fx) {
      items.forEach(function (it) { it.hidden = zeigen.indexOf(it) < 0; });
      return;
    }
    galerie.classList.add('filtert');
    items.forEach(function (it) {
      it.classList.add('ist-da');
      if (zeigen.indexOf(it) < 0 && !it.hidden) it.classList.add('geht');
    });
    filterTimer = setTimeout(function () {
      items.forEach(function (it) {
        var an = zeigen.indexOf(it) >= 0;
        if (!an) { it.hidden = true; return; }
        if (it.hidden) { it.classList.add('geht'); it.hidden = false; }
      });
      void galerie.offsetWidth;
      zeigen.forEach(function (it) { it.classList.remove('geht'); });
      filterTimer = setTimeout(function () { galerie.classList.remove('filtert'); }, 300);
    }, 250);
  };
  chips.forEach(function (c) {
    c.addEventListener('click', function () { filtern(c.getAttribute('data-filter'), c); });
  });

  /* Galerie: Lightbox mit dem dialog-Element */
  var lb = $('#lb');
  var rahmen = $('#lb-rahmen');
  var lbText = $('#lb-text');
  var lbZahl = $('#lb-zahl');
  var bild = null;
  var liste = [];
  var pos = 0;
  var sichtbar = function () { return items.filter(function (it) { return !it.hidden; }); };
  var zeige = function (i) {
    pos = (i + liste.length) % liste.length;
    var it = liste[pos];
    var link = $('.g-link', it);
    var klein = $('img', link);
    if (!bild) { bild = document.createElement('img'); bild.decoding = 'async'; rahmen.appendChild(bild); }
    bild.classList.add('laedt');
    bild.alt = klein.alt;
    bild.onload = function () { bild.classList.remove('laedt'); };
    bild.src = link.getAttribute('href');
    lbText.textContent = $('.g-text', it).lastChild.textContent;
    lbZahl.textContent = (pos + 1) + ' / ' + liste.length;
    var naechstes = liste[(pos + 1) % liste.length];
    if (naechstes) { var vor = new Image(); vor.src = $('.g-link', naechstes).getAttribute('href'); }
  };
  if (lb && typeof lb.showModal === 'function') {
    items.forEach(function (it) {
      $('.g-link', it).addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
        e.preventDefault();
        liste = sichtbar();
        zeige(liste.indexOf(it));
        lb.showModal();
        $('#lb-zu').focus();
      });
    });
    $('#lb-zu').addEventListener('click', function () { lb.close(); });
    $('#lb-zurueck').addEventListener('click', function () { zeige(pos - 1); });
    $('#lb-weiter').addEventListener('click', function () { zeige(pos + 1); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); zeige(pos - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); zeige(pos + 1); }
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-innen')) lb.close(); });
    var startX = null;
    lb.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) zeige(pos + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  /* Aktionsleiste: erscheint, sobald die Knöpfe im Hero aus dem Bild sind */
  var aktion = $('#aktion');
  var heroKnoepfe = $('#hero-knoepfe');
  if (heroKnoepfe) {
    var aktionPruefen = function () { aktion.classList.toggle('ist-da', heroKnoepfe.getBoundingClientRect().bottom < 0); };
    aktionPruefen();
    window.addEventListener('scroll', aktionPruefen, { passive: true });
    window.addEventListener('resize', aktionPruefen);
  } else {
    aktion.classList.add('ist-da');
  }

  /* Werkstatt: kleines Foto bewegt sich leicht gegen das grosse (nur mit Animationen, breite Bildschirme) */
  var klein = $('#werk-klein');
  if (fx && klein && window.matchMedia('(min-width: 981px)').matches) {
    var tick = false;
    var para = function () {
      tick = false;
      var r = klein.parentNode.getBoundingClientRect();
      var mitte = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      klein.style.setProperty('--py', Math.max(-1, Math.min(1, mitte)) * 36 + 'px');
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(para); } }, { passive: true });
    para();
  }
})();
