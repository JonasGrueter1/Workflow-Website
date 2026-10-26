/* Fahrschule Hofstetter, Design A «Stimmen»
   Kopf, Menü, Titelseite (Wort für Wort, Zitatwechsel), Laufband, Einblenden, Aktionsleiste.
   Ohne JavaScript ist alles sichtbar; versteckt wird nur über html.js. */
(function () {
  'use strict';
  window.hofA = true;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Kopf: Schatten, Lesefortschritt, Parallaxe ---------- */
  var head = $('.mh');
  var prog = $('.mh-progress');
  var cover = $('.cv');
  var mark = $('.cv-mark');
  var swoosh = $('.cv-swoosh');
  var ticking = false;
  var bar = null, ctaBtn = null, ktMain = null;

  /* Lage im Layout ohne transform (der Knopf gleitet beim Auftritt noch ein paar Pixel nach oben) */
  function layoutRect(el) {
    var y = 0, n = el;
    while (n) { y += n.offsetTop; n = n.offsetParent; }
    var top = y - (window.pageYOffset || 0);
    return { top: top, bottom: top + el.offsetHeight };
  }

  function barCheck() {
    if (!bar) return;
    var vh = window.innerHeight;
    var vz = document.querySelector('.vz-bar');
    var vzr = vz ? vz.getBoundingClientRect() : null;
    var unten = vzr && vzr.height ? vzr.top : vh;
    var oben = head ? head.getBoundingClientRect().bottom : 0;
    var r = ctaBtn ? layoutRect(ctaBtn) : null;
    var ctaDa = r ? r.top >= oben && r.bottom <= unten + 1 : false;
    var k = ktMain ? ktMain.getBoundingClientRect() : null;
    var kontaktDa = k ? k.top < vh * 0.7 && k.bottom > oben : false;
    bar.classList.toggle('is-on', !ctaDa && !kontaktDa);
  }

  function frame() {
    ticking = false;
    barCheck();
    var y = window.pageYOffset || 0;
    head.classList.toggle('is-scrolled', y > 4);
    var max = root.scrollHeight - window.innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (!reduce && cover && y < cover.offsetHeight + 200) {
      if (swoosh) swoosh.style.translate = '0 ' + (y * 0.18).toFixed(1) + 'px';
      if (mark) mark.style.translate = '0 ' + (y * -0.06).toFixed(1) + 'px';
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();

  /* ---------- Sanftes Scrollen nur bei Klick auf Anker ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Menü (Handy) ---------- */
  var menuBtn = $('.mh-menu');
  var mnav = $('#mnav');
  function setMenu(open) {
    head.classList.toggle('is-open', open);
    mnav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (menuBtn && mnav) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1060) setMenu(false); });
  }

  /* ---------- Titelseite: Zitat Wort für Wort ---------- */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
            var s = document.createElement('span');
            s.className = 'w';
            s.style.setProperty('--i', i++);
            s.textContent = t;
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(el);
  }
  var quotes = $$('.cv-q');
  if (quotes.length) {
    if (!reduce) splitWords($('blockquote p', quotes[0]));
    quotes[0].classList.add('is-split');
  }

  /* ---------- Titelseite: Zitatwechsel alle 8 Sekunden ---------- */
  var qBox = $('.cv-quotes');
  var dotsWrap = $('.cv-dots');
  var dots = $$('.cv-dot');
  var cur = 0;
  var why = { hover: false, focus: false, away: false };

  function setPaused() { qBox.classList.toggle('is-paused', why.hover || why.focus || why.away); }
  function show(n) {
    if (n === cur) return;
    quotes[cur].classList.remove('is-active');
    quotes[cur].setAttribute('aria-hidden', 'true');
    dots[cur].classList.remove('is-active');
    dots[cur].setAttribute('aria-pressed', 'false');
    cur = n;
    quotes[cur].classList.add('is-active');
    quotes[cur].removeAttribute('aria-hidden');
    dots[cur].classList.add('is-active');
    dots[cur].setAttribute('aria-pressed', 'true');
  }

  if (!reduce && qBox && dotsWrap && quotes.length > 1) {
    dotsWrap.hidden = false;
    dots.forEach(function (d, n) {
      d.addEventListener('click', function () { qBox.classList.add('is-manual'); show(n); });
      $('.cv-dot-fill', d).addEventListener('animationend', function () {
        if (!qBox.classList.contains('is-manual')) show((cur + 1) % quotes.length);
      });
    });
    qBox.addEventListener('mouseenter', function () { why.hover = true; setPaused(); });
    qBox.addEventListener('mouseleave', function () { why.hover = false; setPaused(); });
    qBox.addEventListener('focusin', function () { why.focus = true; setPaused(); });
    qBox.addEventListener('focusout', function () { why.focus = false; setPaused(); });
    if (hasIO) {
      new IntersectionObserver(function (es) { why.away = !es[0].isIntersecting; setPaused(); }, { threshold: 0.25 }).observe(qBox);
    }
  }

  /* ---------- Laufband ---------- */
  var mq = $('.mq');
  if (mq && !reduce) {
    $$('.mq-track', mq).forEach(function (t) {
      $$('.mq-i', t).forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        t.appendChild(c);
      });
    });
    mq.classList.add('is-live');
    var pause = $('.mq-pause', mq);
    if (pause) {
      pause.hidden = false;
      pause.addEventListener('click', function () {
        var on = !mq.classList.contains('is-paused');
        mq.classList.toggle('is-paused', on);
        pause.setAttribute('aria-pressed', String(on));
        pause.setAttribute('aria-label', on ? 'Laufband weiterlaufen lassen' : 'Laufband anhalten');
      });
    }
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var items = $$('.rv');
  function reveal(el, delay) {
    el.style.setProperty('--d', delay + 'ms');
    el.classList.add('is-in');
    setTimeout(function () { el.style.removeProperty('--d'); }, delay + 1200);
  }
  if (reduce || !hasIO) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target, Math.min(k, 5) * 90);
        k++;
        io.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Aktionsleiste (Handy) ----------
     Sichtbar, solange der Hauptknopf der Titelseite nicht ganz im Bild ist: auf kleinen Handys schon beim Laden
     (der Knopf liegt dort unter der Falz), sonst nach dem Scrollen. Beim Kontakt, wo Nummer und E-Mail gross
     stehen, blendet sie sich aus. Gemessen wird bei jedem Scrollbild, damit auch Sprünge (Anker, Neuladen) stimmen. */
  bar = $('.ab');
  ctaBtn = $('.cv-cta .btn');
  ktMain = $('.kt-main');
  barCheck();
  setTimeout(barCheck, 0);
  setTimeout(barCheck, 1400);
  window.addEventListener('load', barCheck);
})();
