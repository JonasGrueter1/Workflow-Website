/* myfahrlehrer.ch, Design B «Schilderwald»: kleine Helfer ohne Bibliotheken */
(function () {
  'use strict';
  window.myfahrlehrerB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hatIO = 'IntersectionObserver' in window;

  /* Kopf: Schatten beim Scrollen, Menü auf schmalen Bildschirmen */
  var kopf = document.getElementById('kopf');
  var btn = kopf && kopf.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  function onScroll() { if (kopf) kopf.classList.toggle('gescrollt', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function menu(offen) {
    if (!kopf || !btn) return;
    kopf.classList.toggle('offen', offen);
    btn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    btn.querySelector('use').setAttribute('href', offen ? '#i-zu' : '#i-menu');
  }
  if (btn) {
    btn.addEventListener('click', function () { menu(!kopf.classList.contains('offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  }

  /* Sanft zu Ankern scrollen (nur mit Bewegung) */
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

  /* Einblenden beim Scrollen */
  var rv = document.querySelectorAll('.rv');
  if (fx && hatIO) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* Preis zählt hoch */
  var zahl = document.querySelector('[data-zaehlen]');
  if (zahl && fx && hatIO) {
    var ziel = parseFloat(zahl.getAttribute('data-zaehlen'));
    var fertig = zahl.textContent;
    zahl.textContent = '0.00';
    var zio = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return;
      zio.disconnect();
      var start = null, dauer = 700;
      function schritt(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / dauer);
        var w = 1 - Math.pow(1 - p, 3);
        zahl.textContent = p < 1 ? Math.round(ziel * w) + '.00' : fertig;
        if (p < 1) requestAnimationFrame(schritt);
      }
      setTimeout(function () { requestAnimationFrame(schritt); }, 250);
    }, { threshold: 0.5 });
    zio.observe(zahl);
  }

  /* Schilderfeld: leichte Parallaxe mit der Maus */
  var feld = document.getElementById('feld');
  var hero = document.querySelector('.hero');
  var fein = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  if (fx && feld && hero && fein && fein.matches) {
    var lauf = false, mx = 0, my = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (lauf) return;
      lauf = true;
      requestAnimationFrame(function () {
        feld.style.setProperty('--px', mx.toFixed(3));
        feld.style.setProperty('--py', my.toFixed(3));
        lauf = false;
      });
    });
    hero.addEventListener('pointerleave', function () {
      feld.style.setProperty('--px', 0);
      feld.style.setProperty('--py', 0);
    });
  }

  /* Feedback-Karussell: Knöpfe, Punkte, Pfeiltasten (kein automatischer Wechsel) */
  var spur = document.getElementById('spur');
  if (spur) {
    var folien = spur.querySelectorAll('.zitat');
    var punkte = document.querySelectorAll('.k-punkt');
    var pfeile = document.querySelectorAll('.k-btn');
    var aktuell = 0;
    function breite() { return folien[0].getBoundingClientRect().width + parseFloat(getComputedStyle(spur).columnGap || 0); }
    function gehe(i) {
      i = Math.max(0, Math.min(folien.length - 1, i));
      spur.scrollTo({ left: i * breite(), behavior: fx ? 'smooth' : 'auto' });
      setze(i);
    }
    function setze(i) {
      aktuell = i;
      punkte.forEach(function (p, k) { if (k === i) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
      folien.forEach(function (f, k) { f.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      pfeile[0].disabled = i === 0;
      pfeile[1].disabled = i === folien.length - 1;
    }
    pfeile.forEach(function (b) {
      b.addEventListener('click', function () { gehe(aktuell + parseInt(b.getAttribute('data-richtung'), 10)); });
    });
    punkte.forEach(function (p) {
      p.addEventListener('click', function () { gehe(parseInt(p.getAttribute('data-ziel'), 10)); });
    });
    spur.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); gehe(aktuell + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); gehe(aktuell - 1); }
    });
    var warte;
    spur.addEventListener('scroll', function () {
      clearTimeout(warte);
      warte = setTimeout(function () {
        var i = Math.round(spur.scrollLeft / breite());
        if (i !== aktuell) setze(i);
      }, 90);
    }, { passive: true });
    setze(0);
  }

  /* Aktionsleiste erst zeigen, wenn die Anruf-Knöpfe im Hero weg sind */
  var aktion = document.getElementById('aktion');
  var cta = document.querySelector('.hero-cta');
  if (aktion && cta && hatIO) {
    new IntersectionObserver(function (e) {
      var weg = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      aktion.classList.toggle('zeigen', weg);
    }).observe(cta);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
