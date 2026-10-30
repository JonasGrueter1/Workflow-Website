/* Fahrschule Letzi, Design A «Linienplan»: Kopf, Einblendungen, Linienplan, Anfrage-Karte, Aktionsleiste */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Kopf: Linie und Schatten, sobald gescrollt wird */
  var top = document.getElementById('top');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      top.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Sanftes Scrollen zu den Abschnitten (nur bei Klick, nicht für Werkzeuge oder reduzierte Bewegung) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    /* Fokus für Tastatur und Screenreader mitnehmen, ohne am Handy die Tastatur zu öffnen */
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    setTimeout(function () { ziel.focus({ preventScroll: true }); }, reduce ? 0 : 450);
  });

  /* Scroll-Einblendungen */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (!hasIO || reduce) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* Linienplan: Linie 1 zeichnet sich von Dietikon bis zum Triemli, die Haltestellen erscheinen,
     sobald die Linie sie erreicht. Danach zweigt Linie 2 in Schlieren nach Urdorf ab. */
  var plan = document.getElementById('plan');
  var DAUER1 = 1.4, DAUER2 = 0.7;
  /* Zeitpunkt (0 bis 1), an dem eine Ease-in-out-Sinus-Kurve den Anteil d erreicht */
  var zeit = function (d) { d = Math.max(0, Math.min(1, d)); return Math.acos(1 - 2 * d) / Math.PI; };
  var laengeBei = function (path, x, y) {
    var total = path.getTotalLength(), best = 0, bestD = Infinity;
    for (var s = 0; s <= total; s += 2) {
      var p = path.getPointAtLength(s), dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (dd < bestD) { bestD = dd; best = s; }
    }
    return best;
  };
  var vorbereiten = function (svg) {
    var l1 = svg.querySelector('.linie-1'), l2 = svg.querySelector('.linie-2');
    if (!l1 || !l2 || !l1.getTotalLength) return false;
    var L1 = l1.getTotalLength(), L2 = l2.getTotalLength();
    [[l1, L1], [l2, L2]].forEach(function (a) {
      a[0].style.strokeDasharray = a[1] + ' ' + a[1];
      a[0].style.strokeDashoffset = a[1];
    });
    /* Abzweigung: Linie 2 beginnt dort, wo Linie 1 Schlieren erreicht */
    var start = l2.getPointAtLength(0);
    var start2 = DAUER1 * zeit(laengeBei(l1, start.x, start.y) / L1) + 0.1;
    svg.style.setProperty('--dauer', DAUER1 + 's');
    svg.style.setProperty('--start2', start2.toFixed(2) + 's');
    [].forEach.call(svg.querySelectorAll('.halt-link'), function (a) {
      var c = a.querySelector('.punkt');
      var x = +c.getAttribute('cx'), y = +c.getAttribute('cy');
      var t;
      if (a.getAttribute('data-linie') === '2') t = start2 + DAUER2 * zeit(laengeBei(l2, x, y) / L2);
      else t = DAUER1 * zeit(laengeBei(l1, x, y) / L1);
      a.style.setProperty('--t', Math.max(0, t - 0.08).toFixed(2) + 's');
    });
    return true;
  };
  if (plan && !reduce && hasIO) {
    var ok = true;
    [].forEach.call(plan.querySelectorAll('.plan-svg'), function (svg) {
      try { ok = vorbereiten(svg) && ok; } catch (err) { ok = false; }
    });
    if (ok) {
      plan.classList.add('is-armed');
      var pio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          pio.disconnect();
          requestAnimationFrame(function () { requestAnimationFrame(function () { plan.classList.add('is-drawn'); }); });
        }
      }, { threshold: 0.1 });
      pio.observe(plan);
    }
  }

  /* Öffnungszeiten (Montag bis Sonntag, 8 bis 19 Uhr): Status im Hero und heutigen Tag markieren, nach Zürcher Zeit */
  var jetzt = new Date();
  try {
    var teile = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(jetzt);
    var wert = function (typ) { for (var i = 0; i < teile.length; i++) if (teile[i].type === typ) return teile[i].value; return null; };
    var wt = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wert('weekday'));
    var std = (+wert('hour') % 24) + (+wert('minute')) / 60;
  } catch (err) {
    wt = (jetzt.getDay() + 6) % 7; std = jetzt.getHours() + jetzt.getMinutes() / 60;
  }
  var tage = document.querySelectorAll('.woche-tage .tag');
  if (tage.length === 7 && wt >= 0) tage[wt].classList.add('is-heute');
  var status = document.getElementById('status');
  if (status && !isNaN(std)) {
    var offen = std >= 8 && std < 19;
    status.classList.add(offen ? 'is-offen' : 'is-zu');
    status.querySelector('span').textContent = offen ? 'Heute bis 19 Uhr erreichbar' : (std < 8 ? 'Heute ab 8 Uhr erreichbar' : 'Morgen ab 8 Uhr erreichbar');
  }

  /* Anfrage-Karte: bereitet eine fertige E-Mail an Mike vor, es geht nichts an einen Server */
  var form = document.getElementById('anfrage');
  if (form) {
    var fehler = document.getElementById('anfrage-fehler');
    var name = form.querySelector('#f-name');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = name.value.trim();
      if (!n) {
        name.setAttribute('aria-invalid', 'true');
        fehler.hidden = false;
        name.focus();
        return;
      }
      name.removeAttribute('aria-invalid');
      fehler.hidden = true;
      var tel = form.querySelector('#f-tel').value.trim();
      var treff = form.querySelector('#f-treff').value;
      var text = form.querySelector('#f-text').value.trim();
      var body = 'Grüezi Mike\n\n' +
        (text ? text + '\n\n' : 'Ich interessiere mich für Fahrstunden bei der Fahrschule Letzi.\n\n') +
        'Name: ' + n + '\n' +
        (tel ? 'Telefon: ' + tel + '\n' : '') +
        'Gewünschter Treffpunkt: ' + treff + '\n\n' +
        'Freundliche Grüsse\n' + n;
      var subject = 'Anfrage Fahrstunden: ' + n;
      window.location.href = 'mailto:info@fahrschule-letzi.ch?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
    name.addEventListener('input', function () {
      if (name.value.trim()) { name.removeAttribute('aria-invalid'); fehler.hidden = true; }
    });
  }

  /* Aktionsleiste am Handy: ausblenden, solange die Knöpfe im Hero oder die Anfrage-Karte sichtbar sind */
  var dock = document.querySelector('.dock');
  var heroCta = document.getElementById('hero-cta');
  if (dock && heroCta && hasIO) {
    dock.classList.add('is-hidden');
    var sichtbar = {};
    var dio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { sichtbar[e.target.id] = e.isIntersecting; });
      dock.classList.toggle('is-hidden', !!(sichtbar['hero-cta'] || sichtbar.anfrage));
    }, { threshold: 0 });
    dio.observe(heroCta);
    if (form) dio.observe(form);
  }
})();
