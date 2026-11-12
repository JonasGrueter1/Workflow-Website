/* Reber Holzwerker GmbH, Design B «Holz nach Mass» */
(function () {
  'use strict';
  window.__reberB = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');

  /* ---------- Hero-Auftritt ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { html.classList.add('geladen'); });
  });

  /* ---------- Kopf: Schatten beim Scrollen ---------- */
  var kopf = document.getElementById('kopf');
  var tick = false;
  function aufScroll() {
    tick = false;
    kopf.classList.toggle('gescrollt', window.scrollY > 8);
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(aufScroll); }
  }, { passive: true });
  aufScroll();

  /* ---------- Menü am Handy ---------- */
  var menuKnopf = document.getElementById('menu-knopf');
  var nav = document.getElementById('nav');
  function menu(auf) {
    kopf.classList.toggle('menu-offen', auf);
    menuKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menuKnopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  }
  menuKnopf.addEventListener('click', function () { menu(!kopf.classList.contains('menu-offen')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('menu-offen')) { menu(false); menuKnopf.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (kopf.classList.contains('menu-offen') && !kopf.contains(e.target)) menu(false);
  });

  /* ---------- Weiches Scrollen nur bei Ankerlinks ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var ziel = document.getElementById(a.getAttribute('href').slice(1));
    if (!ziel) return;
    e.preventDefault();
    var y = ziel.getBoundingClientRect().top + window.scrollY - kopf.offsetHeight + 1;
    window.scrollTo({ top: y, behavior: fx ? 'smooth' : 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + ziel.id);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveal = [].slice.call(document.querySelectorAll('[data-reveal]'));
  // gestaffelte Verzögerung innerhalb einer Gruppe
  [].forEach.call(document.querySelectorAll('.werke, .galerie'), function (gruppe) {
    [].forEach.call(gruppe.querySelectorAll('[data-reveal]'), function (el, i) {
      el.style.setProperty('--d', (i % 4) * 0.09 + 's');
    });
  });
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Aktionsleiste: erscheint, sobald die Hero-Knöpfe weg sind ---------- */
  var aktion = document.getElementById('aktion');
  var heroKnoepfe = document.getElementById('hero-knoepfe');
  // Wo die Seite selbst Knöpfe zeigt (Gravurformular, Kontakt), tritt die Leiste zurück
  var eigene = [document.getElementById('gravur-form'), document.getElementById('kontakt')];
  if ('IntersectionObserver' in window && aktion && heroKnoepfe) {
    var heroSichtbar = true, sichtbar = [false, false];
    var setze = function () { aktion.classList.toggle('zeigen', !heroSichtbar && !sichtbar[0] && !sichtbar[1]); };
    new IntersectionObserver(function (e) { heroSichtbar = e[0].isIntersecting || e[0].boundingClientRect.top > 0; setze(); }).observe(heroKnoepfe);
    eigene.forEach(function (el, i) {
      new IntersectionObserver(function (e) { sichtbar[i] = e[0].isIntersecting; setze(); }, { threshold: i === 0 ? 0.3 : 0.25 }).observe(el);
    });
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* ---------- Gravur-Vorschau ---------- */
  var brett = document.getElementById('brett');
  var z1 = document.getElementById('brett-z1');
  var z2 = document.getElementById('brett-z2');
  var in1 = document.getElementById('zeile-1');
  var in2 = document.getElementById('zeile-2');
  var senden = document.getElementById('gravur-senden');
  var werkzeug = brett.querySelector('.werkzeug');
  var form = document.getElementById('gravur-form');

  function sauber(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 22); }

  // Schriftgrösse so wählen, dass die Zeile auf das Brett passt
  function einpassen() {
    var b = brett.clientWidth;
    var max1 = b * 0.0857, max2 = b * 0.0464; // 48 px und 26 px bei 560 px Breite
    var platz = b * 0.76;
    [[z1, max1, '--z1'], [z2, max2, '--z2']].forEach(function (x) {
      var el = x[0];
      brett.style.setProperty(x[2], x[1] + 'px');
      var w = el.scrollWidth;
      if (w > platz) brett.style.setProperty(x[2], Math.max(x[1] * platz / w, 12) + 'px');
    });
  }

  function aktualisieren() {
    var t1 = sauber(in1.value), t2 = sauber(in2.value);
    z1.textContent = t1 || ' ';
    z2.textContent = t2 || ' ';
    einpassen();
    brett.setAttribute('aria-label', 'Vorschau der Gravur: ' + ([t1, t2].filter(Boolean).join(', ') || 'leer'));
    var body = 'Guten Tag\n\nIch interessiere mich für eine Gravur in Holz.\n\n' +
      'Zeile 1: ' + t1 + '\nZeile 2: ' + t2 + '\n\nFreundliche Grüsse\n';
    senden.setAttribute('href', 'mailto:info@reber-holzwerker.ch?subject=' + encodeURIComponent('Anfrage Gravur') +
      '&body=' + encodeURIComponent(body));
  }

  in1.addEventListener('input', function () { fertig(); aktualisieren(); });
  in2.addEventListener('input', function () { fertig(); aktualisieren(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); window.location.href = senden.getAttribute('href'); });
  window.addEventListener('resize', einpassen);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(einpassen);
  aktualisieren();

  var animiert = false;
  function fertig() {
    if (animiert) return;
    animiert = true;
    brett.classList.add('graviert', 'fertig');
    werkzeug.style.opacity = '0';
  }

  // Werkzeugpunkt fährt über eine Zeile
  function fahren(zeile, dauer, verzoegerung) {
    if (!werkzeug.animate) return;
    var bb = brett.getBoundingClientRect(), zb = zeile.getBoundingClientRect();
    var y = zb.top - bb.top + zb.height * 0.56;
    var x0 = zb.left - bb.left, x1 = zb.right - bb.left;
    werkzeug.animate([
      { transform: 'translate(' + x0 + 'px,' + y + 'px)', opacity: 0 },
      { transform: 'translate(' + (x0 + 6) + 'px,' + y + 'px)', opacity: 1, offset: 0.04 },
      { transform: 'translate(' + (x1 - 4) + 'px,' + (y - 2) + 'px)', opacity: 1, offset: 0.96 },
      { transform: 'translate(' + x1 + 'px,' + (y - 2) + 'px)', opacity: 0 }
    ], { duration: dauer, delay: verzoegerung, easing: 'linear', fill: 'both' });
  }

  if (fx && 'IntersectionObserver' in window) {
    var bio = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting || animiert) return;
      bio.disconnect();
      setTimeout(function () {
        if (animiert) return;
        brett.classList.add('graviert');
        fahren(z1, 1400, 0);
        fahren(z2, 800, 1500);
        setTimeout(function () { animiert = true; brett.classList.add('fertig'); }, 2400);
      }, 350);
    }, { threshold: 0.6 });
    bio.observe(brett);
  } else {
    brett.classList.add('graviert', 'fertig');
    animiert = true;
  }
})();
