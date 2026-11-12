/* Zihlmann AG, Design B: kleine Helfer für Menü, Einblendungen, Musterbrett, Team-Band */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;

  /* Menü (schmale Bildschirme) */
  var kopf = document.getElementById('kopf');
  var menueKnopf = kopf.querySelector('.kopf-menue');
  function menue(auf) {
    kopf.classList.toggle('offen', auf);
    menueKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menueKnopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
    root.style.overflow = auf ? 'hidden' : '';
  }
  menueKnopf.addEventListener('click', function () { menue(!kopf.classList.contains('offen')); });
  kopf.querySelectorAll('.kopf-nav a').forEach(function (a) {
    a.addEventListener('click', function () { menue(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); menueKnopf.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1099 && kopf.classList.contains('offen')) menue(false);
  });

  /* Sanftes Scrollen nur für Ankerlinks (nicht global, damit Scroll-Befehle sofort wirken) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Einblenden beim Scrollen, Geschwister gestaffelt */
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
  reveals.forEach(function (el) {
    var geschwister = [].slice.call(el.parentNode.children).filter(function (k) { return k.hasAttribute('data-reveal'); });
    var idx = geschwister.indexOf(el);
    if (idx > 0) el.style.setProperty('--v', Math.min(idx * 80, 400) + 'ms');
  });
  if (!hatIO || reduziert) {
    reveals.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* 1956: zählt einmal hoch */
  var zaehler = document.querySelector('[data-zaehler]');
  if (zaehler && hatIO && !reduziert) {
    var ziel = parseInt(zaehler.getAttribute('data-zaehler'), 10);
    var zio = new IntersectionObserver(function (eintraege) {
      if (!eintraege[0].isIntersecting) return;
      zio.disconnect();
      var start = performance.now(), von = 1900, dauer = 1000;
      (function schritt(t) {
        var p = Math.min(1, (t - start) / dauer);
        var e = 1 - Math.pow(1 - p, 3);
        zaehler.textContent = String(Math.round(von + (ziel - von) * e));
        if (p < 1) requestAnimationFrame(schritt);
      })(start);
    }, { threshold: 0.4 });
    zio.observe(zaehler);
  }

  /* Kapitelnummern: leichte Parallaxe auf grossen Bildschirmen */
  var nummern = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var gross = window.matchMedia('(min-width: 861px)');
  if (nummern.length && !reduziert) {
    var laeuft = false;
    var bewegen = function () {
      laeuft = false;
      var vh = window.innerHeight;
      nummern.forEach(function (n) {
        if (!gross.matches) { n.style.transform = ''; return; }
        var r = n.parentNode.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var y = Math.max(-28, Math.min(28, (r.top + r.height / 2 - vh / 2) * 0.08));
        n.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!laeuft) { laeuft = true; requestAnimationFrame(bewegen); } }, { passive: true });
    window.addEventListener('resize', bewegen);
    bewegen();
  }

  /* Musterbrett */
  var info = document.getElementById('brett-info');
  var muster = [].slice.call(document.querySelectorAll('.muster'));
  muster.forEach(function (m) {
    m.addEventListener('click', function () {
      var war = m.getAttribute('aria-pressed') === 'true';
      muster.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      if (!war) {
        m.setAttribute('aria-pressed', 'true');
        info.textContent = m.getAttribute('data-text');
      } else {
        info.textContent = info.getAttribute('data-standard');
      }
    });
  });
  if (info) info.setAttribute('data-standard', info.textContent);

  /* Team-Band: läuft nur mit Bewegung, hält bei Hover, Fokus und Knopf an */
  var band = document.getElementById('band');
  var spur = document.getElementById('band-spur');
  var bandKnopf = document.querySelector('.band-knopf');
  if (band && spur) {
    var bilder = [].slice.call(spur.querySelectorAll('img'));
    var laden = function () { bilder.forEach(function (img) { img.loading = 'eager'; }); };
    if (hatIO) {
      var lio = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { laden(); lio.disconnect(); } }, { rootMargin: '800px 0px' });
      lio.observe(band);
    } else { laden(); }

    if (reduziert) {
      if (bandKnopf) bandKnopf.hidden = true;
    } else {
      [].slice.call(spur.children).forEach(function (li) {
        var kopie = li.cloneNode(true);
        kopie.setAttribute('aria-hidden', 'true');
        kopie.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
        spur.appendChild(kopie);
      });
      bilder = [].slice.call(spur.querySelectorAll('img'));
      var breite = 0;
      var messen = function () {
        breite = spur.scrollWidth / 2;
        band.style.setProperty('--band-dauer', Math.round(breite / 38) + 's');
      };
      band.classList.add('laeuft');
      messen();
      window.addEventListener('resize', messen);
      if (bandKnopf) {
        bandKnopf.addEventListener('click', function () {
          var an = band.classList.toggle('pausiert');
          bandKnopf.setAttribute('aria-pressed', an ? 'true' : 'false');
          bandKnopf.querySelector('span').textContent = an ? 'Band abspielen' : 'Band anhalten';
        });
      }
    }
  }

  /* Formular: Absenden zeigt den Vorschau-Hinweis */
  var formular = document.getElementById('formular');
  if (formular) {
    formular.addEventListener('submit', function (e) {
      e.preventDefault();
      var knopf = formular.querySelector('[data-soon]');
      if (knopf && e.submitter !== knopf) knopf.click();
    });
  }

  /* Aktionsleiste erst nach dem Hero */
  var aktion = document.getElementById('aktion');
  var held = document.querySelector('.held');
  if (aktion && held && hatIO) {
    new IntersectionObserver(function (e) {
      aktion.classList.toggle('zeigen', !e[0].isIntersecting);
    }, { threshold: 0, rootMargin: '-40% 0px 0px 0px' }).observe(held);
  } else if (aktion) { aktion.classList.add('zeigen'); }

  /* Aktiver Menüpunkt */
  var links = [].slice.call(document.querySelectorAll('.kopf-nav > a[href^="#"]'));
  if (links.length && hatIO) {
    var nachId = {};
    links.forEach(function (a) { nachId[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        var a = nachId[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          links.forEach(function (x) { x.classList.remove('aktiv'); x.removeAttribute('aria-current'); });
          a.classList.add('aktiv'); a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(nachId).forEach(function (id) { var s = document.getElementById(id); if (s) sio.observe(s); });
  }
})();
