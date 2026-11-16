/* Small chart helpers. No data lives here — callers pass their own numbers.
   Everything is drawn with plain elements and CSS so it follows the theme. */

import { h } from '../lib/h.js';

export const fmtMoney = (n, dp = 2) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

/* spreadsheet day number → Date (local midnight) */
export function fromSerial(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const daysBetween = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);

/* horizontal bars: rows = [{ label, value, text, tone, href }] */
export function bars(rows, { max } = {}) {
  const top = max || Math.max(...rows.map((r) => r.value), 1);
  return h('div.ch-bars', rows.map((r, i) => h(r.href ? 'a.ch-bar' : 'div.ch-bar', { href: r.href || null, style: { '--i': i } },
    h('span.ch-bar__l', r.label),
    h('span.ch-bar__track', h(`span.ch-bar__fill.ch-tone--${r.tone || 'stamp'}`, { style: { width: `${Math.max(0.6, (r.value / top) * 100)}%` } })),
    h('span.ch-bar__v', r.text ?? fmtMoney(r.value, 0)))));
}

/* one stacked bar with its parts in proportion */
export function stack(parts) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return h('div.ch-stack', { role: 'img', 'aria-label': parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ') },
    parts.map((p) => h(`span.ch-stack__p.ch-tone--${p.tone || 'stamp'}`, { style: { width: `${(p.value / total) * 100}%` }, title: `${p.label}: ${Math.round((p.value / total) * 100)}%` },
      (p.value / total) > 0.12 ? h('i', p.label) : null)));
}

/* a donut: parts = [{ label, value, tone }] */
export function donut(parts, { center = '', sub = '' } = {}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 42; const c = 2 * Math.PI * r;
  let off = 0;
  const arcs = parts.map((p) => {
    const len = (p.value / total) * c;
    const s = `<circle cx="60" cy="60" r="${r}" class="ch-donut__arc ch-stroke--${p.tone || 'stamp'}" stroke-dasharray="${Math.max(0, len - 1.5)} ${c - Math.max(0, len - 1.5)}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${p.label}: ${Math.round((p.value / total) * 100)}%</title></circle>`;
    off += len;
    return s;
  }).join('');
  const box = h('div.ch-donut', { html: `<svg viewBox="0 0 120 120" role="img" aria-label="${parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}"><circle cx="60" cy="60" r="${r}" class="ch-donut__bg"/>${arcs}</svg>` });
  box.append(h('div.ch-donut__in', h('b', String(center)), h('span', sub)));
  return box;
}
