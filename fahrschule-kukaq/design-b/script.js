/* Fahrschule Kukaq Beqir, Design B: Fotowand, Kursdaten, Weg ab 2027, Einblenden */
(function () {
  'use strict';
  window.kukaqBereit = true;

  var reduziert = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;
  var kopf = document.getElementById('kopf');
  var hero = document.getElementById('start');

  /* Kopfzeile: fester Hintergrund nach dem ersten Scrollen */
  function kopfPruefen() {
    kopf.classList.toggle('is-fest', window.scrollY > 24 || kopf.classList.contains('menue-offen'));
  }

  /* Menü */
  var menuKnopf = kopf.querySelector('.menu-knopf');
  var menue = document.getElementById('menue');
  function menueSetzen(offen) {
    menuKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    kopf.classList.toggle('menue-offen', offen);
    kopfPruefen();
  }
  menuKnopf.addEventListener('click', function () {
    menueSetzen(menuKnopf.getAttribute('aria-expanded') !== 'true');
  });
  menue.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && !a.hasAttribute('data-soon')) menueSetzen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('menue-offen')) { menueSetzen(false); menuKnopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (kopf.classList.contains('menue-offen') && !kopf.contains(e.target)) menueSetzen(false);
  });

  /* Hero-Auftritt */
  requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-bereit'); }); });

  /* Fotowand: bewegt sich nur, solange der Hero sichtbar ist; Knopf zum Anhalten */
  var wand = document.getElementById('wand');
  var pauseKnopf = hero.querySelector('.wand-pause');
  var pauseText = pauseKnopf.querySelector('.wand-pause-text');
  var manuell = false, heroSichtbar = true;
  function wandSetzen() { wand.classList.toggle('is-pause', manuell || !heroSichtbar); }
  pauseKnopf.addEventListener('click', function () {
    manuell = !manuell;
    pauseKnopf.setAttribute('aria-pressed', manuell ? 'true' : 'false');
    pauseText.textContent = manuell ? 'Fotowand abspielen' : 'Fotowand anhalten';
    wandSetzen();
  });
  if (hatIO) {
    new IntersectionObserver(function (eintraege) {
      heroSichtbar = eintraege[0].isIntersecting;
      wandSetzen();
    }).observe(hero);
  }

  /* Einblenden beim Scrollen */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (!hatIO || reduziert) {
    reveals.forEach(function (el) { el.classList.add('is-sichtbar'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* Kursdaten: vergangene Termine ausblenden, nächsten Termin in die Karten schreiben */
  function heuteZuerich() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (err) {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  try {
    var daten = JSON.parse(document.getElementById('kurse').textContent);
    var heute = heuteZuerich();
    ['vku', 'nothelfer'].forEach(function (art) {
      var kommende = (daten[art] || []).filter(function (k) { return k.start >= heute; });
      var liste = document.querySelector('[data-kursliste="' + art + '"]');
      if (liste) {
        liste.textContent = '';
        if (!kommende.length) {
          liste.appendChild(el('li', 'kurs-leer', 'Neue Termine findest du im Anmeldeportal.'));
        }
        kommende.forEach(function (k) {
          var li = el('li');
          li.appendChild(el('strong', '', k.tage));
          li.appendChild(el('span', '', k.zeit));
          liste.appendChild(li);
        });
      }
      var karte = document.querySelector('[data-naechster="' + art + '"] > span');
      if (karte) {
        karte.textContent = '';
        if (kommende.length) {
          karte.appendChild(el('span', 'termin-label', 'Nächster Kurs'));
          karte.appendChild(el('strong', '', kommende[0].tage));
          karte.appendChild(el('span', 'termin-zeit', kommende[0].zeit));
        } else {
          karte.appendChild(el('span', 'termin-label', 'Termine'));
          karte.appendChild(el('strong', '', 'Neue Termine im Anmeldeportal'));
        }
      }
    });
  } catch (err) { /* Ohne Daten bleibt die fest eingetragene Liste stehen */ }

  /* Weiches Scrollen nur bei Klicks auf Anker (nicht global per CSS) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || e.defaultPrevented) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    if (id === 'kursdaten' && ziel.tagName === 'DETAILS') ziel.open = true;
    var abstand = kopf.offsetHeight + 16;
    var y = -abstand;
    for (var n = ziel; n; n = n.offsetParent) y += n.offsetTop; /* ohne Transform der Einblendung */
    window.scrollTo({ top: Math.max(0, y), behavior: reduziert ? 'auto' : 'smooth' });
    if (history.pushState) history.pushState(null, '', '#' + id);
    if (!ziel.hasAttribute('tabindex') && !/^(A|BUTTON|DETAILS|INPUT)$/.test(ziel.tagName)) ziel.setAttribute('tabindex', '-1');
    try { ziel.focus({ preventScroll: true }); } catch (err) { /* älterer Browser */ }
  });

  /* Link «Kurse» öffnet die Liste aller Kursdaten */
  var kursdaten = document.getElementById('kursdaten');
  function kursdatenOeffnen() { if (kursdaten) kursdaten.open = true; }
  document.querySelectorAll('a[href="#kursdaten"]').forEach(function (a) { a.addEventListener('click', kursdatenOeffnen); });
  if (location.hash === '#kursdaten') kursdatenOeffnen();

  /* Weg ab 2027: goldene Linie wächst mit dem Scrollen, Rauten drehen sich beim Erreichen */
  var schritte = document.getElementById('schritte');
  var schrittListe = schritte ? schritte.querySelectorAll('.schritt') : [];
  function wegAktualisieren() {
    var vh = window.innerHeight;
    var r = schritte.getBoundingClientRect();
    var p = (vh * 0.62 - r.top) / r.height;
    p = Math.max(0, Math.min(1, p));
    schritte.style.setProperty('--fortschritt', p.toFixed(4));
    schrittListe.forEach(function (li) {
      var k = li.querySelector('.knoten').getBoundingClientRect();
      li.classList.toggle('ist-erreicht', k.top + k.height / 2 < vh * 0.62);
    });
  }
  if (schritte) {
    if (reduziert) {
      schritte.style.setProperty('--fortschritt', '1');
      schrittListe.forEach(function (li) { li.classList.add('ist-erreicht'); });
    } else {
      wegAktualisieren();
    }
  }

  /* Ein gemeinsamer Scroll-Takt */
  var wartet = false;
  function beimScrollen() {
    if (wartet) return;
    wartet = true;
    requestAnimationFrame(function () {
      wartet = false;
      kopfPruefen();
      if (schritte && !reduziert) wegAktualisieren();
    });
  }
  window.addEventListener('scroll', beimScrollen, { passive: true });
  window.addEventListener('resize', beimScrollen);
  kopfPruefen();

  /* Aktionsleiste am Handy: erst nach dem Hero, nicht beim Kontakt */
  var leiste = document.getElementById('aktionsleiste');
  if (leiste) {
    if (!hatIO) {
      leiste.classList.add('is-da');
    } else {
      var zustand = { knoepfe: true, kontakt: false };
      var knoepfe = document.getElementById('hero-knoepfe');
      var kontakt = document.getElementById('kontakt');
      var lio = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) {
          if (e.target === knoepfe) zustand.knoepfe = e.isIntersecting;
          if (e.target === kontakt) zustand.kontakt = e.isIntersecting;
        });
        leiste.classList.toggle('is-da', !(zustand.knoepfe || zustand.kontakt));
      });
      lio.observe(knoepfe);
      lio.observe(kontakt);
    }
  }
})();
