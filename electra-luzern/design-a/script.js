/* Electra AG Luzern, Design A: Menü, Einblenden, Zähler, Ablauf Elektrokontrolle, Aktionsleiste */
(function () {
  'use strict';
  window.electraA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');
  var hatIO = 'IntersectionObserver' in window;

  /* Kopf: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var kopfSetzen = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 40); };
  kopfSetzen();
  window.addEventListener('scroll', kopfSetzen, { passive: true });

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
  window.addEventListener('resize', function () { if (window.innerWidth > 1060) setMenu(false); });

  /* Sanftes Scrollen zu Ankern (nur bei Klick, nicht global, damit Scroll-Skripte und Tests sauber laufen) */
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

  /* Formular: in der Vorschau nicht absenden (Hinweis kommt über data-soon) */
  var form = document.getElementById('formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Zähler */
  var zaehle = function (el) {
    var ziel = parseInt(el.getAttribute('data-zahl'), 10);
    if (!fx || isNaN(ziel) || ziel === 0) { el.textContent = String(ziel); return; }
    var start = null, dauer = 1300;
    var schritt = function (t) {
      if (start === null) start = t;
      var x = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - x, 3);
      el.textContent = String(Math.round(ziel * e));
      if (x < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  };

  /* Einblenden beim Scrollen */
  var sichtbar = function (el) {
    el.classList.add('ist-sichtbar');
    var zahlen = el.querySelectorAll('[data-zahl]');
    for (var i = 0; i < zahlen.length; i++) zaehle(zahlen[i]);
  };
  var ziele = document.querySelectorAll('.rv, .slogan');
  if (fx && hatIO) {
    var zahlenStart = document.querySelectorAll('.rv [data-zahl]');
    for (var z = 0; z < zahlenStart.length; z++) {
      if (zahlenStart[z].getBoundingClientRect().top > window.innerHeight) zahlenStart[z].textContent = '0';
    }
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (en.isIntersecting) { sichtbar(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    for (var k = 0; k < ziele.length; k++) io.observe(ziele[k]);
  } else {
    for (var j = 0; j < ziele.length; j++) ziele[j].classList.add('ist-sichtbar');
  }

  /* Funke entlang der Stromlinie: Weg auf die Linienlänge setzen */
  var strich = document.querySelector('.sl-strich');
  var funke = document.querySelector('.sl-funke');
  var funkeSetzen = function () {
    if (!strich || !funke) return;
    var w = strich.getBoundingClientRect().width;
    var links = strich.getBoundingClientRect().left - funke.parentNode.getBoundingClientRect().left;
    funke.style.left = links + 'px';
    funke.style.setProperty('--weg', Math.max(200, w - 40) + 'px');
  };
  funkeSetzen();
  window.addEventListener('resize', funkeSetzen);

  /* Ablauf Elektrokontrolle: rote Linie an den Scroll gekoppelt */
  var ablauf = document.getElementById('ablauf');
  if (ablauf) {
    var schritte = ablauf.querySelectorAll('.schritt');
    var linie = ablauf.querySelector('.ablauf-linie');
    var spur = ablauf.querySelector('.al-spur');
    var anteile = [];
    var messen = function () {
      var s = spur.getBoundingClientRect();
      var senkrecht = s.height > s.width;
      anteile = [];
      for (var i = 0; i < schritte.length; i++) {
        var nr = schritte[i].querySelector('.nr').getBoundingClientRect();
        var a = senkrecht ? (nr.top + nr.height / 2 - s.top) / s.height : (nr.left + nr.width / 2 - s.left) / s.width;
        anteile.push(Math.max(0, Math.min(1, a)));
      }
    };
    var aktualisieren = function (p) {
      ablauf.style.setProperty('--p', p.toFixed(4));
      for (var i = 0; i < schritte.length; i++) schritte[i].classList.toggle('ist-an', p >= anteile[i] - 0.001);
      ablauf.classList.toggle('ist-fertig', p >= 0.995);
    };
    if (!fx) {
      for (var a = 0; a < schritte.length; a++) schritte[a].classList.add('ist-an');
      ablauf.classList.add('ist-fertig');
    } else {
      var wartet = false;
      var rechnen = function () {
        wartet = false;
        var r = ablauf.getBoundingClientRect();
        var vh = window.innerHeight;
        var start = vh * 0.82, laenge = r.height + vh * 0.2;
        var p = Math.max(0, Math.min(1, (start - r.top) / laenge));
        aktualisieren(p);
      };
      var anstossen = function () { if (!wartet) { wartet = true; requestAnimationFrame(rechnen); } };
      messen();
      rechnen();
      window.addEventListener('scroll', anstossen, { passive: true });
      window.addEventListener('resize', function () { messen(); anstossen(); });
      window.addEventListener('load', function () { messen(); anstossen(); });
    }
    if (linie) linie.setAttribute('data-bereit', '');
  }

  /* Aktiver Menüpunkt */
  var navLinks = document.querySelectorAll('.nav a[href^="#"]');
  if (hatIO && navLinks.length) {
    var map = {};
    for (var n = 0; n < navLinks.length; n++) map[navLinks[n].getAttribute('href').slice(1)] = navLinks[n];
    var navIO = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        var l = map[en.target.id];
        if (l && en.isIntersecting) {
          for (var q = 0; q < navLinks.length; q++) navLinks[q].classList.remove('ist-aktiv');
          l.classList.add('ist-aktiv');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) navIO.observe(s); });
  }

  /* Aktionsleiste am Handy: erscheint, wenn die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  var kontakt = document.getElementById('kontakt');
  if (aktion && heroCta) {
    var leisteSetzen = function () {
      var c = heroCta.getBoundingClientRect();
      var k = kontakt ? kontakt.getBoundingClientRect() : null;
      var amKontakt = k && k.top < window.innerHeight * 0.6 && k.bottom > 0;
      aktion.classList.toggle('ist-da', c.bottom < 0 && !amKontakt);
    };
    leisteSetzen();
    window.addEventListener('scroll', leisteSetzen, { passive: true });
    window.addEventListener('resize', leisteSetzen);
  }
})();
