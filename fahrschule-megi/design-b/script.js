/* Fahrschule Megi, Design B: Kopf, Einblenden, Prüfungsort-Auswahl mit Karte, VKU-Plan, Laufband, Aktionsleiste */
(function () {
  'use strict';
  window.megiB = true;

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;
  var WA = 'https://wa.me/41768052585';

  /* ---------- Kopf: Hintergrund nach dem Scrollen ---------- */
  var kopf = document.getElementById('kopf');
  function kopfUpdate() { kopf.classList.toggle('gescrollt', window.scrollY > 24); }
  window.addEventListener('scroll', kopfUpdate, { passive: true });
  kopfUpdate();

  /* ---------- Anker: sanft scrollen ---------- */
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

  /* ---------- Einblenden beim Scrollen ---------- */
  var rvs = document.querySelectorAll('.rv');
  if (fx && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('ist-da'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* ---------- Prüfungsort wählen ---------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-ort]'));
  var punkte = Array.prototype.slice.call(document.querySelectorAll('.pkt[data-ort]'));
  var zielG = document.querySelector('.ziel');
  var erg = document.querySelector('.ergebnis');
  var ergOrt = document.getElementById('erg-ort');
  var ergKanton = document.getElementById('erg-kanton');
  var ergKnopf = document.getElementById('erg-knopf');
  var ergKnopfText = document.getElementById('erg-knopf-text');
  var wechselTimer;

  punkte.forEach(function (p, i) { p.style.setProperty('--n', i); });

  function setzeText(ort, kanton) {
    ergOrt.textContent = ort;
    ergKanton.textContent = 'Kanton ' + kanton;
    ergKnopfText.textContent = 'Fahrstunde in ' + ort + ' anfragen';
    ergKnopf.href = WA + '?text=' + encodeURIComponent('Hallo Mërgim, ich möchte Fahrstunden im Prüfungsgebiet ' + ort + '.');
  }

  function waehle(ort, sofort) {
    var chip = chips.filter(function (c) { return c.getAttribute('data-ort') === ort; })[0];
    if (!chip) return;
    var kanton = chip.getAttribute('data-kanton');
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
    var pkt = null;
    punkte.forEach(function (p) {
      var an = p.getAttribute('data-ort') === ort;
      p.classList.toggle('ist-aktiv', an);
      if (an) pkt = p;
    });
    if (pkt && zielG) {
      var t = pkt.transform.baseVal.consolidate();
      if (t) zielG.style.transform = 'translate(' + t.matrix.e + 'px, ' + t.matrix.f + 'px)';
    }
    clearTimeout(wechselTimer);
    if (sofort || !fx) { setzeText(ort, kanton); return; }
    erg.classList.add('wechselt');
    wechselTimer = setTimeout(function () {
      setzeText(ort, kanton);
      erg.classList.remove('wechselt');
    }, 180);
  }

  chips.forEach(function (c) {
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', function () { waehle(c.getAttribute('data-ort')); });
  });
  punkte.forEach(function (p) {
    p.addEventListener('click', function () { waehle(p.getAttribute('data-ort')); });
  });
  if (chips.length) waehle('Suhr', true);

  /* ---------- Laufband mit Bewertungen ---------- */
  var band = document.getElementById('band');
  if (fx && band) {
    var spur = band.querySelector('.band-spur');
    var liste = spur.querySelector('.band-liste');
    var kopie = liste.cloneNode(true);
    kopie.setAttribute('aria-hidden', 'true');
    kopie.setAttribute('inert', '');
    spur.appendChild(kopie);
    band.classList.add('laufband');
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        band.classList.toggle('laeuft', entries[0].isIntersecting);
      }).observe(band);
    } else {
      band.classList.add('laeuft');
    }
  }

  /* ---------- Aktionsleiste mobil: erscheint, sobald die Hero-Knöpfe weg sind ---------- */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  var kontakt = document.getElementById('kontakt');
  var heroWeg = false, kontaktDa = false;
  function aktionUpdate() { aktion.classList.toggle('zeigen', heroWeg && !kontaktDa); }
  if (aktion && heroCta && hasIO) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      heroWeg = !en.isIntersecting && en.boundingClientRect.top < 0;
      aktionUpdate();
    }).observe(heroCta);
    if (kontakt) {
      new IntersectionObserver(function (entries) {
        kontaktDa = entries[0].isIntersecting;
        aktionUpdate();
      }, { threshold: 0.25 }).observe(kontakt);
    }
  } else if (aktion) {
    aktion.classList.add('zeigen');
  }
})();
