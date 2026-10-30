/* Fahrschule Pfäffli, Design B: Kopf, Einblenden, Zitat, Triptychon, Fahrstunden-Karte, Menü, Aktionsleiste */
(function () {
  'use strict';
  window.pfaeffliB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var feinZeiger = window.matchMedia('(hover: hover) and (pointer: fine)');
  var breit = window.matchMedia('(min-width: 1024px)');

  /* ---------- Zitat: Wörter einzeln, damit sie nacheinander aufleuchten ---------- */
  if (fx) {
    var zitat = document.querySelector('[data-woerter]');
    if (zitat) {
      var woerter = zitat.textContent.trim().split(/\s+/);
      zitat.textContent = '';
      woerter.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w';
        s.style.setProperty('--w', i);
        s.textContent = w;
        zitat.appendChild(s);
        if (i < woerter.length - 1) zitat.appendChild(document.createTextNode(' '));
      });
    }
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var ausweis = document.getElementById('ausweis');
  var beob = document.querySelectorAll('.rv, .maske, .schalt, .kurs, .anh-foto, .ausweis');
  function zeigen(el) {
    el.classList.add('ist-da');
    if (el === ausweis) setTimeout(function () { ausweis.classList.add('bereit'); }, 1300);
  }
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { zeigen(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    beob.forEach(function (el) { io.observe(el); });
  } else {
    beob.forEach(zeigen);
  }

  /* ---------- Kopf: Schatten beim Scrollen, dunkel nach dem Hero ---------- */
  var kopf = document.getElementById('kopf');
  var hero = document.querySelector('.hero');
  function kopfUpdate() {
    kopf.classList.toggle('gescrollt', window.scrollY > 4);
    kopf.classList.toggle('dunkel', hero.getBoundingClientRect().bottom <= kopf.offsetHeight + 1);
  }

  /* ---------- Hero: Wort und Foto gehören zusammen ---------- */
  var paare = hero.querySelectorAll('[data-k]');
  function paar(k) {
    hero.classList.toggle('paar', !!k);
    paare.forEach(function (el) { el.classList.toggle('an', !!k && el.getAttribute('data-k') === k); });
  }
  if (feinZeiger.matches) {
    paare.forEach(function (el) {
      el.addEventListener('mouseenter', function () { paar(el.getAttribute('data-k')); });
      el.addEventListener('mouseleave', function () { paar(null); });
    });
    hero.addEventListener('focusin', function (e) {
      var item = e.target.closest('[data-k]');
      paar(item ? item.getAttribute('data-k') : null);
    });
    hero.addEventListener('focusout', function () { paar(null); });
  }

  /* ---------- Triptychon am Handy: Punkte zeigen die Position ---------- */
  var tri = document.querySelector('.tri');
  var punkte = document.querySelectorAll('.tri-punkte span');
  if (tri && punkte.length) {
    var triTick = false;
    tri.addEventListener('scroll', function () {
      if (triTick) return;
      triTick = true;
      requestAnimationFrame(function () {
        triTick = false;
        var max = tri.scrollWidth - tri.clientWidth;
        var idx = max > 0 ? Math.round((tri.scrollLeft / max) * (punkte.length - 1)) : 0;
        punkte.forEach(function (p, i) { p.classList.toggle('an', i === idx); });
      });
    }, { passive: true });
  }

  /* ---------- Fahrstunden-Karte: neigt sich leicht mit der Maus ---------- */
  if (fx && ausweis && feinZeiger.matches) {
    var buehne = ausweis.parentNode;
    buehne.addEventListener('pointermove', function (e) {
      if (!breit.matches || !ausweis.classList.contains('bereit')) return;
      var r = ausweis.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      ausweis.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      ausweis.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
    });
    buehne.addEventListener('pointerleave', function () {
      ausweis.style.removeProperty('--ry');
      ausweis.style.removeProperty('--rx');
    });
  }

  /* ---------- Anker-Links: sanft scrollen (nur bei Klick und mit Animation) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Menü am Handy: schliesst nach Klick, mit Escape und ausserhalb ---------- */
  var menue = document.querySelector('.menue');
  if (menue) {
    menue.addEventListener('click', function (e) {
      if (e.target.closest('.menue-panel a')) menue.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menue.hasAttribute('open')) {
        menue.removeAttribute('open');
        menue.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (menue.hasAttribute('open') && !menue.contains(e.target)) menue.removeAttribute('open');
    });
  }

  /* ---------- Aktionsleiste: erscheint, sobald die Hero-Knöpfe weg sind ---------- */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta && hasIO) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      aktion.classList.toggle('zeigen', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }

  /* ---------- Scroll ---------- */
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; kopfUpdate(); });
  }, { passive: true });
  window.addEventListener('resize', kopfUpdate, { passive: true });
  kopfUpdate();
})();
