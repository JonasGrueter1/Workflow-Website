/* SoLo-Fahrschule, Design B: Gutschein-Rechner, Einblendungen, VKU-Schalter. Nur Vanilla-JS. */
(function () {
  'use strict';
  window.soloB = true;
  var d = document.documentElement;
  d.classList.add('js');
  var reduziert = false;
  try { reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var fx = d.classList.contains('fx') && !reduziert;
  var EASE = 'cubic-bezier(.16, 1, .3, 1)';
  var kannAnimieren = fx && typeof Element.prototype.animate === 'function';

  function anim(el, frames, opts) {
    if (!kannAnimieren || !el) return null;
    try { return el.animate(frames, opts); } catch (e) { return null; }
  }

  /* Hero-Auftritt starten */
  requestAnimationFrame(function () { d.classList.add('ist-bereit'); });

  /* Sanftes Scrollen nur für Klicks auf Anker (nicht per CSS, damit Scrollen per Skript sofort greift) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && document.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduziert ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Kopf mit Linie, sobald gescrollt */
  var kopf = document.getElementById('kopf');
  function kopfPruefen() { if (kopf) kopf.classList.toggle('ist-gescrollt', window.scrollY > 8); }
  window.addEventListener('scroll', kopfPruefen, { passive: true });
  kopfPruefen();

  /* Einblenden beim Scrollen */
  var rv = [].slice.call(document.querySelectorAll('.rv, .phasen'));
  if ('IntersectionObserver' in window && fx) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  /* ---------- Gutschein-Rechner ---------- */
  var vorname = document.getElementById('vorname');
  var geburt = document.getElementById('geburtstag');
  var ausgabe = document.getElementById('ausgabe');
  var waKnopf = document.getElementById('rechner-wa');
  var waText = document.getElementById('rechner-wa-text');
  var nick = document.getElementById('karte-nick');
  var WA = 'https://wa.me/41793597415?text=';

  function heute() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function tageImMonat(j, m) { return new Date(j, m + 1, 0).getDate(); }
  function format(dt) { return dt.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function lesen(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    if (!m) return null;
    var j = +m[1], mo = +m[2] - 1, t = +m[3];
    if (j < 1900 || mo < 0 || mo > 11 || t < 1 || t > tageImMonat(j, mo)) return null;
    return { j: j, m: mo, t: t };
  }
  /* 17. Geburtstag: gleicher Tag und Monat, Jahr + 17. Den 29. Februar gibt es dann nicht, also 28. Februar. */
  function geburtstag17(g) {
    var j = g.j + 17;
    return new Date(j, g.m, Math.min(g.t, tageImMonat(j, g.m)));
  }
  /* Theorieprüfung: gleicher Tag einen Monat früher, sonst der letzte Tag dieses Monats */
  function einenMonatFrueher(dt) {
    var j = dt.getFullYear(), m = dt.getMonth() - 1;
    if (m < 0) { m = 11; j -= 1; }
    return new Date(j, m, Math.min(dt.getDate(), tageImMonat(j, m)));
  }

  var karteWerte = {};
  function setzeWert(feld, text, platzhalter) {
    var box = document.querySelector('.kf[data-feld="' + feld + '"]');
    if (!box) return;
    var el = box.querySelector('.wert');
    var linie = box.querySelector('.linie');
    if (karteWerte[feld] === text) return;
    karteWerte[feld] = text;
    var tauschen = function () { el.textContent = text; el.classList.toggle('ist-platzhalter', !!platzhalter); };
    if (!kannAnimieren) { tauschen(); return; }
    var raus = anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
    var rein = function () {
      tauschen();
      if (raus) raus.cancel();
      anim(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
    };
    if (raus) raus.onfinish = rein; else rein();
    anim(linie, [
      { transform: 'scaleX(0)', opacity: 1 },
      { transform: 'scaleX(1)', opacity: 1, offset: 0.6 },
      { transform: 'scaleX(1)', opacity: 0 }
    ], { duration: 800, easing: 'ease-out' });
  }
  var letztesNicken = 0;
  function nicken() {
    var jetzt = Date.now();
    if (jetzt - letztesNicken < 450) return;
    letztesNicken = jetzt;
    anim(nick, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-4deg)' }, { transform: 'rotateX(0deg)' }], { duration: 420, easing: 'ease-in-out' });
  }

  function zeile(dt, dd, klasse) {
    return '<div' + (klasse ? ' class="' + klasse + '"' : '') + '><dt>' + dt + '</dt><dd>' + dd + '</dd></div>';
  }
  function zeigeAusgabe(html) {
    ausgabe.innerHTML = html;
    if (!kannAnimieren) return;
    var teile = ausgabe.querySelectorAll('dl > div, .meldung');
    for (var i = 0; i < teile.length; i++) {
      anim(teile[i], [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 80, easing: EASE, fill: 'backwards' });
    }
  }
  function setzeWa(text, knopf) {
    if (waKnopf) waKnopf.href = WA + encodeURIComponent(text);
    if (waText) waText.textContent = knopf;
  }

  var letzterTag = null;
  function rechnen(ausDatum) {
    var name = (vorname.value || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    setzeWert('fuer', name || 'dich', !name);
    var g = lesen(geburt.value);
    var schluessel = g ? geburt.value : '';
    if (!ausDatum) return;
    if (schluessel === letzterTag) return;
    letzterTag = schluessel;
    nicken();

    if (!g) {
      setzeWert('tag', '17. Geburtstag', true);
      setzeWert('theorie', '1 Monat vorher', true);
      zeigeAusgabe('<p class="ausgabe-leer">Gib dein Geburtsdatum ein. Dann siehst du, wann du die Theorieprüfung machen kannst und welcher Tag dein Geschenktag ist.</p>');
      setzeWa('Hallo Peter, ich möchte meine 1. Fahrstunde an meinem 17. Geburtstag reservieren.', 'Geschenktag per WhatsApp reservieren');
      return;
    }

    var h = heute();
    var geb = new Date(g.j, g.m, g.t);
    if (geb > h) {
      setzeWert('tag', '17. Geburtstag', true);
      setzeWert('theorie', '1 Monat vorher', true);
      zeigeAusgabe('<p class="meldung">Dieses Datum liegt in der Zukunft. Bitte prüfe dein Geburtsdatum.</p>');
      setzeWa('Hallo Peter, ich möchte meine 1. Fahrstunde an meinem 17. Geburtstag reservieren.', 'Geschenktag per WhatsApp reservieren');
      return;
    }

    var tag17 = geburtstag17(g);
    var theorie = einenMonatFrueher(tag17);

    if (tag17 < h) {
      setzeWert('tag', '17. Geburtstag', true);
      setzeWert('theorie', '1 Monat vorher', true);
      zeigeAusgabe('<dl>' + zeile('Dein 17. Geburtstag', format(tag17)) + '</dl><p class="meldung">Dein 17. Geburtstag ist schon vorbei. Melde dich trotzdem, ich plane gerne mit dir.</p>');
      setzeWa('Hallo Peter, ich möchte gerne Fahrstunden bei dir nehmen.', 'Per WhatsApp melden');
      return;
    }

    var tage = Math.round((tag17 - h) / 86400000);
    var theorieText = theorie <= h ? 'jetzt möglich' : format(theorie);
    setzeWert('tag', format(tag17), false);
    setzeWert('theorie', theorie <= h ? 'jetzt möglich' : format(theorie), false);
    var bisDann = tage === 0 ? 'heute, herzlichen Glückwunsch!' : (tage === 1 ? 'morgen' : 'noch ' + tage + ' Tage');
    zeigeAusgabe('<dl>' +
      zeile('Theorieprüfung frühestens', theorieText) +
      zeile('Geschenkte 1. Fahrstunde', format(tag17), 'gold') +
      zeile('Bis dahin', bisDann) +
      '</dl>');
    if (tage === 0) setzeWa('Hallo Peter, ich werde heute 17 und möchte meine geschenkte 1. Fahrstunde reservieren.', 'Heute per WhatsApp reservieren');
    else setzeWa('Hallo Peter, ich werde am ' + format(tag17) + ' 17 und möchte an diesem Tag meine geschenkte 1. Fahrstunde reservieren.', 'Diesen Tag per WhatsApp reservieren');
  }

  if (vorname && geburt && ausgabe) {
    var h0 = heute();
    geburt.max = h0.getFullYear() + '-' + ('0' + (h0.getMonth() + 1)).slice(-2) + '-' + ('0' + h0.getDate()).slice(-2);
    var namenTimer;
    vorname.addEventListener('input', function () {
      clearTimeout(namenTimer);
      namenTimer = setTimeout(function () { rechnen(false); nicken(); }, 280);
    });
    geburt.addEventListener('change', function () { rechnen(true); });
    geburt.addEventListener('input', function () { rechnen(true); });
    /* Anfangszustand der Karte merken */
    karteWerte = { fuer: 'dich', tag: '17. Geburtstag', theorie: '1 Monat vorher' };
    [].forEach.call(document.querySelectorAll('.kf .wert'), function (w) { w.classList.add('ist-platzhalter'); });
    if (geburt.value || vorname.value) { letzterTag = null; rechnen(true); }
  }

  /* Karte: leichte Neigung mit der Maus (nur Maus, nur mit Bewegung) */
  var buehne = document.getElementById('karte-buehne');
  var tilt = document.getElementById('karte-tilt');
  var feinerZeiger = false;
  try { feinerZeiger = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  if (buehne && tilt && fx && feinerZeiger) {
    var raf = 0;
    buehne.addEventListener('pointermove', function (e) {
      var r = tilt.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      x = Math.max(-0.6, Math.min(0.6, x)); y = Math.max(-0.6, Math.min(0.6, y));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        tilt.style.setProperty('--ty', (x * 9).toFixed(2) + 'deg');
        tilt.style.setProperty('--tx', (-y * 9).toFixed(2) + 'deg');
      });
    });
    buehne.addEventListener('pointerleave', function () {
      cancelAnimationFrame(raf);
      tilt.style.setProperty('--tx', '0deg');
      tilt.style.setProperty('--ty', '0deg');
    });
  }

  /* Aktionsleiste mobil erst zeigen, wenn die Knöpfe im Startbild nach oben weggescrollt sind */
  var leiste = document.getElementById('leiste');
  var heroCta = document.getElementById('hero-cta');
  if (leiste && heroCta) {
    var leisteRaf = 0;
    var leistePruefen = function () {
      leisteRaf = 0;
      leiste.classList.toggle('ist-versteckt', heroCta.getBoundingClientRect().bottom > 0);
    };
    window.addEventListener('scroll', function () { if (!leisteRaf) leisteRaf = requestAnimationFrame(leistePruefen); }, { passive: true });
    window.addEventListener('resize', leistePruefen);
    leistePruefen();
  }

  /* ---------- VKU-Schalter ---------- */
  var vku = document.getElementById('vku');
  if (vku) {
    var knoepfe = [].slice.call(vku.querySelectorAll('.schalter button'));
    var chips = [].slice.call(vku.querySelectorAll('.chip'));
    knoepfe.forEach(function (b) {
      b.addEventListener('click', function () {
        var jahr = b.getAttribute('data-jahr');
        if (vku.getAttribute('data-jahr') === jahr) return;
        var vorher = chips.map(function (c) { return c.getBoundingClientRect(); });
        vku.setAttribute('data-jahr', jahr);
        knoepfe.forEach(function (k) { k.setAttribute('aria-pressed', String(k === b)); });
        chips.forEach(function (c, i) {
          var nachher = c.getBoundingClientRect();
          var dx = vorher[i].left - nachher.left;
          if (dx) anim(c, [{ transform: 'translateX(' + dx + 'px)' }, { transform: 'none' }], { duration: 650, easing: EASE });
        });
        anim(vku.querySelector('.panel[data-panel="' + jahr + '"]'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
        anim(vku.querySelector('.z-' + jahr), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
      });
    });
  }
})();
