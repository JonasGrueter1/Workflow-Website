/* Autodrive Fahrschule, Design A: Kopf, Einblenden, Zitat-Bühne, Stimmen, Aktionsleiste, Anker */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Kopf: Linie und Schatten nach den ersten Pixeln */
  var top = document.getElementById('top');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      top.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Einblenden beim Scrollen, gestaffelt (70 ms) */
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if (hasIO && !reduce) {
    root.classList.add('io');
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        var el = entry.target;
        el.style.setProperty('--rd', Math.min(i, 5) * 70 + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
        /* Verzögerung danach entfernen, damit Hover sofort reagiert */
        setTimeout(function () { el.style.setProperty('--rd', '0ms'); }, 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Siegel im Hero nur drehen, solange der Hero sichtbar ist */
  var hero = document.querySelector('.hero');
  if (hero && hasIO) {
    new IntersectionObserver(function (e) {
      hero.classList.toggle('is-off', !e[0].isIntersecting);
    }).observe(hero);
  }

  /* Zitat-Bühne: wechselt alle 7 s, ein Durchgang, Pause bei Hover und Fokus.
     Ohne JS und bei reduzierter Bewegung stehen alle Zitate untereinander. */
  var stage = document.getElementById('stage');
  if (stage && !reduce) {
    var quotes = [].slice.call(stage.querySelectorAll('.q'));
    var dots = [].slice.call(stage.querySelectorAll('.dot'));
    var ctrl = document.getElementById('stage-ctrl');
    var pauseBtn = document.getElementById('pause');
    var pauseLbl = pauseBtn.querySelector('.pause-lbl');
    var qmark = stage.querySelector('.qmark');
    var DELAY = 7000;
    var idx = 0, timer = null, userPaused = false, hold = false, visible = false, shown = 1, finished = false;

    ctrl.hidden = false;
    stage.classList.add('is-rot');
    stage.style.setProperty('--dur', DELAY + 'ms');
    quotes.forEach(function (q, i) {
      q.setAttribute('role', 'group');
      q.setAttribute('aria-roledescription', 'Stimme');
      q.setAttribute('aria-label', (i + 1) + ' von ' + quotes.length);
    });

    var show = function (n) {
      idx = (n + quotes.length) % quotes.length;
      quotes.forEach(function (q, i) {
        var on = i === idx;
        q.classList.toggle('is-active', on);
        q.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      dots.forEach(function (d, i) { d.setAttribute('aria-pressed', i === idx ? 'true' : 'false'); });
      if (qmark) {
        qmark.classList.add('is-pop');
        setTimeout(function () { qmark.classList.remove('is-pop'); }, 260);
      }
    };
    var setPausedUi = function (p) {
      pauseBtn.classList.toggle('is-paused', p);
      pauseLbl.textContent = p ? 'Weiter' : 'Anhalten';
      pauseBtn.setAttribute('aria-label', p ? 'Wechsel fortsetzen' : 'Wechsel anhalten');
    };
    var stop = function () { clearTimeout(timer); timer = null; stage.classList.remove('is-run'); };
    var schedule = function () {
      stop();
      if (userPaused || hold || !visible || finished) return;
      void stage.offsetWidth; /* Fortschritt im aktiven Balken neu starten */
      stage.classList.add('is-run');
      timer = setTimeout(function () {
        if (shown >= quotes.length) {
          /* nach einem ganzen Durchgang zurück zur ersten Stimme und anhalten */
          show(0); finished = true; userPaused = true; setPausedUi(true); stop(); return;
        }
        show(idx + 1); shown++;
        schedule();
      }, DELAY);
    };

    show(0);
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { show(i); shown = 1; finished = false; schedule(); });
    });
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      if (!userPaused) { finished = false; shown = 1; show(idx + 1); }
      setPausedUi(userPaused);
      schedule();
    });
    stage.addEventListener('mouseenter', function () { hold = true; stop(); });
    stage.addEventListener('mouseleave', function () { hold = false; schedule(); });
    stage.addEventListener('focusin', function () { hold = true; stop(); });
    stage.addEventListener('focusout', function (e) { if (!stage.contains(e.relatedTarget)) { hold = false; schedule(); } });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else schedule(); });

    if (hasIO) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible) schedule(); else stop();
      }, { threshold: 0.45 }).observe(stage);
    } else {
      visible = true; schedule();
    }
  }

  /* Stimmen auf schmalen Bildschirmen: zuerst vier zeigen, Rest auf Wunsch (ohne Skript alle sichtbar) */
  var mauer = document.querySelector('.mauer');
  if (mauer && window.matchMedia('(max-width: 639px)').matches) {
    var st = mauer.querySelectorAll('.st');
    if (st.length > 4) {
      mauer.classList.add('is-kurz');
      var wrapBtn = document.createElement('div');
      wrapBtn.className = 'mehr-st';
      wrapBtn.innerHTML = '<button type="button" class="btn btn-line" aria-expanded="false">Weitere ' + (st.length - 4) + ' Stimmen zeigen</button>';
      mauer.parentNode.insertBefore(wrapBtn, mauer.nextSibling);
      wrapBtn.firstChild.addEventListener('click', function () {
        mauer.classList.remove('is-kurz');
        var next = st[4];
        wrapBtn.parentNode.removeChild(wrapBtn);
        for (var k = 4; k < st.length; k++) st[k].classList.add('is-in');
        next.setAttribute('tabindex', '-1');
        next.focus({ preventScroll: true });
      });
    }
  }

  /* Tipps: ohne JS sind alle offen, mit JS nur der erste */
  [].slice.call(document.querySelectorAll('.akk details')).forEach(function (d, i) { if (i > 0) d.open = false; });

  /* Aktionsleiste unten: erscheint, sobald die Knöpfe im Startbereich aus dem Bild sind */
  var dock = document.querySelector('.dock');
  var heroCta = document.getElementById('hero-cta');
  if (dock && heroCta && hasIO) {
    dock.classList.add('is-off');
    new IntersectionObserver(function (e) {
      dock.classList.toggle('is-off', e[0].isIntersecting || e[0].boundingClientRect.top > 0);
    }, { threshold: 0 }).observe(heroCta);
  }

  /* Anker: weich scrollen */
  document.querySelectorAll('a[href^="#"]:not([data-soon])').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (id === 'inhalt') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });
})();
