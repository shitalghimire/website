/* ═══════════════════════════════════════════════════════════════
   Motion — one place for every moving part of the Registry.

   The rule of the house: motion explains something. A stamp lands
   because a stamp lands. A bar grows because time passes. Nothing
   moves for decoration, and nothing moves at all if the reader has
   asked their machine to keep still.
   ═══════════════════════════════════════════════════════════════ */

export const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── page changes ─────────────────────────────────────────────────
   Uses the browser's own view transition when it has one, so the old
   page cross-fades into the new instead of snapping. Everywhere else
   the callback simply runs. */
export function swap(fn, name = 'page') {
  /* A transition needs a visible, settled document. During the first paint,
     or while the tab is in the background, the browser rejects it — so in
     those cases just do the work. */
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

/* ── reveal on scroll ─────────────────────────────────────────────
   Children of a revealed container rise in as they reach the screen,
   in reading order, with a small stagger inside each group. Elements
   already on screen when the page is drawn come in immediately. */
let io = null;
const seen = new WeakSet();

function observer() {
  if (io) return io;
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
  return io;
}

/* Mark a subtree so its direct children animate in. */
export function reveal(root, { selector = ':scope > *', stagger = 60, start = 0 } = {}) {
  if (!root) return;
  const kids = [...root.querySelectorAll(selector)];
  if (still()) { kids.forEach((el) => el.classList.add('is-in')); return; }
  kids.forEach((el, i) => {
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add('rv');
    el.style.setProperty('--d', `${start + Math.min(i, 8) * stagger}ms`);
    observer().observe(el);
  });
}

/* Stagger a list that is already visible — used for grids that are
   redrawn by a filter, where a scroll observer would never fire. */
export function cascade(nodes, step = 34) {
  if (still()) return nodes;
  nodes.forEach((el, i) => el?.style?.setProperty?.('--i', i));
  return nodes;
}

/* ── counting up ──────────────────────────────────────────────────
   For a number that means a quantity. Counts on a curve, not linearly,
   so it settles rather than stops. */
export function countUp(el, to, { ms = 900, from = 0, format = (n) => n.toLocaleString() } = {}) {
  if (still() || to === from) { el.textContent = format(to); return; }
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(tick);
  };
  el.textContent = format(from);
  requestAnimationFrame(tick);
}

/* Count up the first time the element is scrolled into view. */
export function countWhenSeen(el, to, opts) {
  if (still()) { el.textContent = (opts?.format || ((n) => n.toLocaleString()))(to); return el; }
  const once = new IntersectionObserver((entries, o) => {
    if (!entries[0].isIntersecting) return;
    o.disconnect();
    countUp(el, to, opts);
  }, { threshold: 0.3 });
  once.observe(el);
  return el;
}

/* ── the rubber stamp ─────────────────────────────────────────────
   Lands once, when it is first seen, and never again. */
export function stampWhenSeen(el, delay = 0) {
  if (still()) return el;
  const once = new IntersectionObserver((entries, o) => {
    if (!entries[0].isIntersecting) return;
    o.disconnect();
    setTimeout(() => el.classList.add('is-thunk'), delay);
  }, { threshold: 0.5 });
  once.observe(el);
  return el;
}

/* ── FLIP ─────────────────────────────────────────────────────────
   Move an element from where it was to where it is now. Used for the
   marker that slides between rail tabs. */
export function flip(el, first, ms = 320) {
  if (still() || !first) return;
  const last = el.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  if (!dx && !dy) return;
  el.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
    { duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)' },
  );
}

/* ── a ticking sequence ───────────────────────────────────────────
   Plays steps one after another and can be stopped. Used by the letter
   threads, where the point is that time passes between letters. */
export function sequence(steps, { gap = 620, onStep } = {}) {
  let i = 0;
  let timer = null;
  let live = true;
  const run = () => {
    if (!live || i >= steps.length) { live = false; onStep?.(null, i, true); return; }
    onStep?.(steps[i], i, false);
    i++;
    timer = setTimeout(run, still() ? 0 : gap);
  };
  return {
    play() { if (!live) { live = true; } run(); return this; },
    stop() { live = false; clearTimeout(timer); return this; },
    reset() { this.stop(); i = 0; live = true; return this; },
    get index() { return i; },
    get playing() { return live && i < steps.length; },
  };
}
