/* Garage Blattmann, Design A: Öffnungszeiten heute, Klima-Check, Einblenden, Menü, Band-Parallaxe */
(function () {
  'use strict';
  window.gbA = true;
  var doc = document.documentElement;
  var fx = doc.classList.contains('fx');

  /* Öffnungszeiten (eine Quelle für Info-Leiste und Tabellen) */
  var ZEITEN = {
    0: null,
    1: '7:30 bis 12:00 und 13:15 bis 17:30',
    2: '7:30 bis 12:00 und 13:15 bis 17:30',
    3: '7:30 bis 12:00 und 13:15 bis 17:30',
    4: '7:30 bis 12:00 und 13:15 bis 17:30',
    5: '7:30 bis 12:00 und 13:15 bis 17:00',
    6: 'samstag'
  };
  var TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  function heuteIndex() {
    try {
      var name = new Intl.DateTimeFormat('de-CH', { weekday: 'long', timeZone: 'Europe/Zurich' }).format(new Date());
      var i = TAGE.indexOf(name);
      if (i >= 0) return i;
    } catch (e) {}
    return new Date().getDay();
  }

  var tag = heuteIndex();
  var heute = document.getElementById('heute');
  if (heute) {
    var z = ZEITEN[tag];
    var kopf = '<b>Heute (' + TAGE[tag] + ')</b>';
    if (z === null) heute.innerHTML = kopf + '<span class="zu">Geschlossen</span>';
    else if (z === 'samstag') heute.innerHTML = kopf + '<span class="zu">Geschlossen.</span> Beratung und Verkauf nach Vereinbarung.';
    else heute.innerHTML = kopf + z.split(' und ').map(function (t) { return '<span class="nw">' + t + '</span>'; }).join(' und ');
  }
  document.querySelectorAll('.zeiten tr[data-tage]').forEach(function (tr) {
    if ((' ' + tr.getAttribute('data-tage') + ' ').indexOf(' ' + tag + ' ') >= 0) tr.classList.add('ist-heute');
  });
  var details = document.getElementById('zeiten-details');
  if (details) details.removeAttribute('open');

  /* Kopf: Schatten beim Scrollen, Menü */
  var kopfEl = document.getElementById('kopf');
  var knopf = kopfEl && kopfEl.querySelector('.menu-knopf');
  function menuZu() {
    if (!kopfEl.classList.contains('menu-offen')) return;
    kopfEl.classList.remove('menu-offen');
    knopf.setAttribute('aria-expanded', 'false');
  }
  if (knopf) {
    knopf.addEventListener('click', function () {
      var offen = kopfEl.classList.toggle('menu-offen');
      knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
    kopfEl.querySelectorAll('.menu a[href^="#"]:not([data-soon])').forEach(function (a) { a.addEventListener('click', menuZu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menuZu(); } });
  }

  /* Weiches Scrollen zu Ankern (nur Klicks, nicht bei reduzierter Bewegung) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || e.defaultPrevented) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Thema im Formular vorwählen (Klimaservice, Beratung) */
  var thema = document.getElementById('f-thema');
  document.querySelectorAll('[data-thema]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (thema) thema.value = a.getAttribute('data-thema');
    });
  });

  /* Klima-Check */
  var kc = document.getElementById('klimacheck');
  if (kc) {
    var antworten = {};
    var segmente = kc.querySelectorAll('.kc-balken span');
    var zahl = document.getElementById('kc-zahl');
    var erg = document.getElementById('kc-ergebnis');
    var ergTitel = document.getElementById('kc-erg-titel');
    var ergText = document.getElementById('kc-erg-text');
    var ergKnopf = erg.querySelector('.btn');
    var fragen = kc.querySelectorAll('.kc-frage');
    var letzteStufe = '';

    function auswerten() {
      var ja = 0, beantwortet = 0;
      for (var k in antworten) { beantwortet++; if (antworten[k] === 'ja') ja++; }
      segmente.forEach(function (s, i) { s.classList.toggle('ist-ja', i < ja); });
      if (zahl.textContent !== String(ja)) {
        zahl.textContent = ja;
        if (fx) { zahl.classList.remove('wechsel'); void zahl.offsetWidth; zahl.classList.add('wechsel'); }
      }
      var stufe = beantwortet === 0 ? 'start' : (ja > 2 ? 'hoch' : 'tief');
      if (stufe === 'start') {
        ergTitel.textContent = 'Tippen Sie bei jeder Frage auf Ja oder Nein.';
        ergText.textContent = 'Sind es mehr als zwei Mal Ja, ist es Zeit für einen Klimaservice.';
      } else if (stufe === 'hoch') {
        ergTitel.textContent = 'Zeit für einen Klimaservice.';
        ergText.textContent = 'Sie haben ' + ja + ' von 6 Fragen mit Ja beantwortet. Unser Klimaservice reinigt Ihre Klimaanlage komplett.';
      } else {
        ergTitel.textContent = ja === 1 ? 'Bisher eine Frage mit Ja.' : (ja === 0 ? 'Bisher keine Frage mit Ja.' : 'Bisher zwei Fragen mit Ja.');
        ergText.textContent = 'Für weitere Informationen rund um die Klimaanlage stehen wir Ihnen gerne zur Verfügung.';
      }
      ergKnopf.textContent = stufe === 'hoch' ? 'Klimaservice anfragen' : 'Frage zur Klimaanlage stellen';
      if (stufe !== letzteStufe) {
        erg.setAttribute('data-stufe', stufe);
        if (fx && letzteStufe) { erg.classList.remove('neu'); void erg.offsetWidth; erg.classList.add('neu'); }
        letzteStufe = stufe;
      }
    }

    fragen.forEach(function (f, i) {
      f.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var wert = b.getAttribute('data-wert');
          var war = antworten[i];
          if (war === wert) { delete antworten[i]; } else { antworten[i] = wert; }
          f.querySelectorAll('button').forEach(function (x) {
            x.setAttribute('aria-pressed', antworten[i] === x.getAttribute('data-wert') ? 'true' : 'false');
          });
          auswerten();
        });
      });
    });
    auswerten();
  }

  /* Einblenden beim Scrollen */
  var ziele = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  // Gestaffelte Verzögerung innerhalb gleicher Gruppen
  ['.karten', '.team-liste', '.hero-punkte'].forEach(function (sel) {
    var g = document.querySelector(sel);
    if (!g) return;
    Array.prototype.forEach.call(g.children, function (el, i) { el.style.setProperty('--d', (i * 70) + 'ms'); });
  });
  function zeigen(el) {
    el.classList.add('ist-da');
    setTimeout(function () { el.classList.add('rv-fertig'); }, 1300);
  }
  var offen = [];
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(zeigen);
  } else {
    offen = ziele.slice();
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeigen(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
  }
  /* Sicherheitsnetz bei schnellem Scrollen: alles, was schon oberhalb des Bildschirmrands liegt, zeigen */
  function nachziehen() {
    if (!offen.length) return;
    var grenze = window.innerHeight * 0.96;
    offen = offen.filter(function (el) {
      if (el.classList.contains('ist-da')) return false;
      if (el.getBoundingClientRect().top < grenze) { zeigen(el); return false; }
      return true;
    });
  }

  /* Aktionsleiste Handy erst nach dem Hero, Kopf-Schatten */
  var aktion = document.getElementById('aktion');
  var hero = document.querySelector('.hero');
  var band = document.getElementById('band');
  var bandBild = band && band.querySelector('.band-bild img');
  var bandAktiv = false;
  var tick = false;

  function takt() {
    tick = false;
    var y = window.scrollY || window.pageYOffset;
    if (kopfEl) kopfEl.classList.toggle('ist-gescrollt', y > 8);
    nachziehen();
    if (aktion && hero) aktion.classList.toggle('ist-da', hero.getBoundingClientRect().bottom < 40);
    if (bandAktiv && bandBild) {
      var r = band.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      bandBild.style.transform = 'translate3d(0,' + (-30 * p).toFixed(1) + 'px,0)';
    }
  }
  function anfordern() { if (!tick) { tick = true; requestAnimationFrame(takt); } }
  window.addEventListener('scroll', anfordern, { passive: true });
  window.addEventListener('resize', anfordern, { passive: true });

  if (fx && band && bandBild && 'IntersectionObserver' in window) {
    var mq = window.matchMedia('(min-width: 768px)');
    new IntersectionObserver(function (e) {
      bandAktiv = e[0].isIntersecting && mq.matches;
      if (!mq.matches) bandBild.style.transform = '';
      anfordern();
    }).observe(band);
  }
  takt();

  /* Hero-Auftritt fertig: Animationen lösen, damit keine Ebenen hängen bleiben */
  if (fx) setTimeout(function () { doc.classList.add('hero-ruhe'); }, 2600);
})();
