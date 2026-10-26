/* Fahrschule Schelbert, Design A «Kilometerstand»
   Ziffernwalzen, Scroll-Reveals, Zähler, Reiter, Aktionsleiste. Ohne Bibliotheken. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Kopf: Schatten beim Scrollen */
  var kopf = $('.kopf');
  var onScroll = function () { kopf.classList.toggle('is-scrolled', window.scrollY > 4); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menü am Handy (details) schliessen */
  var mnav = $('.mnav');
  if (mnav) {
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { mnav.removeAttribute('open'); }); });
    document.addEventListener('click', function (e) { if (mnav.open && !mnav.contains(e.target)) mnav.removeAttribute('open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.open) { mnav.removeAttribute('open'); $('summary', mnav).focus(); }
    });
  }

  /* Ziffernwalzen: jede Walze wird zu einer Ziffernspalte, die per translateY auf ihren Zielwert rollt */
  function buildDrum(drum, single) {
    var to = parseInt(drum.getAttribute('data-to'), 10) || 0;
    var turns = parseInt(drum.getAttribute('data-turns'), 10) || 0;
    var col = $('.col', drum);
    var html = '', n = 0, t, d;
    if (single) {
      html = '<span>' + ((to + 9) % 10) + '</span><span>' + to + '</span>'; n = 2;
    } else {
      for (t = 0; t < turns; t++) { for (d = 0; d < 10; d++) { html += '<span>' + d + '</span>'; n++; } }
      for (d = 0; d <= to; d++) { html += '<span>' + d + '</span>'; n++; }
    }
    col.innerHTML = html;
    col.style.transform = 'translateY(0)';
    return { drum: drum, col: col, end: 'translateY(' + (-(n - 1) / n * 100).toFixed(4) + '%)' };
  }

  function prepare(root, single) {
    return $$('.drum', root).map(function (d) { return buildDrum(d, single); });
  }

  function roll(root, opts, items) {
    items = items || prepare(root, opts.single);
    if (!items.length) return;
    void root.offsetHeight;
    var count = items.length;
    var last = null, lastEnd = 0;
    items.forEach(function (it, idx) {
      var k = opts.fromRight ? count - 1 - idx : idx;
      var dur = opts.dur - k * opts.step;
      var delay = opts.delay + k * opts.stagger;
      it.col.style.transition = 'transform ' + dur.toFixed(2) + 's cubic-bezier(.15,.7,.2,1) ' + delay.toFixed(2) + 's';
      if (dur + delay >= lastEnd) { lastEnd = dur + delay; last = it; }
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        items.forEach(function (it) { it.col.style.transform = it.end; });
      });
    });
    var done = false;
    var finish = function () {
      if (done) return; done = true;
      if (opts.lock) last.drum.classList.add('is-locked');
      if (opts.onDone) opts.onDone();
    };
    last.col.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, (lastEnd + 0.3) * 1000);
  }

  var odo = $('.odo');
  if (odo && !reduce) {
    var odoItems = prepare(odo);
    var startOdo = function () {
      roll(odo, { fromRight: true, dur: 2.5, step: 0.12, delay: 0.2, stagger: 0.07, lock: true,
        onDone: function () { odo.classList.add('is-done'); } }, odoItems);
    };
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var started = false;
    var go = function () { if (!started) { started = true; startOdo(); } };
    fontsReady.then(go);
    setTimeout(go, 600);
  }

  /* Zähler (Prozentwerte im Messprotokoll) */
  var counters = $$('[data-count]');
  if (!reduce) counters.forEach(function (el) { el.textContent = '0'; });
  function countUp(el, delay) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduce) { el.textContent = target; return; }
    var dur = 900, t0 = null;
    setTimeout(function () {
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
  }

  /* Scroll-Reveals */
  var telDone = false;
  function show(el) {
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(function (c) { countUp(c, 450); });
    if (el.hasAttribute('data-roll') && !telDone && !reduce) {
      telDone = true;
      roll(el, { fromRight: false, single: true, dur: 0.45, step: 0, delay: 0.2, stagger: 0.04, lock: true });
    }
  }
  var rv = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(show);
  } else {
    var pending = rv.slice();
    var reveal = function (el) {
      var i = pending.indexOf(el);
      if (i === -1) return;
      pending.splice(i, 1);
      io.unobserve(el);
      show(el);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) reveal(e.target); });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    rv.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: alles, was beim schnellen Springen schon überholt wurde, sofort zeigen */
    var sweepQueued = false;
    var sweep = function () {
      sweepQueued = false;
      var vh = window.innerHeight;
      pending.slice().forEach(function (el) { if (el.getBoundingClientRect().top < vh * 0.92) reveal(el); });
      if (!pending.length) window.removeEventListener('scroll', onSweep);
    };
    var onSweep = function () { if (!sweepQueued) { sweepQueued = true; requestAnimationFrame(sweep); } };
    window.addEventListener('scroll', onSweep, { passive: true });
  }

  /* Sanftes Scrollen nur für Anker im Seiteninhalt */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* Reiter Preise */
  var tablist = $('.reiter');
  if (tablist) {
    var tabs = $$('[role="tab"]', tablist);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var strich = $('.reiter-strich', tablist);
    var current = 0;
    var moveStrich = function () {
      var t = tabs[current];
      strich.style.transform = 'translateX(' + t.offsetLeft + 'px) scaleX(' + (t.offsetWidth / 100) + ')';
    };
    var select = function (i, focus) {
      current = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        panels[k].classList.remove('is-shown');
      });
      void panels[i].offsetWidth;
      panels[i].classList.add('is-shown');
      if (focus) tabs[i].focus();
      moveStrich();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { if (i !== current) select(i); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, j = null;
        if (e.key === 'ArrowRight') j = (current + 1) % n;
        else if (e.key === 'ArrowLeft') j = (current - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); select(j, true); }
      });
    });
    select(0);
    panels[0].classList.remove('is-shown');
    requestAnimationFrame(function () { moveStrich(); strich.classList.add('is-ready'); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveStrich);
    window.addEventListener('resize', moveStrich);
  }

  /* Dezente Parallaxe im Cockpit-Band */
  var bandImg = $('.weg-band img');
  if (bandImg && !reduce) {
    var ticking = false;
    var par = function () {
      ticking = false;
      var r = bandImg.parentNode.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < -50 || r.top > vh + 50) return;
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      bandImg.style.transform = 'translate3d(0,' + (p * 7).toFixed(2) + '%,0)';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
    par();
  }

  /* Aktionsleiste am Handy: sichtbar, solange die Knöpfe im Hero nicht im Bild sind */
  var bar = $('.aktion');
  var heroCta = $('.hero .cta');
  if (bar && heroCta && 'IntersectionObserver' in window) {
    bar.classList.add('is-ready');
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      bar.classList.toggle('is-on', !e.isIntersecting);
    }, { rootMargin: '0px 0px -150px 0px' }).observe(heroCta);
  }
})();
