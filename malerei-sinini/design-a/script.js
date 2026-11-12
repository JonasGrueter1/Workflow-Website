/* Malerei Sinini, Design A: Menü, Einblendungen, Vorher und nachher, Farbtonkarte, Aktionsleiste */
(function () {
  'use strict';
  window.siniA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');

  /* Fertige Animationen entfernen: Der Endzustand entspricht dem Normalzustand */
  document.addEventListener('animationend', function (e) {
    if (e.target && e.target.classList && !e.target.closest('.messpunkt')) e.target.classList.add('anim-fertig');
  });

  /* Kopf: Linie und Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var onScroll = function () {
    kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
    if (window.scrollY < 300) navLinks.forEach(function (a) { a.classList.remove('ist-aktiv'); });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menü mobil */
  var menuBtn = document.querySelector('.kopf-menu');
  var menu = document.getElementById('menu');
  var setMenu = function (offen) {
    menuBtn.setAttribute('aria-expanded', String(offen));
    menuBtn.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    menu.hidden = !offen;
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1100) setMenu(false); });

  /* Anker sanft anspringen; «Farbberatung anfragen» füllt die Nachricht vor */
  var nachricht = document.getElementById('f-nachricht');
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    var ziel = id === '#top' ? document.body : (id.length > 1 ? document.querySelector(id) : null);
    if (!ziel) return;
    e.preventDefault();
    var anliegen = a.getAttribute('data-anliegen');
    if (anliegen && nachricht && !nachricht.value) nachricht.value = anliegen;
    if (id === '#top') window.scrollTo({ top: 0, behavior: fx ? 'smooth' : 'auto' });
    else ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* Formular ist eine Vorschau: nichts absenden */
  var formular = document.getElementById('formular');
  if (formular) formular.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Einblendungen beim Scrollen */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], .faecher'));
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('ist-sichtbar');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* Vorher und nachher: Umschalter mit Wisch-Überblendung */
  var vn = document.getElementById('vn');
  var vnText = document.getElementById('vn-unterschrift');
  var vnKnoepfe = Array.prototype.slice.call(document.querySelectorAll('.vn-knopf'));
  var vnBenutzt = false;
  var vnTimer;
  var zeige = function (zustand) {
    if (vn.getAttribute('data-zustand') === zustand) return;
    vn.setAttribute('data-zustand', zustand);
    vnKnoepfe.forEach(function (k) { k.setAttribute('aria-pressed', String(k.getAttribute('data-zeige') === zustand)); });
    var cap = vn.querySelector('.vn-' + zustand + ' figcaption');
    if (vnText && cap) vnText.textContent = cap.textContent;
    if (fx) {
      vn.classList.add('ist-wischend');
      clearTimeout(vnTimer);
      vnTimer = setTimeout(function () { vn.classList.remove('ist-wischend'); }, 900);
    }
  };
  vnKnoepfe.forEach(function (k) {
    k.addEventListener('click', function () { vnBenutzt = true; zeige(k.getAttribute('data-zeige')); });
  });
  /* Einmal automatisch von Vorher zu Nachher, sobald der Rahmen gut sichtbar ist */
  if (fx && 'IntersectionObserver' in window) {
    var vnIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        vnIo.disconnect();
        setTimeout(function () { if (!vnBenutzt) zeige('nachher'); }, 1200);
      });
    }, { threshold: 0.55 });
    vnIo.observe(vn);
  }

  /* Farbtonkarte: Radiogruppe mit Pfeiltasten, Foto mit Messpunkt */
  var faecher = document.getElementById('faecher');
  var muster = Array.prototype.slice.call(faecher.querySelectorAll('.muster'));
  /* Zweite Bildebene für die Überblendung (erst mit JavaScript, damit kein leeres Bild im HTML steht) */
  var erstesBild = document.querySelector('.farbfoto-img');
  var zweitesBild = document.createElement('img');
  zweitesBild.className = 'farbfoto-img';
  zweitesBild.alt = '';
  zweitesBild.width = 540; zweitesBild.height = 720;
  zweitesBild.decoding = 'async';
  zweitesBild.loading = 'lazy';
  zweitesBild.setAttribute('aria-hidden', 'true');
  zweitesBild.src = erstesBild.getAttribute('src');
  erstesBild.parentNode.insertBefore(zweitesBild, erstesBild.nextSibling);
  var bilder = [erstesBild, zweitesBild];
  var punkt = document.getElementById('messpunkt');
  var fotoText = document.getElementById('farbfoto-text');
  var aktivBild = 0;
  var wahl = 0;
  muster.forEach(function (m, i) { m.style.setProperty('--n', i); });
  var setzePunkt = function (m) {
    var x = parseFloat(m.getAttribute('data-x'));
    punkt.style.setProperty('--x', x + '%');
    punkt.style.setProperty('--y', m.getAttribute('data-y') + '%');
    punkt.style.setProperty('--ton', m.style.getPropertyValue('--ton'));
    punkt.classList.toggle('ist-rechts', x > 55);
  };
  setzePunkt(muster[0]);
  var waehle = function (i, fokus) {
    if (i === wahl) { if (fokus) muster[i].focus(); return; }
    wahl = i;
    var m = muster[i];
    muster.forEach(function (x, j) {
      x.setAttribute('aria-checked', String(j === i));
      x.tabIndex = j === i ? 0 : -1;
    });
    if (fokus) m.focus();
    if (window.innerWidth < 1000 && m.scrollIntoView) {
      var r = m.getBoundingClientRect(), fr = faecher.getBoundingClientRect();
      if (r.left < fr.left || r.right > fr.right) faecher.scrollBy({ left: r.left - fr.left - 16, behavior: fx ? 'smooth' : 'auto' });
    }
    var neu = bilder[1 - aktivBild];
    var alt = bilder[aktivBild];
    var quelle = '../assets/img/' + m.getAttribute('data-bild') + '.webp';
    punkt.classList.add('ist-weg');
    var tausche = function () {
      if (wahl !== i) return;
      neu.alt = 'Foto zum Farbton ' + m.querySelector('strong').textContent + ': ' + m.getAttribute('data-text');
      neu.removeAttribute('aria-hidden');
      alt.setAttribute('aria-hidden', 'true');
      alt.alt = '';
      neu.classList.add('ist-aktiv');
      alt.classList.remove('ist-aktiv');
      aktivBild = 1 - aktivBild;
      setzePunkt(m);
      fotoText.textContent = m.getAttribute('data-text');
      punkt.classList.remove('ist-weg', 'ist-neu');
      void punkt.offsetWidth;
      punkt.classList.add('ist-neu');
    };
    if (neu.getAttribute('src') !== quelle) {
      neu.onload = function () { neu.onload = null; tausche(); };
      neu.onerror = tausche;
      neu.src = quelle;
      if (neu.complete && neu.naturalWidth) { neu.onload = null; tausche(); }
    } else {
      tausche();
    }
  };
  muster.forEach(function (m, i) {
    m.addEventListener('click', function () { waehle(i, false); });
  });
  faecher.addEventListener('keydown', function (e) {
    var n = muster.length;
    var map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in map) { e.preventDefault(); waehle((wahl + map[e.key] + n) % n, true); }
    else if (e.key === 'Home') { e.preventDefault(); waehle(0, true); }
    else if (e.key === 'End') { e.preventDefault(); waehle(n - 1, true); }
  });
  /* Fotos der Farbtonkarte vorladen, sobald der Abschnitt naht */
  if ('IntersectionObserver' in window) {
    var vorIo = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      vorIo.disconnect();
      muster.forEach(function (m) { var im = new Image(); im.src = '../assets/img/' + m.getAttribute('data-bild') + '.webp'; });
    }, { rootMargin: '400px 0px' });
    vorIo.observe(faecher);
  }

  /* Öffnungszeiten: geöffnet oder geschlossen (Zeit in der Schweiz) */
  var status = document.getElementById('status');
  try {
    var teile = new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var wert = {};
    teile.forEach(function (t) { wert[t.type] = t.value; });
    var tag = wert.weekday.replace('.', '');
    var minuten = parseInt(wert.hour, 10) * 60 + parseInt(wert.minute, 10);
    var werktag = ['Mo', 'Di', 'Mi', 'Do', 'Fr'].indexOf(tag) > -1;
    var offen = werktag && ((minuten >= 420 && minuten < 720) || (minuten >= 780 && minuten < 1020));
    status.textContent = offen ? 'Jetzt geöffnet' : 'Jetzt geschlossen';
    status.classList.toggle('ist-offen', offen);
    status.hidden = false;
  } catch (e) { /* ohne Zeitzone: keine Anzeige */ }

  /* Aktionsleiste mobil: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  var kontakt = document.getElementById('kontakt');
  var aktionWartet = false;
  var aktionSetzen = function () {
    aktionWartet = false;
    var weg = heroCta.getBoundingClientRect().bottom < 0;
    var kr = kontakt.getBoundingClientRect();
    var amFormular = kr.top < window.innerHeight * 0.6 && kr.bottom > 0;
    aktion.classList.toggle('ist-da', weg && !amFormular);
  };
  aktionSetzen();
  window.addEventListener('scroll', function () {
    if (!aktionWartet) { aktionWartet = true; requestAnimationFrame(aktionSetzen); }
  }, { passive: true });
  window.addEventListener('resize', aktionSetzen);

  /* Aktiver Menüpunkt beim Scrollen */
  if ('IntersectionObserver' in window && navLinks.length) {
    var abschnitte = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    abschnitte.forEach(function (s) { navIo.observe(s); });
  }
})();
