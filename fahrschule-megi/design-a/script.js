/* Fahrschule Megi, Design A: Auftritt, Scroll-Reveals, Zitatwechsel, Zählwerk, Menü */
(function () {
  'use strict';
  window.megiReady = true;

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Hero-Auftritt */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  });

  /* Kopf mit Schatten, Aktionsleiste am Handy */
  var top = document.querySelector('.top');
  var dock = document.querySelector('.dock');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || 0;
    if (top) top.classList.toggle('is-scrolled', y > 8);
    if (dock) dock.classList.toggle('is-on', y > 420);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* Menü am Handy */
  var menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.menu-panel a')) menu.removeAttribute('open');
    });
    document.addEventListener('click', function (e) {
      if (menu.hasAttribute('open') && !menu.contains(e.target)) menu.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.hasAttribute('open')) {
        menu.removeAttribute('open');
        menu.querySelector('summary').focus();
      }
    });
  }

  /* Sanftes Scrollen zu Ankern (nur per Klick, damit window.scrollTo unverändert bleibt) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Zählwerk "pro Lektion": 90.– auf 88.– bzw. 85.– */
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  function fmt(n) { return n + '.–'; }
  function runCount(el) {
    var to = parseInt(el.getAttribute('data-count'), 10);
    var from = 90, dur = 650, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!reduce && hasIO) counters.forEach(function (el) { el.textContent = fmt(90); });

  /* Scroll-Reveals */
  var rvs = [].slice.call(document.querySelectorAll('.rv, .rvg'));
  function reveal(el) {
    el.classList.add('in');
    setTimeout(function () { el.classList.add('rv-done'); }, 1800);
    if (!reduce) {
      [].forEach.call(el.querySelectorAll('[data-count]'), function (c) {
        setTimeout(function () { runCount(c); }, 350);
      });
    }
  }
  if (reduce || !hasIO) {
    rvs.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(function (el) { io.observe(el); });
  }

  /* Zitatwechsel im Hero: alle 6 s, nur sichtbar, stoppt nach 3 Wechseln */
  var rq = document.querySelector('.rq');
  if (rq) {
    var items = rq.querySelectorAll('.rq-item');
    var dots = rq.querySelectorAll('.rq-dots i');
    var idx = 0, changes = 0, visible = true, timer = null;
    [].forEach.call(items, function (it, i) { if (i !== 0) it.setAttribute('aria-hidden', 'true'); });
    if (!reduce && items.length > 1) {
      if (hasIO) {
        new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.3 }).observe(rq);
      }
      timer = setInterval(function () {
        if (!visible || document.hidden) return;
        items[idx].classList.remove('is-on');
        items[idx].setAttribute('aria-hidden', 'true');
        if (dots[idx]) dots[idx].classList.remove('on');
        idx = (idx + 1) % items.length;
        items[idx].classList.add('is-on');
        items[idx].removeAttribute('aria-hidden');
        if (dots[idx]) dots[idx].classList.add('on');
        changes += 1;
        if (changes >= 3) clearInterval(timer);
      }, 6000);
    }
  }
})();
