/* Design A «Wegweiser»: Einblendungen, Schilderformen, Aktionsleiste, Strasse und Ortstafel beim Scrollen */
(function () {
  'use strict';
  window.brunnerA = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var gross = window.matchMedia('(min-width: 900px)');

  /* 1. Einblenden beim Scrollen */
  var rvs = [].slice.call(document.querySelectorAll('.rv'));
  var offen = rvs.slice();
  function zeige(el) { el.classList.add('is-in'); }
  if (!('IntersectionObserver' in window) || reduce.matches) {
    rvs.forEach(zeige);
    offen = [];
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { zeige(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    rvs.forEach(function (el) { io.observe(el); });
  }
  /* Signalmast und Strasse: Auftritt erst, wenn gut sichtbar */
  var buehnen = [].slice.call(document.querySelectorAll('.mast, .strasse'));
  if (!('IntersectionObserver' in window) || reduce.matches) {
    buehnen.forEach(zeige);
  } else {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { zeige(e.target); io2.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    buehnen.forEach(function (el) { io2.observe(el); });
    offen = offen.concat(buehnen);
  }

  /* Sicherheitsnetz bei sehr schnellem Scrollen: alles, was schon oberhalb des Bildschirmrands liegt, wird gezeigt */
  function nachziehen() {
    if (!offen.length) return;
    var vh = window.innerHeight;
    offen = offen.filter(function (el) {
      if (el.classList.contains('is-in')) return false;
      var r = el.getBoundingClientRect();
      if ((buehnen.indexOf(el) > -1 ? r.bottom < vh : r.top < vh)) { zeige(el); return false; }
      return true;
    });
  }

  /* Weiches Scrollen nur bei Klick auf Anker (nicht per CSS, damit Programm-Scrollen sofort springt) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (id === 'inhalt') { ziel.setAttribute('tabindex', '-1'); ziel.focus({ preventScroll: true }); }
  });

  /* 2. Schilderformen: Pfeilspitze und weisser Innenrand, passend zur echten Grösse gezeichnet */
  var NS = 'http://www.w3.org/2000/svg';
  function f(n) { return Math.round(n * 100) / 100; }

  function zeichne(el) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    var richtung = gross.matches ? el.getAttribute('data-spitze') : (el.getAttribute('data-spitze-klein') || 'rechts');
    var faktor = parseFloat(el.getAttribute('data-faktor') || '0.5');
    var t = richtung === 'keine' ? 0 : Math.min(h * faktor, w * 0.3, parseFloat(el.getAttribute('data-max') || '9999'));
    var r = parseFloat(el.getAttribute('data-radius') || (h > 200 ? '14' : '8'));
    var lw = parseFloat(el.getAttribute('data-linie') || (h > 200 ? '4' : '3'));
    var d = parseFloat(el.getAttribute('data-abstand') || (h > 200 ? '10' : '5')) + lw / 2;
    var hh = h / 2;
    var links = richtung === 'links';
    function X(x) { return f(links ? w - x : x); }
    function P(x, y) { return X(x) + ' ' + f(y); }

    var aussen, innen, ri = Math.max(r - d + 2, 2);
    if (!t) {
      aussen = 'M' + P(r, 0) + 'H' + X(w - r) + 'Q' + P(w, 0) + ' ' + P(w, r) + 'V' + f(h - r) + 'Q' + P(w, h) + ' ' + P(w - r, h) +
        'H' + X(r) + 'Q' + P(0, h) + ' ' + P(0, h - r) + 'V' + f(r) + 'Q' + P(0, 0) + ' ' + P(r, 0) + 'Z';
      innen = 'M' + P(d + ri, d) + 'H' + X(w - d - ri) + 'Q' + P(w - d, d) + ' ' + P(w - d, d + ri) + 'V' + f(h - d - ri) +
        'Q' + P(w - d, h - d) + ' ' + P(w - d - ri, h - d) + 'H' + X(d + ri) + 'Q' + P(d, h - d) + ' ' + P(d, h - d - ri) +
        'V' + f(d + ri) + 'Q' + P(d, d) + ' ' + P(d + ri, d) + 'Z';
    } else {
      var L = Math.sqrt(hh * hh + t * t);
      var xc = w - t - d * (L - t) / hh;
      var xt = w - d * L / hh;
      aussen = 'M' + P(r, 0) + 'L' + P(w - t, 0) + 'L' + P(w, hh) + 'L' + P(w - t, h) + 'L' + P(r, h) +
        'Q' + P(0, h) + ' ' + P(0, h - r) + 'L' + P(0, r) + 'Q' + P(0, 0) + ' ' + P(r, 0) + 'Z';
      innen = 'M' + P(d + ri, d) + 'L' + P(xc, d) + 'L' + P(xt, hh) + 'L' + P(xc, h - d) + 'L' + P(d + ri, h - d) +
        'Q' + P(d, h - d) + ' ' + P(d, h - d - ri) + 'L' + P(d, d + ri) + 'Q' + P(d, d) + ' ' + P(d + ri, d) + 'Z';
    }

    var svg = el.querySelector(':scope > .form');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'form');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var pa = document.createElementNS(NS, 'path'); pa.setAttribute('class', 'form-aussen');
      var pl = document.createElementNS(NS, 'path'); pl.setAttribute('class', 'form-linie');
      svg.appendChild(pa); svg.appendChild(pl);
      el.insertBefore(svg, el.firstChild);
    }
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.firstChild.setAttribute('d', aussen);
    svg.lastChild.setAttribute('d', innen);
    svg.lastChild.setAttribute('stroke-width', lw);
    el.classList.add('hat-form');
  }

  var schilder = [].slice.call(document.querySelectorAll('[data-spitze]'));
  schilder.forEach(zeichne);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { zeichne(e.target); }); });
    schilder.forEach(function (el) { ro.observe(el); });
  } else {
    window.addEventListener('resize', function () { schilder.forEach(zeichne); });
  }
  var neu = function () { schilder.forEach(zeichne); };
  if (gross.addEventListener) gross.addEventListener('change', neu); else if (gross.addListener) gross.addListener(neu);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(neu);

  /* 3. Aktionsleiste erst zeigen, wenn die Knöpfe im Hero aus dem Bild sind */
  var aktion = document.querySelector('.aktion');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  if (aktion && heroKnoepfe && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      aktion.classList.toggle('ist-sichtbar', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroKnoepfe);
  } else if (aktion) {
    aktion.classList.add('ist-sichtbar');
  }

  /* 4. Scrollen: Kopfzeile, Mittellinie der Strasse, Ortstafel-Parallaxe */
  var kopf = document.querySelector('.kopf');
  var strich = document.querySelector('.mittellinie span');
  var hero = document.querySelector('.hero');
  var tafel = document.querySelector('.ortstafel-px');
  var laeuft = false;

  function update() {
    laeuft = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (kopf) kopf.classList.toggle('ist-gescrollt', y > 8);
    nachziehen();
    if (reduce.matches) return;
    var vh = window.innerHeight;
    if (strich && hero && y < hero.offsetHeight + 200) {
      strich.style.transform = 'translate3d(' + f(-((y * 0.9) % 120)) + 'px,0,0)';
    }
    if (tafel) {
      var r = tafel.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) {
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p = Math.max(-1, Math.min(1, p));
        tafel.style.transform = 'translate3d(0,' + f(p * 12) + 'px,0)';
      }
    }
  }
  function onScroll() { if (!laeuft) { laeuft = true; window.requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
