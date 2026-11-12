/* Niederberger Bodenbeläge, Design B: Hero, Einblenden, Raumbeispiele, Formular-Vorwahl, Menü, Aktionsleiste */
(function () {
  'use strict';
  window.niederbergerB = true;
  var d = document.documentElement;
  var fx = d.classList.contains('fx');
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Hero starten ---------- */
  function heroLos() { d.classList.add('hero-los'); }
  if (fx) {
    var heroImg = document.querySelector('.hero-bild img');
    var gestartet = false;
    var start = function () {
      if (gestartet) return; gestartet = true;
      requestAnimationFrame(function () { requestAnimationFrame(heroLos); });
    };
    var bereit = 0;
    var weiter = function () { bereit += 1; if (bereit >= 2) start(); };
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(weiter); } else { weiter(); }
    if (heroImg && !heroImg.complete) { heroImg.addEventListener('load', weiter); heroImg.addEventListener('error', weiter); } else { weiter(); }
    setTimeout(start, 600);
  } else {
    heroLos();
  }

  /* ---------- Staffel-Index setzen ---------- */
  each(document.querySelectorAll('[data-stagger]'), function (list) {
    each(list.children, function (el, i) { el.style.setProperty('--i', i); });
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = document.querySelectorAll('[data-reveal], [data-stagger], .reno-worte');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    each(ziele, function (el) { io.observe(el); });
  } else {
    each(ziele, function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Raumbeispiele: Reiter ---------- */
  var reiter = document.querySelectorAll('.reiter-knopf');
  function zeigeRaum(knopf, fokus) {
    each(reiter, function (k) {
      var an = k === knopf;
      k.setAttribute('aria-selected', an ? 'true' : 'false');
      k.tabIndex = an ? 0 : -1;
      var panel = document.getElementById(k.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('ist-aktiv', an);
    });
    if (fokus) knopf.focus();
  }
  each(reiter, function (k, i) {
    k.addEventListener('click', function () { zeigeRaum(k, false); });
    k.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = reiter[(i + 1) % reiter.length];
      if (e.key === 'ArrowLeft') n = reiter[(i - 1 + reiter.length) % reiter.length];
      if (e.key === 'Home') n = reiter[0];
      if (e.key === 'End') n = reiter[reiter.length - 1];
      if (n) { e.preventDefault(); zeigeRaum(n, true); }
    });
  });

  /* ---------- Sanftes Scrollen zu Ankern (nur mit Bewegung) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || e.defaultPrevented) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Formular: Anliegen und Belag vorwählen ---------- */
  var formular = document.querySelector('.formular');
  function anliegenAnpassen() {
    if (!formular) return;
    var gewaehlt = formular.querySelector('input[name="anliegen"]:checked');
    formular.classList.toggle('ist-offerte', !!gewaehlt && gewaehlt.value === 'offerte');
  }
  if (formular) {
    each(formular.querySelectorAll('input[name="anliegen"]'), function (r) { r.addEventListener('change', anliegenAnpassen); });
    anliegenAnpassen();
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-wunsch], [data-belag]');
    if (!link || !formular) return;
    var wunsch = link.getAttribute('data-wunsch');
    var belag = link.getAttribute('data-belag');
    if (wunsch) {
      var radio = formular.querySelector('input[name="anliegen"][value="' + wunsch + '"]');
      if (radio) { radio.checked = true; anliegenAnpassen(); }
    }
    if (belag) {
      var box = formular.querySelector('input[name="belag"][value="' + belag + '"]');
      if (box) box.checked = true;
    }
  });

  /* ---------- Menü (Handy und Tablet) ---------- */
  var knopf = document.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  function menueZu() {
    if (!knopf || !menue) return;
    knopf.setAttribute('aria-expanded', 'false');
    knopf.setAttribute('aria-label', 'Menü öffnen');
    menue.classList.remove('offen');
    menue.hidden = true;
    d.classList.remove('menue-offen');
  }
  if (knopf && menue) {
    knopf.addEventListener('click', function () {
      var offen = knopf.getAttribute('aria-expanded') === 'true';
      if (offen) { menueZu(); return; }
      knopf.setAttribute('aria-expanded', 'true');
      knopf.setAttribute('aria-label', 'Menü schliessen');
      menue.hidden = false;
      menue.classList.add('offen');
      d.classList.add('menue-offen');
    });
    each(menue.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { if (!a.hasAttribute('data-soon')) menueZu(); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') { menueZu(); knopf.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1100) menueZu(); }, { passive: true });
  }

  /* ---------- Kopf, Ankermarke, Aktionsleiste ---------- */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var termin = document.getElementById('termin');
  var anker = document.querySelectorAll('.anker a');
  var abschnitte = [];
  each(anker, function (a) {
    var ziel = document.querySelector(a.getAttribute('href'));
    if (ziel) abschnitte.push({ a: a, el: ziel });
  });
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.pageYOffset || d.scrollTop;
    var h = window.innerHeight;
    if (kopf) kopf.classList.toggle('gescrollt', y > 24);
    var aktiv = null;
    abschnitte.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.top < h * 0.45 && r.bottom > h * 0.45) aktiv = s.a;
    });
    each(anker, function (a) { a.classList.toggle('ist-aktiv', a === aktiv); });
    if (aktion) {
      var zeigen = y > h * 0.5;
      if (termin) {
        var t = termin.getBoundingClientRect();
        if (t.top < h * 0.7 && t.bottom > h * 0.2) zeigen = false;
      }
      aktion.classList.toggle('zeigen', zeigen);
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
