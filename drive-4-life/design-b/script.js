/* Drive 4 Life, Design B: Kopf, Einblenden, Kapitel-Stapel, Preise, Menü, Aktionsleiste */
(function () {
  'use strict';
  window.__d4lBereit = true;

  var d = document;
  var html = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var breit = window.matchMedia('(min-width: 900px)');

  /* Kopf wird beim Scrollen dunkel */
  var kopf = d.querySelector('.kopf');
  function kopfStand() { kopf.classList.toggle('is-solid', window.scrollY > 40); }

  /* Einblenden beim Scrollen, nur einmal. Geprüft wird die Lage im Fenster, damit auch
     schnelles Scrollen (oder ein Sprung über einen Anker) nichts unsichtbar zurücklässt. */
  var offen = [].slice.call(d.querySelectorAll('[data-reveal], .kapitel'));
  [].forEach.call(d.querySelectorAll('.preis-liste'), function (ul) {
    [].forEach.call(ul.children, function (li, i) { li.style.setProperty('--n', i); });
  });
  function einblenden() {
    if (!offen.length) return;
    var vh = window.innerHeight;
    offen = offen.filter(function (el) {
      var grenze = el.classList.contains('kapitel') ? vh * 0.55 : vh * 0.9;
      if (el.getBoundingClientRect().top < grenze) { el.classList.add('is-in'); return false; }
      return true;
    });
  }
  if (reduce.matches) { offen.forEach(function (el) { el.classList.add('is-in'); }); offen = []; }

  /* Kapitel-Stapel: das nächste Bild schiebt sich über das vorige, das vorige dunkelt ab */
  var kapitel = [].slice.call(d.querySelectorAll('.kapitel'));
  var laeuft = false;
  function stapel() {
    if (!desktop.matches || reduce.matches) {
      kapitel.forEach(function (k) { k.style.removeProperty('--decke'); });
      return;
    }
    var vh = window.innerHeight;
    for (var i = 0; i < kapitel.length - 1; i++) {
      var oben = kapitel[i + 1].getBoundingClientRect().top;
      var p = 1 - Math.min(Math.max(oben / vh, 0), 1);
      kapitel[i].style.setProperty('--decke', p.toFixed(3));
    }
  }

  /* Aktionsleiste Handy erst nach dem Hero */
  var heroCta = d.querySelector('.hero-cta');
  var kontakt = d.querySelector('.kontakt-cta');
  var heroWeg = false, kontaktDa = false;
  function leiste() { html.classList.toggle('aktion-an', heroWeg && !kontaktDa); }
  if ('IntersectionObserver' in window && heroCta) {
    new IntersectionObserver(function (e) {
      heroWeg = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; leiste();
    }).observe(heroCta);
    if (kontakt) new IntersectionObserver(function (e) { kontaktDa = e[0].isIntersecting; leiste(); }).observe(kontakt);
  } else {
    html.classList.add('aktion-an');
  }

  function bild() { laeuft = false; einblenden(); stapel(); }
  function beimScrollen() {
    kopfStand();
    if (!laeuft) { laeuft = true; window.requestAnimationFrame(bild); }
  }
  window.addEventListener('scroll', beimScrollen, { passive: true });
  window.addEventListener('resize', beimScrollen);
  kopfStand(); einblenden(); stapel();
  window.addEventListener('load', einblenden);

  /* Preise: Desktop alle Spalten offen, Handy als Akkordeon */
  var gruppen = [].slice.call(d.querySelectorAll('.preis-gruppe'));
  function preise() {
    gruppen.forEach(function (g, i) {
      if (breit.matches) g.open = true;
      else if (!g.hasAttribute('data-angefasst')) g.open = i === 0;
    });
  }
  gruppen.forEach(function (g) {
    var s = g.querySelector('summary');
    s.addEventListener('click', function (e) {
      if (breit.matches) { e.preventDefault(); return; }
      g.setAttribute('data-angefasst', '');
    });
  });
  if (breit.addEventListener) breit.addEventListener('change', preise);
  preise();

  /* Sanftes Scrollen nur bei Klicks auf Anker (nicht bei scrollTo) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id ? d.getElementById(id) : null;
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Menü */
  var knopf = d.querySelector('.menu-btn');
  var menu = d.getElementById('menu');
  function menuSetzen(offen) {
    menu.hidden = !offen;
    knopf.setAttribute('aria-expanded', String(offen));
    knopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
    html.classList.toggle('menu-offen', offen);
    d.body.style.overflow = offen ? 'hidden' : '';
    if (offen) { var a = menu.querySelector('a'); if (a) a.focus(); }
  }
  if (knopf && menu) {
    knopf.addEventListener('click', function () { menuSetzen(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuSetzen(false); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { menuSetzen(false); knopf.focus(); }
    });
    desktop.addEventListener && desktop.addEventListener('change', function () { if (!menu.hidden) menuSetzen(false); });
  }
})();
