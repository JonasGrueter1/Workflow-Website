/* Erich Schürmann Malergeschäft, Design B «Persönlich» */
(function () {
  'use strict';
  window.schuermannB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Linie beim Scrollen ---------- */
  var kopf = $('#kopf');
  var kopfTick = false;
  function kopfUpdate() { kopfTick = false; kopf.classList.toggle('ist-gescrollt', window.scrollY > 40); }
  window.addEventListener('scroll', function () { if (!kopfTick) { kopfTick = true; requestAnimationFrame(kopfUpdate); } }, { passive: true });
  kopfUpdate();

  /* ---------- Menü Handy ---------- */
  var knopf = $('.menue-knopf');
  var menue = $('#menue');
  function menueZu(fokus) {
    if (menue.hidden) return;
    menue.hidden = true;
    knopf.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menue-offen');
    if (fokus) knopf.focus();
  }
  knopf.addEventListener('click', function () {
    var auf = menue.hidden;
    menue.hidden = !auf;
    knopf.setAttribute('aria-expanded', String(auf));
    document.body.classList.toggle('menue-offen', auf);
    if (auf) { var erster = $('a', menue); if (erster) erster.focus(); }
  });
  menue.addEventListener('click', function (e) { if (e.target.closest('a')) menueZu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menueZu(true); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1080) menueZu(false); });

  /* ---------- Leistungslisten: auf dem Handy zugeklappt ---------- */
  var mqKlein = window.matchMedia('(max-width: 699px)');
  var listenSetzen = function () { $$('.l-det').forEach(function (d) { d.open = !mqKlein.matches; }); };
  listenSetzen();
  if (mqKlein.addEventListener) mqKlein.addEventListener('change', listenSetzen);

  /* ---------- Formular: Name des gewählten Fotos ---------- */
  var kFoto = $('#k-foto');
  var kName = $('#k-foto-name');
  if (kFoto && kName) {
    kFoto.addEventListener('change', function () {
      kName.textContent = kFoto.files && kFoto.files[0] ? kFoto.files[0].name : 'Noch kein Foto';
    });
  }

  /* ---------- Sanftes Springen zu Abschnitten (nur mit Bewegung) ---------- */
  if (fx && 'scrollBehavior' in root.style) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      var ziel = id === 'top' ? document.body : document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
      else ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------- Scroll-Reveals ---------- */
  var reveals = $$('[data-reveal]');
  // gestaffelt innerhalb eines Rasters
  $$('.l-raster, .v-raster').forEach(function (g) {
    $$('[data-reveal]', g).forEach(function (el, i) { el.style.setProperty('--d', (i % 3) * 0.09 + 's'); });
  });
  $$('.a-karte').forEach(function (el, i) { el.style.setProperty('--d', Math.min(i, 4) * 0.1 + 's'); });

  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-da'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
    var reihe = $('#a-reihe');
    if (reihe) io.observe(reihe);
  } else {
    reveals.forEach(function (el) { el.classList.add('ist-da'); });
    var r2 = $('#a-reihe'); if (r2) r2.classList.add('ist-da');
  }

  /* ---------- Aktionsleiste Handy: erscheint nach dem Hero ---------- */
  var aktion = $('#aktion');
  var hero = $('.hero');
  if (aktion && hero && hasIO) {
    new IntersectionObserver(function (entries) {
      aktion.classList.toggle('zeigen', !entries[0].isIntersecting);
    }, { rootMargin: '-35% 0px 0px 0px' }).observe(hero);
  } else if (aktion) { aktion.classList.add('zeigen'); }

  /* ---------- Aktiver Menüpunkt ---------- */
  var navLinks = $$('.nav a');
  if (hasIO && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { var a = map[en.target.id]; if (a) a.classList.toggle('ist-aktiv', en.isIntersecting); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var sek = document.getElementById(id); if (sek) navObs.observe(sek); });
  }

  /* ---------- Ihr Bild an der Wand ---------- */
  var MOTIVE = {
    skyline: { src: '../assets/img/b-motiv-skyline.webp', name: 'Beispiel: Skyline' },
    delfine: { src: '../assets/img/b-motiv-delfine.webp', name: 'Beispiel: Delfine' },
    ornament: { src: '../assets/img/b-motiv-ornament.webp', name: 'Beispiel: Ornament' }
  };
  var bahnen = $('#bahnen');
  var basis = document.createElement('img');
  basis.className = 'wand-basis'; basis.alt = ''; basis.hidden = true;
  var leer = $('.wand-leer');
  var tag = $('#raum-tag');
  var wahl = $('#foto-wahl');
  var motivKnoepfe = $$('.motiv');
  var aktuell = null;      // aktuelle Bildquelle an der Wand
  var eigeneUrl = null;    // Objekt-URL des eigenen Fotos
  var benutzt = false;     // hat jemand selbst gewählt?
  var laeuft = 0;

  function bahnImgs() { return $$('.bahn img', bahnen); }
  function decode(img) { return img.decode ? img.decode().catch(function () {}) : Promise.resolve(); }

  function zeigeTag(text) {
    tag.textContent = text;
    tag.classList.add('zeigen');
  }
  function drueckeMotiv(key) {
    motivKnoepfe.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-motiv') === key)); });
  }

  function setzeBild(src, text, key) {
    var nr = ++laeuft;
    var imgs = bahnImgs();
    var vorher = aktuell;
    drueckeMotiv(key || '');
    // 1. Bisheriges Bild als Grund festhalten
    var schritt = Promise.resolve();
    if (vorher) {
      if (!basis.parentNode) bahnen.parentNode.insertBefore(basis, bahnen);
      basis.hidden = false;
      if (basis.getAttribute('src') !== vorher) basis.src = vorher;
      schritt = decode(basis);
    }
    schritt.then(function () {
      if (nr !== laeuft) return;
      if (vorher) leer.hidden = true;
      bahnen.classList.remove('rollen', 'fertig');
      imgs.forEach(function (im) { im.src = src; });
      return decode(imgs[0]);
    }).then(function () {
      if (nr !== laeuft) return;
      aktuell = src;
      if (!fx) {
        bahnen.classList.add('fertig');
        leer.hidden = true;
        zeigeTag(text);
        return;
      }
      void bahnen.offsetWidth; // Neustart der Animation erzwingen
      bahnen.classList.add('rollen');
      zeigeTag(text);
      var letzte = $$('.bahn', bahnen).pop();
      var fertig = function (e) {
        if (e && e.animationName !== 'abrollen') return;
        letzte.removeEventListener('animationend', fertig);
        if (nr !== laeuft) return;
        bahnen.classList.add('fertig');
        bahnen.classList.remove('rollen');
        leer.hidden = true;
      };
      letzte.addEventListener('animationend', fertig);
    });
  }

  motivKnoepfe.forEach(function (b) {
    b.addEventListener('click', function () {
      benutzt = true;
      var key = b.getAttribute('data-motiv');
      setzeBild(MOTIVE[key].src, MOTIVE[key].name, key);
    });
  });

  if (wahl) {
    wahl.addEventListener('change', function () {
      var f = wahl.files && wahl.files[0];
      if (!f || !/^image\//.test(f.type)) return;
      benutzt = true;
      var alt = eigeneUrl;
      eigeneUrl = URL.createObjectURL(f);
      setzeBild(eigeneUrl, 'Ihr Foto', '');
      // alte Objekt-URL erst freigeben, wenn sie nirgends mehr gezeigt wird
      if (alt) setTimeout(function () { if (aktuell !== alt && basis.getAttribute('src') !== alt) URL.revokeObjectURL(alt); }, 3000);
    });
  }

  // Beim ersten Sichtkontakt rollt ein Beispiel ab
  var raum = $('#raum');
  if (raum && bahnen) {
    if (!fx || !hasIO) {
      setzeBild(MOTIVE.skyline.src, MOTIVE.skyline.name, 'skyline');
    } else {
      var rio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        rio.disconnect();
        setTimeout(function () { if (!benutzt) setzeBild(MOTIVE.skyline.src, MOTIVE.skyline.name, 'skyline'); }, 650);
      }, { threshold: 0.5 });
      rio.observe(raum);
    }
  }

  /* ---------- Arbeiten: Pfeile und Fortschritt ---------- */
  var reiheEl = $('#a-reihe');
  var zur = $('#a-zurueck');
  var wei = $('#a-weiter');
  var balken = $('#a-balken');
  if (reiheEl) {
    var tick = false;
    var update = function () {
      tick = false;
      var max = reiheEl.scrollWidth - reiheEl.clientWidth;
      var p = max > 0 ? reiheEl.scrollLeft / max : 1;
      var sicht = reiheEl.clientWidth / reiheEl.scrollWidth;
      if (balken) balken.style.transform = 'translateX(' + (p * (1 - sicht) * 100) + '%) scaleX(' + sicht + ')';
      if (zur) zur.disabled = reiheEl.scrollLeft < 4;
      if (wei) wei.disabled = reiheEl.scrollLeft > max - 4;
    };
    reiheEl.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    var schritt = function (dir) {
      var karte = $('.a-karte', reiheEl);
      var w = karte ? karte.getBoundingClientRect().width + 24 : 400;
      reiheEl.scrollBy({ left: dir * w, behavior: fx ? 'smooth' : 'auto' });
    };
    if (zur) zur.addEventListener('click', function () { schritt(-1); });
    if (wei) wei.addEventListener('click', function () { schritt(1); });
    update();
  }
})();
