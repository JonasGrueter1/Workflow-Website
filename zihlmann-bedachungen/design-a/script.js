/* Zihlmann AG, Design A: Kopf, Menü, Gebäudehülle, Projektfilter, Einblenden, Aktionsleiste */
(function () {
  'use strict';
  window.zihA = true;
  var d = document;
  var root = d.documentElement;
  var fx = root.classList.contains('fx');

  /* Kopf: Schatten beim Scrollen, Aktionsleiste am Handy */
  var kopf = d.getElementById('kopf');
  var aktion = d.getElementById('aktion');
  var heroCta = d.getElementById('hero-cta');
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.scrollY || 0;
    if (kopf) kopf.classList.toggle('ist-unten', y > 8);
    /* Ganz oben ist noch kein Abschnitt aktiv */
    if (y < 200) [].forEach.call(d.querySelectorAll('.nav a.ist-aktiv'), function (a) { a.classList.remove('ist-aktiv'); });
    if (aktion && heroCta) {
      var r = heroCta.getBoundingClientRect();
      aktion.classList.toggle('ist-da', r.bottom < 0);
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Menü am Handy */
  var menuBtn = d.querySelector('.kopf-menu');
  var menu = d.getElementById('menu');
  function menuZu() {
    if (!menu || !menuBtn) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Menü öffnen');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var auf = menuBtn.getAttribute('aria-expanded') === 'true';
      if (auf) { menuZu(); return; }
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Menü schliessen');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { menuZu(); menuBtn.focus(); } });
  }

  /* Aktiver Menüpunkt */
  var navLinks = [].slice.call(d.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var navIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = d.querySelector(a.getAttribute('href')); if (s) navIo.observe(s); });
  }

  /* Gebäudehülle: Reiter, Punkte im Haus und Bauteile */
  var hs = d.getElementById('hs');
  if (hs) {
    var tabs = [].slice.call(hs.querySelectorAll('[role="tab"]'));
    var panels = [].slice.call(hs.querySelectorAll('[role="tabpanel"]'));
    var punkte = [].slice.call(hs.querySelectorAll('.hs-punkt'));
    var teile = [].slice.call(hs.querySelectorAll('.hs-teil'));
    var zeigen = function (ziel, fokus) {
      tabs.forEach(function (t) {
        var an = t.getAttribute('data-ziel') === ziel;
        t.setAttribute('aria-selected', an ? 'true' : 'false');
        t.tabIndex = an ? 0 : -1;
        if (an && fokus) t.focus();
        if (an && t.scrollIntoView && window.matchMedia('(max-width: 760px)').matches) {
          var reiter = t.parentNode;
          var links = t.offsetLeft - (reiter.clientWidth - t.offsetWidth) / 2;
          reiter.scrollTo({ left: Math.max(0, links), behavior: fx ? 'smooth' : 'auto' });
        }
      });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-teil') !== ziel; });
      punkte.forEach(function (p) { p.classList.toggle('ist-aktiv', p.getAttribute('data-ziel') === ziel); });
      teile.forEach(function (g) { g.classList.toggle('ist-aktiv', g.getAttribute('data-teil') === ziel); });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { zeigen(t.getAttribute('data-ziel')); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n === null) return;
        e.preventDefault();
        zeigen(tabs[n].getAttribute('data-ziel'), true);
      });
    });
    punkte.forEach(function (p) {
      p.addEventListener('click', function () { zeigen(p.getAttribute('data-ziel')); });
    });
    /* Bauteile in der Zeichnung direkt antippen */
    teile.forEach(function (g) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', function () { zeigen(g.getAttribute('data-teil')); });
    });
    zeigen('steildach');
  }

  /* Projekte filtern */
  var raster = d.getElementById('raster');
  var chips = [].slice.call(d.querySelectorAll('.filter .chip'));
  var status = d.getElementById('raster-status');
  if (raster && chips.length) {
    var projekte = [].slice.call(raster.querySelectorAll('.projekt'));
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.getAttribute('data-filter');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        var n = 0;
        projekte.forEach(function (p) {
          var zeig = f === 'alle' || p.getAttribute('data-bereich') === f;
          p.hidden = !zeig;
          p.classList.remove('ist-neu');
          if (zeig) {
            n++;
            if (fx) { void p.offsetWidth; p.classList.add('ist-neu'); }
          }
        });
        if (status) status.textContent = n + ' Projekte angezeigt';
      });
    });
  }

  /* Team: Wellen von links oben (Abstand je 25 ms, höchstens 600 ms) */
  var setzeWelle = function (liste, spalten) {
    if (!liste) return;
    [].slice.call(liste.children).forEach(function (li, i) {
      var w = (i % spalten) + Math.floor(i / spalten);
      li.style.setProperty('--w', Math.min(w, 24));
    });
  };
  var crew = d.getElementById('crew');
  var spaltenCrew = function () {
    if (window.matchMedia('(max-width: 760px)').matches) return 3;
    if (window.matchMedia('(max-width: 1180px)').matches) return 6;
    return 9;
  };
  setzeWelle(crew, spaltenCrew());
  setzeWelle(d.querySelector('.gl'), 4);
  [].slice.call(d.querySelectorAll('.projekt')).forEach(function (p, i) { p.style.setProperty('--d', i % 4 + Math.floor(i / 4)); });

  /* Formular: nur Vorschau, kein Versand */
  var form = d.querySelector('.formular');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(d.querySelectorAll('[data-reveal], .leitsatz, .hs, .raster, .gl, .crew, .service-box'));
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ziele.forEach(function (el) { io.observe(el); });
  }
})();
