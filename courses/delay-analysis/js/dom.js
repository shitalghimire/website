/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — DOM + formatting helpers

   Nothing in this course ever hands content data to innerHTML.
   Lesson text arrives as a small inline syntax and is parsed into
   real nodes (see markup.js), so a course file cannot inject markup
   even if one were edited carelessly.
   ═══════════════════════════════════════════════════════════════ */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * el('div.panel.sheet', { onclick }, [children])
 * Text children become text nodes, never parsed HTML.
 */
export function el(spec, props = null, kids = null) {
  if (props && (Array.isArray(props) || typeof props === 'string' ||
      typeof props === 'number' || props instanceof Node)) {
    kids = props; props = null;
  }
  const [tag, ...cls] = String(spec).split('.');
  const n = document.createElement(tag || 'div');
  if (cls.length) n.className = cls.join(' ');
  applyProps(n, props);
  add(n, kids);
  return n;
}

/** Same, in the SVG namespace. svg('rect', { x: 0, width: 10 }) */
export function svg(spec, props = null, kids = null) {
  if (props && (Array.isArray(props) || typeof props === 'string' ||
      typeof props === 'number' || props instanceof Node)) {
    kids = props; props = null;
  }
  const [tag, ...cls] = String(spec).split('.');
  const n = document.createElementNS(SVG_NS, tag || 'g');
  if (cls.length) n.setAttribute('class', cls.join(' '));
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') {
        const prev = n.getAttribute('class');
        n.setAttribute('class', prev ? prev + ' ' + v : String(v));
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(n.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        n.addEventListener(k.slice(2), v);
      } else {
        n.setAttribute(k, String(v));
      }
    }
  }
  add(n, kids);
  return n;
}

function applyProps(n, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className += (n.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k === 'aria' && typeof v === 'object') {
      for (const [a, av] of Object.entries(v)) {
        if (av !== null && av !== undefined) n.setAttribute('aria-' + a, String(av));
      }
    } else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k in n && k !== 'list' && k !== 'type' && k !== 'form') {
      try { n[k] = v; } catch { n.setAttribute(k, String(v)); }
    } else n.setAttribute(k, String(v));
  }
}

export function add(parent, kids) {
  if (kids === null || kids === undefined || kids === false || kids === true) return parent;
  if (Array.isArray(kids)) { kids.forEach(k => add(parent, k)); return parent; }
  parent.append(kids instanceof Node ? kids : document.createTextNode(String(kids)));
  return parent;
}

export function frag(kids) {
  const f = document.createDocumentFragment();
  add(f, kids);
  return f;
}

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Sets --i on each child so the entry cascade staggers. */
export function stagger(node, cap = 14) {
  [...node.children].forEach((c, i) => c.style.setProperty('--i', String(Math.min(i, cap))));
  node.classList.add('stagger');
  return node;
}

/* ── numbers ────────────────────────────────────────────────── */

/** Plain integer with thousands separators. */
export function n0(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Math.round(v).toLocaleString('en-GB');
}

export function n2(v, dp = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/**
 * Days, always signed and always with a unit.
 * Delay analysis lives or dies on sign convention: a NEGATIVE float
 * value means behind programme, and a POSITIVE delay means days lost.
 * The two are easy to confuse, so nothing here is ever bare.
 */
export function days(v, { sign = false, unit = 'd' } = {}) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = sign && v > 0 ? '+' : v < 0 ? '−' : '';
  return s + Math.abs(v) + unit;
}

export function pct(x, dp = 0) {
  if (!Number.isFinite(x)) return '0%';
  return (x * 100).toFixed(dp) + '%';
}

export function money(v, cur = '£') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const neg = v < 0;
  return (neg ? '−' : '') + cur + Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

/* ── dates: programme dates are always DD-MMM-YY, like a CPM print ── */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function d2(iso) {
  const d = toDate(iso);
  if (!d) return String(iso ?? '—');
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MON[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

export function dLong(iso) {
  const d = toDate(iso);
  if (!d) return String(iso ?? '—');
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function toDate(iso) {
  if (iso instanceof Date) return iso;
  if (typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

export function iso(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Calendar days between two ISO dates (b − a). */
export function dayDiff(a, b) {
  const A = toDate(a), B = toDate(b);
  if (!A || !B) return 0;
  return Math.round((B - A) / 86400000);
}

/** Add n calendar days to an ISO date, returning ISO. */
export function addDays(isoStr, n) {
  const d = toDate(isoStr);
  if (!d) return isoStr;
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/** Local YYYY-MM-DD — a streak must follow the learner's day, not UTC. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── misc ───────────────────────────────────────────────────── */

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Deterministic PRNG so any generated figure is identical on reload. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function prefersStill() {
  return document.documentElement.dataset.motion === '0' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Screen-reader announcement that does not move focus. */
let live;
export function say(msg) {
  if (!live) {
    live = el('div.sr-only', { role: 'status', 'aria-live': 'polite' });
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 40);
}

/**
 * Every chart carries a hidden data table, so nothing in this course is
 * available only as colour on a canvas. The table is wrapped in a block
 * DIV rather than carrying .sr-only itself: `display: table` treats
 * width:1px as a minimum and would push the page wider than the viewport.
 */
export function altTable(caption, headers, rows) {
  return el('div.sr-only', el('table', [
    el('caption', caption),
    el('thead', el('tr', headers.map(h => el('th', { scope: 'col' }, h)))),
    el('tbody', rows.map(r => el('tr', r.map(c => el('td', String(c))))))
  ]));
}

/** Device-pixel-ratio aware canvas. Returns the 2D context. */
export function fitCanvas(cv, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return c;
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
