/* NASA Fahrschule, Design B «Showroom» */
(function () {
  'use strict';
  window.nasaB = true;
  var d = document.documentElement;
  var reduziert = !d.classList.contains('fx');

  /* Hero-Auftritt */
  var hero = document.querySelector('.hero');
  var heroImg = hero && hero.querySelector('.hero-bild img');
  var losGelegt = false;
  function los() { if (losGelegt) return; losGelegt = true; requestAnimationFrame(function () { hero.classList.add('los'); }); }
  if (hero) {
    if (!heroImg || heroImg.complete) los();
    else { heroImg.addEventListener('load', los); heroImg.addEventListener('error', los); setTimeout(los, 700); }
  }

  /* Kopfzeile fest nach Scroll, Aktionsleiste nach dem Hero */
  var kopf = document.getElementById('kopf');
  var aktion = document.getElementById('aktion');
  var knoepfe = document.getElementById('hero-knoepfe');
  var tick = false;
  function scrollLage() {
    tick = false;
    var y = window.scrollY || window.pageYOffset;
    kopf.classList.toggle('fest', y > 40);
    if (aktion && knoepfe) {
      var unten = knoepfe.getBoundingClientRect().bottom;
      var fuss = document.querySelector('.fuss').getBoundingClientRect().top;
      aktion.classList.toggle('zeigen', unten < 0 && fuss > window.innerHeight - 40);
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(scrollLage); } }, { passive: true });
  scrollLage();

  /* Scroll-Reveal */
  var rv = [].slice.call(document.querySelectorAll('.rv, .probe'));
  if ('IntersectionObserver' in window && !reduziert) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('sichtbar'); });
  }

  /* Fahrzeug-Wähler (ARIA tabs) */
  var liste = document.querySelector('.reiter');
  if (liste) {
    var tabs = [].slice.call(liste.querySelectorAll('[role="tab"]'));
    var linie = liste.querySelector('.reiter-linie');
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

    function linieSetzen(tab) {
      if (!linie) return;
      linie.style.transform = 'translate3d(' + tab.offsetLeft + 'px,0,0) scaleX(' + (tab.offsetWidth / 100) + ')';
    }
    function waehlen(i, fokus) {
      tabs.forEach(function (t, j) {
        var an = i === j;
        t.setAttribute('aria-selected', an ? 'true' : 'false');
        t.tabIndex = an ? 0 : -1;
        var p = panels[j];
        if (an) {
          if (p.hidden) {
            p.classList.add('rein');
            p.hidden = false;
            void p.offsetWidth;
            requestAnimationFrame(function () { p.classList.remove('rein'); });
          }
        } else {
          p.hidden = true;
        }
      });
      linieSetzen(tabs[i]);
      if (fokus) tabs[i].focus();
      var wrap = liste.parentElement;
      if (wrap.scrollWidth > wrap.clientWidth) {
        var t = tabs[i];
        var ziel = t.offsetLeft - (wrap.clientWidth - t.offsetWidth) / 2;
        wrap.scrollTo({ left: ziel, behavior: reduziert ? 'auto' : 'smooth' });
      }
    }
    panels.forEach(function (p, j) { if (j > 0) p.hidden = true; });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { waehlen(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); waehlen(n, true); }
      });
    });
    linieSetzen(tabs[0]);
    window.addEventListener('resize', function () {
      var aktiv = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      if (aktiv) linieSetzen(aktiv);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { linieSetzen(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
  }

  /* Erreichbarkeit: Montag bis Samstag 06:00 bis 22:00 (Zeit Zürich) */
  var status = document.querySelector('[data-status]');
  if (status && window.Intl) {
    try {
      var teile = new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var wert = {};
      teile.forEach(function (p) { wert[p.type] = p.value; });
      var tag = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].indexOf(String(wert.weekday).replace('.', '').slice(0, 2));
      var min = parseInt(wert.hour, 10) * 60 + parseInt(wert.minute, 10);
      if (tag >= 0) {
        var offen = tag >= 1 && tag <= 6 && min >= 360 && min < 1320;
        var text;
        if (offen) text = 'Jetzt erreichbar, bis 22:00 Uhr';
        else if (tag >= 1 && tag <= 6 && min < 360) text = 'Wieder erreichbar ab 06:00 Uhr';
        else if (tag >= 1 && tag <= 5) text = 'Wieder erreichbar morgen ab 06:00 Uhr';
        else text = 'Wieder erreichbar am Montag ab 06:00 Uhr';
        status.classList.toggle('offen', offen);
        status.querySelector('.status-text').textContent = text;
      }
    } catch (e) {}
  }
})();
