/* Reber Holzwerker, Design A: Kopf, Menü, Einblenden, Aktionsleiste, Ehrengabe-Bewegung */
(function () {
  'use strict';
  window.reberA = true;
  var d = document;
  var root = d.documentElement;
  var fx = root.classList.contains('fx');

  /* Kopf mit Schatten beim Scrollen, Aktionsleiste am Handy, Ehrengabe seitlich */
  var kopf = d.getElementById('kopf');
  var aktion = d.getElementById('aktion');
  var heroCta = d.getElementById('hero-cta');
  /* Wo der Kontaktbereich eigene Knöpfe zeigt, tritt die Aktionsleiste zurück */
  var kontaktCta = d.querySelector('.kontakt-cta');
  var ehRahmen = d.getElementById('eh-rahmen');
  var ehBild = ehRahmen ? ehRahmen.querySelector('img') : null;
  var gross = window.matchMedia('(min-width: 861px)');
  var parallax = false;

  function parallaxPruefen() {
    parallax = fx && gross.matches && !!ehBild;
    if (ehBild) {
      ehBild.classList.toggle('ist-parallax', parallax);
      if (!parallax) ehBild.style.removeProperty('--px');
    }
  }
  if (gross.addEventListener) gross.addEventListener('change', function () { parallaxPruefen(); onScroll(); });
  parallaxPruefen();

  var tick = false;
  function onScroll() {
    tick = false;
    var y = window.scrollY || window.pageYOffset || 0;
    if (kopf) kopf.classList.toggle('ist-unten', y > 8);
    if (aktion && heroCta) {
      var vhA = window.innerHeight || 800;
      var kontaktDa = false;
      if (kontaktCta) {
        var kr = kontaktCta.getBoundingClientRect();
        kontaktDa = kr.top < vhA && kr.bottom > 0;
      }
      aktion.classList.toggle('ist-da', heroCta.getBoundingClientRect().bottom < 0 && !kontaktDa);
    }
    if (parallax) {
      var r = ehRahmen.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      if (r.bottom > 0 && r.top < vh) {
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); /* -1 bis 1 */
        p = Math.max(-1, Math.min(1, p));
        ehBild.style.setProperty('--px', (p * 15).toFixed(1) + 'px');
      }
    }
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function () { if (!tick) { tick = true; window.requestAnimationFrame(onScroll); } });
  onScroll();

  /* Menü am Handy */
  var menuBtn = d.querySelector('.kopf-menu');
  var menu = d.getElementById('menu');
  function menuZu() {
    if (!menu || !menuBtn) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Menü öffnen');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      if (menuBtn.getAttribute('aria-expanded') === 'true') { menuZu(); return; }
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Menü schliessen');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menuZu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { menuZu(); menuBtn.focus(); } });
    d.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.kopf')) menuZu(); });
  }

  /* Sanftes Scrollen zu Ankern (nicht per CSS, damit Skripte und Tests sofort springen) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var ziel = d.querySelector(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: fx ? 'smooth' : 'auto', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Aktiver Menüpunkt */
  var navLinks = [].slice.call(d.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var navIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('ist-aktiv', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = d.querySelector(a.getAttribute('href')); if (s) navIo.observe(s); });
    var top = d.getElementById('top');
    if (top) navIo.observe(top);
  }

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(d.querySelectorAll('.rv, .rv-oeffnen, .rv-streifen'));
  if (!fx || !('IntersectionObserver' in window)) {
    ziele.forEach(function (el) { el.classList.add('ist-da'); });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('ist-da');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  ziele.forEach(function (el) { io.observe(el); });
})();
