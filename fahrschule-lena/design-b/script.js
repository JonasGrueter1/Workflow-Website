/* Fahrschule Lena, Design B «Fallblatt»
   Klappanzeige (Fallblatt), Uhr, Einblenden beim Scrollen, Garage, Aktionsleiste.
   Ohne JavaScript stehen alle Texte statisch da. Bei reduzierter Bewegung klappt nichts. */
(function () {
  'use strict';

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqWide = window.matchMedia('(min-width: 760px)');
  var hasAnim = typeof Element.prototype.animate === 'function' && typeof Promise === 'function';
  var hasIO = 'IntersectionObserver' in window;
  function motion() { return hasAnim && !mqReduce.matches; }

  var ROLL = 'ABCDEFGHIJKLMNOPRSTUVWZÄÖÜ0123456789';
  var DIGITS = '0123456789';
  function rnd(n) { return Math.floor(Math.random() * n); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function onChange(mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }

  /* ---------- Klappzelle ---------- */
  function Cell(opts) {
    opts = opts || {};
    var el = document.createElement('span');
    el.className = 'cell' + (opts.word ? ' w' : '') + (opts.cls ? ' ' + opts.cls : '');
    el.innerHTML = (opts.word ? '<span class="sz"></span>' : '') +
      '<span class="h t"><b></b></span><span class="h b"><b></b></span>' +
      '<span class="f ft"><b></b></span><span class="f fb"><b></b></span>';
    var k = opts.word ? 1 : 0;
    this.el = el;
    this.sz = opts.word ? el.children[0] : null;
    this.ht = el.children[k].firstChild;
    this.hb = el.children[k + 1].firstChild;
    this.ft = el.children[k + 2];
    this.fb = el.children[k + 3];
    this.roll = opts.roll || ROLL;
    this.ch = '';
    this.tok = 0;
    this.set(opts.value || ' ');
  }
  Cell.prototype.size = function (v) { if (this.sz) this.sz.textContent = v; };
  Cell.prototype.set = function (v) {
    this.tok++;
    this.ch = v;
    this.ht.textContent = v;
    this.hb.textContent = v;
    this.ft.style.visibility = 'hidden';
    this.fb.style.visibility = 'hidden';
  };
  /* Ein Klapp-Schritt: obere Hälfte fällt nach unten, neue untere Hälfte klappt herunter */
  Cell.prototype.step = function (n, dur, tok) {
    var self = this, o = this.ch, ft = this.ft, fb = this.fb;
    this.ch = n;
    this.ht.textContent = n;
    this.hb.textContent = o;
    ft.firstChild.textContent = o;
    fb.firstChild.textContent = n;
    ft.style.visibility = 'visible';
    ft.style.willChange = 'transform';
    return ft.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
      { duration: dur, easing: 'cubic-bezier(.5,0,1,.6)' }).finished
      .then(function () {
        ft.style.visibility = 'hidden';
        ft.style.willChange = '';
        if (tok !== self.tok) return;
        fb.style.visibility = 'visible';
        fb.style.willChange = 'transform';
        return fb.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }],
          { duration: dur, easing: 'cubic-bezier(0,.4,.5,1)' }).finished;
      })
      .then(function () {
        fb.style.willChange = '';
        if (tok !== self.tok) return;
        fb.style.visibility = 'hidden';
        self.hb.textContent = n;
      });
  };
  Cell.prototype.flip = function (target, o) {
    o = o || {};
    if (!motion()) { this.set(target); return Promise.resolve(); }
    if (target === this.ch) return Promise.resolve();
    var self = this, tok = ++this.tok;
    var pool = o.pool || this.roll;
    var n = o.steps != null ? o.steps : 2 + rnd(4);
    var seq = [];
    for (var i = 0; i < n; i++) {
      var c = typeof pool === 'string' ? pool.charAt(rnd(pool.length)) : pool[rnd(pool.length)];
      if (c !== target) seq.push(c);
    }
    seq.push(target);
    var dur = o.dur || 70;
    var p = wait(o.delay || 0).then(function () {
      if (o.hl != null && tok === self.tok) self.el.classList.toggle('hl', o.hl);
    });
    seq.forEach(function (c) {
      p = p.then(function () { if (tok === self.tok) return self.step(c, dur, tok); });
    });
    return p.catch(function () {});
  };

  /* ---------- Grosse Tafel aus Zellen ---------- */
  function wrapText(text, cols) {
    var words = text.toUpperCase().split(' '), lines = [], line = '';
    words.forEach(function (w) {
      if (!line) line = w;
      else if ((line + ' ' + w).length <= cols) line += ' ' + w;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }

  function Board(el, layout) {
    this.el = el;
    this.layout = layout;
    this.build();
  }
  Board.prototype.build = function () {
    var L = this.layout();
    this.L = L;
    this.el.textContent = '';
    this.el.style.setProperty('--cols', L.cols);
    this.el.classList.add('is-live');
    this.cells = [];
    var frag = document.createDocumentFragment();
    for (var r = 0; r < L.rows; r++) {
      for (var c = 0; c < L.cols; c++) {
        var cell = new Cell();
        this.cells.push(cell);
        frag.appendChild(cell.el);
      }
    }
    this.el.appendChild(frag);
  };
  /* Zeilen mit vorangestelltem ~ erscheinen hervorgehoben (Mint) */
  Board.prototype.show = function (lines, animate, fast) {
    var L = this.L, ps = [];
    var rows = [], hls = [];
    for (var r0 = 0; r0 < L.rows; r0++) {
      var line = lines[r0] || '';
      hls.push(line.charAt(0) === '~');
      rows.push(line.replace(/^~/, ''));
    }
    this.cells.forEach(function (cell, i) {
      var r = Math.floor(i / L.cols), c = i % L.cols;
      var t = rows[r].charAt(c) || ' ', hl = hls[r];
      if (!animate) { cell.set(t); cell.el.classList.toggle('hl', hl); return; }
      if (t === cell.ch) { cell.el.classList.toggle('hl', hl); return; }
      ps.push(cell.flip(t, fast
        ? { hl: hl, delay: c * 8 + r * 20, steps: 1, dur: 45 }
        : { hl: hl, delay: c * 26 + r * 45 + rnd(40), steps: t === ' ' ? 1 + rnd(2) : 2 + rnd(4) }));
    });
    return Promise.all(ps);
  };

  /* ---------- Hero: Abfahrtstafel mit wechselnden Slogans ---------- */
  var SLOGANS = ['Sicheres Fahren ist kein Zufall', 'Perfekt vorbereitet auf jede Situation', 'Gekonnt durch die Prüfung'];
  var hero = document.querySelector('[data-hero]');
  var heroVisible = true;

  var heroGrid = document.querySelector('[data-board]');
  if (heroGrid) {
    var heroLayout = function () {
      if (mqWide.matches) {
        return { cols: 22, rows: 4, lines: function (i) { return ['FAHRSCHULE LENA', '~REIDEN LU'].concat(wrapText(SLOGANS[i], 22)); } };
      }
      return { cols: 15, rows: 4, lines: function (i) {
        var l = ['FAHRSCHULE LENA'].concat(wrapText(SLOGANS[i], 15));
        if (l.length < 4) l.push('~REIDEN LU');
        return l;
      } };
    };
    var hb = new Board(heroGrid, heroLayout);
    var idx = 0, changes = 0, paused = false, timer = null, busy = false;

    var schedule = function () {
      clearTimeout(timer);
      if (!motion() || changes >= 8) return;
      timer = setTimeout(tick, changes === 0 ? 4500 : 6000);
    };
    var tick = function () {
      if (paused || !heroVisible || document.hidden || busy) { timer = setTimeout(tick, 1200); return; }
      idx = (idx + 1) % SLOGANS.length;
      changes++;
      busy = true;
      hb.show(hb.L.lines(idx), true).then(function () { busy = false; schedule(); });
    };

    if (motion()) {
      hb.show([], false);
      busy = true;
      wait(40).then(function () { return hb.show(hb.L.lines(0), true, true); }).then(function () { busy = false; schedule(); });
    } else {
      hb.show(hb.L.lines(0), false);
    }

    if (hero) {
      hero.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') paused = true; });
      hero.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') paused = false; });
      hero.addEventListener('focusin', function () { paused = true; });
      hero.addEventListener('focusout', function () { paused = false; });
    }
    onChange(mqWide, function () { hb.build(); hb.show(hb.L.lines(idx), false); });
  }

  /* ---------- Uhr in der Kopfzeile der Tafel ---------- */
  var clockEl = document.querySelector('[data-clock]');
  if (clockEl) {
    var cc = [], last = '';
    for (var i = 0; i < 4; i++) cc.push(new Cell({ roll: DIGITS }));
    var colon = document.createElement('span');
    colon.className = 'colon';
    colon.textContent = ':';
    clockEl.appendChild(cc[0].el); clockEl.appendChild(cc[1].el);
    clockEl.appendChild(colon);
    clockEl.appendChild(cc[2].el); clockEl.appendChild(cc[3].el);
    clockEl.classList.add('is-live');
    var timeNow = function () {
      var d = new Date();
      return ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2);
    };
    var updClock = function (anim) {
      var s = timeNow();
      if (s === last) return;
      last = s;
      cc.forEach(function (c, k) {
        if (anim) c.flip(s.charAt(k), { pool: DIGITS, steps: rnd(2), delay: k * 50, dur: 50 });
        else c.set(s.charAt(k));
      });
    };
    if (motion()) wait(40).then(function () { updClock(true); });
    else updClock(false);
    setInterval(function () { updClock(motion() && heroVisible && !document.hidden); }, 1000);
  }

  /* ---------- Klappfelder in den Abschnitten (Tarif, Ziele, Gleisnummern, Garage) ---------- */
  var groups = [];
  var groupOf = function (el) {
    var g = el.closest('[data-flipgroup], [data-garage], .gleis') || el;
    for (var k = 0; k < groups.length; k++) if (groups[k].el === g) return groups[k];
    var grp = { el: g, items: [], words: [], pools: {} };
    groups.push(grp);
    return grp;
  };

  [].forEach.call(document.querySelectorAll('[data-flap]'), function (fx) {
    var text = fx.textContent.replace(/\s+/g, ' ').trim();
    var up = text.toUpperCase();
    var mode = fx.getAttribute('data-flap');
    var grp = groupOf(fx);
    var vis = document.createElement('span');
    vis.className = 'fx-vis';
    vis.setAttribute('aria-hidden', 'true');
    fx.textContent = '';
    if (!fx.hasAttribute('aria-hidden') && text) {
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      fx.appendChild(sr);
    }
    fx.appendChild(vis);
    fx.classList.add('is-live');

    var item = { cells: [], targets: [] };
    if (mode === 'chars') {
      var n = parseInt(fx.getAttribute('data-cells'), 10) || up.length;
      var padded = (new Array(n + 1).join(' ') + up).slice(-n);
      for (var k = 0; k < n; k++) {
        var digitish = /[0-9.\-]/.test(padded.charAt(k));
        var c = new Cell({ roll: digitish ? DIGITS : ROLL });
        item.cells.push(c);
        item.targets.push(padded.charAt(k));
        vis.appendChild(c.el);
      }
    } else {
      var w = new Cell({ word: true });
      w.size(up || ' ');
      item.cells.push(w);
      item.targets.push(up || ' ');
      item.word = true;
      /* Wie auf echten Tafeln: Eine Klappe rollt nur durch Begriffe ihrer eigenen Spalte */
      item.key = fx.getAttribute('data-pool') || (fx.parentNode && fx.parentNode.className) || '';
      if (up) {
        grp.words.push(up);
        if (!fx.hasAttribute('data-pool')) (grp.pools[item.key] = grp.pools[item.key] || []).push(up);
      }
      if (fx.hasAttribute('data-pool')) {
        grp.pools[item.key] = fx.getAttribute('data-pool').toUpperCase().split('|').concat(up);
      }
      vis.appendChild(w.el);
    }
    item.cells.forEach(function (c, k) { c.set(motion() ? ' ' : item.targets[k]); });
    grp.items.push(item);
  });

  var playGroup = function (grp) {
    if (grp.played) return Promise.resolve();
    grp.played = true;
    var ps = [];
    grp.items.forEach(function (item, j) {
      item.cells.forEach(function (c, k) {
        var opt = { delay: 80 + j * 60 + k * 40, steps: 2 + rnd(2), dur: 60 };
        if (item.word) {
          var col = grp.pools[item.key] || [];
          var distinct = col.filter(function (v, x) { return col.indexOf(v) === x; });
          opt.pool = distinct.length > 1 ? col : (grp.words.length > 1 ? grp.words : ROLL);
          opt.dur = 70;
        }
        ps.push(c.flip(item.targets[k], opt));
      });
    });
    return Promise.all(ps).then(function () { grp.el.classList.add('is-done'); });
  };

  /* ---------- «Ich will!»: Tafel «Nächste Abfahrt» ---------- */
  var nextGrid = document.querySelector('[data-board-next]');
  var nextBoard = null;
  if (nextGrid) {
    var nextLayout = function () {
      if (mqWide.matches) return { cols: 22, rows: 2, lines: ['NÄCHSTE ABFAHRT:', '~DEINE ERSTE FAHRSTUNDE'] };
      return { cols: 15, rows: 3, lines: ['NÄCHSTE ABFAHRT', '~DEINE ERSTE', '~FAHRSTUNDE'] };
    };
    nextBoard = new Board(nextGrid, nextLayout);
    nextBoard.played = false;
    nextBoard.show(motion() ? [] : nextBoard.L.lines, false);
    onChange(mqWide, function () { nextBoard.build(); nextBoard.show(nextBoard.L.lines, false); nextBoard.played = true; });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  var reveal = [].slice.call(document.querySelectorAll('.rv'));
  var garage = document.querySelector('[data-garage]');
  var bays = garage ? [].slice.call(garage.querySelectorAll('.rv-x')) : [];

  var showAll = function () {
    reveal.forEach(function (el) { el.classList.add('in'); });
    bays.forEach(function (el) { el.classList.add('in'); });
    groups.forEach(function (g) { playGroup(g); });
    if (nextBoard && !nextBoard.played) { nextBoard.played = true; nextBoard.show(nextBoard.L.lines, motion()); }
  };

  if (hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        if (el === garage) {
          bays.forEach(function (b) { b.classList.add('in'); });
        } else if (el === nextGrid) {
          if (!nextBoard.played) { nextBoard.played = true; nextBoard.show(nextBoard.L.lines, true, true); }
        } else {
          el.classList.add('in');
        }
        groups.forEach(function (g) { if (g.el === el || (el === garage && g.el === garage)) playGroup(g); });
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    reveal.forEach(function (el) { io.observe(el); });
    if (garage) io.observe(garage);
    if (nextGrid) io.observe(nextGrid);
    groups.forEach(function (g) { if (reveal.indexOf(g.el) === -1 && g.el !== garage) io.observe(g.el); });
  } else {
    showAll();
  }

  /* ---------- Garage: Fortschritt und leichte Parallaxe beim Wischen ---------- */
  if (garage) {
    var bar = document.querySelector('[data-garage-bar]');
    var imgs = [].slice.call(garage.querySelectorAll('.bay-img img'));
    var ticking = false;
    var updGarage = function () {
      ticking = false;
      var max = garage.scrollWidth - garage.clientWidth;
      var p = max > 2 ? Math.min(1, Math.max(0, garage.scrollLeft / max)) : 0;
      if (bar) bar.style.transform = 'translateX(' + (p * 200).toFixed(1) + '%)';
      if (max <= 2 || !motion()) { imgs.forEach(function (img) { img.style.transform = ''; }); return; }
      var gr = garage.getBoundingClientRect(), cx = gr.left + gr.width / 2;
      imgs.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        var off = ((r.left + r.width / 2) - cx) / gr.width;
        off = Math.max(-1, Math.min(1, off));
        img.style.transform = 'translateX(' + (off * -7).toFixed(2) + '%) scale(1.16)';
      });
    };
    garage.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updGarage); } }, { passive: true });
    window.addEventListener('resize', function () { requestAnimationFrame(updGarage); });
    updGarage();
  }

  /* ---------- Sanftes Scrollen zu den Abschnitten ---------- */
  [].forEach.call(document.querySelectorAll('a[href^="#"]:not([data-soon])'), function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  /* ---------- Kopf und Aktionsleiste ---------- */
  var hd = document.querySelector('[data-hd]');
  var actbar = document.querySelector('[data-actbar]');
  var onScroll = function () { if (hd) hd.classList.toggle('is-scrolled', window.scrollY > 10); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (hero && hasIO) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      heroVisible = e.isIntersecting;
      hero.classList.toggle('is-off', !e.isIntersecting);
      if (actbar) actbar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(hero);
  } else if (actbar) {
    actbar.classList.add('is-on');
  }
})();
