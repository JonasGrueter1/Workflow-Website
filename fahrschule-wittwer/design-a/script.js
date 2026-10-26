/* Fahrschule Wittwer, Design A «Leuchtstift»
   Kopfzeile, Leuchtstift-Markierungen, Einblenden, gezeichnete Linien, Parallaxe, Aktionsleiste. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Kopfzeile: Haarlinie nach dem ersten Scrollen */
  var header = document.querySelector('.hd');
  var onScrollHeader = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Leuchtstift ----------
     Jede Markierung wird pro Textzeile in einen eigenen Strich aufgeteilt,
     damit der Stift auch über Zeilenumbrüche hinweg sauber von links nach rechts zieht. */
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  var split = function (mk) {
    var text = mk.getAttribute('data-text');
    if (!text) { text = mk.textContent.replace(/[ \t\r\n]+/g, ' ').trim(); mk.setAttribute('data-text', text); }
    var words = text.split(' ');
    mk.innerHTML = words.map(function (w) { return '<span class="mk-w">' + esc(w) + '</span>'; }).join(' ');
    var lines = [], top = null;
    Array.prototype.forEach.call(mk.querySelectorAll('.mk-w'), function (w) {
      var t = w.getBoundingClientRect().top;
      if (top === null || Math.abs(t - top) > 6) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w.textContent);
    });
    mk.innerHTML = lines.map(function (l) { return '<span class="mk-line">' + esc(l.join(' ')) + '</span>'; }).join(' ');
  };

  var marks = Array.prototype.slice.call(document.querySelectorAll('.mk'));
  marks.forEach(split);

  /* Nach dem Laden der Schrift oder bei neuer Breite neu aufteilen, Zustand bleibt erhalten */
  var resplitAll = function () {
    marks.forEach(function (mk) {
      var drawn = mk.classList.contains('is-drawn');
      mk.classList.remove('is-animating');
      split(mk);
      if (drawn) mk.classList.add('is-drawn');
    });
  };

  /* Zeichnet eine Markierung, gibt die Dauer in ms zurück */
  var draw = function (mk, start) {
    var t = start || 0;
    var lines = mk.querySelectorAll('.mk-line');
    if (reduce) { mk.classList.add('is-drawn'); return 0; }
    Array.prototype.forEach.call(lines, function (line, i) {
      var w = line.getBoundingClientRect().width;
      var dur = Math.max(240, Math.min(640, w / 1.7));
      line.style.setProperty('--delay', t + 'ms');
      line.style.setProperty('--dur', dur + 'ms');
      t += dur + (i < lines.length - 1 ? 40 : 0);
    });
    mk.classList.add('is-animating');
    // Erst im nächsten Bild auslösen, damit der Übergang sicher startet
    requestAnimationFrame(function () { requestAnimationFrame(function () { mk.classList.add('is-drawn'); }); });
    setTimeout(function () { mk.classList.remove('is-animating'); }, t + 80);
    return t - (start || 0);
  };

  var drawChain = function (list, startDelay) {
    var t = startDelay || 0;
    list.forEach(function (mk) { t += draw(mk, t) + 140; });
  };

  /* Hero: Schrift ist sofort da, danach zieht der Stift */
  var heroMarks = Array.prototype.slice.call(document.querySelectorAll('[data-mk-chain="hero"] .mk'));
  var startHero = function () { drawChain(heroMarks, 320); };
  if (document.fonts && document.fonts.ready && !reduce) {
    var started = false;
    var go = function () { if (!started) { started = true; resplitAll(); startHero(); } };
    document.fonts.ready.then(go);
    setTimeout(go, 600);
  } else {
    startHero();
  }

  /* Übrige Markierungen: beim Sichtbarwerden, in Gruppen nacheinander */
  var chained = function (mk) { return mk.closest('[data-mk-chain]'); };
  var groups = [];
  var singles = [];
  marks.forEach(function (mk) {
    var c = chained(mk);
    if (c && c.getAttribute('data-mk-chain') === 'hero') return;
    if (c) { if (groups.indexOf(c) < 0) groups.push(c); } else { singles.push(mk); }
  });

  /* ---------- Einblenden ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (list) {
    Array.prototype.forEach.call(list.children, function (el, i) { el.style.setProperty('--i', i); });
  });
  var reveals = document.querySelectorAll('.rv');
  var drawings = document.querySelectorAll('.draw:not(.note-arrow)');

  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        if (el.classList.contains('mk')) {
          var host = el.closest('.rv');
          var idx = host ? parseInt(host.style.getPropertyValue('--i'), 10) || 0 : 0;
          draw(el, host ? 480 + idx * 90 : 200);
          return;
        }
        if (el.classList.contains('rv')) el.classList.add('is-in');
        if (el.hasAttribute('data-mk-chain')) {
          var list = Array.prototype.slice.call(el.querySelectorAll('.mk'));
          drawChain(list, 450);
        }
        if (el.classList.contains('draw')) el.classList.add('is-in');
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    var watched = [];
    var watch = function (el) { if (watched.indexOf(el) < 0) { watched.push(el); io.observe(el); } };
    Array.prototype.forEach.call(reveals, watch);
    Array.prototype.forEach.call(drawings, watch);
    singles.forEach(watch);
    groups.forEach(watch);
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
    Array.prototype.forEach.call(drawings, function (el) { el.classList.add('is-in'); });
    singles.concat(groups.reduce(function (a, g) { return a.concat(Array.prototype.slice.call(g.querySelectorAll('.mk'))); }, []))
      .forEach(function (mk) { mk.classList.add('is-drawn'); });
  }

  /* Pfeil der Randnotiz zeichnet sich nach den Markierungen */
  var arrow = document.querySelector('.note-arrow');
  if (arrow) { setTimeout(function () { arrow.classList.add('is-in'); }, reduce ? 0 : 1500); }

  /* Neu aufteilen, wenn sich die Breite ändert */
  var lastW = window.innerWidth, rt;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(resplitAll, 150);
  });

  /* Sanftes Scrollen zu den Abschnitten (nur bei Klick, nicht global) */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]:not([href="#"])'), function (a) {
    a.addEventListener('click', function (e) {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (target.id === 'inhalt') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  });

  /* ---------- Parallaxe im Foto-Band ---------- */
  var band = document.querySelector('.band-frame');
  var bandImg = document.querySelector('.band-img');
  if (band && bandImg && !reduce) {
    var ticking = false;
    var parallax = function () {
      ticking = false;
      var r = band.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var p = (vh - r.top) / (vh + r.height); // 0 bis 1
      var max = r.height * 0.05;
      bandImg.style.transform = 'translate3d(0,' + ((p - 0.5) * 2 * max).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    window.addEventListener('resize', parallax);
    parallax();
  }

  /* ---------- Aktionsleiste Handy: erscheint, sobald die Hero-Knöpfe weg sind ---------- */
  var bar = document.querySelector('.actionbar');
  var heroCta = document.getElementById('hero-cta');
  if (bar && heroCta && hasIO) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (bar) {
    bar.classList.add('is-on');
  }
})();
