/* NASA Fahrschule, Design A: Menü, Reveals, Abo-Rechner, Erreichbarkeit, Parallaxe, Aktionsleiste */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kopfzeile und Menü */
  var head = document.getElementById('kopf');
  var nav = document.getElementById('nav');
  var burger = document.querySelector('.burger');
  var dock = document.querySelector('.dock');
  var hero = document.querySelector('.hero');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* Weiches Scrollen zu Ankern (nur mit JS, ohne reduzierte Bewegung) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Scroll: Kopfzeile, Aktionsleiste, Parallaxe */
  var bands = [].slice.call(document.querySelectorAll('.lb'));
  var speeds = [-0.05, 0.04, -0.09];
  var desk = window.matchMedia('(min-width: 900px)');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    head.classList.toggle('is-scrolled', y > 8);
    if (dock && hero) dock.classList.toggle('is-visible', y > hero.offsetHeight * 0.6);
    if (!reduce && desk.matches) {
      var vh = window.innerHeight;
      bands.forEach(function (el, i) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var c = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (c * speeds[i]).toFixed(1) + 'px,0)';
      });
    } else if (bands.length && bands[0].style.transform) {
      bands.forEach(function (el) { el.style.transform = ''; });
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Reveals */
  var groups = ['.staerken-grid', '.feat', '.tiles', '.steps', '.orte-grid', '.team-grid'];
  groups.forEach(function (sel) {
    var g = document.querySelector(sel);
    if (!g) return;
    [].slice.call(g.querySelectorAll('.reveal')).forEach(function (el, i) { el.style.setProperty('--i', i % 4); });
  });
  var watch = [].slice.call(document.querySelectorAll('.reveal, .steps, .calc'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(function (el) { el.classList.add('in'); });
  }

  /* Abo-Rechner: liest die Werte aus der Tabelle */
  var rows = [].slice.call(document.querySelectorAll('#abo-table tbody tr'));
  var data = rows.map(function (tr) {
    return { n: +tr.getAttribute('data-n'), total: +tr.getAttribute('data-total'), row: tr };
  });
  var single = data[0] ? data[0].total : 0;
  var range = document.getElementById('abo-range');
  var chips = [].slice.call(document.querySelectorAll('.calc-chips button'));
  var barsBox = document.querySelector('.bars');
  var outWhat = document.querySelector('[data-out="what"]');
  var outTotal = document.querySelector('[data-out="total"]');
  var outPer = document.querySelector('[data-out="per"]');
  var outSave = document.querySelector('[data-out="save"]');
  var bars = [];

  if (barsBox && data.length) {
    var max = single, min = 60;
    data.forEach(function (d) {
      var per = Math.round(d.total / d.n);
      var b = document.createElement('div');
      b.className = 'bar';
      b.innerHTML = '<i style="--h:' + Math.round((per - min) / (max - min) * 100) + '%"></i><b>' + per + '</b>';
      barsBox.appendChild(b);
      bars.push(b);
    });
  }

  function roll(el, text) {
    if (!el) return;
    if (el.getAttribute('data-v') === text) return;
    el.setAttribute('data-v', text);
    if (reduce || !el.firstElementChild) { var s0 = document.createElement('span'); s0.textContent = text; el.replaceChildren(s0); return; }
    var old = el.firstElementChild;
    [].slice.call(el.children).forEach(function (c) { if (c !== old) c.remove(); });
    old.className = 'r-out';
    var n = document.createElement('span');
    n.className = 'r-in';
    n.textContent = text;
    el.appendChild(n);
    setTimeout(function () { if (old.parentNode) old.remove(); n.className = ''; }, 300);
  }

  function setAbo(i) {
    var d = data[i];
    if (!d) return;
    var per = Math.round(d.total / d.n);
    outWhat.textContent = d.n === 1 ? 'Einzellektion à 50 Minuten' : d.n + ' Fahrlektionen à 50 Minuten';
    roll(outTotal, String(d.total));
    roll(outPer, 'CHF ' + per);
    var save = d.n * single - d.total;
    outSave.textContent = save > 0 ? 'Du sparst CHF ' + save + ' gegenüber Einzellektionen.' : 'Einzelpreis, ohne Abo.';
    outSave.classList.toggle('is-neutral', save <= 0);
    range.value = i;
    range.setAttribute('aria-valuetext', d.n === 1 ? '1 Lektion' : d.n + ' Lektionen');
    range.parentNode.style.setProperty('--p', (i / (data.length - 1) * 100) + '%');
    chips.forEach(function (c) { c.setAttribute('aria-pressed', +c.getAttribute('data-i') === i ? 'true' : 'false'); });
    bars.forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    data.forEach(function (x, k) { x.row.classList.toggle('is-on', k === i); });
  }

  if (range && data.length) {
    [outTotal, outPer].forEach(function (el) { var s1 = document.createElement('span'); s1.textContent = el.textContent; el.setAttribute('data-v', el.textContent); el.replaceChildren(s1); });
    range.addEventListener('input', function () { setAbo(+range.value); });
    chips.forEach(function (c) { c.addEventListener('click', function () { setAbo(+c.getAttribute('data-i')); }); });
    setAbo(+range.value);
  }

  /* Erreichbarkeit: Montag bis Samstag 06:00 bis 22:00 Uhr, Zeitzone Zürich */
  var status = document.getElementById('status');
  if (status && window.Intl) {
    try {
      var parts = new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
      var wd = get('weekday').replace('.', '');
      var h = +get('hour');
      var days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      var d = days.indexOf(wd);
      var t = status.querySelector('.status-t');
      if (d >= 0) {
        var openDay = d >= 1 && d <= 6;
        if (openDay && h >= 6 && h < 22) {
          status.classList.add('is-open');
          t.textContent = 'Jetzt erreichbar, heute bis 22:00 Uhr';
        } else {
          var msg;
          if (openDay && h < 6) msg = 'heute ab 06:00 Uhr';
          else if (d >= 1 && d <= 5) msg = 'morgen ab 06:00 Uhr';
          else msg = 'Montag ab 06:00 Uhr';
          t.textContent = 'Wieder erreichbar ' + msg;
        }
      }
    } catch (e) { /* Zeiten bleiben stehen */ }
  }
})();
