/* HMplus Holzbau AG, Design A: Menü, Scroll-Effekte, Zähler, Zeitstrahl, Referenzen-Band */
(function () {
  'use strict';
  window.hmA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');

  /* Kopf: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Dezente Parallaxe im Hero-Bild (nur Desktop, nur mit Animationen) */
  var par = document.getElementById('hero-par');
  if (fx && par && window.matchMedia('(min-width: 961px)').matches) {
    var parWartet = false;
    var parSetzen = function () {
      parWartet = false;
      var y = window.scrollY;
      if (y < window.innerHeight * 1.2) par.style.transform = 'translate3d(0,' + Math.min(y * 0.1, par.offsetHeight * 0.05).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () { if (!parWartet) { parWartet = true; requestAnimationFrame(parSetzen); } }, { passive: true });
  }

  /* Menü am Handy */
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

  /* Formular: in der Vorschau nichts absenden */
  var form = document.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Referenzen-Band: Pfeile */
  var band = document.getElementById('ref-band');
  var knoepfe = document.querySelectorAll('.pfeil-knopf');
  var schritt = function () {
    var li = band.querySelector('li');
    return li ? li.getBoundingClientRect().width + 20 : 320;
  };
  var pfeileAktualisieren = function () {
    var max = band.scrollWidth - band.clientWidth - 2;
    knoepfe.forEach(function (k) {
      var r = Number(k.getAttribute('data-richtung'));
      k.disabled = r < 0 ? band.scrollLeft <= 2 : band.scrollLeft >= max;
    });
  };
  knoepfe.forEach(function (k) {
    k.addEventListener('click', function () {
      band.scrollBy({ left: Number(k.getAttribute('data-richtung')) * schritt() * 2, behavior: fx ? 'smooth' : 'auto' });
    });
  });
  band.addEventListener('scroll', pfeileAktualisieren, { passive: true });
  window.addEventListener('resize', pfeileAktualisieren);
  pfeileAktualisieren();

  /* Aktionsleiste am Handy: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  /* Auch auf kleinen Handys (320 px), wo die Hero-Knöpfe noch unter der Vorschau-Leiste liegen, ist sie sofort da */
  if (aktion && heroCta) {
    var aktionWartet = false;
    var aktionPruefen = function () {
      aktionWartet = false;
      var r = heroCta.getBoundingClientRect();
      var sichtbarBis = window.innerHeight - 90;
      aktion.classList.toggle('ist-da', r.bottom < 70 || r.top > sichtbarBis - 24);
    };
    window.addEventListener('scroll', function () { if (!aktionWartet) { aktionWartet = true; requestAnimationFrame(aktionPruefen); } }, { passive: true });
    window.addEventListener('resize', aktionPruefen);
    aktionPruefen();
  } else if (aktion) {
    aktion.classList.add('ist-da');
  }

  /* Zähler */
  var zaehle = function (el) {
    var ziel = Number(el.getAttribute('data-zahl'));
    if (!fx || ziel < 2) { el.textContent = String(ziel); return; }
    var start = null, dauer = 1200;
    el.textContent = '0';
    var tick = function (t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(ziel * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* Plan: Weg des roten Stifts = Breite des Bildes */
  var plan = document.getElementById('planblatt');
  var planBreite = function () {
    var img = plan && plan.querySelector('img');
    if (img) plan.style.setProperty('--plan-b', img.getBoundingClientRect().width + 'px');
  };
  planBreite();
  window.addEventListener('resize', planBreite);

  var alle = document.querySelectorAll('[data-reveal], #zeitstrahl, #planblatt, [data-zahl]');
  var zeige = function (el) {
    if (el.id === 'zeitstrahl') el.classList.add('laeuft');
    else if (el.id === 'planblatt') { planBreite(); el.classList.add('zeichnet', 'ist-sichtbar'); }
    else if (el.hasAttribute('data-zahl')) zaehle(el);
    else el.classList.add('ist-sichtbar');
  };

  if (!('IntersectionObserver' in window)) {
    alle.forEach(zeige);
    return;
  }
  if (fx) {
    document.querySelectorAll('[data-zahl]').forEach(function (el) { el.textContent = '0'; });
  }
  var offen = Array.prototype.slice.call(alle);
  var erledigt = function (el) {
    var i = offen.indexOf(el);
    if (i > -1) { offen.splice(i, 1); zeige(el); io.unobserve(el); }
  };
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) erledigt(e.target); });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  alle.forEach(function (el) { io.observe(el); });

  /* Sicherheitsnetz bei schnellem Scrollen: alles, was schon oberhalb des Bildschirmrands liegt, wird gezeigt */
  var wartet = false;
  var nachholen = function () {
    wartet = false;
    var h = window.innerHeight;
    offen.slice().forEach(function (el) { if (el.getBoundingClientRect().top < h * 0.94) erledigt(el); });
    if (!offen.length) window.removeEventListener('scroll', beimScrollen);
  };
  var beimScrollen = function () { if (!wartet) { wartet = true; requestAnimationFrame(nachholen); } };
  window.addEventListener('scroll', beimScrollen, { passive: true });

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
})();
