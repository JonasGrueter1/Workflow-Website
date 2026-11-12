/* Garage Blattmann, Design B: Hero-Auftritt, Einblenden, Öffnungszeiten heute, Rückruf-Planer, Räderhotel-Profil */
(function () {
  'use strict';
  window.gbB = true;

  var doc = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduce = mq.matches;

  /* Zeit in Zürich (Wochentag 0 = Sonntag) */
  function jetzt() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute,
        wd: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday] };
    } catch (e) {
      var n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), h: n.getHours(), min: n.getMinutes(), wd: n.getDay() };
    }
  }
  var heute = jetzt();

  /* Hero-Auftritt */
  requestAnimationFrame(function () { requestAnimationFrame(function () { doc.classList.add('los'); }); });

  /* Kopf: Menü am Handy */
  var kopf = document.getElementById('kopf');
  var knopf = document.getElementById('menue-knopf');
  function menue(auf) {
    kopf.classList.toggle('offen', auf);
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
  }
  if (knopf) {
    knopf.addEventListener('click', function () { menue(!kopf.classList.contains('offen')); });
    document.querySelectorAll('#kopf-nav a').forEach(function (a) { a.addEventListener('click', function () { menue(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); knopf.focus(); } });
  }

  /* Sanftes Springen zu Ankern (ohne CSS scroll-behavior, damit Prüfwerkzeuge normal scrollen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Einblenden beim Scrollen */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Zähler 30 */
  var zahl = document.querySelector('[data-zahl]');
  if (zahl && !reduce) {
    var ziel = +zahl.getAttribute('data-zahl');
    zahl.textContent = '0';
    setTimeout(function () {
      var start = performance.now(), dauer = 1200;
      (function schritt(t) {
        var p = Math.min(1, (t - start) / dauer);
        zahl.textContent = String(Math.round(ziel * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(schritt);
      })(start);
    }, 700);
  }

  /* Öffnungszeiten: Zeile von heute markieren */
  document.querySelectorAll('.tz[data-tage]').forEach(function (z) {
    if (z.getAttribute('data-tage').split(' ').indexOf(String(heute.wd)) > -1) {
      z.classList.add('heute');
      z.setAttribute('aria-current', 'date');
    }
  });

  /* Aktionsleiste am Handy erst nach dem Hero */
  var aktion = document.getElementById('aktion');
  var heldKnoepfe = document.getElementById('held-knoepfe');
  if (aktion && heldKnoepfe && 'IntersectionObserver' in window) {
    var nachHero = false, amFormular = false;
    var leiste = function () { aktion.classList.toggle('zeigen', nachHero && !amFormular); };
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      nachHero = !e.isIntersecting && e.boundingClientRect.top < 0;
      leiste();
    }).observe(heldKnoepfe);
    // Beim Ausfüllen des Rückruf-Planers verdeckt die Leiste nichts
    var planerEl = document.getElementById('planer');
    if (planerEl) {
      new IntersectionObserver(function (entries) {
        amFormular = entries[0].isIntersecting;
        leiste();
      }, { rootMargin: '-35% 0px -35% 0px' }).observe(planerEl);
    }
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* Räderhotel: Profil rollt mit dem Scrollen (höchstens 2 Rippen weit) */
  var band = document.querySelector('.profil-band');
  var raeder = document.getElementById('raederhotel');
  if (band && raeder && !reduce && 'IntersectionObserver' in window) {
    var sichtbar = false, wartet = false;
    var setzen = function () {
      wartet = false;
      var r = raeder.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      var p = (vh - r.top) / (vh + r.height);
      p = Math.max(0, Math.min(1, p));
      band.style.transform = 'translate(' + (-p * 128).toFixed(1) + 'px, 0)';
    };
    var beimScrollen = function () { if (sichtbar && !wartet) { wartet = true; requestAnimationFrame(setzen); } };
    new IntersectionObserver(function (e) { sichtbar = e[0].isIntersecting; beimScrollen(); }).observe(raeder);
    window.addEventListener('scroll', beimScrollen, { passive: true });
  }

  /* Rückruf-Planer */
  var planer = document.getElementById('planer');
  if (!planer) return;
  var tageBox = document.getElementById('planer-tage');
  var summe = document.getElementById('planer-summe');
  var nachmittagZeit = document.getElementById('nachmittag-zeit');
  var kurz = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  // Felder ohne JS abschalten, damit sie nicht mitgeschickt werden
  if (doc.classList.contains('js')) planer.querySelectorAll('.ohne-js input').forEach(function (i) { i.disabled = true; });

  // Die nächsten fünf Werktage (heute nur, wenn noch genug Zeit bleibt)
  var tage = [];
  var minuten = heute.h * 60 + heute.min;
  var schluss = heute.wd === 5 ? 16 * 60 + 30 : 17 * 60;
  for (var k = 0; tage.length < 5 && k < 14; k++) {
    var dt = new Date(Date.UTC(heute.y, heute.m - 1, heute.d + k));
    var wd = dt.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    if (k === 0 && minuten >= schluss) continue;
    tage.push({ wd: wd, heute: k === 0, text: kurz[wd] + ' ' + dt.getUTCDate() + '.' + (dt.getUTCMonth() + 1) + '.' });
  }
  tage.forEach(function (t, i) {
    var l = document.createElement('label');
    l.className = 'chip chip-tag';
    var oben = t.heute ? 'Heute' : kurz[t.wd];
    var datum = t.text.split(' ')[1];
    l.innerHTML = '<input type="radio" name="tag" value="' + t.text + '" data-wd="' + t.wd + '" data-heute="' + (t.heute ? 1 : 0) + '">' +
      '<span><small>' + oben + '</small> ' + datum + '</span>';
    tageBox.appendChild(l);
  });

  function wert(name) {
    var el = planer.querySelector('input[name="' + name + '"]:checked');
    return el ? el : null;
  }

  function fensterAnpassen() {
    var tag = wert('tag');
    var vormittag = planer.querySelector('input[name="fenster"][value="Vormittag"]');
    var istFreitag = tag && tag.getAttribute('data-wd') === '5';
    nachmittagZeit.textContent = istFreitag ? '13:15 bis 17:00' : '13:15 bis 17:30';
    var heuteGewaehlt = tag && tag.getAttribute('data-heute') === '1';
    var zuSpaet = heuteGewaehlt && minuten >= 11 * 60 + 30;
    vormittag.disabled = !!zuSpaet;
    if (zuSpaet && vormittag.checked) vormittag.checked = false;
  }

  var timer;
  function zusammenfassen() {
    var th = wert('thema'), tg = wert('tag'), fe = wert('fenster');
    var text;
    if (th && tg && fe) {
      var tagText = tg.getAttribute('data-heute') === '1' ? 'heute, ' + tg.value : 'am ' + tg.value;
      text = 'Rückruf ' + tagText + ', ' + fe.value + ', Thema ' + th.value + '.';
    } else {
      var fehlt = [];
      if (!th) fehlt.push('Thema');
      if (!tg) fehlt.push('Tag');
      if (!fe) fehlt.push('Zeitfenster');
      text = (fehlt.length === 3 ? 'Wählen Sie ' : 'Noch offen: ') + (fehlt.length > 1 ? fehlt.slice(0, -1).join(', ') + ' und ' + fehlt[fehlt.length - 1] : fehlt[0]) + '.';
    }
    if (summe.textContent === text) return;
    var fertig = !!(th && tg && fe);
    if (reduce) { summe.textContent = text; summe.classList.toggle('fertig', fertig); return; }
    summe.classList.add('wechsel');
    clearTimeout(timer);
    timer = setTimeout(function () {
      summe.textContent = text;
      summe.classList.toggle('fertig', fertig);
      summe.classList.remove('wechsel');
    }, 160);
  }

  planer.addEventListener('change', function (e) {
    if (e.target.name === 'tag') fensterAnpassen();
    zusammenfassen();
  });
  planer.addEventListener('submit', function (e) { e.preventDefault(); });

  // Links mit Thema (z. B. «Unfall melden») wählen das Thema vor
  document.querySelectorAll('a[data-thema]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = planer.querySelector('input[name="thema"][value="' + a.getAttribute('data-thema') + '"]');
      if (r) { r.checked = true; zusammenfassen(); }
    });
  });
})();
