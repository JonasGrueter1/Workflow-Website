/* Fahrschule Zberg, Design A «Lernheft»: Einblenden, Heftlinien, Hefte öffnen, Registerreiter, Parallaxe */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Linierte Blätter: Linien als einzelne Striche, die sich von links ziehen */
  var blaetter = [].slice.call(d.querySelectorAll('[data-linien]'));
  function zeichneLinien(el) {
    var box = el.querySelector(':scope > .linien');
    if (!box) {
      box = d.createElement('span');
      box.className = 'linien';
      box.setAttribute('aria-hidden', 'true');
      el.insertBefore(box, el.firstChild);
    }
    var zeile = 32;
    var start = parseFloat(getComputedStyle(el).getPropertyValue('--l0')) || 0;
    var h = el.offsetHeight;
    var html = '';
    var n = 0;
    for (var y = zeile - 1 + start; y < h - 6; y += zeile) {
      html += '<i style="top:' + y + 'px;--n:' + n + '"></i>';
      n++;
    }
    box.innerHTML = html;
  }
  blaetter.forEach(zeichneLinien);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { blaetter.forEach(zeichneLinien); });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { blaetter.forEach(zeichneLinien); }, 150);
  });

  /* Einblenden beim Scrollen */
  var ziele = [].slice.call(d.querySelectorAll('[data-reveal], [data-linien]'));
  var offen = ziele.slice();
  function nachholen() {
    // alles, was schon oberhalb des Bildschirmrands liegt, sicher zeigen (auch nach schnellen Sprüngen)
    if (!offen.length) return;
    var grenze = window.innerHeight * 0.94;
    offen = offen.filter(function (el) {
      if (el.classList.contains('is-in')) return false;
      if (el.getBoundingClientRect().top < grenze) { el.classList.add('is-in'); return false; }
      return true;
    });
  }
  /* Lektionenzahl auf den Heften zählt beim Aufschlagen hoch */
  function zaehlen(heft) {
    var b = heft.querySelector('[data-zahl]');
    if (!b || reduce || b.getAttribute('data-gezaehlt')) return;
    b.setAttribute('data-gezaehlt', '1');
    var ziel = parseInt(b.getAttribute('data-zahl'), 10);
    var t0 = null;
    var dauer = 700 + ziel * 12;
    b.textContent = '0';
    function schritt(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dauer);
      p = 1 - Math.pow(1 - p, 3);
      b.textContent = String(Math.round(ziel * p));
      if (p < 1) requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          if (e.target.classList.contains('heft-fall')) setTimeout(function () { zaehlen(e.target); }, 250);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    ziele.forEach(function (el) { io.observe(el); });
  } else {
    ziele.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Hefte öffnen und schliessen */
  [].slice.call(d.querySelectorAll('.heft-obj')).forEach(function (btn) {
    var heft = btn.closest('.heft');
    var name = (heft.querySelector('h3') || {}).textContent || 'Heft';
    [].slice.call(btn.querySelectorAll('.kaestchen i')).forEach(function (k, i) { k.style.setProperty('--k', i); });
    btn.addEventListener('click', function () {
      var offen = !heft.classList.contains('is-open');
      heft.classList.toggle('is-open', offen);
      btn.setAttribute('aria-expanded', offen ? 'true' : 'false');
      btn.setAttribute('aria-label', offen ? 'Heft ' + name + ' schliessen' : 'Heft ' + name + ' öffnen und Aufteilung zeigen');
    });
  });

  /* Kopf: Schatten beim Scrollen, Menü auf dem Mobiltelefon */
  var kopf = d.getElementById('kopf');
  var menuBtn = kopf && kopf.querySelector('.menu-btn');
  function menu(auf) {
    kopf.classList.toggle('is-open', auf);
    menuBtn.setAttribute('aria-expanded', auf ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', auf ? 'Menü schliessen' : 'Menü öffnen');
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { menu(!kopf.classList.contains('is-open')); });
    kopf.querySelector('.nav').addEventListener('click', function (e) {
      if (e.target.closest('a[href^="#"]:not([data-soon])')) menu(false);
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  }

  /* Sanftes Scrollen zu Ankern (nur wenn Bewegung erwünscht) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-soon')) return;
    var id = a.getAttribute('href').slice(1);
    var ziel = id && d.getElementById(id);
    if (!ziel) return;
    e.preventDefault();
    ziel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* Registerreiter folgen dem Scrollen */
  var reiter = [].slice.call(d.querySelectorAll('.reiter'));
  var abschnitte = [].slice.call(d.querySelectorAll('[data-reg]'));
  function aktiv(i) {
    reiter.forEach(function (r, k) {
      r.classList.toggle('is-aktiv', k === i);
      if (k === i) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
    });
  }
  if (hasIO && reiter.length) {
    var sichtbar = {};
    var regIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { sichtbar[e.target.id] = e.isIntersecting; });
      var treffer = -1;
      abschnitte.forEach(function (s) { if (sichtbar[s.id]) treffer = parseInt(s.getAttribute('data-reg'), 10); });
      aktiv(treffer);
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    abschnitte.forEach(function (s) { regIO.observe(s); });
  }

  /* Aktionsleiste auf dem Mobiltelefon erst nach dem Umschlag zeigen */
  var leiste = d.getElementById('aktionsleiste');
  var heroCta = d.getElementById('hero-cta');

  /* Parallaxe Foto und Kopfschatten */
  var par = [].slice.call(d.querySelectorAll('[data-parallax]'));
  var tick = false;
  function aufScroll() {
    tick = false;
    var y = window.pageYOffset || root.scrollTop;
    if (kopf) kopf.classList.toggle('is-scrolled', y > 8);
    nachholen();
    if (leiste && heroCta) {
      var r = heroCta.getBoundingClientRect();
      leiste.classList.toggle('is-visible', r.bottom < 0);
    }
    if (reduce) return;
    var vh = window.innerHeight;
    par.forEach(function (img) {
      var b = img.parentNode.getBoundingClientRect();
      if (b.bottom < -100 || b.top > vh + 100) return;
      var p = (b.top + b.height / 2 - vh / 2) / (vh / 2 + b.height / 2);
      p = Math.max(-1, Math.min(1, p));
      img.style.transform = 'translate3d(0,' + (p * -22).toFixed(1) + 'px,0) scale(1.08)';
    });
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(aufScroll); }
  }, { passive: true });
  aufScroll();
})();
