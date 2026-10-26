/* Fahrschule Schelbert, Design B: Umschalter Auto / Motorrad, Kamerafahrt, Reveals */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var ORDER = ['auto', 'moto'];
  var mode = root.getAttribute('data-mode') || 'auto';
  var LINES = {
    auto: 'Autofahren lernen, mit Handschaltung oder Automat.',
    moto: 'Motorradfahren lernen, Kategorie A, A1 und A beschränkt.'
  };

  /* ---------- Kamera: Flottenfoto schwenkt zur gewählten Seite ---------- */
  var cam = document.getElementById('cam');
  var IW = 1920, IH = 634;
  // Bildbereiche im Original (x von bis): zuerst die weite Einstellung, sonst die enge
  var FOCUS = {
    auto: [[40, 1310], [50, 880]],
    moto: [[1150, 1890]]
  };

  function place(m) {
    if (!cam) return;
    var ww = cam.clientWidth, wh = cam.clientHeight;
    if (!ww || !wh) return;
    var iw = wh * IW / IH;            // Bildbreite bei Massstab 1 (Höhe gefüllt)
    var s0 = Math.max(1, ww / iw);    // kleinster Massstab ohne Ränder
    var list = FOCUS[m], range = list[list.length - 1], s = s0;
    for (var i = 0; i < list.length; i++) {
      var fit = ww / ((list[i][1] - list[i][0]) / IW * iw);
      if (fit >= s0 || i === list.length - 1) {
        range = list[i];
        s = Math.min(Math.max(fit, s0), s0 * 1.3);  // höchstens 1.3, das Bild ist nur 634 px hoch
        break;
      }
    }
    var c = (range[0] + range[1]) / 2 / IW;
    var dx = -(c - 0.5) * iw * s;
    var lim = Math.max(0, (iw * s - ww) / 2);
    dx = Math.max(-lim, Math.min(lim, dx));
    cam.style.setProperty('--dx', dx.toFixed(1) + 'px');
    cam.style.setProperty('--s', s.toFixed(4));
  }

  if (cam) {
    var introDone = false;
    var lastW = cam.clientWidth, lastH = cam.clientHeight;
    if (reduce.matches) {
      cam.classList.add('no-tr');
      place(mode);
      introDone = true;
    } else {
      // Start in der Totalen, dann Schwenk auf die Autos, sobald der Verschluss offen ist
      setTimeout(function () { introDone = true; place(mode); }, 420);
    }
    var rt;
    window.addEventListener('resize', function () {
      // Nur echte Grössenänderungen des Fensters (am Handy feuert resize auch beim Ein- und Ausblenden der Adressleiste)
      var w = cam.clientWidth, h = cam.clientHeight;
      if (!introDone || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      cam.classList.add('no-tr');
      place(mode);
      clearTimeout(rt);
      rt = setTimeout(function () { if (!reduce.matches) cam.classList.remove('no-tr'); }, 150);
    }, { passive: true });
  }

  /* ---------- Modus umschalten ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"][data-set]'));
  var heroPanel = document.getElementById('hero-panel');
  var line = document.getElementById('mode-line');
  var lineTimer;

  function setLine(m) {
    if (!line) return;
    clearTimeout(lineTimer);
    if (reduce.matches) { line.textContent = LINES[m]; return; }
    line.classList.add('is-fading');
    lineTimer = setTimeout(function () {
      line.textContent = LINES[m];
      line.classList.remove('is-fading');
    }, 200);
  }

  function setMode(m) {
    if (m === mode || ORDER.indexOf(m) < 0) return;
    root.setAttribute('data-dir', ORDER.indexOf(m) > ORDER.indexOf(mode) ? 'next' : 'prev');
    mode = m;
    root.setAttribute('data-mode', m);
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-set') === m;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    if (heroPanel) heroPanel.setAttribute('aria-labelledby', m === 'auto' ? 'tab-auto' : 'tab-moto');
    if (cam) cam.classList.toggle('no-tr', reduce.matches);
    place(m);
    setLine(m);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { setMode(t.getAttribute('data-set')); });
    t.addEventListener('keydown', function (e) {
      var list = Array.prototype.slice.call(t.parentNode.querySelectorAll('[role="tab"]'));
      var i = list.indexOf(t), next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = list[(i + 1) % list.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = list[(i - 1 + list.length) % list.length];
      else if (e.key === 'Home') next = list[0];
      else if (e.key === 'End') next = list[list.length - 1];
      if (!next) return;
      e.preventDefault();
      setMode(next.getAttribute('data-set'));
      next.focus();
    });
  });

  /* ---------- Sanftes Scrollen nur für Anker-Links (nicht global, damit Tests und Tastatur sofort springen) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'inhalt') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* ---------- Scroll-Reveals ---------- */
  var items = document.querySelectorAll('.rv');
  function showAll() { for (var k = 0; k < items.length; k++) items[k].classList.add('is-in'); }
  if (!('IntersectionObserver' in window) || reduce.matches) {
    showAll();
  } else {
    root.classList.add('rv-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    for (var k = 0; k < items.length; k++) io.observe(items[k]);
  }

  /* ---------- Aktionsleiste am Handy erst nach dem Hero ---------- */
  var bar = document.querySelector('.abar');
  if (bar) {
    var ticking = false;
    var check = function () {
      ticking = false;
      bar.classList.toggle('is-on', window.scrollY > Math.min(420, window.innerHeight * 0.55));
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
    }, { passive: true });
    check();
  }
})();
