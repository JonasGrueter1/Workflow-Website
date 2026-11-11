/* D'Drive Fahrschule, Design B: Kopfzeile, Menü, Auto-Umschalter, Einblenden, Zähler, Weg, Aktionsleiste */
(function () {
  'use strict';
  window.ddriveB = true;
  var h = document.documentElement;
  var bewegung = h.classList.contains('fx');
  var WA = 'https://wa.me/41782195599?text=';

  /* Kopfzeile: Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var aktionen = document.getElementById('aktionen');
  var heroKnoepfe = document.querySelector('.hero-knoepfe');
  var kontakt = document.getElementById('kontakt');
  var onScroll = function () {
    kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
    if (aktionen && heroKnoepfe) {
      var unten = heroKnoepfe.getBoundingClientRect().bottom < 0;
      var imKontakt = kontakt && kontakt.getBoundingClientRect().top < window.innerHeight * 0.55;
      aktionen.classList.toggle('ist-da', unten && !imKontakt);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü auf schmalen Bildschirmen */
  var knopf = kopf.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  var setMenue = function (offen) {
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menue.hidden = !offen;
    document.body.style.overflow = offen ? 'hidden' : '';
  };
  knopf.addEventListener('click', function () { setMenue(menue.hidden); });
  menue.addEventListener('click', function (e) { if (e.target.closest('a')) setMenue(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menue.hidden) { setMenue(false); knopf.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1000 && !menue.hidden) setMenue(false); });

  /* Weiches Scrollen zu Ankern */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: bewegung ? 'smooth' : 'auto' });
    else ziel.scrollIntoView({ behavior: bewegung ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Hero-Foto: nach dem Öffnen Animation und Beschnitt entfernen */
  var foto = document.querySelector('.ein-bild');
  if (foto) {
    var offen = function () { foto.classList.add('ist-offen'); };
    foto.addEventListener('animationend', function (e) { if (e.target === foto) offen(); });
    if (!bewegung) offen();
    setTimeout(offen, 2200);
  }

  /* Auto-Umschalter: «Du hast die Wahl» */
  var wahl = document.getElementById('wahl');
  var cta = document.getElementById('cta-lektion');
  var ctaText = document.getElementById('cta-text');
  var notiz = document.getElementById('wahl-notiz');
  var autos = {
    '': { text: 'Ich möchte gerne 1 Fahrlektion buchen.', knopf: 'Fahrlektion per WhatsApp buchen', notiz: '' },
    swift: { text: 'Ich möchte gerne 1 Fahrlektion im Suzuki Swift Sport (Handschaltung) buchen.', knopf: 'Lektion im Swift Sport buchen', notiz: 'Deine Wahl steht schon in der WhatsApp-Nachricht.' },
    golf: { text: 'Ich möchte gerne 1 Fahrlektion im Golf 8 GTI (Automat) buchen.', knopf: 'Lektion im Golf 8 GTI buchen', notiz: 'Deine Wahl steht schon in der WhatsApp-Nachricht.' }
  };
  var waehlen = function (auto) {
    if (wahl.getAttribute('data-wahl') === auto) auto = '';
    wahl.setAttribute('data-wahl', auto);
    wahl.classList.add('ist-benutzt');
    wahl.querySelectorAll('.s-knopf').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-auto') === auto ? 'true' : 'false');
    });
    var d = autos[auto];
    cta.href = WA + encodeURIComponent(d.text);
    ctaText.textContent = d.knopf;
    notiz.textContent = d.notiz;
    notiz.classList.toggle('ist-da', !!auto);
  };
  if (wahl) {
    wahl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-auto]');
      if (b) waehlen(b.getAttribute('data-auto'));
    });
  }

  /* Zähler: zählen einmal hoch (Preise) oder herunter (Gutschein), wenn sichtbar */
  var zaehlen = function (el, von, bis, dauer) {
    if (!bewegung) return;
    var start = null;
    el.textContent = String(von);
    var schritt = function (t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(von + (bis - von) * e));
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  };

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('.rv, .beleg');
  var zeigen = function (el) {
    el.classList.add('ist-sichtbar');
    el.querySelectorAll('[data-zaehler]').forEach(function (z) {
      zaehlen(z, 0, parseInt(z.getAttribute('data-zaehler'), 10), 900);
    });
    el.querySelectorAll('[data-runter]').forEach(function (z) {
      setTimeout(function () { zaehlen(z, 99, parseInt(z.getAttribute('data-runter'), 10), 1100); }, 450);
    });
  };
  if ('IntersectionObserver' in window && bewegung) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (en.isIntersecting) { zeigen(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el, i) {
      /* Geschwister nacheinander einblenden */
      var vor = el.previousElementSibling;
      if (vor && vor.classList.contains('rv') && el.classList.contains('rv')) {
        var n = 0, p = el;
        while ((p = p.previousElementSibling) && p.classList.contains('rv')) n++;
        el.style.transitionDelay = Math.min(n, 4) * 90 + 'ms';
      }
      io.observe(el);
    });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* Weg ab 2027: Linie wächst mit dem Scrollen, Schritte leuchten auf */
  var leiste = document.getElementById('leiste');
  var linie = leiste ? leiste.querySelector('.leiste-linie span') : null;
  var schritte = leiste ? leiste.querySelectorAll('.schritt') : [];
  var wegTick = false;
  var weg = function () {
    wegTick = false;
    var r = leiste.getBoundingClientRect();
    var mitte = window.innerHeight * 0.62;
    var p = (mitte - r.top) / Math.max(1, r.height - 40);
    p = Math.max(0, Math.min(1, p));
    linie.style.setProperty('--p', p.toFixed(4));
    schritte.forEach(function (s) {
      var nr = s.querySelector('.schritt-nr').getBoundingClientRect();
      if (nr.top + nr.height / 2 < mitte) s.classList.add('ist-erreicht');
    });
  };
  if (leiste && linie) {
    if (bewegung) {
      linie.style.setProperty('--p', '0');
      window.addEventListener('scroll', function () { if (!wegTick) { wegTick = true; requestAnimationFrame(weg); } }, { passive: true });
      window.addEventListener('resize', weg);
      weg();
    } else {
      schritte.forEach(function (s) { s.classList.add('ist-erreicht'); });
    }
  }

  /* Aktiver Anker in der Kopfzeile */
  var anker = document.querySelectorAll('.anker a');
  if ('IntersectionObserver' in window && anker.length) {
    var abschnitte = ['preise', 'kurse', 'weg', 'team', 'kontakt'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var aio = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (!en.isIntersecting) return;
        anker.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    abschnitte.forEach(function (s) { aio.observe(s); });
  }
})();
