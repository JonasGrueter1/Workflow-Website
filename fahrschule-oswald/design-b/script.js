/* Fahrschule Oliver Oswald, Design B «Datenblatt»: Kopfzeile, Menü, Reveals, Datenblatt, Weg, Galerie, Aktionsleiste */
(function () {
  'use strict';
  window.oswaldB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Kopfzeile: fest ab dem ersten Scrollen ---------- */
  var kopf = $('#kopf');
  var tick = false;
  function kopfStand() { kopf.classList.toggle('kopf-fest', window.scrollY > 24 || menueOffen); }

  /* ---------- Menü (Handy) ---------- */
  var knopf = $('#menue-knopf');
  var menue = $('#menue');
  var menueOffen = false;
  function setMenue(offen) {
    menueOffen = offen;
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    knopf.querySelector('use').setAttribute('href', offen ? '#i-zu' : '#i-menue');
    knopf.querySelector('.sr').textContent = offen ? 'Menü schliessen' : 'Menü öffnen';
    if (offen) { menue.hidden = false; requestAnimationFrame(function () { menue.classList.add('offen'); }); }
    else { menue.classList.remove('offen'); menue.hidden = true; }
    document.body.style.overflow = offen ? 'hidden' : '';
    kopfStand();
  }
  if (knopf && menue) {
    knopf.setAttribute('role', 'button');
    knopf.addEventListener('click', function (e) { e.preventDefault(); setMenue(!menueOffen); });
    menue.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href').charAt(0) === '#' && a.getAttribute('href').length > 1) setMenue(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menueOffen) { setMenue(false); knopf.focus(); } });
    window.addEventListener('resize', function () { if (menueOffen && window.innerWidth >= 1100) setMenue(false); });
  }

  /* ---------- Scroll-Reveals ---------- */
  var reveals = $$('[data-reveal]');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('sichtbar'); });
  }

  /* ---------- Datenblatt: Zeilen, Ladebalken, Zähler ---------- */
  var karte = $('#datenblatt');
  var zahl = $('#db-zahl');
  var ZIEL = 625;
  function zaehlen() {
    var dauer = 1400, start = null;
    function schritt(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      zahl.textContent = String(Math.round(ZIEL * e));
      if (p < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }
  if (karte) {
    if (fx && hasIO) {
      zahl.textContent = '0';
      var ioK = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          ioK.disconnect();
          karte.classList.add('laeuft');
          setTimeout(zaehlen, 1100);
        });
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0.2 });
      ioK.observe(karte);
    } else {
      karte.classList.add('laeuft');
    }
  }

  /* ---------- Weg: Linie wächst mit dem Scrollen, Knoten leuchten auf ---------- */
  var liste = $('#weg-liste');
  var fort = $('#weg-fortschritt');
  var stationen = $$('.station', liste);
  var wegMax = 0;
  function wegStand() {
    if (!liste) return;
    var r = liste.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var p = (vh * 0.62 - r.top) / Math.max(1, r.height);
    p = Math.max(0, Math.min(1, p));
    if (p <= wegMax) return;
    wegMax = p;
    fort.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    var grenze = r.top + p * r.height;
    stationen.forEach(function (s) {
      var k = s.querySelector('.knoten').getBoundingClientRect();
      if (k.top + k.height / 2 <= grenze + 2) s.classList.add('erreicht');
    });
  }
  if (!fx) stationen.forEach(function (s) { s.classList.add('erreicht'); });

  /* ---------- Laufbahn (Über mich) ---------- */
  var bahn = $('#laufbahn');
  if (bahn) {
    if (fx && hasIO) {
      var ioB = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { bahn.classList.add('laeuft'); ioB.disconnect(); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
      ioB.observe(bahn);
    } else {
      bahn.classList.add('laeuft');
    }
  }

  /* ---------- Galerie Scenic ---------- */
  var gross = $('#galerie-gross');
  var bild = $('#galerie-bild');
  var text = $('#galerie-text');
  $$('.ansicht').forEach(function (b, idx, alle) {
    var vorladen = function () { var i = new Image(); i.src = b.getAttribute('data-gross'); };
    b.addEventListener('pointerenter', vorladen, { once: true });
    b.addEventListener('focus', vorladen, { once: true });
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') === 'true') return;
      alle.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var src = b.getAttribute('data-gross');
      var neu = new Image();
      gross.classList.add('wechsel');
      var fertig = function () {
        setTimeout(function () {
          bild.src = src;
          bild.alt = b.getAttribute('data-alt');
          text.textContent = b.getAttribute('data-text');
          requestAnimationFrame(function () { gross.classList.remove('wechsel'); });
        }, fx ? 180 : 0);
      };
      neu.onload = fertig; neu.onerror = fertig;
      neu.src = src;
    });
  });

  /* ---------- Aktionsleiste Handy: erscheint, wenn die Hero-Knöpfe weg sind ---------- */
  var aktion = $('#aktion');
  var heroKnoepfe = $('#hero-knoepfe');
  if (aktion && heroKnoepfe && hasIO) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        aktion.classList.toggle('zeigen', !e.isIntersecting && e.boundingClientRect.top < 0);
      });
    }).observe(heroKnoepfe);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* ---------- Sanftes Scrollen zu Ankern (nur mit Bewegung) ---------- */
  if (fx) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      var ziel = id && document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------- Formular: Absenden erst nach der Designwahl ---------- */
  var form = $('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- Scroll-Schleife ---------- */
  function aufScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      tick = false;
      kopfStand();
      if (fx) wegStand();
    });
  }
  window.addEventListener('scroll', aufScroll, { passive: true });
  window.addEventListener('resize', aufScroll);
  kopfStand();
  if (fx) wegStand();
})();
