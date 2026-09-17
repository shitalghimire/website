/* ═══════════════════════════════════════════════════════════════
   THE CLAIM WORKSHOP — small runtime.
   DOM building, motion, and the bit of progress we remember.
   No framework, no build step, nothing to install.
   ═══════════════════════════════════════════════════════════════ */

/* ── building elements ────────────────────────────────────────────
   h('div.card#id', {props}, ...children). Children are appended as
   text nodes unless they are already nodes, so nothing the course
   writes can smuggle markup into the page. */
export function h(tag, props, ...kids) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag);
  if (!m) throw new Error(`bad tag: ${tag}`);
  const el = document.createElement(m[1] || 'div');
  for (const part of m[2].match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  if (props != null && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    kids.unshift(props);
    props = null;
  }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'svg') el.innerHTML = v; // our own icon markup only
      else if (k === 'style' && typeof v === 'object') {
        // Object.assign drops --custom-properties on the floor; set them by hand
        for (const [prop, val] of Object.entries(v)) {
          if (val == null) continue;
          if (prop.startsWith('--')) el.style.setProperty(prop, String(val));
          else el.style[prop] = val;
        }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export function mount(el, ...kids) { clear(el); append(el, kids); return el; }

/* ── light markup inside course text ──────────────────────────────
   **bold**, *italic*, `code`, ==marked==, and [[label]] for a term
   the glossary explains. Returns a fragment, so when it goes inside
   a CSS grid item, wrap it: h('li', h('span', fx(text))). */
const FX = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(==[^=]+==)|(\[\[[^\]]+\]\])/g;
export function fx(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of String(text).matchAll(FX)) {
    if (m.index > last) frag.append(String(text).slice(last, m.index));
    const s = m[0];
    if (m[1]) frag.append(h('strong', s.slice(2, -2)));
    else if (m[2]) frag.append(h('em', s.slice(1, -1)));
    else if (m[3]) frag.append(h('code', s.slice(1, -1)));
    else if (m[4]) frag.append(h('mark', s.slice(2, -2)));
    else if (m[5]) frag.append(h('b.term', { title: 'A term worth knowing' }, s.slice(2, -2)));
    last = m.index + s.length;
  }
  frag.append(String(text).slice(last));
  return frag;
}

/* a paragraph of marked-up text */
export const p = (text, cls = '') => h(`p${cls ? '.' + cls : ''}`, fx(text));

/* ── motion ───────────────────────────────────────────────────────
   Everything here checks the reader's motion preference first. */
export const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Cross-fade the page instead of snapping to it. */
export function swap(fn, name = 'page') {
  const ok = document.startViewTransition && !still()
    && document.visibilityState === 'visible' && document.readyState === 'complete';
  if (!ok) { fn(); return Promise.resolve(); }
  document.documentElement.dataset.vt = name;
  let t;
  try { t = document.startViewTransition(fn); }
  catch { fn(); delete document.documentElement.dataset.vt; return Promise.resolve(); }
  t.ready.catch(() => {});
  t.updateCallbackDone.catch(() => {});
  return t.finished.catch(() => {}).finally(() => { delete document.documentElement.dataset.vt; });
}

let io = null;
const seen = new WeakSet();
function observer() {
  if (io) return io;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.03 });
  return io;
}

/* Children rise in as the reader reaches them, not all at once on load. */
export function reveal(root, { selector = ':scope > *', step = 60, from = 0 } = {}) {
  if (!root) return;
  const kids = $$(selector, root);
  if (still()) { kids.forEach((el) => el.classList.add('in')); return; }
  kids.forEach((el, i) => {
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add('rv');
    el.style.setProperty('--d', `${from + Math.min(i, 9) * step}ms`);
    /* Anything already on screen — or scrolled past, which happens on a
       deep link or a restored scroll position — is shown at once. The
       observer would never fire for those, and they would stay blank. */
    if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); return; }
    observer().observe(el);
  });
}

/* A number that means a quantity counts up, once, when first seen. */
export function countUp(el, to, { ms = 850, from = 0, format = (n) => n.toLocaleString() } = {}) {
  if (still() || to === from) { el.textContent = format(to); return el; }
  const once = new IntersectionObserver((entries, o) => {
    if (!entries[0].isIntersecting) return;
    o.disconnect();
    const t0 = performance.now();
    const tick = (now) => {
      const prog = Math.min(1, (now - t0) / ms);
      el.textContent = format(Math.round(from + (to - from) * (1 - Math.pow(1 - prog, 3))));
      if (prog < 1) requestAnimationFrame(tick);
    };
    el.textContent = format(from);
    requestAnimationFrame(tick);
  }, { threshold: 0.4 });
  el.textContent = format(from);
  once.observe(el);
  return el;
}

/* Steps that play one after another, and can be stopped. */
export function sequence(steps, { gap = 700, onStep } = {}) {
  let i = 0; let timer = null; let live = true;
  const run = () => {
    if (!live || i >= steps.length) { live = false; onStep?.(null, i, true); return; }
    onStep?.(steps[i], i, false);
    i += 1;
    timer = setTimeout(run, still() ? 0 : gap);
  };
  return {
    play() { live = true; run(); return this; },
    stop() { live = false; clearTimeout(timer); return this; },
    reset() { this.stop(); i = 0; return this; },
    get playing() { return live && i < steps.length; },
  };
}

/* ── remembering where you got to ─────────────────────────────────
   One key, on this device. Nothing leaves the browser. */
const KEY = 'claim-workshop:v1';
const blank = () => ({ done: {}, answers: {}, notes: {}, theme: null, seen: {} });

let state = load();
const subs = new Set();

function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return blank(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode, full disk */ }
  subs.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  update(fn) { fn(state); save(); },
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  reset() { state = blank(); save(); },
  markDone(id) { this.update((s) => { s.done[id] = Date.now(); }); },
  isDone(id) { return !!state.done[id]; },
  toggleDone(id) { this.update((s) => { if (s.done[id]) delete s.done[id]; else s.done[id] = Date.now(); }); },
};

/* ── odds and ends ────────────────────────────────────────────── */
export const debounce = (fn, ms = 120) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }, text);
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    toast('Copied');
  }
}

export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}
