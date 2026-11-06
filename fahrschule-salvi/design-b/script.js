/* Fahrschule Salvi, Design B «Ready to take your chance»: Kopf, Menü, Einblenden, Abo-Leiste, Laufband, Galerie */
(function () {
  'use strict';
  window.salviB = true;
  var root = document.documentElement;
  /* Kam das Skript erst nach dem Sicherheitsnetz, gilt die JS-Darstellung trotzdem (ohne Animation) */
  root.classList.add('js');
  var fx = function () { return root.classList.contains('fx'); };

  /* Kopf: Hintergrund ab 24 px Scrollweg */
  var kopf = document.querySelector('[data-kopf]');
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      if (kopf) kopf.classList.toggle('ist-fest', y > 24);
      tick = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menü (Handy und Tablet) */
  var knopf = document.querySelector('[data-menue-knopf]');
  var menue = document.querySelector('[data-menue]');
  function menueSetzen(offen) {
    if (!knopf || !menue) return;
    knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    menue.hidden = !offen;
    kopf.classList.toggle('menue-offen', offen);
    document.body.classList.toggle('menue-auf', offen);
    knopf.querySelector('.sr').textContent = offen ? 'Menü schliessen' : 'Menü';
  }
  if (knopf && menue) {
    knopf.addEventListener('click', function () { menueSetzen(knopf.getAttribute('aria-expanded') !== 'true'); });
    menue.addEventListener('click', function (e) { if (e.target.closest('a')) menueSetzen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') { menueSetzen(false); knopf.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100) menueSetzen(false); });
  }

  /* Reihenfolge für gestaffelte Animationen */
  document.querySelectorAll('[data-reihe]').forEach(function (liste) {
    Array.prototype.forEach.call(liste.children, function (el, i) { el.style.setProperty('--i', i); });
  });

  /* Striche der Abo-Karten: ein Strich pro Lektion */
  document.querySelectorAll('[data-striche]').forEach(function (el) {
    var n = parseInt(el.getAttribute('data-striche'), 10) || 0;
    for (var s = 0; s < n; s++) {
      var strich = document.createElement('i');
      strich.style.setProperty('--s', s);
      el.appendChild(strich);
    }
  });

  /* Einblenden beim Scrollen */
  var reveal = document.querySelectorAll('[data-reveal], [data-galerie]');
  if ('IntersectionObserver' in window && fx()) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          el.classList.add('ist-da');
          io.unobserve(el);
          /* Nach dem Einblenden: Verzögerungen weg, damit Hover sofort reagiert */
          if (el.hasAttribute('data-reihe')) setTimeout(function () { el.classList.add('ist-fertig'); }, 1600);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveal.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: was beim Laden schon oberhalb liegt (Sprung per Anker), sofort zeigen */
    window.addEventListener('load', function () {
      reveal.forEach(function (el) {
        if (el.getBoundingClientRect().bottom < 0) { el.classList.add('ist-da'); io.unobserve(el); }
      });
    });
  } else {
    reveal.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Sanftes Scrollen zu Ankern (Links mit data-soon übernimmt die Vorschau-Leiste) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx() ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Abo-Leiste am Handy: Punkte zeigen die aktuelle Karte */
  var scroller = document.querySelector('[data-abo-scroller]');
  var punkte = document.querySelectorAll('[data-abo-punkte] span');
  if (scroller && punkte.length) {
    var karten = scroller.querySelectorAll('.abo');
    var aboTick = false;
    var aktualisieren = function () {
      aboTick = false;
      var links = scroller.getBoundingClientRect().left;
      var best = 0, abstand = Infinity;
      karten.forEach(function (k, i) {
        var d = Math.abs(k.getBoundingClientRect().left - links - 20);
        if (d < abstand) { abstand = d; best = i; }
      });
      punkte.forEach(function (p, i) { p.classList.toggle('ist-aktiv', i === best); });
    };
    scroller.addEventListener('scroll', function () {
      if (!aboTick) { aboTick = true; requestAnimationFrame(aktualisieren); }
    }, { passive: true });
    aktualisieren();
  }

  /* Laufband der Assistenzsysteme: Liste verdoppeln, dann gleichmässig laufen lassen */
  var band = document.querySelector('[data-laufband]');
  if (band && fx()) {
    var spur = band.querySelector('.laufband-spur');
    var original = Array.prototype.slice.call(spur.children);
    original.forEach(function (li) {
      var k = li.cloneNode(true);
      k.setAttribute('aria-hidden', 'true');
      spur.appendChild(k);
    });
    band.classList.add('ist-bereit');
    var setzeTempo = function () {
      var breite = spur.scrollWidth / 2;
      band.style.setProperty('--lauf-weg', '-' + breite + 'px');
      band.style.setProperty('--lauf-dauer', Math.max(24, breite / 45) + 's');
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setzeTempo); else setzeTempo();
    window.addEventListener('resize', setzeTempo);
  }

  /* Galerie: Pfeile und Ziehen mit der Maus */
  var leiste = document.querySelector('[data-galerie]');
  if (leiste) {
    var pfeile = document.querySelectorAll('[data-gal]');
    var schritt = function () { return Math.max(260, leiste.clientWidth * 0.7); };
    var pfeilStatus = function () {
      var max = leiste.scrollWidth - leiste.clientWidth - 2;
      pfeile.forEach(function (b) {
        var r = parseInt(b.getAttribute('data-gal'), 10);
        b.disabled = r < 0 ? leiste.scrollLeft <= 2 : leiste.scrollLeft >= max;
      });
    };
    pfeile.forEach(function (b) {
      b.addEventListener('click', function () {
        leiste.scrollBy({ left: parseInt(b.getAttribute('data-gal'), 10) * schritt(), behavior: fx() ? 'smooth' : 'auto' });
      });
    });
    leiste.addEventListener('scroll', function () { requestAnimationFrame(pfeilStatus); }, { passive: true });
    window.addEventListener('resize', pfeilStatus);
    window.addEventListener('load', pfeilStatus);
    pfeilStatus();

    leiste.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        leiste.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * schritt(), behavior: fx() ? 'smooth' : 'auto' });
      }
    });

    var start = null, startLinks = 0, gezogen = false;
    leiste.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      start = e.clientX; startLinks = leiste.scrollLeft; gezogen = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (start === null) return;
      var dx = e.clientX - start;
      if (!gezogen && Math.abs(dx) > 6) { gezogen = true; leiste.classList.add('ist-ziehen'); }
      if (gezogen) leiste.scrollLeft = startLinks - dx;
    });
    window.addEventListener('pointerup', function () {
      if (start === null) return;
      start = null;
      if (gezogen) setTimeout(function () { leiste.classList.remove('ist-ziehen'); gezogen = false; }, 30);
    });
    leiste.addEventListener('click', function (e) { if (gezogen) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
})();
