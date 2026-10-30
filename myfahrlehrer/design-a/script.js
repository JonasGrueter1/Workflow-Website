/* myfahrlehrer.ch, Design A: Kopf, Einblendungen, Ablauf-Linie, Zähler, Öffnungszeiten, Aktionsleiste */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var top = document.getElementById('top');

  /* Kopf: Linie und Schatten nach dem ersten Scrollen */
  var steps = [].slice.call(document.querySelectorAll('.step'));
  var list = document.querySelector('.steps');
  var ticking = false;

  var update = function () {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    top.classList.toggle('is-scrolled', y > 8);

    /* Ablauf: lindgrüne Linie wächst mit dem Scrollen, Nummern springen auf */
    if (!list || !steps.length || reduce) return;
    var mark = window.innerHeight * 0.62;
    var first = steps[0].querySelector('.step-no').getBoundingClientRect();
    var last = steps[steps.length - 1].querySelector('.step-no').getBoundingClientRect();
    var start = first.top + first.height / 2;
    var end = last.top + last.height / 2;
    var p = (mark - start) / Math.max(1, end - start);
    p = Math.max(0, Math.min(1, p));
    list.style.setProperty('--p', p.toFixed(3));
    steps.forEach(function (s) {
      var r = s.querySelector('.step-no').getBoundingClientRect();
      s.classList.toggle('is-on', r.top + r.height / 2 <= mark + 2);
    });
  };
  var onScroll = function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  /* Linie genau von der ersten bis zur letzten Nummer */
  var layout = function () {
    if (!list || !steps.length) return;
    var base = list.getBoundingClientRect().top;
    var a = steps[0].querySelector('.step-no').getBoundingClientRect();
    var b = steps[steps.length - 1].querySelector('.step-no').getBoundingClientRect();
    var t = a.top + a.height / 2 - base;
    list.style.setProperty('--t-top', t.toFixed(1) + 'px');
    list.style.setProperty('--t-h', (b.top + b.height / 2 - base - t).toFixed(1) + 'px');
  };

  if (reduce) steps.forEach(function (s) { s.classList.add('is-on'); });
  else if (list) list.style.setProperty('--p', '0');
  layout();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { layout(); onScroll(); });
  window.addEventListener('load', function () { layout(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); update(); });

  /* Einblenden beim Scrollen */
  var items = [].slice.call(document.querySelectorAll('.rv, .rv-l, .rv-r, .rv-group, .route, .price-grid'));
  var show = function (el) {
    el.classList.add('is-in');
    if (el.classList.contains('rating')) countUp(el);
  };
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        if (!entry.target.style.getPropertyValue('--d')) entry.target.style.setProperty('--d', Math.min(i, 3) * 90 + 'ms');
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(show);
  }

  /* Zähler: 0 bis 122 Bewertungen */
  function countUp(box) {
    var el = box.querySelector('.count');
    if (!el || reduce) return;
    var to = parseInt(el.getAttribute('data-to'), 10);
    var t0 = null;
    var step = function (t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / 1200);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  /* Anker: weich scrollen, nur bei Klick */
  [].forEach.call(document.querySelectorAll('a[href^="#"]:not([data-soon])'), function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* Feedbacks am Handy: Punkte zeigen, welche Karte sichtbar ist */
  var fbList = document.querySelector('.fb-list');
  var dots = [].slice.call(document.querySelectorAll('.fb-dots span'));
  if (fbList && dots.length) {
    var cards = [].slice.call(fbList.children);
    var fbTick = false;
    fbList.addEventListener('scroll', function () {
      if (fbTick) return; fbTick = true;
      requestAnimationFrame(function () {
        fbTick = false;
        var x = fbList.scrollLeft, best = 0, bestD = Infinity;
        cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - fbList.offsetLeft - x - parseFloat(getComputedStyle(fbList).paddingLeft)); if (d < bestD) { bestD = d; best = i; } });
        if (fbList.scrollLeft + fbList.clientWidth >= fbList.scrollWidth - 4) best = cards.length - 1;
        dots.forEach(function (d, i) { d.classList.toggle('is-on', i === best); });
      });
    }, { passive: true });
  }

  /* Öffnungszeiten: heutigen Tag markieren */
  var day = new Date().getDay();
  [].forEach.call(document.querySelectorAll('.hours tr[data-tage]'), function (tr) {
    if (tr.getAttribute('data-tage').split(',').indexOf(String(day)) > -1) tr.classList.add('is-today');
  });

  /* Menü am Handy: nach Klick oder ausserhalb schliessen */
  var menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.menu-panel a')) menu.removeAttribute('open');
    });
    document.addEventListener('click', function (e) {
      if (menu.hasAttribute('open') && !menu.contains(e.target)) menu.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.hasAttribute('open')) { menu.removeAttribute('open'); menu.querySelector('summary').focus(); }
    });
  }

  /* Aktionsleiste: erscheint, sobald der Anruf-Knopf im Start weg ist, und weicht beim Kontakt */
  var dock = document.querySelector('.dock');
  var call = document.querySelector('.hero .call');
  var kontakt = document.querySelector('.k-call');
  if (dock && call && hasIO) {
    var callGone = false, kontaktIn = false;
    var setDock = function () { dock.classList.toggle('is-on', callGone && !kontaktIn); };
    new IntersectionObserver(function (e) {
      callGone = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      setDock();
    }).observe(call);
    if (kontakt) new IntersectionObserver(function (e) { kontaktIn = e[0].isIntersecting; setDock(); }, { threshold: 0.25 }).observe(kontakt);
  } else if (dock) {
    dock.classList.add('is-on');
  }
})();
