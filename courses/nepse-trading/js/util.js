/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — formatting and DOM helpers
   Currency is ALWAYS Nepali/Indian digit grouping: Rs. 1,23,456.78
   ═══════════════════════════════════════════════════════════════ */

/** Nepali/Indian grouping: last three digits, then pairs (lakh, crore). */
export function group(n) {
  const s = String(n);
  if (s.length <= 3) return s;
  const head = s.slice(0, -3);
  const tail = s.slice(-3);
  return head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + tail;
}

/** Rs. 1,23,456.78 — two decimals for prices and money, always. */
export function rs(n, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const v = Math.abs(n).toFixed(dp);
  const [int, frac] = v.split('.');
  // non-breaking space so "Rs." never orphans from its figure when a line wraps
  const NB = ' ';
  return (neg ? '−Rs.' + NB : 'Rs.' + NB) + group(int) + (frac ? '.' + frac : '');
}

/** Bare number with Nepali grouping and no currency mark. */
export function num(n, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const v = Math.abs(n).toFixed(dp);
  const [int, frac] = v.split('.');
  return (neg ? '−' : '') + group(int) + (frac ? '.' + frac : '');
}

/** Large rupee amounts in Nepali scale words. */
export function rsScale(n) {
  const a = Math.abs(n);
  if (a >= 1e12) return 'Rs. ' + (n / 1e12).toFixed(3) + ' trillion';
  if (a >= 1e9) return 'Rs. ' + (n / 1e9).toFixed(2) + ' arba';
  if (a >= 1e7) return 'Rs. ' + (n / 1e7).toFixed(2) + ' crore';
  if (a >= 1e5) return 'Rs. ' + (n / 1e5).toFixed(2) + ' lakh';
  return rs(n);
}

/** Signed percentage. Gains always carry a + sign — never colour alone. */
export function pct(x, dp = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  const v = (x * 100).toFixed(dp);
  return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(v) + '%';
}

/** Unsigned percentage, for progress and accuracy. */
export function pctPlain(x, dp = 0) {
  if (!Number.isFinite(x)) return '0%';
  return (x * 100).toFixed(dp) + '%';
}

const DEVA = '०१२३४५६७८९';
/** Devanagari numerals — decorative markers only, never functional data. */
export function deva(n) {
  return String(n).replace(/\d/g, d => DEVA[+d]);
}
/** Two-digit Devanagari section marker: 1 → ०१ */
export function deva2(n) {
  return deva(String(n).padStart(2, '0'));
}

/** 19 Aug 2026 */
export function fmtDate(d) {
  const dt = typeof d === 'string' ? new Date(d + (d.length === 7 ? '-01' : '')) : new Date(d);
  if (Number.isNaN(+dt)) return String(d);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dt.getDate()} ${M[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** Local YYYY-MM-DD (never UTC — a streak must follow the learner's day). */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

/**
 * Approximate Bikram Sambat conversion.
 * BS runs ~56 years 8.5 months ahead of AD; New Year falls mid-April.
 * Used only for the certificate date line, which is decorative.
 */
export function toBS(date) {
  const d = new Date(date);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const afterNewYear = m > 4 || (m === 4 && day >= 14);
  const bsYear = y + (afterNewYear ? 57 : 56);
  const MON = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
  // month index offset by the mid-April new year
  let idx = (m - 4 + (day >= 14 ? 0 : -1) + 12) % 12;
  return `${MON[idx]} ${bsYear} BS`;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Deterministic PRNG so generated data is identical on every load. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, optionally seeded. Options are shuffled on every render. */
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];

/* ── DOM ────────────────────────────────────────────────────── */

/**
 * el('div.panel', { onclick }, [children])
 * Text children are inserted as text nodes — no HTML is ever parsed from data.
 */
export function el(spec, props = null, children = null) {
  if (Array.isArray(props) || typeof props === 'string' || props instanceof Node) {
    children = props; props = null;
  }
  const [tagPart, ...classes] = String(spec).split('.');
  const tag = tagPart || 'div';
  const n = document.createElement(tag);
  if (classes.length) n.className = classes.join(' ');
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className += (n.className ? ' ' : '') + v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'html') n.innerHTML = v;                 // only ever called with our own markup
      else if (k in n && k !== 'list' && k !== 'type') { try { n[k] = v; } catch { n.setAttribute(k, v); } }
      else n.setAttribute(k, v);
    }
  }
  append(n, children);
  return n;
}

export function append(parent, children) {
  if (children === null || children === undefined || children === false) return parent;
  if (Array.isArray(children)) { children.forEach(c => append(parent, c)); return parent; }
  parent.append(children instanceof Node ? children : document.createTextNode(String(children)));
  return parent;
}

export function frag(children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Adds --i to each child so the entry-stagger animation cascades. */
export function stagger(node, cap = 10) {
  [...node.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, cap)));
  node.classList.add('stagger');
  return node;
}

/** Screen-reader announcement without moving focus. */
let liveRegion;
export function announce(msg) {
  if (!liveRegion) {
    liveRegion = el('div.sr-only', { role: 'status', 'aria-live': 'polite' });
    document.body.append(liveRegion);
  }
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = msg; }, 40);
}

export function prefersReducedMotion() {
  return document.documentElement.dataset.motion === '0' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Device-pixel-ratio aware canvas sizing. Returns the 2D context. */
export function fitCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Every chart carries a hidden data table so it is not colour- or canvas-only.
 * The table sits inside a .sr-only DIV rather than carrying the class itself:
 * `display: table` treats `width: 1px` as a minimum and expands to fit its
 * content, which pushed the page wider than the viewport on small screens.
 * A block wrapper honours the width and clips the table inside it.
 */
export function dataTable(rows, headers, caption) {
  const t = el('table');
  if (caption) t.append(el('caption', caption));
  t.append(el('thead', el('tr', headers.map(h => el('th', { scope: 'col' }, h)))));
  t.append(el('tbody', rows.map(r => el('tr', r.map(c => el('td', String(c)))))));
  return el('div.sr-only', t);
}
