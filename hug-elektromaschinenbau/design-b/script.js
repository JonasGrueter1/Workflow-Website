/* Hug Elektromaschinenbau AG, Design B «Prozesskette» */
(function () {
  'use strict';
  window.hugB = true;

  var doc = document.documentElement;
  var body = document.body;
  var fx = doc.classList.contains('fx');
  var hatIO = 'IntersectionObserver' in window;

  /* ---------- Kopf: Schatten beim Scrollen, Menü am Handy ---------- */
  var kopf = document.getElementById('kopf');
  var menuKnopf = document.querySelector('.menu-knopf');
  var menu = document.getElementById('menu');

  function menuZu() {
    body.classList.remove('menu-offen');
    if (menuKnopf) menuKnopf.setAttribute('aria-expanded', 'false');
  }
  if (menuKnopf && menu) {
    menuKnopf.addEventListener('click', function () {
      var offen = !body.classList.contains('menu-offen');
      if (offen) body.style.setProperty('--menu-top', kopf.getBoundingClientRect().bottom + 'px');
      body.classList.toggle('menu-offen', offen);
      menuKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && !a.hasAttribute('data-soon')) menuZu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menuZu(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1180) menuZu(); });
  }

  /* ---------- Sanftes Scrollen zu Ankern (nur per Klick, nicht für programmatisches Scrollen) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip') || e.defaultPrevented) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    var kopfH = kopf ? kopf.getBoundingClientRect().height : 0;
    var y = ziel.getBoundingClientRect().top + window.pageYOffset - kopfH - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: fx ? 'smooth' : 'auto' });
    if (history.pushState) history.pushState(null, '', '#' + id);
  });

  /* ---------- Prozesskette: ein Schritt offen, Reiter (Desktop) oder Akkordeon (Handy) ---------- */
  var kette = document.querySelector('[data-kette]');
  if (kette) {
    var knoepfe = [].slice.call(kette.querySelectorAll('.pfeil'));
    var waehle = function (knopf, animiert) {
      knoepfe.forEach(function (k) {
        var feld = document.getElementById(k.getAttribute('aria-controls'));
        var an = k === knopf;
        k.setAttribute('aria-expanded', an ? 'true' : 'false');
        k.parentNode.classList.toggle('aktiv', an);
        if (an) {
          feld.hidden = false;
          if (animiert && fx) {
            feld.classList.remove('einblenden');
            void feld.offsetWidth;
            feld.classList.add('einblenden');
          }
        } else {
          feld.hidden = true;
        }
      });
    };
    knoepfe.forEach(function (k) {
      k.addEventListener('click', function () {
        if (k.getAttribute('aria-expanded') === 'true') return;
        waehle(k, true);
        /* Am Handy den gewählten Schritt in Sicht holen */
        if (window.innerWidth < 900) {
          var oben = k.getBoundingClientRect().top;
          if (oben < 70 || oben > window.innerHeight * 0.6) {
            window.scrollBy({ top: oben - 90, behavior: fx ? 'smooth' : 'auto' });
          }
        }
      });
      /* Pfeiltasten wie bei Reitern */
      k.addEventListener('keydown', function (e) {
        var i = knoepfe.indexOf(k), n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = knoepfe[(i + 1) % knoepfe.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = knoepfe[(i - 1 + knoepfe.length) % knoepfe.length];
        if (n) { e.preventDefault(); n.focus(); waehle(n, true); }
      });
    });
    waehle(knoepfe[0], false);
    /* Knopf «Weiter» unten im Feld öffnet den nächsten Schritt */
    kette.addEventListener('click', function (e) {
      var w = e.target.closest('[data-weiter]');
      if (!w) return;
      var ziel = document.getElementById(w.getAttribute('data-weiter'));
      if (!ziel) return;
      ziel.click();
      ziel.focus({ preventScroll: true });
      if (window.innerWidth >= 900) {
        var oben = kette.getBoundingClientRect().top;
        if (oben < 90) window.scrollBy({ top: oben - 110, behavior: fx ? 'smooth' : 'auto' });
      }
    });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = [].slice.call(document.querySelectorAll('[data-reveal], [data-kette], [data-stationen]'));
  if (fx && hatIO) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    ziele.forEach(function (z) { io.observe(z); });
  } else {
    ziele.forEach(function (z) { z.classList.add('sichtbar'); });
  }

  /* ---------- Zeitstrahl: Linie wächst mit dem Scrollen, Jahre leuchten auf ---------- */
  var strahl = document.querySelector('[data-zeitstrahl]');
  if (strahl) {
    var punkte = [].slice.call(strahl.querySelectorAll('li'));
    if (!fx) {
      punkte.forEach(function (p) { p.classList.add('erreicht'); });
    } else {
      var aktiv = false, geplant = false;
      var takt = function () {
        geplant = false;
        var r = strahl.getBoundingClientRect();
        var marke = window.innerHeight * 0.62;
        var f = Math.max(0, Math.min(1, (marke - r.top) / r.height));
        strahl.style.setProperty('--fortschritt', f.toFixed(4));
        punkte.forEach(function (p) {
          var pr = p.getBoundingClientRect();
          p.classList.toggle('erreicht', pr.top + 20 < marke);
        });
      };
      var anfordern = function () { if (aktiv && !geplant) { geplant = true; requestAnimationFrame(takt); } };
      if (hatIO) {
        new IntersectionObserver(function (e) { aktiv = e[0].isIntersecting; if (aktiv) anfordern(); }, { rootMargin: '20% 0px 20% 0px' }).observe(strahl);
      } else { aktiv = true; }
      window.addEventListener('scroll', anfordern, { passive: true });
      window.addEventListener('resize', anfordern, { passive: true });
      takt();
    }
  }

  /* ---------- Kopf-Schatten und Aktionsleiste ---------- */
  var held = document.querySelector('.held');
  var aktion = document.getElementById('aktion');
  var geplantKopf = false;
  function kopfTakt() {
    geplantKopf = false;
    kopf.classList.toggle('gescrollt', window.scrollY > 8);
  }
  window.addEventListener('scroll', function () {
    if (!geplantKopf) { geplantKopf = true; requestAnimationFrame(kopfTakt); }
  }, { passive: true });
  kopfTakt();
  if (aktion && held) {
    if (hatIO) {
      new IntersectionObserver(function (e) {
        aktion.classList.toggle('zeigen', !e[0].isIntersecting);
      }, { rootMargin: '-35% 0px 0px 0px' }).observe(held);
    } else {
      aktion.classList.add('zeigen');
    }
  }

  /* ---------- Formular: Demo, nichts wird gesendet ---------- */
  var form = document.querySelector('.formular');
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    var datei = form.querySelector('input[type=file]');
    var dateiText = form.querySelector('.datei-text');
    if (datei && dateiText) {
      datei.addEventListener('change', function () {
        dateiText.textContent = datei.files && datei.files.length ? datei.files[0].name : 'Datei auswählen';
      });
    }
  }
})();
