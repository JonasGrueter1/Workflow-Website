/* Hug Elektromaschinenbau AG, Design A: Menü, Einblenden, Zähler, Reiter, Zeitstrahl */
(function () {
  'use strict';
  window.hugA = true;
  var d = document, root = d.documentElement;
  var fx = root.classList.contains('fx');
  var hasIO = 'IntersectionObserver' in window;

  /* Menü am Handy */
  var knopf = d.querySelector('.menu-knopf');
  var menu = d.getElementById('menu');
  function menuZu() {
    if (!menu.classList.contains('offen')) return;
    menu.classList.remove('offen');
    knopf.setAttribute('aria-expanded', 'false');
  }
  if (knopf && menu) {
    knopf.addEventListener('click', function () {
      var offen = menu.classList.toggle('offen');
      knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menuZu(); } });
    d.addEventListener('click', function (e) { if (!e.target.closest('.kopf')) menuZu(); });
  }

  /* Weiches Scrollen nur bei Klicks auf Sprungmarken (nicht global, damit Scrollen per Skript sofort springt) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = d.getElementById(id.slice(1));
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Aktiver Menüpunkt */
  var links = [].slice.call(d.querySelectorAll('.menu a[href^="#"]'));
  if (hasIO && links.length) {
    var ziele = links.map(function (a) { return d.querySelector(a.getAttribute('href')); }).filter(Boolean);
    /* Hero mitbeobachten: oben ist kein Menüpunkt aktiv */
    var heroZiel = d.getElementById('top');
    if (heroZiel) ziele.push(heroZiel);
    var ioMenu = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ziele.forEach(function (z) { ioMenu.observe(z); });
  }

  /* Einblenden beim Scrollen */
  var reveal = [].slice.call(d.querySelectorAll('[data-reveal], [data-blatt]'));
  if (!fx || !hasIO) {
    reveal.forEach(function (el) { el.classList.add('ist-da'); });
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach(function (el) { io.observe(el); });
  }

  /* Motorschnitt zeichnen, sobald er sichtbar ist */
  var zeichnung = d.querySelector('.hero-zeichnung');
  if (zeichnung) {
    if (!fx || !hasIO) zeichnung.classList.add('laeuft');
    else {
      var ioM = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { zeichnung.classList.add('laeuft'); ioM.disconnect(); }
      }, { threshold: 0.25 });
      ioM.observe(zeichnung);
    }
  }

  /* Zähler: nur Mengen, keine Jahreszahlen */
  function format(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’'); }
  var zaehler = [].slice.call(d.querySelectorAll('[data-zaehlen]'));
  if (fx && hasIO && zaehler.length) {
    var ioZ = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        ioZ.unobserve(e.target);
        var el = e.target, ziel = parseInt(el.getAttribute('data-zaehlen'), 10), t0 = null, dauer = 950;
        el.style.minWidth = el.offsetWidth + 'px';
        function schritt(t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / dauer);
          var w = 1 - Math.pow(1 - k, 3);
          el.textContent = format(Math.round(ziel * w));
          if (k < 1) requestAnimationFrame(schritt); else el.textContent = format(ziel);
        }
        el.textContent = '0';
        requestAnimationFrame(schritt);
      });
    }, { threshold: 0.6 });
    zaehler.forEach(function (el) { ioZ.observe(el); });
  }

  /* Reiter Referenzteile */
  var tabs = [].slice.call(d.querySelectorAll('.reiter [role="tab"]'));
  var balken = d.querySelector('.reiter-balken');
  function balkenSetzen() {
    var aktiv = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    if (!aktiv || !balken) return;
    balken.style.width = aktiv.offsetWidth + 'px';
    balken.style.transform = 'translateX(' + aktiv.offsetLeft + 'px)';
  }
  function waehle(tab, fokus) {
    tabs.forEach(function (t) {
      var an = t === tab;
      t.setAttribute('aria-selected', an ? 'true' : 'false');
      t.tabIndex = an ? 0 : -1;
      var panel = d.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      if (an) {
        panel.hidden = false;
        panel.classList.add('ist-da');
        if (fx) { panel.classList.remove('wechsel'); void panel.offsetWidth; panel.classList.add('wechsel'); }
      } else {
        panel.hidden = true;
      }
    });
    if (fokus) tab.focus();
    balkenSetzen();
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      var panel = d.getElementById(t.getAttribute('aria-controls'));
      if (panel && i > 0) panel.hidden = true;
      t.addEventListener('click', function () { waehle(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === 'Home') n = tabs[0];
        else if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); waehle(n, true); }
      });
    });
    balkenSetzen();
    window.addEventListener('resize', balkenSetzen, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(balkenSetzen);
  }

  /* Dateifeld: gewählten Dateinamen zeigen */
  var datei = d.querySelector('.datei-wahl input[type="file"]');
  if (datei) {
    datei.addEventListener('change', function () {
      var name = d.querySelector('.datei-name');
      if (!name) return;
      name.textContent = datei.files && datei.files.length ? datei.files[0].name : name.getAttribute('data-leer');
    });
  }

  /* Gemeinsamer rAF-Takt für Scroll: Aktionsleiste und Zeitstrahl */
  var aktion = d.getElementById('aktion');
  var heroCta = d.getElementById('hero-cta');
  var strahl = d.querySelector('[data-strahl]');
  var liste = strahl ? strahl.querySelector('.strahl-liste') : null;
  var punkte = liste ? [].slice.call(liste.children) : [];
  var strahlSichtbar = !hasIO;
  var geplant = false;

  function strahlRechnen() {
    if (!liste) return;
    var vh = window.innerHeight;
    var r = liste.getBoundingClientRect();
    var senkrecht = getComputedStyle(liste).display === 'block';
    var p;
    if (senkrecht) {
      p = (vh * 0.62 - r.top) / Math.max(1, r.height);
    } else {
      p = (vh * 0.88 - r.top) / (vh * 0.55);
    }
    p = Math.max(0, Math.min(1, p));
    liste.style.setProperty('--p', p.toFixed(4));
    punkte.forEach(function (li) {
      var lr = li.getBoundingClientRect();
      var pos = senkrecht ? (lr.top + 8 - r.top) / Math.max(1, r.height) : (lr.left - r.left) / Math.max(1, r.width);
      li.classList.toggle('an', pos <= p + 0.001);
    });
  }

  function takt() {
    geplant = false;
    if (aktion && heroCta) {
      var rc = heroCta.getBoundingClientRect();
      aktion.classList.toggle('ist-da', rc.bottom < 0);
    }
    if (fx && strahlSichtbar) strahlRechnen();
  }
  function planen() { if (!geplant) { geplant = true; requestAnimationFrame(takt); } }

  if (fx && liste && hasIO) {
    new IntersectionObserver(function (e) {
      strahlSichtbar = e[0].isIntersecting;
      if (strahlSichtbar) planen();
    }, { rootMargin: '10% 0px 10% 0px' }).observe(liste);
  }
  if (!fx && liste) { punkte.forEach(function (li) { li.classList.add('an'); }); }

  window.addEventListener('scroll', planen, { passive: true });
  window.addEventListener('resize', planen, { passive: true });
  planen();
})();
