/* Kunz AG, Design B: Hero-Auftritt, Einblenden, Zähler, Umschalter, Detail-Reihen, Lupe, Menü, Aktionsleiste */
(function () {
  'use strict';

  var doc = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kopf = document.getElementById('kopf');
  var held = document.querySelector('.held');
  var aktion = document.querySelector('.aktion');

  /* Hero-Auftritt */
  function heroLos() { if (held) held.classList.add('los'); }
  if (document.fonts && document.fonts.ready && !ruhig) {
    var fertig = false;
    document.fonts.ready.then(function () { if (!fertig) { fertig = true; requestAnimationFrame(heroLos); } });
    setTimeout(function () { if (!fertig) { fertig = true; heroLos(); } }, 600);
  } else {
    heroLos();
  }

  /* Kopf fest, Aktionsleiste, Parallaxe: ein gemeinsamer rAF-Takt */
  var heldBild = document.querySelector('.held-bild');
  var heldSichtbar = true;
  var geplant = false;
  var breit = window.matchMedia('(min-width: 761px)');
  function takt() {
    geplant = false;
    var y = window.scrollY || window.pageYOffset;
    if (kopf) kopf.classList.toggle('fest', y > 30);
    if (aktion && held) aktion.classList.toggle('zeigen', y > held.offsetHeight * 0.55);
    if (heldBild && heldSichtbar && !ruhig && breit.matches) {
      heldBild.style.transform = 'translate3d(0,' + Math.min(y * 0.22, 220).toFixed(1) + 'px,0)';
    } else if (heldBild && !breit.matches) {
      heldBild.style.transform = '';
    }
  }
  function anfordern() { if (!geplant) { geplant = true; requestAnimationFrame(takt); } }
  window.addEventListener('scroll', anfordern, { passive: true });
  window.addEventListener('resize', anfordern, { passive: true });
  if ('IntersectionObserver' in window && held) {
    new IntersectionObserver(function (e) { heldSichtbar = e[0].isIntersecting; }).observe(held);
  }
  takt();

  /* Menü */
  var menueKnopf = document.querySelector('.menue-knopf');
  var nav = document.getElementById('kopf-nav');
  function menue(auf) {
    kopf.classList.toggle('offen', auf);
    menueKnopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menueKnopf.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
    doc.style.overflow = auf ? 'hidden' : '';
  }
  if (menueKnopf && nav) {
    menueKnopf.addEventListener('click', function () { menue(!kopf.classList.contains('offen')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menue(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && kopf.classList.contains('offen')) { menue(false); menueKnopf.focus(); } });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', function (m) { if (m.matches) menue(false); });
  }

  /* Sanftes Scrollen zu Ankern (per JS, damit programmatisches Scrollen sofort springt) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? document.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Einblenden beim Scrollen */
  var ziele = document.querySelectorAll('[data-reveal], [data-reihe], [data-medaillen], [data-zeitstrahl]');
  document.querySelectorAll('.reihe-spur').forEach(function (spur) {
    spur.querySelectorAll(':scope > li').forEach(function (li, i) { li.style.setProperty('--i', Math.min(i, 5)); });
  });
  document.querySelectorAll('[data-zeitstrahl] li').forEach(function (li, i) { li.style.setProperty('--i', i); });
  if ('IntersectionObserver' in window && !ruhig) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('ist-da');
        io.unobserve(e.target);
        zaehlen(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Zähler */
  function zaehlen(el) {
    el.querySelectorAll('[data-zahl]').forEach(function (z) {
      var ziel = parseInt(z.getAttribute('data-zahl'), 10);
      var start = null;
      var dauer = 1300;
      function schritt(t) {
        if (start === null) start = t;
        var p = Math.min((t - start) / dauer, 1);
        var k = 1 - Math.pow(1 - p, 3);
        z.textContent = Math.round(ziel * k);
        if (p < 1) requestAnimationFrame(schritt);
      }
      z.textContent = '0';
      requestAnimationFrame(schritt);
    });
  }

  /* Umschalter Alte Käserei (Tabs mit Überblendung) */
  document.querySelectorAll('[data-schalter]').forEach(function (liste) {
    var name = liste.getAttribute('data-schalter');
    var buehne = document.querySelector('[data-buehne="' + name + '"]');
    if (!buehne) return;
    var tabs = Array.prototype.slice.call(liste.querySelectorAll('[role="tab"]'));
    var bilder = buehne.querySelectorAll('img');
    var etikett = buehne.querySelector('[data-etikett]');
    function waehle(i, fokus) {
      tabs.forEach(function (t, k) {
        var an = k === i;
        t.setAttribute('aria-selected', an ? 'true' : 'false');
        t.tabIndex = an ? 0 : -1;
        if (bilder[k]) bilder[k].classList.toggle('ist-aktiv', an);
      });
      buehne.setAttribute('aria-labelledby', tabs[i].id);
      if (etikett) etikett.textContent = tabs[i].textContent.replace(/^\d/, '').trim();
      if (fokus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { waehle(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); waehle(n, true); }
      });
    });
    // Bilder der Bühne früh laden, damit das Umschalten sofort sitzt
    if ('IntersectionObserver' in window) {
      var vor = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { bilder.forEach(function (b) { b.loading = 'eager'; }); vor.disconnect(); }
      }, { rootMargin: '600px 0px' });
      vor.observe(buehne);
    }
  });

  /* Detail-Reihen: Pfeile */
  document.querySelectorAll('[data-reihe]').forEach(function (reihe) {
    var spur = reihe.querySelector('.reihe-spur');
    var zurueck = reihe.querySelector('[data-richtung="-1"]');
    var weiter = reihe.querySelector('[data-richtung="1"]');
    if (!spur || !zurueck || !weiter) return;
    function schritt() {
      var li = spur.querySelector('li');
      return li ? li.getBoundingClientRect().width + 16 : 300;
    }
    var pfeile = reihe.querySelector('.reihe-pfeile');
    function zustand() {
      var max = spur.scrollWidth - spur.clientWidth - 2;
      if (pfeile) pfeile.hidden = max <= 2;
      zurueck.disabled = spur.scrollLeft <= 2;
      weiter.disabled = spur.scrollLeft >= max;
    }
    zurueck.addEventListener('click', function () { spur.scrollBy({ left: -schritt() * 2, behavior: ruhig ? 'auto' : 'smooth' }); });
    weiter.addEventListener('click', function () { spur.scrollBy({ left: schritt() * 2, behavior: ruhig ? 'auto' : 'smooth' }); });
    spur.addEventListener('scroll', zustand, { passive: true });
    window.addEventListener('resize', zustand, { passive: true });
    zustand();
  });

  /* Lupe: grosses Bild im Dialog */
  var lupe = document.querySelector('.lupe');
  if (lupe && typeof lupe.showModal === 'function') {
    var figur = lupe.querySelector('[data-lupe-figur]');
    var text = lupe.querySelector('[data-lupe-text]');
    var bild = null;
    document.querySelectorAll('.karte').forEach(function (karte) {
      karte.addEventListener('click', function (e) {
        e.preventDefault();
        var klein = karte.querySelector('img');
        if (!bild) { bild = document.createElement('img'); figur.insertBefore(bild, text); }
        bild.src = karte.getAttribute('href');
        bild.alt = klein ? klein.alt : '';
        var tag = karte.querySelector('.karte-tag');
        var titel = karte.querySelector('.karte-titel');
        text.textContent = (tag ? tag.textContent + ': ' : '') + (titel ? titel.textContent : '');
        lupe.showModal();
      });
    });
    lupe.querySelector('.lupe-zu').addEventListener('click', function () { lupe.close(); });
    lupe.addEventListener('click', function (e) { if (e.target === lupe) lupe.close(); });
  }
})();
