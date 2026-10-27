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
    this.splitText();
    this.initHeader();
    this.initNav();
    this.initReveal();
    this.initCounters();
    this.initForm();
    this.initCursor();
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------- Woerter aufteilen */
  // Jedes Wort in <span class="w"><i>..</i></span>, damit es aus einer Maske aufsteigen kann.
  // Leerzeichen bleiben echte Textknoten (Screenreader und Suche lesen den Satz normal).
  splitText() {
    for (const el of $$('[data-split]')) {
      if (el.classList.contains('is-split')) continue;
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((word, i) => {
        const w = document.createElement('span');
        w.className = 'w';
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
      g.set(p.items, { opacity: 0, y: 22 });
      g.set(p.lines, { opacity: 0, x: -12 });
      return;
    }
    const delay = first ? 0.15 : 0.05;
    const tl = g.timeline({ delay });
    if (p.lines.length) tl.fromTo(p.lines, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' }, 0);
    if (p.words.length) {
      tl.fromTo(p.words, { yPercent: 115, rotate: 4 }, {
        yPercent: 0, rotate: 0, duration: 1.25, ease: 'expo.out', stagger: first ? 0.06 : 0.045,
      }, 0.08);
    }
    if (p.items.length) {
      tl.fromTo(p.items, { opacity: 0, y: 22 }, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, clearProps: 'transform',
      }, first ? 0.5 : 0.32);
    }
    p.tl = tl;
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
      const set = (open) => {
        header.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
        if (label) label.textContent = open ? 'Schliessen' : 'Menü';
        document.body.style.overflow = open ? 'hidden' : '';
      };
      btn.addEventListener('click', () => set(!header.classList.contains('is-open')));
      $$('.nav a').forEach((a) => a.addEventListener('click', () => set(false)));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    }
    // Aktiver Abschnitt in der Navigation
    const links = $$('.nav a[href^="#"]:not(.nav__cta)');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if (!('IntersectionObserver' in window) || !map.size) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const a = map.get(e.target.id);
        if (a) a.classList.toggle('is-current', e.isIntersecting);
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------------------------------------------- Einblendungen */
  initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (this.reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* Zahlen im Fallbeispiel zaehlen hoch, sobald sie sichtbar werden */
  initCounters() {
    const els = $$('[data-count]');
    const g = this.gsap;
    if (!els.length || !g || this.reduced || !('IntersectionObserver' in window)) return;
    const fmt = (el, v) => {
      el.textContent = `${el.dataset.prefix || ''}${Math.round(v)}${el.dataset.suffix || ''}`;
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target;
        const end = parseFloat(el.dataset.count);
        const o = { v: 0 };
        fmt(el, 0);
        g.to(o, { v: end, duration: end > 20 ? 1.8 : 1.2, ease: 'power3.out', delay: 0.15, onUpdate: () => fmt(el, o.v) });
      }
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------ Cursor */
  initCursor() {
    if (this.reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span>';
    document.body.appendChild(el);
    this.root.classList.add('has-cursor');
    const ring = el.firstElementChild;
    const dot = el.lastElementChild;
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let last = performance.now();
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      el.classList.add('is-visible');
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
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-dt * 14);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
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

    const show = (kind, text, extra) => {
      if (!status) return;
      status.hidden = false;
      status.className = 'form-status' + (kind === 'error' ? ' is-error' : ' is-ok');
      status.textContent = '';
      const span = document.createElement('span');
      span.textContent = text;
      status.append(span);
      if (extra) status.append(extra);
    };

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
      if (status) status.hidden = true;
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json().then((json) => {
          if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
        }))
        .then(() => {
          show('ok', MSG.ok);
          form.reset();
          inputs.forEach((i) => { delete i.dataset.touched; fieldError(i, ''); });
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
