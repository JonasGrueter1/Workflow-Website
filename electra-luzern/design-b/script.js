/* Electra AG, Design B «Stromkreis»: Menü, Stromkreis-Animation, Einblenden, Zähler, Aktionsleiste */
(function () {
  'use strict';
  window.electraB = true;

  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Kopf und Menü ---------- */
  var kopf = $('#kopf');
  var knopf = $('.menue-knopf');
  function menue(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    var label = knopf.querySelector('span');
    if (label) label.textContent = auf ? 'Schliessen' : 'Menü';
    knopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (knopf) {
    knopf.addEventListener('click', function () { menue(!kopf.classList.contains('offen')); });
    $$('.menue a').forEach(function (a) { a.addEventListener('click', function () { menue(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); knopf.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1080) menue(false); });
  }

  /* ---------- Sanftes Springen zu Ankern (nur mit Bewegung) ---------- */
  if (fx && 'scrollBehavior' in doc.style) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var ziel = document.getElementById(id.slice(1));
      if (!ziel) return;
      e.preventDefault();
      ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', id);
      if (ziel.classList.contains('zeile')) {
        ziel.classList.remove('ziel'); void ziel.offsetWidth; ziel.classList.add('ziel');
        setTimeout(function () { ziel.classList.remove('ziel'); }, 2600);
      }
    });
  }

  /* ---------- Scroll: Kopf-Schatten, Leitung entlang der Leistungen ---------- */
  var zeilen = $('#zeilen');
  var busFill = $('.bus-fill');
  var tick = false;
  function aufScroll() {
    tick = false;
    kopf.classList.toggle('gescrollt', window.scrollY > 8);
    if (fx && zeilen && busFill) {
      var r = zeilen.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.62 - r.top) / r.height;
      p = Math.max(0, Math.min(1, p));
      busFill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(aufScroll); } }, { passive: true });
  aufScroll();

  /* ---------- Zähler ---------- */
  function zaehle(el) {
    var ziel = parseInt(el.getAttribute('data-zaehler'), 10);
    if (!fx || !ziel || el.dataset.fertig) return;
    el.dataset.fertig = '1';
    el.style.minWidth = el.getBoundingClientRect().width.toFixed(2) + 'px';
    var start = null, dauer = 1300;
    function schritt(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dauer);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(ziel * e));
      if (k < 1) requestAnimationFrame(schritt);
    }
    el.textContent = '0';
    requestAnimationFrame(schritt);
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && fx) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('sicht');
        if (el.classList.contains('zeile')) setTimeout(function () { el.classList.add('an'); }, 250);
        $$('[data-zaehler]', el).forEach(zaehle);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('sicht', 'an'); });
  }

  /* ---------- Stromkreis im Hero ---------- */
  var kreis = $('#kreis');
  if (kreis && fx) {
    var knoten = $$('.knoten', kreis);
    var spur = $('.spur', kreis);
    var punkt = $('.punkt', kreis);
    // Weg des Punkts: von der Mitte nach links, im Uhrzeigersinn über alle sechs Knoten und zurück zur Mitte
    var P = [[300, 300], [100, 300], [100, 130], [300, 130], [500, 130], [500, 470], [300, 470], [100, 470], [100, 300], [300, 300]];
    var seg = [], total = 0;
    for (var i = 1; i < P.length; i++) {
      var l = Math.abs(P[i][0] - P[i - 1][0]) + Math.abs(P[i][1] - P[i - 1][1]);
      seg.push(l); total += l;
    }
    // Strecke bis zu jedem Knoten (Reihenfolge wie im HTML: 01 bis 06)
    var halt = [370, 570, 770, 1110, 1310, 1510];
    function lage(d) {
      for (var j = 0; j < seg.length; j++) {
        if (d <= seg[j]) {
          var a = P[j], b = P[j + 1], k = seg[j] ? d / seg[j] : 0;
          return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
        }
        d -= seg[j];
      }
      return P[P.length - 1];
    }
    function weich(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    function puls() { kreis.classList.remove('puls'); void kreis.offsetWidth; kreis.classList.add('puls'); }

    function lauf() {
      var start = null, dauer = 2300, naechster = 0;
      kreis.classList.add('laeuft');
      puls();
      function schritt(t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / dauer);
        var d = weich(k) * total;
        var xy = lage(d);
        punkt.setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1) + ')');
        spur.style.strokeDashoffset = (1 - d / total).toFixed(4);
        while (naechster < halt.length && d >= halt[naechster]) {
          (function (kn) {
            kn.classList.add('an', 'live');
            setTimeout(function () { kn.classList.remove('an'); }, 650);
          })(knoten[naechster]);
          naechster++;
        }
        if (k < 1) { requestAnimationFrame(schritt); return; }
        kreis.classList.remove('laeuft');
        kreis.classList.add('fertig');
        puls();
      }
      requestAnimationFrame(schritt);
    }

    punkt.setAttribute('transform', 'translate(300 300)');
    setTimeout(function () { kreis.classList.add('zeichnen'); }, 120);
    setTimeout(lauf, 1050);
  }

  /* ---------- Aktionsleiste Handy ----------
     Erscheint, sobald die Hero-Knöpfe nach oben aus dem Bild sind, und weicht im Kontaktteil.
     Über die Scrollposition statt IntersectionObserver: Am Handy stehen die Knöpfe unter dem
     Stromkreis, also beim Laden schon unter dem Bildrand; ein Sprung per Anker löste den
     Observer nie aus. */
  var aktion = $('#aktion');
  var heroKnoepfe = $('.hero-knoepfe');
  var kontakt = $('#kontakt');
  if (aktion && heroKnoepfe) {
    var aktionTick = false;
    var aktionPruefen = function () {
      aktionTick = false;
      var vorbei = heroKnoepfe.getBoundingClientRect().bottom < 0;
      var k = kontakt ? kontakt.getBoundingClientRect() : null;
      var amKontakt = k ? (k.top < window.innerHeight * 0.75 && k.bottom > 0) : false;
      aktion.classList.toggle('zeigen', vorbei && !amKontakt);
    };
    window.addEventListener('scroll', function () { if (!aktionTick) { aktionTick = true; requestAnimationFrame(aktionPruefen); } }, { passive: true });
    window.addEventListener('resize', aktionPruefen);
    aktionPruefen();
  }

  /* ---------- Jetzt geöffnet? (Montag bis Freitag 07:00 bis 17:00, Zeit in Zürich) ---------- */
  var status = $('#status');
  if (status && window.Intl && Intl.DateTimeFormat) {
    try {
      var teile = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var w = '', h = 0, m = 0;
      teile.forEach(function (t) { if (t.type === 'weekday') w = t.value; if (t.type === 'hour') h = +t.value; if (t.type === 'minute') m = +t.value; });
      var min = h * 60 + m;
      var werktag = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(w) > -1;
      var offen = werktag && min >= 420 && min < 1020;
      status.textContent = offen ? 'Jetzt geöffnet' : 'Zurzeit geschlossen';
      status.classList.toggle('offen', offen);
      status.hidden = false;
    } catch (e) { /* ohne Anzeige */ }
  }
})();
