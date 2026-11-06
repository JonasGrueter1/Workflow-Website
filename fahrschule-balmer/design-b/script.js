/* Fahrschule Balmer, Design B «Performance Drive»: Kopf, Einblenden, Paket-Wähler, Kundenstimmen */
(function () {
  'use strict';
  window.balmerB = true;
  var root = document.documentElement;
  var fx = function () { return root.classList.contains('fx'); };

  /* Kopf: Hintergrund ab 40 px Scrollweg */
  var kopf = document.querySelector('[data-kopf]');
  var parallax = document.querySelector('[data-parallax]');
  var hero = document.querySelector('.hero');
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      if (kopf) kopf.classList.toggle('ist-fest', y > 40);
      if (parallax && fx() && hero && y < hero.offsetHeight) {
        parallax.style.transform = 'translate3d(0,' + (y * 0.07).toFixed(1) + 'px,0)';
      }
      tick = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Reihenfolge für gestaffelte Animationen */
  document.querySelectorAll('[data-reihe]').forEach(function (liste) {
    Array.prototype.forEach.call(liste.children, function (el, i) { el.style.setProperty('--i', i); });
  });

  /* Einblenden beim Scrollen */
  var reveal = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && fx()) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add('ist-da'); });
  }

  /* Paket-Wähler (ARIA-Tabs) mit rollender Zahl */
  var waehler = document.querySelector('[data-waehler]');
  if (waehler) {
    var tabs = Array.prototype.slice.call(waehler.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var zahl = waehler.querySelector('.anz-zahl');
    var panelBox = waehler.querySelector('.panels');
    var aktiv = 0;

    var setzeMarker = function (i) {
      waehler.style.setProperty('--tab', i);
      waehler.style.setProperty('--tab-x', i % 2);
      waehler.style.setProperty('--tab-y', Math.floor(i / 2));
      waehler.setAttribute('data-aktiv', tabs[i].id === 'tab-special' ? 'special' : 'normal');
    };
    var setzeZahl = function (wert) {
      var alt = zahl.querySelector('.anz-wert:not(.raus)');
      if (!alt || alt.textContent === wert) return;
      if (!fx()) { alt.textContent = wert; return; }
      var neu = document.createElement('span');
      neu.className = 'anz-wert rein';
      neu.textContent = wert;
      zahl.appendChild(neu);
      alt.classList.add('raus');
      neu.getBoundingClientRect();
      requestAnimationFrame(function () { neu.classList.remove('rein'); });
      setTimeout(function () { if (alt.parentNode) alt.parentNode.removeChild(alt); }, 450);
    };
    var hoehe = function () {
      var max = 0;
      panelBox.style.minHeight = '';
      panels.forEach(function (p) {
        var war = p.hidden;
        p.hidden = false;
        max = Math.max(max, p.offsetHeight);
        p.hidden = war;
      });
      panelBox.style.minHeight = max + 'px';
    };
    var waehle = function (i, fokus) {
      if (i === aktiv && !fokus) return;
      tabs.forEach(function (t, k) {
        var an = k === i;
        t.setAttribute('aria-selected', an ? 'true' : 'false');
        t.tabIndex = an ? 0 : -1;
        panels[k].hidden = !an;
        panels[k].classList.remove('rein');
      });
      if (i !== aktiv && fx()) { panels[i].getBoundingClientRect(); panels[i].classList.add('rein'); }
      aktiv = i;
      setzeMarker(i);
      setzeZahl(tabs[i].getAttribute('data-wert'));
      if (fokus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      panels[i].hidden = i !== 0;
      t.addEventListener('click', function () { waehle(i); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); waehle(n, true); }
      });
    });
    setzeMarker(0);
    hoehe();
    window.addEventListener('resize', hoehe);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(hoehe);
  }

  /* Kundenstimmen: eine grosse Stimme, Pfeile, Punkte, Wischen */
  var buehne = document.querySelector('[data-stimmen]');
  if (buehne) {
    var stimmen = Array.prototype.slice.call(buehne.querySelectorAll('.stimme'));
    var liste = buehne.querySelector('.st-liste');
    var punkte = Array.prototype.slice.call(buehne.querySelectorAll('.st-punkt'));
    var akt = document.querySelector('.st-akt');
    var idx = 0;
    var stHoehe = function () {
      var max = 0;
      liste.style.minHeight = '';
      stimmen.forEach(function (s) {
        var war = s.hidden;
        s.hidden = false;
        max = Math.max(max, s.offsetHeight);
        s.hidden = war;
      });
      liste.style.minHeight = max + 'px';
    };
    var zeige = function (n, richtung) {
      n = (n + stimmen.length) % stimmen.length;
      if (n === idx) return;
      stimmen[idx].hidden = true;
      stimmen[idx].classList.remove('rein-1', 'rein--1');
      stimmen[n].hidden = false;
      if (fx()) { stimmen[n].getBoundingClientRect(); stimmen[n].classList.add(richtung < 0 ? 'rein--1' : 'rein-1'); }
      idx = n;
      punkte.forEach(function (p, k) { p.setAttribute('aria-current', k === n ? 'true' : 'false'); });
      if (akt) akt.textContent = ('0' + (n + 1)).slice(-2);
    };
    stimmen.forEach(function (s, i) { s.hidden = i !== 0; });
    punkte.forEach(function (p, k) {
      p.setAttribute('aria-current', k === 0 ? 'true' : 'false');
      p.addEventListener('click', function () { zeige(k, k < idx ? -1 : 1); });
    });
    document.querySelectorAll('[data-st]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = parseInt(b.getAttribute('data-st'), 10);
        zeige(idx + d, d);
      });
    });
    var startX = null, startY = null;
    buehne.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    buehne.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) zeige(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      startX = null;
    }, { passive: true });
    stHoehe();
    window.addEventListener('resize', stHoehe);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stHoehe);
  }
})();
