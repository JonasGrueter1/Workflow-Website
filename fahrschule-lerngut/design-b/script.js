/* Fahrschule LernGut, Design B «Abendrot»: Kopf, Menü, Einblenden, Stapelkarten, Preis-Schalter, Karussell, Zeitleiste */
(function () {
  'use strict';
  window.lgReady = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobile = window.matchMedia('(max-width: 760px)');
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* Kopf: Hintergrund beim Scrollen */
  var head = document.querySelector('[data-head]');
  var onHead = function () { head.classList.toggle('is-scrolled', window.scrollY > 12); };

  /* Menü */
  var nav = document.getElementById('nav');
  var burger = document.querySelector('.burger');
  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    if (open) head.classList.add('is-scrolled'); else onHead();
  };
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });

  /* Einblenden beim Scrollen */
  var revealEls = document.querySelectorAll('[data-reveal]');
  var contact = document.querySelector('.contact');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { contact.classList.add('is-lit'); io2.disconnect(); } });
    }, { threshold: 0.25 });
    if (contact) io2.observe(contact);
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
    if (contact) contact.classList.add('is-lit');
  }

  /* Buchungskarte: auf kleinen Bildschirmen nur zwei Lektionen, Rest aufklappbar */
  var book = document.querySelector('.book');
  var more = document.querySelector('.book-more');
  var setCollapsed = function () {
    if (!book || !more) return;
    if (mobile.matches && !more.dataset.opened) {
      book.classList.add('is-collapsed'); more.hidden = false; more.setAttribute('aria-expanded', 'false');
    } else {
      book.classList.remove('is-collapsed'); more.hidden = true;
    }
  };
  if (more) {
    more.addEventListener('click', function () {
      more.dataset.opened = '1';
      book.classList.remove('is-collapsed');
      more.setAttribute('aria-expanded', 'true');
      more.hidden = true;
      var third = book.querySelector('.book-row:nth-child(3)');
      if (third) { third.setAttribute('tabindex', '-1'); third.focus({ preventScroll: true }); }
    });
  }
  setCollapsed();
  if (mobile.addEventListener) mobile.addEventListener('change', setCollapsed);

  /* Gestapelte Karten: vorige Karte wird kleiner und dunkler */
  var stackItems = Array.prototype.slice.call(document.querySelectorAll('.stack-item'));
  var updateStack = function () {
    if (reduce.matches) return;
    for (var i = 0; i < stackItems.length - 1; i++) {
      var card = stackItems[i].firstElementChild;
      var next = stackItems[i + 1];
      var stickTop = parseFloat(getComputedStyle(next).top) || 0;
      var h = card.offsetHeight || 1;
      var p = 1 - (next.getBoundingClientRect().top - stickTop) / h;
      p = Math.max(0, Math.min(1, p));
      card.style.setProperty('--p', p.toFixed(3));
    }
  };

  /* Zeitleiste: Linie wächst mit dem Scrollen */
  var tl = document.querySelector('[data-tl]');
  var updateTl = function () {
    if (!tl || reduce.matches) return;
    var r = tl.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = (vh * 0.62 - r.top) / r.height;
    tl.style.setProperty('--tl', Math.max(0, Math.min(1, p)).toFixed(3));
  };
  if (tl && !reduce.matches) tl.style.setProperty('--tl', '0');

  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    raf(function () { onHead(); updateStack(); updateTl(); ticking = false; });
  };
  onHead(); updateStack(); updateTl();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* Preis-Schalter bar / TWINT oder Karte */
  var card = document.querySelector('.price-card');
  if (card) {
    var toggle = card.querySelector('.pay-toggle');
    var btns = toggle.querySelectorAll('button');
    var status = document.getElementById('pay-status');
    var amts = card.querySelectorAll('.pl-amt b');
    var placePill = function () {
      var on = toggle.querySelector('[aria-pressed="true"]');
      toggle.style.setProperty('--pw', on.offsetWidth + 'px');
      toggle.style.setProperty('--px', (on.offsetLeft - 4) + 'px');
    };
    placePill();
    window.addEventListener('resize', placePill, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-set');
        if (card.getAttribute('data-pay') === mode) return;
        card.setAttribute('data-pay', mode);
        btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        placePill();
        status.textContent = mode === 'bar' ? 'Preise bei Barzahlung' : 'Preise mit TWINT oder Karte';
        amts.forEach(function (el, i) {
          var val = el.getAttribute('data-' + mode);
          if (reduce.matches || !el.animate) { el.textContent = val; return; }
          var out = el.animate(
            [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
            { duration: 150, delay: i * 30, easing: 'ease-in', fill: 'forwards' }
          );
          out.onfinish = function () {
            el.textContent = val;
            el.animate(
              [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
              { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
            );
          };
        });
      });
    });
  }

  /* Karussell Fahrschulauto */
  var track = document.querySelector('[data-carousel]');
  if (track) {
    var slides = track.querySelectorAll('.car-slide');
    var dots = document.querySelectorAll('.car-dots i');
    var count = document.querySelector('.car-count b');
    var current = 0;
    var go = function (idx) {
      idx = Math.max(0, Math.min(slides.length - 1, idx));
      track.scrollTo({ left: slides[idx].offsetLeft - slides[0].offsetLeft, behavior: reduce.matches ? 'auto' : 'smooth' });
    };
    var sync = function () {
      var w = slides[0].offsetWidth + 14;
      var idx = Math.round(track.scrollLeft / w);
      if (idx !== current) {
        current = idx;
        dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
        if (count) count.textContent = String(idx + 1);
      }
    };
    track.addEventListener('scroll', function () { raf(sync); }, { passive: true });
    document.querySelectorAll('.car-btns [data-dir]').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = parseInt(b.getAttribute('data-dir'), 10);
        var nextIdx = current + dir;
        if (nextIdx >= slides.length) nextIdx = 0;
        if (nextIdx < 0) nextIdx = slides.length - 1;
        go(nextIdx);
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });
  }
})();
