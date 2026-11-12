/* Maler Schmid, Design B: Einblenden, Leistungsvorschau, Vorher/Nachher, Menü, Aktionsleiste */
(function () {
  'use strict';
  window.schmidB = true;
  var d = document.documentElement;
  var fx = d.classList.contains('fx');

  /* ---------- Hero starten ---------- */
  function heroLos() { d.classList.add('hero-los'); }
  if (fx) {
    var heroImg = document.querySelector('.hero-foto img');
    var gestartet = false;
    var start = function () { if (gestartet) return; gestartet = true; requestAnimationFrame(function () { requestAnimationFrame(heroLos); }); };
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(start); }
    if (heroImg && !heroImg.complete) { heroImg.addEventListener('load', start); }
    setTimeout(start, 350);
  } else {
    heroLos();
  }

  /* ---------- Staffel-Index setzen ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (list) {
    Array.prototype.forEach.call(list.children, function (el, i) { el.style.setProperty('--i', i); });
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = document.querySelectorAll('[data-reveal], [data-feld], [data-stagger]');
  if (fx && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(ziele, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(ziele, function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Kopf: Schatten beim Scrollen, Aktionsleiste ---------- */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var kontakt = document.getElementById('kontakt');
  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.pageYOffset || d.scrollTop;
    if (kopf) kopf.classList.toggle('gescrollt', y > 48);
    if (y < window.innerHeight * 0.5) {
      Array.prototype.forEach.call(document.querySelectorAll('.anker a.ist-aktiv'), function (a) { a.classList.remove('ist-aktiv'); });
    }
    if (aktion) {
      var zeigen = y > window.innerHeight * 0.55;
      if (kontakt) {
        var r = kontakt.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.6 && r.bottom > 0) zeigen = false;
      }
      aktion.classList.toggle('zeigen', zeigen);
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menü (Handy und Tablet) ---------- */
  var knopf = document.querySelector('.menue-knopf');
  var menue = document.getElementById('menue');
  function menueZu() {
    d.classList.remove('menue-offen');
    if (knopf) { knopf.setAttribute('aria-expanded', 'false'); knopf.querySelector('span').textContent = 'Menü'; }
  }
  if (knopf && menue) {
    knopf.addEventListener('click', function () {
      var offen = !d.classList.contains('menue-offen');
      if (offen && kopf) menue.style.top = Math.round(kopf.getBoundingClientRect().bottom) + 'px';
      d.classList.toggle('menue-offen', offen);
      knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
      knopf.querySelector('span').textContent = offen ? 'Schliessen' : 'Menü';
    });
    menue.addEventListener('click', function (e) { if (e.target.closest('a')) menueZu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menueZu(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1240) menueZu(); });
  }

  /* ---------- Aktiver Anker in der Navigation ---------- */
  var anker = document.querySelectorAll('.anker a');
  if ('IntersectionObserver' in window && anker.length) {
    var map = {};
    Array.prototype.forEach.call(anker, function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var ioNav = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = map[e.target.id];
        Array.prototype.forEach.call(anker, function (x) { x.classList.toggle('ist-aktiv', x === a); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('main > section'), function (sec) { ioNav.observe(sec); });
  }

  /* ---------- Leistungen: Bildvorschau (Desktop), folgt dem Scrollen und der Maus ---------- */
  var liste = document.querySelector('.l-liste');
  var box = document.querySelector('.l-vorschau-box');
  var bilder = box ? box.querySelectorAll('.l-vorschau-bilder img') : [];
  var zeilen = document.querySelectorAll('.l-zeile');
  var vTitel = document.querySelector('.l-vorschau-titel');
  var vNr = document.querySelector('.l-vorschau-nr');
  var aktiv = -1, maus = false;
  function setzeLeistung(i) {
    if (!box || i === aktiv) return;
    aktiv = i;
    Array.prototype.forEach.call(zeilen, function (z, k) { z.classList.toggle('ist-aktiv', k === i); });
    Array.prototype.forEach.call(bilder, function (b, k) { b.classList.toggle('ist-aktiv', k === i); });
    if (vTitel) vTitel.textContent = zeilen[i].querySelector('.l-titel').textContent;
    if (vNr) vNr.textContent = (i < 9 ? '0' : '') + (i + 1);
  }
  function spy() {
    if (!box || maus || window.innerWidth < 900) return;
    var r0 = liste.getBoundingClientRect();
    if (r0.bottom < 0 || r0.top > window.innerHeight) return;
    var mitte = window.innerHeight * 0.5, best = 0, bestD = Infinity;
    Array.prototype.forEach.call(zeilen, function (z, k) {
      var r = z.getBoundingClientRect();
      var dd = Math.abs(r.top + r.height / 2 - mitte);
      if (dd < bestD) { bestD = dd; best = k; }
    });
    setzeLeistung(best);
  }
  if (box && liste) {
    setzeLeistung(0);
    Array.prototype.forEach.call(zeilen, function (z, i) {
      z.addEventListener('mouseenter', function () { maus = true; setzeLeistung(i); });
      z.addEventListener('focus', function () { setzeLeistung(i); });
    });
    liste.addEventListener('mouseleave', function () { maus = false; });
    var spyTick = false;
    window.addEventListener('scroll', function () { if (!spyTick) { spyTick = true; requestAnimationFrame(function () { spyTick = false; spy(); }); } }, { passive: true });
  }

  /* ---------- Vorher / Nachher ---------- */
  var tabs = document.querySelectorAll('.vn-tab');
  var panels = document.querySelectorAll('.vn-panel');
  var buehne = document.querySelector('.vn-buehne');
  function zeigeTab(i, fokus) {
    Array.prototype.forEach.call(tabs, function (t, k) {
      var an = k === i;
      t.setAttribute('aria-selected', an ? 'true' : 'false');
      t.tabIndex = an ? 0 : -1;
      if (an && fokus) t.focus();
    });
    Array.prototype.forEach.call(panels, function (p, k) {
      if (k === i) {
        p.hidden = false;
        p.classList.remove('ist-neu'); void p.offsetWidth; p.classList.add('ist-neu');
      } else { p.hidden = true; }
    });
    setzeAnsicht('vorher');
  }
  function setzeAnsicht(w) {
    if (!buehne) return;
    buehne.setAttribute('data-zeige', w);
    Array.prototype.forEach.call(buehne.querySelectorAll('.vn-schalter button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-zeige') === w ? 'true' : 'false');
    });
  }
  if (tabs.length && panels.length) {
    Array.prototype.forEach.call(panels, function (p, k) { p.hidden = k !== 0; });
    Array.prototype.forEach.call(tabs, function (t, i) {
      t.addEventListener('click', function () { zeigeTab(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, j = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = n - 1;
        if (j > -1) { e.preventDefault(); zeigeTab(j, true); }
      });
    });
  }
  if (buehne) {
    Array.prototype.forEach.call(buehne.querySelectorAll('.vn-schalter button'), function (b) {
      b.addEventListener('click', function () { setzeAnsicht(b.getAttribute('data-zeige')); });
    });
    /* Antippen des Bildes wechselt ebenfalls (nur Handy-Ansicht) */
    buehne.addEventListener('click', function (e) {
      if (window.innerWidth >= 900 || !e.target.closest('.vn-paar')) return;
      setzeAnsicht(buehne.getAttribute('data-zeige') === 'vorher' ? 'nachher' : 'vorher');
    });
  }

  /* ---------- Weiches Scrollen zu Ankern (nur bei Klick) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || e.defaultPrevented) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: fx ? 'smooth' : 'auto' });
    else ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Formular: in der Vorschau nicht absenden ---------- */
  var form = document.querySelector('.form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = form.querySelector('[data-soon]');
      if (b) b.click();
    });
  }
})();
