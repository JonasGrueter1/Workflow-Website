/* Fahrschule Megi, Design B: Kopf, Einblenden, Prüfungsort-Wahl mit Megi-Karte, Laufband, Aktionsleiste */
(function () {
  'use strict';
  window.megiB = true;

  var root = document.documentElement;
  var reduziert = false;
  try { reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var hatIO = 'IntersectionObserver' in window;
  var WA = 'https://wa.me/41768052585?text=';

  /* ---------- Kopf: transparent über dem Hero, danach dunkel ---------- */
  var kopf = document.getElementById('kopf');
  function kopfPruefen() { kopf.classList.toggle('solid', window.scrollY > 24); }
  kopfPruefen();
  window.addEventListener('scroll', kopfPruefen, { passive: true });

  /* ---------- Sanftes Springen zu Ankern (nur bei Klick, nicht global) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var anker = id && document.getElementById(id);
    if (!anker) return;
    e.preventDefault();
    anker.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------- Einblenden beim Scrollen ---------- */
  var ziele = [].slice.call(document.querySelectorAll('.rv, .preisliste, .plan, .ort-karte, .kurs'));
  if (hatIO && root.classList.contains('fx')) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('da'); });
  }

  /* ---------- Prüfungsort: Chips, Karte und Megi-Karte ---------- */
  var chips = [].slice.call(document.querySelectorAll('.chip'));
  var pass = document.getElementById('pass');
  var passTilt = document.getElementById('pass-tilt');
  var passOrt = document.getElementById('pass-ort');
  var passKanton = document.getElementById('pass-kanton');
  var glanz = pass ? pass.querySelector('.pass-glanz') : null;
  var knopf = document.getElementById('ort-knopf');
  var knopfText = document.getElementById('ort-knopf-text');
  var ziel = document.getElementById('ziel');
  var punkte = [].slice.call(document.querySelectorAll('.pkt'));
  var aktuell = null;

  function inhaltSetzen(ort, kanton) {
    passOrt.textContent = ort;
    passKanton.textContent = 'Kanton ' + kanton;
  }

  function wechseln(ort, kanton, animiert) {
    if (!animiert || reduziert || !pass.animate) { inhaltSetzen(ort, kanton); return; }
    if (pass.getAnimations) pass.getAnimations().forEach(function (an) { an.cancel(); });
    var hin = pass.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }],
      { duration: 190, easing: 'cubic-bezier(.5,0,.9,.5)' }
    );
    hin.onfinish = function () {
      inhaltSetzen(ort, kanton);
      pass.animate(
        [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }],
        { duration: 300, easing: 'cubic-bezier(.15,.7,.3,1)' }
      );
      if (glanz) {
        glanz.classList.remove('wisch');
        void glanz.offsetWidth;
        glanz.classList.add('wisch');
      }
    };
  }

  function waehlen(ort, kanton, animiert) {
    if (ort === aktuell) return;
    aktuell = ort;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-ort') === ort ? 'true' : 'false'); });
    punkte.forEach(function (p) {
      var an = p.getAttribute('data-ort') === ort;
      p.classList.toggle('aktiv', an);
      if (an && ziel) {
        var m = /translate\(([\d.]+)[ ,]+([\d.]+)\)/.exec(p.getAttribute('transform'));
        if (m) {
          ziel.style.transform = 'translate(' + m[1] + 'px, ' + m[2] + 'px)';
          ziel.classList.add('an');
        }
      }
    });
    wechseln(ort, kanton, animiert);
    knopfText.textContent = 'Fahrstunde in ' + ort + ' anfragen';
    knopf.setAttribute('href', WA + encodeURIComponent('Hallo Mërgim, ich möchte Fahrstunden in ' + ort + ' nehmen.'));
  }

  if (pass && chips.length) {
    chips.forEach(function (c) {
      c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', function () { waehlen(c.getAttribute('data-ort'), c.getAttribute('data-kanton'), true); });
    });
    /* Punkte auf der Karte sind ebenfalls antippbar (die Chips bleiben die zugängliche Bedienung) */
    punkte.forEach(function (p) {
      p.style.cursor = 'pointer';
      p.addEventListener('click', function () {
        var o = p.getAttribute('data-ort');
        var chip = chips.filter(function (c) { return c.getAttribute('data-ort') === o; })[0];
        if (chip) waehlen(o, chip.getAttribute('data-kanton'), true);
      });
    });
    /* Startwert: Suhr, der Sitz der Fahrschule */
    if (ziel) ziel.style.transition = 'none';
    waehlen('Suhr', 'Aargau', false);
    if (ziel) { void ziel.getBoundingClientRect(); ziel.style.transition = ''; }

    /* Nach dem Auftritt: Karte folgt sanft der Maus */
    if (passTilt) {
      passTilt.addEventListener('animationend', function (e) {
        if (e.target === passTilt) passTilt.classList.add('fertig');
      });
      if (!root.classList.contains('fx')) passTilt.classList.add('fertig');
    }
    var feinZeiger = false;
    try { feinZeiger = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
    var bereich = document.querySelector('.ort-pass');
    if (bereich && passTilt && feinZeiger && !reduziert) {
      bereich.addEventListener('pointermove', function (e) {
        if (!passTilt.classList.contains('fertig')) return;
        var r = bereich.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        passTilt.classList.add('folgt');
        passTilt.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        passTilt.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
        pass.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
        pass.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      bereich.addEventListener('pointerleave', function () {
        passTilt.classList.remove('folgt');
        passTilt.style.removeProperty('--ry');
        passTilt.style.removeProperty('--rx');
        pass.style.removeProperty('--gx');
        pass.style.removeProperty('--gy');
      });
    }
  }

  /* ---------- Laufband mit Bewertungen ---------- */
  var band = document.getElementById('band');
  if (band && root.classList.contains('fx')) {
    var spur = band.querySelector('.band-spur');
    var liste = band.querySelector('.band-liste');
    var kopie = liste.cloneNode(true);
    kopie.setAttribute('aria-hidden', 'true');
    [].forEach.call(kopie.querySelectorAll('[role="img"]'), function (el) { el.removeAttribute('role'); el.removeAttribute('aria-label'); });
    spur.appendChild(kopie);
    if (hatIO) {
      new IntersectionObserver(function (e) { band.classList.toggle('laeuft', e[0].isIntersecting); }).observe(band);
    } else {
      band.classList.add('laeuft');
    }
  }

  /* ---------- Aktionsleiste am Handy: erscheint, wenn die Hero-Knöpfe weg sind ---------- */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta && hatIO) {
    new IntersectionObserver(function (e) {
      aktion.classList.toggle('zeigen', !e[0].isIntersecting && e[0].boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
