// UI ohne 3D: Preloader, eigener Cursor, Navigation, Fortschritt, Text-Einblendungen, Zahlen, Kontaktformular.
// Laeuft auch im Fallback (ohne WebGL, reduzierte Bewegung) und importiert kein three.js.

const WEB3FORMS_KEY = 'd2e340ec-3d1e-4baf-9f1a-cdb4e59d18e9'; // oeffentlicher Schluessel, Mails gehen an Jonas
const MAIL = ['jonas.grueter.web', 'gmail.com'].join('@');
const SUBJECT = 'Anfrage über jonasgrueter Website';
const MSG = {
  required: 'Bitte füllen Sie dieses Feld aus.',
  email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  sending: 'Wird gesendet …',
  ok: 'Danke, Ihre Anfrage ist angekommen. Ich melde mich so bald wie möglich bei Ihnen.',
  error: 'Das hat leider nicht geklappt. Schreiben Sie mir bitte direkt an ',
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export class UI {
  constructor() {
    this.root = document.documentElement;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.gsap = window.gsap || null;
    this._shown = 0;
    this._target = 0;
    this._ticking = false;
    this._panels = new Map();
    this.pre = $('#preloader');
    this.preNum = $('#preload-num');
    this.prePct = $('#preload-pct');
    this.preText = $('#preload-text');
    this.preBar = $('#preload-bar');
    this.hudIndex = $('#hud-index');
    this.hudLabel = $('#hud-label');
    this.progressEls = $$('.hud, .story-bar');
    this._static = false;
    // ui.js laeuft: die CSS-Sicherung fuer [data-reveal] (falls dieses Skript nie startet) wird nicht gebraucht
    this.root.classList.add('ui-on');
    // 3D-Modus: Panels sind bis zum Einblenden unsichtbar (--o 0) und duerfen keinen Fokus bekommen
    if (this.root.classList.contains('gl')) {
      for (const sec of $$('.chapter')) this.setInteractive(sec, sec.dataset.scene === 'intro');
    }
    this.splitText();
    this.initHeader();
    this.initNav();
    this.initAnchors();
    this.initReveal();
    this.initCounters();
    this.initFaq();
    this.initForm();
    this.initTopicLinks();
    this.initCursor();
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------- Woerter aufteilen */
  // Jedes Wort in <span class="w"><i>..</i></span>, damit es aus einer Maske aufsteigen kann.
  // Die Ueberschrift bekommt den ganzen Satz als aria-label, die Wort-Spans sind fuer Screenreader versteckt
  // (VoiceOver liest inline-block-Woerter sonst einzeln). Leerzeichen bleiben echte Textknoten (Suche, Kopieren).
  splitText() {
    for (const el of $$('[data-split]')) {
      if (el.classList.contains('is-split')) continue;
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      const words = text.split(' ');
      el.setAttribute('aria-label', text);
      el.textContent = '';
      words.forEach((word, i) => {
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('i');
        inner.textContent = word;
        w.appendChild(inner);
        el.appendChild(w);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.classList.add('is-split');
    }
  }

  /* ---------------------------------------------------------- Preloader */
  progress(f) {
    this._target = Math.max(this._target, Math.min(1, f));
    if (!this._ticking) { this._ticking = true; requestAnimationFrame(() => this._tick()); }
  }

  _tick() {
    const d = this._target - this._shown;
    this._shown += Math.max(Math.min(d, 0.004), d * 0.09);
    if (this._target - this._shown < 0.002) this._shown = this._target;
    const pct = Math.round(this._shown * 100);
    if (pct !== this._pct) {
      this._pct = pct;
      if (this.preNum) this.preNum.textContent = String(pct);
      if (this.prePct) this.prePct.textContent = String(pct);
      if (this.preText && pct >= 55 && !this._altText) {
        this._altText = true;
        const t = this.preText;
        t.style.opacity = '0';
        setTimeout(() => { t.textContent = t.dataset.alt || t.textContent; t.style.opacity = '1'; }, 380);
      }
    }
    if (this.preBar) this.preBar.style.transform = `scaleX(${this._shown.toFixed(4)})`;
    if (this._shown < this._target) requestAnimationFrame(() => this._tick());
    else this._ticking = false;
  }

  /** Preloader auf 100 % laufen lassen und ausblenden. Loest auf, wenn die Seite frei ist. */
  finish() {
    if (this._finishing) return this._finishing;
    this.progress(1);
    this._finishing = new Promise((resolve) => {
      const wait = () => {
        if (this._shown < 0.999) { requestAnimationFrame(wait); return; }
        this._exit(resolve);
      };
      wait();
    });
    return this._finishing;
  }

  _exit(resolve) {
    const ready = () => {
      if (this._ready) return;
      this._ready = true;
      this.root.classList.add('is-ready');
      resolve();
    };
    const done = () => {
      if (this.pre) this.pre.hidden = true;
      ready();
    };
    if (!this.pre || this.reduced) { done(); return; }
    const g = this.gsap;
    this.root.classList.add('is-leaving');
    if (g) {
      // Intro startet schon, waehrend der Vorhang noch ausblendet
      g.timeline({ onComplete: done })
        .to('.preloader__meta, .preloader__count, .preloader__status', { y: -18, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.04 })
        .to('.preloader__line', { scaleX: 1.6, opacity: 0, duration: 0.6, ease: 'power3.inOut' }, '<0.1')
        .to(this.pre, { opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.25')
        .add(ready, '-=0.6');
    } else {
      this.pre.style.transition = 'opacity .6s ease';
      this.pre.style.opacity = '0';
      setTimeout(ready, 150);
      setTimeout(done, 650);
    }
  }

  hidePreloader() {
    if (this.pre) this.pre.hidden = true;
    this.root.classList.add('is-ready');
  }

  /** Einstieg nach dem Preloader: Intro-Elemente nacheinander einblenden */
  introReveal() {
    const intro = $('[data-scene="intro"]');
    if (!intro) return;
    this._introDone = true;
    this.panel(intro, true, { first: true });
  }

  /* ------------------------------------------- Text-Panels der Geschichte */
  _parts(section) {
    let p = this._panels.get(section);
    if (p) return p;
    const text = $('.chapter__text', section) || section;
    p = {
      words: $$('[data-split] .w > i', text),
      lines: $$('.kicker, .eyebrow', text),
      items: $$('[data-anim]:not(.kicker), [data-intro]:not([data-split]):not(.eyebrow)', section),
      tl: null,
      on: false,
    };
    this._panels.set(section, p);
    return p;
  }

  /** Panel wird sichtbar (on) oder ist ganz ausgeblendet (off). Vom Director bei jedem Wechsel gerufen. */
  panel(section, on, { first = false } = {}) {
    const g = this.gsap;
    const p = this._parts(section);
    if (this._static) return;
    this.setInteractive(section, on);
    if (!g || this.reduced) {
      [...p.words, ...p.lines, ...p.items].forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
      return;
    }
    if (section.dataset.scene === 'intro' && !this._introDone) return; // wartet auf den Preloader
    if (on === p.on && !first) return;
    p.on = on;
    if (p.tl) { p.tl.kill(); p.tl = null; }
    if (!on) {
      // Panel ist schon ausgeblendet (--o = 0): Ausgangslage fuer das naechste Mal
      g.set(p.words, { yPercent: 115, rotate: 4 });
      g.set(p.items, { opacity: 0, y: 14 });
      g.set(p.lines, { opacity: 0, x: -12 });
      return;
    }
    // Lesbarkeit vor Effekt: Die Woerter stehen nach hoechstens 0.6 s (inkl. Versatz) still, der Rest folgt kurz danach.
    // Nur der Hero direkt nach dem Preloader darf etwas laenger aufsteigen.
    const delay = first ? 0.15 : 0.02;
    const tl = g.timeline({ delay });
    const n = p.words.length;
    const wDur = first ? 0.8 : 0.48;
    const wTotal = first ? 1.1 : 0.6;
    const stagger = n > 1 ? Math.min(first ? 0.06 : 0.035, (wTotal - wDur) / (n - 1)) : 0;
    if (p.lines.length) tl.fromTo(p.lines, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, 0);
    if (n) {
      tl.fromTo(p.words, { yPercent: 115, rotate: 4 }, {
        yPercent: 0, rotate: 0, duration: wDur, ease: 'expo.out', stagger,
      }, 0.04);
    }
    if (p.items.length) {
      tl.fromTo(p.items, { opacity: 0, y: 14 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, clearProps: 'transform',
      }, first ? 0.45 : 0.16);
    }
    p.tl = tl;
  }

  /**
   * Unsichtbare Panels: Links und Buttons aus der Tab-Reihenfolge nehmen (tabindex -1). Kein inert: Texte und
   * Ueberschriften bleiben im Accessibility-Baum, Screenreader lesen alle Kapitel (Deckkraft 0 stoert sie nicht).
   */
  setInteractive(section, on) {
    const panel = section.querySelector('.chapter__panel');
    if (!panel) return;
    for (const a of panel.querySelectorAll('a, button')) {
      if (on) a.removeAttribute('tabindex');
      else a.setAttribute('tabindex', '-1');
    }
  }

  /**
   * Statischer Fallback (kein WebGL, Kontextverlust, zu langsam): alle Einblend-Animationen stoppen,
   * Inline-Stile von GSAP entfernen, alle Panels sichtbar und bedienbar.
   */
  toStatic() {
    this._static = true;
    const g = this.gsap;
    for (const sec of $$('.chapter')) {
      const p = this._parts(sec);
      if (p.tl) { p.tl.kill(); p.tl = null; }
      p.on = true;
      const els = [...p.words, ...p.lines, ...p.items];
      if (g) { g.killTweensOf(els); g.set(els, { clearProps: 'all' }); }
      els.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
      this.setInteractive(sec, true);
    }
  }

  /* --------------------------------------------------------------- HUD */
  setChapter(index, label) {
    const idx = String(index).padStart(2, '0');
    if (this.hudIndex) this.hudIndex.textContent = idx;
    const el = this.hudLabel;
    if (!el || el.textContent === label) return;
    const g = this.gsap;
    if (!g || this.reduced || !this._ready) { el.textContent = label; return; }
    g.killTweensOf(el);
    g.to(el, {
      opacity: 0, y: -6, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        el.textContent = label;
        g.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
      },
    });
  }

  /** Angebotszeile unter dem fertigen Website-Geruest (Kapitel Code, dna-Fortschritt p 0..1) */
  setOffer(p, inContent) {
    const on = !inContent && p > 0.8 && p < 0.985;
    if (on === this._offerOn) return;
    this._offerOn = on;
    const el = this._offer || (this._offer = $('#offer'));
    if (!el) return;
    el.classList.toggle('is-on', on);
    const a = el.querySelector('a');
    if (a) { if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); }
  }

  setStory(p, inContent) {
    const v = Math.round(p * 1000) / 1000;
    if (v !== this._story) {
      this._story = v;
      for (const el of this.progressEls) el.style.setProperty('--story', v);
    }
    const off = !!inContent;
    if (off !== this._hudOff) { this._hudOff = off; this.root.classList.toggle('is-content', off); }
  }

  /* ------------------------------------------------------------ Header */
  initHeader() {
    const header = $('.site-header');
    if (!header) return;
    let last = -1;
    const on = () => {
      const s = window.scrollY > 24;
      if (s !== last) { last = s; header.classList.toggle('is-scrolled', s); }
    };
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  initNav() {
    const btn = $('.nav-toggle');
    const header = $('.site-header');
    const label = $('.nav-toggle__text');
    if (btn && header) {
      // Offenes Vollbild-Menue: alles dahinter ist gesperrt (inert), der Fokus bleibt im Menue
      const behind = () => $$('main, .site-footer, .hud, .skip-link');
      const isOpen = () => header.classList.contains('is-open');
      const set = (open, { restoreFocus = false } = {}) => {
        header.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
        if (label) label.textContent = open ? 'Schliessen' : 'Menü';
        document.body.style.overflow = open ? 'hidden' : '';
        for (const el of behind()) el.inert = open;
        if (open) {
          const first = $('.nav a');
          if (first) requestAnimationFrame(() => first.focus());
        } else if (restoreFocus) {
          btn.focus();
        }
      };
      btn.addEventListener('click', () => set(!isOpen(), { restoreFocus: isOpen() }));
      $$('.nav a').forEach((a) => a.addEventListener('click', () => { if (isOpen()) set(false); }));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) set(false, { restoreFocus: true }); });
      // Breiter als das Handy-Layout: Menue schliessen (sonst blieben die Inhalte gesperrt)
      const mq = window.matchMedia('(min-width: 961px)');
      const onMq = () => { if (mq.matches && isOpen()) set(false); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
    }
    // Aktiver Abschnitt in der Navigation
    const links = $$('.nav a[href^="#"]:not(.nav__cta)');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if (!('IntersectionObserver' in window) || !map.size) return;
    // Nur ein Link ist aktiv (der letzte sichtbare Abschnitt in Dokument-Reihenfolge), mit aria-current
    const seen = new Set();
    const ids = [...map.keys()];
    let current = null;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) seen.add(e.target.id); else seen.delete(e.target.id); }
      let next = null;
      for (const id of ids) if (seen.has(id)) next = id;
      if (next === current) return;
      if (current) { const a = map.get(current); a.classList.remove('is-current'); a.removeAttribute('aria-current'); }
      if (next) { const a = map.get(next); a.classList.add('is-current'); a.setAttribute('aria-current', 'true'); }
      current = next;
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ------------------------------------------------------ Anker-Links */
  // Im 3D-Modus ist scroll-behavior aus (ScrollTrigger misst sonst beim Refresh falsch). Anker scrollen darum
  // per JS weich. Im Fallback uebernimmt das CSS (html:not(.gl) { scroll-behavior: smooth }).
  initAnchors() {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!this.root.classList.contains('gl') || this.reduced) return;
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const header = $('.site-header');
      const pad = id === 'top' ? 0 : (header ? header.offsetHeight : 0);
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - pad);
      window.scrollTo({ top, behavior: 'smooth' });
      if (window.history && history.pushState) history.pushState(null, '', `#${id}`);
      // Fokus an das Ziel (Tastatur und Screenreader lesen dort weiter), ohne den weichen Scroll zu stoeren
      if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
        target.setAttribute('tabindex', '-1');
      }
      try { target.focus({ preventScroll: true }); } catch (err) { /* alter Browser */ }
    });
  }

  /* ---------------------------------------------------- Einblendungen */
  initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (this.reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    // Frueh ausloesen (Element 10 % ueber dem unteren Rand), damit beim Lesen nichts mehr nachrutscht
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    els.forEach((el) => io.observe(el));
  }

  /* Zahlen im Fallbeispiel zaehlen einmal hoch (1.2 s), sobald sie sichtbar werden. Der Endwert steht im HTML
     (Google, Screenreader, Fallback ohne JS). Bei reduzierter Bewegung bleibt er einfach stehen. */
  initCounters() {
    const els = $$('[data-count]');
    const g = this.gsap;
    if (!els.length || !g || this.reduced || !('IntersectionObserver' in window)) return;
    // Nur die Zahl (.n) zaehlt hoch, Zusaetze wie "+" bleiben stehen
    const fmt = (el, v) => {
      const n = el.querySelector('.n') || el;
      n.textContent = String(Math.round(v));
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target;
        const end = parseFloat(el.dataset.count);
        if (!(end > 0)) continue;
        const o = { v: 0 };
        fmt(el, 0);
        g.to(o, { v: end, duration: 1.2, ease: 'power3.out', delay: 0.1, onUpdate: () => fmt(el, o.v), onComplete: () => fmt(el, end) });
      }
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  /* -------------------------------------------- Haeufige Fragen (Akkordeon) */
  // Muster nach WAI-ARIA APG: Ueberschrift mit Knopf (aria-expanded, aria-controls), Antwort darunter.
  // Im HTML sind alle Antworten offen (aria-expanded="true"): ohne JS bleibt alles lesbar. Hier wird zugeklappt,
  // nur die erste Frage bleibt offen. Tastatur: Enter/Leertaste (Knopf), Pfeil hoch/runter, Pos1, Ende.
  // Geschlossene Antworten sind per CSS visibility: hidden (kein Fokus, nicht im Accessibility-Baum).
  initFaq() {
    const btns = $$('.faq__q button[aria-controls]');
    if (!btns.length) return;
    const set = (btn, open) => {
      btn.setAttribute('aria-expanded', String(open));
      const item = btn.closest('.faq__item');
      if (item) item.classList.toggle('is-open', open);
    };
    btns.forEach((btn, i) => {
      set(btn, i === 0);
      btn.addEventListener('click', () => set(btn, btn.getAttribute('aria-expanded') !== 'true'));
      btn.addEventListener('keydown', (e) => {
        let to = -1;
        if (e.key === 'ArrowDown') to = (i + 1) % btns.length;
        else if (e.key === 'ArrowUp') to = (i - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = btns.length - 1;
        if (to < 0) return;
        e.preventDefault();
        btns[to].focus();
      });
    });
    // Link direkt auf eine Frage oder Antwort (z. B. #faq-a3): diese Frage oeffnen
    const openFor = (el) => {
      const item = el && el.closest ? el.closest('.faq__item') : null;
      const btn = item && item.querySelector('.faq__q button');
      if (btn) set(btn, true);
    };
    if (location.hash) openFor(document.getElementById(location.hash.slice(1)));
  }

  /* Knoepfe mit data-thema (z. B. "KI für meinen Betrieb besprechen") waehlen im Formular das Thema vor */
  initTopicLinks() {
    const select = $('#f-thema');
    if (!select) return;
    document.addEventListener('click', (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[data-thema]') : null;
      if (!a) return;
      const want = a.dataset.thema;
      const opt = Array.from(select.options).find((o) => o.value === want || o.text === want);
      if (opt) select.value = opt.value;
    });
  }

  /* ------------------------------------------------------------ Cursor */
  initCursor() {
    // Nur Dekoration: der Systemzeiger bleibt (auch vergroesserte Zeiger und Barrierefreiheit), ein feiner Ring folgt
    // ihm weich. Erst nach dem Preloader und nur mit echter Maus.
    if (this.reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="cursor__ring"></span>';
    document.body.appendChild(el);
    this.root.classList.add('has-cursor');
    const ring = el.firstElementChild;
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let last = performance.now();
    let raf = 0;
    let idle = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 16);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      // Ruhe: Schleife anhalten, bis die Maus sich wieder bewegt
      idle = Math.abs(x - rx) + Math.abs(y - ry) < 0.3 ? idle + 1 : 0;
      raf = idle > 10 ? 0 : requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      el.classList.add('is-visible');
      if (!raf) { last = performance.now(); idle = 0; raf = requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      el.classList.toggle('is-link', !!t.closest('a, button, [data-cursor], label, summary, select'));
      el.classList.toggle('is-text', !!t.closest('input, textarea'));
    });
    document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-visible'));
    window.addEventListener('pointerdown', () => el.classList.add('is-down'));
    window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  }

  /* ------------------------------------------------------- Formular */
  initForm() {
    const form = $('#kontakt-form');
    if (!form) return;
    const status = $('#form-status');
    const btn = form.querySelector('button[type="submit"]');
    const label = btn ? btn.innerHTML : '';
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    const fieldError = (input, msg) => {
      const field = input.closest('.field');
      const err = field && field.querySelector('.field__error');
      if (field) field.classList.toggle('is-invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) {
        err.textContent = msg || '';
        err.hidden = !msg;
        if (msg) input.setAttribute('aria-describedby', err.id);
        else input.removeAttribute('aria-describedby');
      }
    };
    const check = (input) => {
      const v = input.value.trim();
      let msg = '';
      if (input.required && !v) msg = MSG.required;
      else if (input.type === 'email' && v && !emailOk(v)) msg = MSG.email;
      fieldError(input, msg);
      return !msg;
    };
    const inputs = $$('input[required], textarea[required]', form);
    inputs.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value.trim() || input.dataset.touched) check(input); input.dataset.touched = '1'; });
      input.addEventListener('input', () => { if (input.closest('.field.is-invalid')) check(input); });
    });

    // Die Status-Region (role=status) bleibt immer im DOM, nur ihr Inhalt wechselt: so lesen Screenreader jede Meldung vor
    const show = (kind, text, extra) => {
      if (!status) return;
      status.className = 'form-status' + (kind === 'error' ? ' is-error' : kind === 'ok' ? ' is-ok' : ' is-info');
      status.textContent = '';
      const span = document.createElement('span');
      span.textContent = text;
      status.append(span);
      if (extra) status.append(extra);
    };
    const clear = () => { if (status) { status.className = 'form-status'; status.textContent = ''; } };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let first = null;
      for (const input of inputs) if (!check(input) && !first) first = input;
      if (first) { first.focus(); return; }
      const data = new FormData(form);
      if (data.get('botcheck')) return;
      const v = (k) => String(data.get(k) || '').trim();
      const body = [
        `Thema: ${v('thema') || 'nicht angegeben'}`,
        `Firma: ${v('firma') || 'nicht angegeben'}`,
        `Telefon: ${v('telefon') || 'nicht angegeben'}`,
        '',
        v('nachricht'),
        '',
        `Name: ${v('name')}`,
        `E-Mail: ${v('email')}`,
      ].join('\n');
      const payload = {
        access_key: WEB3FORMS_KEY,
        subject: SUBJECT,
        from_name: 'Website Jonas Grüter',
        name: v('name'),
        email: v('email'),
        firma: v('firma'),
        telefon: v('telefon'),
        thema: v('thema'),
        message: body,
        botcheck: '',
      };
      if (btn) { btn.disabled = true; btn.textContent = MSG.sending; }
      show('info', MSG.sending);
      // Haengt die Verbindung, nach 15 s abbrechen und den mailto-Weg anbieten
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : 0;
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      })
        .then((res) => res.json().then((json) => {
          if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
        }))
        .finally(() => clearTimeout(timer))
        .then(() => {
          show('ok', MSG.ok);
          form.reset();
          inputs.forEach((i) => { delete i.dataset.touched; fieldError(i, ''); });
          form.addEventListener('input', clear, { once: true });
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
        })
        .catch(() => {
          const a = document.createElement('a');
          a.className = 'link';
          a.href = `mailto:${MAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
          a.textContent = 'Anfrage per E-Mail-Programm senden';
          show('error', `${MSG.error}${MAIL}.`, a);
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
        });
    });
  }
}
