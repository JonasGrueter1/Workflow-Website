/* Fahrschule Zberg, Design B «Cockpit 2027» */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Hero-Auftritt und Tür ---------- */
  var hero = d.querySelector('.hero');
  var photo = d.getElementById('hero-photo');
  var readyAt = performance.now();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { readyAt = performance.now(); if (hero) hero.classList.add('is-ready'); });
  });

  if (photo) {
    var openDoor = function () { photo.classList.add('is-open'); if (hero) hero.classList.add('is-open'); };
    if (reduce) {
      openDoor();
    } else {
      var imgs = [].slice.call(photo.querySelectorAll('img'));
      var decoded = Promise.all(imgs.map(function (im) {
        return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
      }));
      var done = false;
      var go = function () {
        if (done) return;
        done = true;
        /* Geschlossene Tür ist erst einen Moment zu sehen, dann geht sie auf */
        var base = Math.max(readyAt, performance.now());
        setTimeout(openDoor, Math.max(0, base + 1200 - performance.now()));
      };
      decoded.then(function () {
        var since = performance.now() - readyAt;
        if (since < 1200) { setTimeout(openDoor, 1200 - since); done = true; } else { go(); }
      });
      setTimeout(function () { if (!done) { done = true; openDoor(); } }, 4500);
    }
  }

  /* ---------- Kopf ---------- */
  var hd = d.querySelector('.hd');
  var onScrollHead = function () { if (hd) hd.classList.toggle('is-scrolled', window.scrollY > 8); };

  /* Menü (Handy und Tablet) */
  var menuBtn = d.querySelector('.hd-menu');
  var setMenu = function (open) {
    if (!hd || !menuBtn) return;
    hd.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  };
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!hd.classList.contains('is-open')); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hd.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    d.addEventListener('click', function (e) {
      if (!hd.classList.contains('is-open')) return;
      if (!hd.contains(e.target) || (e.target.closest && e.target.closest('.hd-nav a'))) setMenu(false);
    });
  }

  /* ---------- Einblenden ---------- */
  var reveal = [].slice.call(d.querySelectorAll('[data-rv], [data-tt], .cockpit, .hz'));
  var special = function (el) {
    if (el.hasAttribute('data-tt')) el.classList.add('is-on');
    el.classList.add('is-in');
  };
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { special(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(special);
  }

  /* ---------- Fahrmodus: Drehregler, Display, Vergleich ---------- */
  var knob = d.getElementById('knob');
  var modes = [].slice.call(d.querySelectorAll('.mode'));
  var panels = [].slice.call(d.querySelectorAll('.mp'));
  var labels = [].slice.call(d.querySelectorAll('.k-lab'));
  var sweep = d.querySelector('.k-sweep');
  var idx = d.querySelector('.disp-idx');
  var bar = d.querySelector('.disp-bar');
  var ANG = [-50, 0, 50];
  var SPLIT = [[12, 4], [18, 6], [24, 8]];
  var current = 1;
  var leaveTimer;

  function setMode(i, focus) {
    if (i < 0) i = 0;
    if (i > 2) i = 2;
    var prev = current;
    current = i;
    if (knob) knob.style.setProperty('--ang', ANG[i] + 'deg');
    if (sweep) sweep.style.strokeDashoffset = String(130 - (ANG[i] + 65));
    if (idx) idx.textContent = String(i + 1);
    if (bar) { bar.style.setProperty('--a', SPLIT[i][0]); bar.style.setProperty('--b', SPLIT[i][1]); }
    labels.forEach(function (l, k) { l.classList.toggle('is-on', k === i); });
    modes.forEach(function (m, k) {
      var on = k === i;
      m.setAttribute('aria-checked', on ? 'true' : 'false');
      m.tabIndex = on ? 0 : -1;
      if (on && focus) m.focus();
    });
    if (prev !== i) {
      clearTimeout(leaveTimer);
      panels.forEach(function (p) { p.classList.remove('is-leaving'); });
      if (panels[prev]) panels[prev].classList.add('is-leaving');
      leaveTimer = setTimeout(function () { if (panels[prev]) panels[prev].classList.remove('is-leaving'); }, 320);
    }
    panels.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
  }

  if (modes.length) {
    modes.forEach(function (m, k) {
      m.addEventListener('click', function () { setMode(k); });
      m.addEventListener('keydown', function (e) {
        var key = e.key;
        if (key === 'ArrowRight' || key === 'ArrowDown') { e.preventDefault(); setMode(current === 2 ? 0 : current + 1, true); }
        else if (key === 'ArrowLeft' || key === 'ArrowUp') { e.preventDefault(); setMode(current === 0 ? 2 : current - 1, true); }
        else if (key === 'Home') { e.preventDefault(); setMode(0, true); }
        else if (key === 'End') { e.preventDefault(); setMode(2, true); }
      });
    });
    labels.forEach(function (l) {
      l.addEventListener('click', function () { setMode(parseInt(l.getAttribute('data-go'), 10)); });
    });
    setMode(1);
  }

  /* Regler drehen: ziehen oder antippen */
  if (knob) {
    var svg = knob.querySelector('.knob-svg');
    var drag = null;
    var angleAt = function (e) {
      var r = svg.getBoundingClientRect();
      var cx = r.left + r.width * (170 / 340);
      var cy = r.top + r.height * (175 / 290);
      return Math.atan2(e.clientX - cx, cy - e.clientY) * 180 / Math.PI;
    };
    svg.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) {
        drag.moved = true;
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      }
      if (drag.moved) {
        var a = angleAt(e);
        var target = a < -25 ? 0 : (a > 25 ? 2 : 1);
        if (target !== current) setMode(target);
      }
    });
    var end = function (e) {
      if (!drag) return;
      if (!drag.moved && e.type === 'pointerup') setMode(current === 2 ? 0 : current + 1);
      drag = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }

  /* ---------- Fortschritt Lernfahrausweis ---------- */
  var steps = [].slice.call(d.querySelectorAll('.steps li'));
  var stepsN = d.querySelector('.steps-n');
  var shownN = -1;
  var countTimer;
  var updSteps = function () {
    if (!steps.length) return;
    var vh = window.innerHeight;
    var n = 0;
    steps.forEach(function (li) {
      var on = li.getBoundingClientRect().top < vh * 0.78;
      li.classList.toggle('is-fill', on);
      if (on) n++;
    });
    if (stepsN && n !== shownN) {
      /* Zähler läuft Schritt für Schritt zum neuen Wert */
      clearInterval(countTimer);
      var from = shownN < 0 ? 0 : shownN;
      shownN = n;
      if (from === n) { stepsN.textContent = String(n); return; }
      var dir = n > from ? 1 : -1;
      var cur = from;
      countTimer = setInterval(function () {
        cur += dir;
        stepsN.textContent = String(cur);
        if (cur === n) clearInterval(countTimer);
      }, 90);
    }
  };
  if (reduce) steps.forEach(function (li) { li.classList.add('is-fill'); });

  /* ---------- Parallaxe ---------- */
  var px = [].slice.call(d.querySelectorAll('[data-px]'));
  var updPx = function () {
    if (reduce) return;
    var vh = window.innerHeight;
    px.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      var y = Math.max(-1, Math.min(1, c)) * -22;
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    });
  };

  /* ---------- Aktionsleiste ---------- */
  var abar = d.getElementById('abar');
  var heroCta = d.getElementById('hero-cta');
  if (abar) {
    if (hasIO && heroCta) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var past = !e.isIntersecting && e.boundingClientRect.top < 0;
          abar.classList.toggle('is-shown', past);
        });
      }).observe(heroCta);
    } else {
      abar.classList.add('is-shown');
    }
  }

  /* ---------- Sanftes Scrollen zu Abschnitten ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && d.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Scroll-Schleife ---------- */
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      onScrollHead();
      if (!reduce) updSteps();
      updPx();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
