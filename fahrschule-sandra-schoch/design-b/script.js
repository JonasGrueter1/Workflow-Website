/* Fahrschule Sandra Schoch, Design B «Schreib mir» */
(function () {
  'use strict';
  window.schochB = true;

  var doc = document.documentElement;
  var bewegung = doc.classList.contains('fx');
  var NUMMER = '41765708140';

  /* ---------- Aktion mit Ablaufdatum ---------- */
  // Zum Testen: ?heute=2026-12-01
  var jetzt = Date.now();
  try {
    var q = new URLSearchParams(location.search).get('heute');
    if (q && !isNaN(Date.parse(q))) jetzt = Date.parse(q);
  } catch (e) {}
  var aktion = document.querySelector('[data-bis]');
  var abgelaufen = aktion && jetzt > Date.parse(aktion.getAttribute('data-bis'));
  if (abgelaufen) {
    aktion.hidden = true;
    document.querySelectorAll('[data-nach-aktion]').forEach(function (el) { el.hidden = false; });
    document.querySelectorAll('[data-vor-aktion-ende]').forEach(function (el) { el.hidden = true; });
    document.querySelectorAll('.themen [data-aktion]').forEach(function (el) { el.remove(); });
  }

  /* ---------- Gezeichnete Linien: nach dem Zeichnen fertig setzen ---------- */
  document.querySelectorAll('.zeichne').forEach(function (g) {
    var pfade = g.querySelectorAll('path');
    var offen = pfade.length;
    pfade.forEach(function (pf) {
      pf.addEventListener('animationend', function () { offen -= 1; if (offen <= 0) g.classList.add('fertig'); });
    });
  });

  /* ---------- Anker weich scrollen ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: bewegung ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Kopf: Schatten beim Scrollen, Menü ---------- */
  var kopf = document.getElementById('kopf');
  var onScroll = function () { kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menueKnopf = document.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  var menueZu = function () { menueKnopf.setAttribute('aria-expanded', 'false'); menue.hidden = true; };
  menueKnopf.addEventListener('click', function () {
    var offen = menueKnopf.getAttribute('aria-expanded') === 'true';
    menueKnopf.setAttribute('aria-expanded', String(!offen));
    menue.hidden = offen;
  });
  menue.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]:not([data-soon])')) menueZu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menue.hidden) { menueZu(); menueKnopf.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 980 && !menue.hidden) menueZu(); });

  /* ---------- Nachricht an Sandra ---------- */
  var chat = document.getElementById('chat');
  var feld = document.getElementById('nachricht');
  var senden = document.getElementById('senden');
  var sendenText = senden.querySelector('.senden-text');
  var kanal = 'wa';
  feld.readOnly = false;

  var linkSetzen = function () {
    var text = feld.value.trim() || 'Hallo Sandra';
    var t = encodeURIComponent(text);
    if (kanal === 'wa') {
      senden.href = 'https://wa.me/' + NUMMER + '?text=' + t;
      senden.target = '_blank'; senden.rel = 'noopener';
      sendenText.textContent = 'Per WhatsApp senden';
    } else {
      senden.href = 'sms:+' + NUMMER + '?&body=' + t;
      senden.removeAttribute('target'); senden.removeAttribute('rel');
      sendenText.textContent = 'Per SMS senden';
    }
  };
  var hoeheAnpassen = function () {
    feld.style.height = 'auto';
    feld.style.height = Math.max(96, feld.scrollHeight + 4) + 'px';
  };

  chat.querySelectorAll('.kanal button').forEach(function (b) {
    b.addEventListener('click', function () {
      kanal = b.getAttribute('data-kanal');
      chat.setAttribute('data-kanal', kanal);
      chat.querySelectorAll('.kanal button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      linkSetzen();
    });
  });
  var themen = chat.querySelectorAll('.themen button');
  themen.forEach(function (b) {
    b.addEventListener('click', function () {
      feld.value = b.getAttribute('data-text');
      themen.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      hoeheAnpassen();
      linkSetzen();
    });
  });
  feld.addEventListener('input', function () {
    themen.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-text') === feld.value)); });
    hoeheAnpassen();
    linkSetzen();
  });
  linkSetzen();

  /* ---------- Preise: Umschalter 60 / 90 Minuten ---------- */
  var formatieren = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\''); };
  var dauer = document.querySelector('.dauer');
  if (dauer) {
    dauer.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.getAttribute('data-dauer');
        if (dauer.getAttribute('data-dauer') === d) return;
        dauer.setAttribute('data-dauer', d);
        dauer.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        document.querySelectorAll('.preis [data-60]').forEach(function (el) {
          var ziel = el.getAttribute('data-' + d);
          if (!el.classList.contains('zahl')) { el.textContent = ziel; return; }
          var von = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
          var nach = parseInt(ziel, 10);
          if (!bewegung) { el.textContent = formatieren(nach); return; }
          var start = null;
          var schritt = function (ts) {
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / 250);
            var e = 1 - Math.pow(1 - p, 3);
            el.textContent = formatieren(von + (nach - von) * e);
            if (p < 1) requestAnimationFrame(schritt);
          };
          requestAnimationFrame(schritt);
        });
      });
    });
    dauer.setAttribute('data-dauer', '60');
  }

  /* ---------- Bewertungen auf schmalen Bildschirmen: Punkte ---------- */
  var zitate = document.getElementById('zitate');
  var punkte = document.querySelectorAll('.punkte i');
  if (zitate && punkte.length) {
    var karten = zitate.querySelectorAll('.zitat');
    zitate.addEventListener('scroll', function () {
      var mitte = zitate.scrollLeft + zitate.clientWidth / 2;
      var best = 0, abstand = Infinity;
      karten.forEach(function (k, i) {
        var m = k.offsetLeft + k.offsetWidth / 2;
        var a = Math.abs(m - mitte);
        if (a < abstand) { abstand = a; best = i; }
      });
      punkte.forEach(function (p, i) { p.classList.toggle('ist-aktiv', i === best); });
    }, { passive: true });
  }

  /* ---------- Scroll-Einblendungen ---------- */
  var ziele = document.querySelectorAll('.rv, .weg, .kontakt');
  if (!bewegung || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    ziele.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Aktionsleiste unten (schmale Bildschirme): erst nach dem Senden-Knopf ---------- */
  var leiste = document.getElementById('aktionen');
  if (leiste) {
    var geplant = false;
    var leistePruefen = function () {
      geplant = false;
      leiste.classList.toggle('ist-da', senden.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener('scroll', function () {
      if (!geplant) { geplant = true; requestAnimationFrame(leistePruefen); }
    }, { passive: true });
    window.addEventListener('resize', leistePruefen);
    leistePruefen();
  }
})();
