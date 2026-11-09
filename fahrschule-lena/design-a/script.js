/* Fahrschule Lena, Design A "Fahrbahn" */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.querySelector('.top');
  var hero = document.querySelector('.hero');
  var heroLogo = document.querySelector('.hero-logo');

  /* Kopfzeile, Fahrbahn-Mittellinie und Fortschritt */
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    root.style.setProperty('--p', p.toFixed(4));
    if (!reduce) root.style.setProperty('--y', (y * 0.5).toFixed(1) + 'px');
    top.classList.toggle('is-scrolled', y > 8);
    var logoBottom = heroLogo ? heroLogo.getBoundingClientRect().bottom : 0;
    top.classList.toggle('is-past', logoBottom < 70);
    root.classList.toggle('nach-hero', hero ? y > hero.offsetHeight * 0.6 : y > 300);
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* Aktiver Abschnitt in der Navigation */
  var navLinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = map[e.target.id];
        if (!link) return;
        if (e.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('is-aktiv'); });
          link.classList.add('is-aktiv');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  /* Menü auf kleinen Bildschirmen */
  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    nav.classList.toggle('is-open', open);
    top.classList.toggle('menu-offen', open);
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
  }

  /* Slogan-Wechsel im Hero */
  var slogans = [].slice.call(document.querySelectorAll('.slogan'));
  if (slogans.length > 1 && !reduce) {
    var idx = 0;
    setInterval(function () {
      if (document.hidden) return;
      slogans[idx].classList.remove('is-on');
      idx = (idx + 1) % slogans.length;
      slogans[idx].classList.add('is-on');
    }, 3600);
  }

  /* Einblenden beim Scrollen (über die Scrollposition, damit auch schnelles Springen nichts verpasst) */
  var pending = [].slice.call(document.querySelectorAll('.rv'));
  if (reduce) {
    pending.forEach(function (el) { el.classList.add('is-in'); });
    pending = [];
  } else {
    pending.forEach(function (el) {
      var sibs = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains('rv'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i * 0.08, 0.4) + 's');
    });
  }
  function reveal() {
    if (!pending.length) return;
    var limit = window.innerHeight * 0.94;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) { el.classList.add('is-in'); return false; }
      return true;
    });
  }
  window.addEventListener('scroll', function () { window.requestAnimationFrame(reveal); }, { passive: true });
  window.addEventListener('resize', reveal);
  window.addEventListener('load', reveal);
  reveal();

  /* Weiche Sprünge zu den Abschnitten */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon') || a.classList.contains('skip')) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Nachricht vorbereiten: WhatsApp- und Mail-Link mit vorausgefülltem Text */
  var form = document.getElementById('planer');
  if (form) {
    var out = document.getElementById('p-text');
    var wa = document.getElementById('p-wa');
    var mail = document.getElementById('p-mail');
    var build = function () {
      var auto = (form.querySelector('input[name="auto"]:checked') || {}).value || '';
      var dauer = (form.querySelector('input[name="dauer"]:checked') || {}).value || '';
      var name = (form.querySelector('input[name="vorname"]').value || '').trim();
      var t = 'Hallo Milena, ich möchte gerne Fahrstunden bei dir nehmen.';
      if (auto) t += ' Am liebsten mit ' + auto + '.';
      if (dauer) t += ' Gerne Lektionen à ' + dauer + '.';
      if (name) t += ' Liebe Grüsse, ' + name;
      out.textContent = t;
      wa.href = 'https://wa.me/41786059339?text=' + encodeURIComponent(t);
      mail.href = 'mailto:lena@fahrschulelena.ch?subject=' + encodeURIComponent('Fahrstunden bei der Fahrschule Lena') + '&body=' + encodeURIComponent(t);
    };
    form.addEventListener('change', build);
    form.addEventListener('input', build);
    build();
  }
})();
