/* Fahrschule Keiser, Design A «Pinselstrich»: Pinsel-Titel, Hero, Einblenden, Menü, Abo-Wähler, Lightbox, Aktionsleiste */
(function () {
  'use strict';
  window.keiserA = true;
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // Pinsel-Titel in Zeilen teilen, damit jede Zeile einzeln «gemalt» wird
  var teileZeilen = function (el) {
    var text = el.textContent.trim();
    var woerter = text.split(/\s+/);
    el.textContent = '';
    var spans = woerter.map(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w;
      el.appendChild(s);
      if (i < woerter.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    var zeilen = [], top = null;
    spans.forEach(function (s) {
      var t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { zeilen.push([]); top = t; }
      zeilen[zeilen.length - 1].push(s.textContent);
    });
    el.textContent = '';
    el.setAttribute('aria-label', text);
    zeilen.forEach(function (z, i) {
      var span = document.createElement('span');
      span.className = 'zeile';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--z', i);
      span.textContent = z.join(' ');
      el.appendChild(span);
      if (i < zeilen.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.classList.add('ist-geteilt');
  };
  var maler = document.querySelectorAll('[data-malen]');
  var teileAlle = function () {
    if (reduced) return;
    each(maler, function (el) {
      if (el.querySelector('.zeile')) {
        // Bei Grössenänderung neu umbrechen
        el.textContent = el.getAttribute('aria-label') || el.textContent;
      }
      teileZeilen(el);
    });
  };

  var start = function () {
    teileAlle();
    requestAnimationFrame(function () {
      root.classList.add('ist-geladen');
      var h1 = document.querySelector('.hero-titel');
      if (h1) h1.classList.add('ist-da');
    });
  };
  if (document.fonts && document.fonts.ready && !reduced) {
    var gestartet = false;
    var los = function () { if (!gestartet) { gestartet = true; start(); } };
    document.fonts.ready.then(los);
    setTimeout(los, 900);
  } else {
    start();
  }

  var breite = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - breite) < 40) return;
    breite = window.innerWidth;
    teileAlle();
  });

  // Gestaffeltes Einblenden: Geschwister in derselben Gruppe bekommen eine Verzögerung
  var reveals = document.querySelectorAll('[data-reveal]');
  each(reveals, function (el) {
    var geschwister = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
    var idx = geschwister.indexOf(el);
    if (idx > 0) el.style.setProperty('--i', Math.min(idx, 5));
  });

  var ziele = document.querySelectorAll('[data-reveal], [data-malen]:not(.hero-titel), .kontakt');
  var zeige = function (t) { t.classList.add('ist-da'); };
  if (reduced || !('IntersectionObserver' in window)) {
    each(ziele, zeige);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    each(ziele, function (t) { io.observe(t); });
    // Sicherheitsnetz: was nach einem Anker-Sprung schon oberhalb liegt, sofort zeigen
    window.addEventListener('load', function () {
      each(ziele, function (t) { if (t.getBoundingClientRect().bottom < 0) zeige(t); });
    });
  }

  // Kopfzeile: Linie nach dem Scrollen
  var kopf = document.getElementById('kopf');
  var leiste = document.getElementById('aktionsleiste');
  var hero = document.querySelector('.hero');
  var onScroll = function () {
    var y = window.scrollY;
    if (kopf) kopf.classList.toggle('ist-gescrollt', y > 12);
    if (leiste && hero) {
      var ende = hero.offsetTop + hero.offsetHeight * 0.55;
      var kontakt = document.getElementById('kontakt');
      var imKontakt = kontakt && kontakt.getBoundingClientRect().top < window.innerHeight * 0.6 && kontakt.getBoundingClientRect().bottom > 0;
      leiste.classList.toggle('ist-sichtbar', y > ende && !imKontakt);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menü am Handy
  var btn = document.querySelector('.kopf-menu');
  var nav = document.getElementById('kopf-nav');
  if (btn && nav && kopf) {
    var setOpen = function (open) {
      kopf.classList.toggle('ist-offen', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    };
    btn.addEventListener('click', function () { setOpen(!kopf.classList.contains('ist-offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  // Abo-Wähler: die alte Zahl wischt nach oben weg
  var radios = document.querySelectorAll('input[name="abo"]');
  var vorher = document.querySelector('.anzeige.a-1');
  each(radios, function (r) {
    r.addEventListener('change', function () {
      if (vorher) {
        var alt = vorher;
        alt.classList.add('ist-weg');
        setTimeout(function () { alt.classList.remove('ist-weg'); }, 320);
      }
      vorher = document.querySelector('.anzeige.a-' + r.id.replace('abo-', ''));
    });
  });

  // Weiches Scrollen zu den Ankern (nicht global, damit Scroll-Werkzeuge nicht verzögert werden)
  if (!reduced) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-soon')) return;
      var id = a.getAttribute('href').slice(1);
      var ziel = id && document.getElementById(id);
      if (!ziel) return;
      e.preventDefault();
      ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  // Rückruf-Formular ist ein Vorschlag: Absenden zeigt den Hinweis der Vorschau
  var form = document.querySelector('.rueckruf');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = form.querySelector('[data-soon]');
      if (b && e.submitter !== b) b.click();
    });
  }

  // Lightbox für die Bestätigung des Strassenverkehrsamts
  var box = document.getElementById('lightbox');
  if (box && typeof box.showModal === 'function') {
    var ausloeser = null;
    each(document.querySelectorAll('[data-lightbox]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        ausloeser = a;
        box.showModal();
      });
    });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('close', function () { if (ausloeser) ausloeser.focus(); });
  }
})();
