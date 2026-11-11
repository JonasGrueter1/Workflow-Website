/* Niederberger Elektro AG, Design A: Menü, Reiter, Bürostatus, Einblendungen, Aktionsleiste */
(function () {
  'use strict';
  window.neA = true;

  var html = document.documentElement;
  var fx = html.classList.contains('fx');

  /* Fertige Animationen entfernen: Der Endzustand entspricht dem Normalzustand, so bleibt nichts hängen */
  document.addEventListener('animationend', function (e) {
    if (e.target && e.target.classList) e.target.classList.add('anim-fertig');
  });

  /* Kopf: Linie und Schatten nach dem ersten Scrollen */
  var kopf = document.getElementById('kopf');
  var onScroll = function () {
    kopf.classList.toggle('ist-gescrollt', window.scrollY > 8);
    if (window.scrollY < 300) document.querySelectorAll('.nav a.ist-aktiv').forEach(function (a) { a.classList.remove('ist-aktiv'); });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Sanftes Scrollen zu Ankern (nur mit Animationen) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = document.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Menü mobil */
  var menuBtn = document.querySelector('.kopf-menu');
  var menu = document.getElementById('menu');
  var setMenu = function (offen) {
    menuBtn.setAttribute('aria-expanded', String(offen));
    menu.hidden = !offen;
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1100) setMenu(false); });

  /* Reiter: Elektro, Telefon, Netzwerk */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.reiter-knopf'));
  var panels = document.getElementById('panels');
  var waehle = function (tab, fokus) {
    tabs.forEach(function (t) {
      var aktiv = t === tab;
      t.setAttribute('aria-selected', String(aktiv));
      t.tabIndex = aktiv ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls'));
      p.hidden = !aktiv;
      if (aktiv) {
        p.classList.remove('ist-neu', 'anim-fertig');
        void p.offsetWidth;
        p.classList.add('ist-neu');
      }
    });
    if (fokus) tab.focus();
  };
  /* Feste Mindesthöhe ab Tablet, damit beim Wechsel nichts springt */
  var hoeheSetzen = function () {
    if (window.innerWidth < 900) { panels.style.minHeight = ''; return; }
    var max = 0;
    tabs.forEach(function (t) {
      var p = document.getElementById(t.getAttribute('aria-controls'));
      var war = p.hidden;
      p.hidden = false;
      max = Math.max(max, p.offsetHeight);
      p.hidden = war;
    });
    panels.style.minHeight = max + 'px';
  };
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { waehle(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); waehle(n, true); }
      });
    });
    tabs.forEach(function (t) { document.getElementById(t.getAttribute('aria-controls')).hidden = t.getAttribute('aria-selected') !== 'true'; });
    hoeheSetzen();
    window.addEventListener('resize', hoeheSetzen);
    window.addEventListener('load', hoeheSetzen);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(hoeheSetzen);
  }

  /* Bürozeiten mit Status (Zeit in Zürich): Mo bis Fr 07.15 bis 12.00 und 13.15 bis 17.00 */
  var zeiten = [[435, 720], [795, 1020]];
  var tageName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var hhmm = function (min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + '.' + (m < 10 ? '0' : '') + m; };
  var jetztZuerich = function () {
    try {
      var teile = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {};
      teile.forEach(function (t) { o[t.type] = t.value; });
      var tag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      if (tag < 0) return null;
      return { tag: tag, min: parseInt(o.hour, 10) % 24 * 60 + parseInt(o.minute, 10) };
    } catch (e) { return null; }
  };
  var status = function () {
    var j = jetztZuerich();
    if (!j) return null;
    var werktag = j.tag >= 1 && j.tag <= 5;
    if (werktag) {
      for (var k = 0; k < zeiten.length; k++) {
        if (j.min >= zeiten[k][0] && j.min < zeiten[k][1]) return { offen: true, text: 'Jetzt geöffnet, bis ' + hhmm(zeiten[k][1]) + ' Uhr' };
      }
      for (var z = 0; z < zeiten.length; z++) {
        if (j.min < zeiten[z][0]) return { offen: false, text: 'Jetzt geschlossen, wieder offen um ' + hhmm(zeiten[z][0]) + ' Uhr' };
      }
    }
    var naechster = j.tag;
    do { naechster = (naechster + 1) % 7; } while (naechster === 0 || naechster === 6);
    var wann = (naechster === (j.tag + 1) % 7) ? 'morgen' : 'am ' + tageName[naechster];
    return { offen: false, text: 'Jetzt geschlossen, wieder offen ' + wann + ' um 07.15 Uhr' };
  };
  var statusZeigen = function () {
    var s = status();
    document.querySelectorAll('[data-status]').forEach(function (el) {
      if (!s) { el.hidden = true; return; }
      var text = s.text;
      if (el.classList.contains('status-klein')) text = s.offen ? 'Büro jetzt geöffnet' : 'Büro geschlossen, Notfall rund um die Uhr';
      el.querySelector('.status-text').textContent = text;
      el.classList.toggle('ist-zu', !s.offen);
      el.hidden = false;
    });
  };
  statusZeigen();
  setInterval(statusZeigen, 60000);

  /* Aktionsleiste mobil: erscheint, sobald die Hero-Knöpfe aus dem Bild sind */
  var aktion = document.getElementById('aktion');
  var heroCta = document.getElementById('hero-cta');
  if (aktion && heroCta) {
    var aktionWartet = false;
    var aktionSetzen = function () {
      aktionWartet = false;
      aktion.classList.toggle('ist-da', heroCta.getBoundingClientRect().bottom < 0);
    };
    aktionSetzen();
    window.addEventListener('scroll', function () {
      if (!aktionWartet) { aktionWartet = true; requestAnimationFrame(aktionSetzen); }
    }, { passive: true });
    window.addEventListener('resize', aktionSetzen);
  } else if (aktion) {
    aktion.classList.add('ist-da');
  }

  /* Aktiver Menüpunkt beim Scrollen */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var abschnitte = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    abschnitte.forEach(function (s) { navIo.observe(s); });
  }

  /* Einblenden beim Scrollen */
  var alle = document.querySelectorAll('[data-reveal], #team-raster, #zeit');
  var zeige = function (el) {
    if (el.id === 'zeit') el.classList.add('laeuft');
    else el.classList.add('ist-sichtbar');
  };
  if (!fx || !('IntersectionObserver' in window)) {
    alle.forEach(zeige);
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { zeige(en.target); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  alle.forEach(function (el) { io.observe(el); });
})();
