/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — shared parts every instrument is built from
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, add } from '../dom.js';

/** The frame with a title block. Every widget in the course wears one. */
export function fig(title, sub, body, note, opts = {}) {
  const n = el('div.fig', [
    (title || sub) && el('div.fig__head', [
      title && el('span.fig__t', title),
      sub && el('span.fig__s', sub)
    ]),
    ...(opts.before || []),
    el('div', { class: 'fig__body' + (opts.flush ? ' fig__body--flush' : '') }, body),
    ...(opts.extras || []),
    note && el('p.fig__note', note)
  ]);
  return n;
}

export function ctlBar(children, top = false) {
  return el('div', { class: 'ctl' + (top ? ' ctl--top' : '') }, children);
}

/** Tab strip. onPick(index, label) fires on change. */
export function tabs(labels, onPick, initial = 0) {
  const btns = labels.map((t, i) => el('button', {
    type: 'button', role: 'tab',
    aria: { selected: String(i === initial) },
    onclick: () => {
      btns.forEach(b => b.setAttribute('aria-selected', 'false'));
      btns[i].setAttribute('aria-selected', 'true');
      onPick(i, t);
    }
  }, t));
  return el('div.tabs', { role: 'tablist' }, btns);
}

/** A row of derived figures under an instrument. */
export function readout(items) {
  return el('div.readout', items.map(([label, value, tone]) =>
    el('div', [
      el('span', label),
      el('b', { class: tone ? 'is-' + tone : '' }, value)
    ])
  ));
}

/** Update one cell of a readout in place, flashing the change. */
export function setReadout(root, index, value, tone) {
  const b = root.querySelectorAll('.readout > div > b')[index];
  if (!b) return;
  b.textContent = value;
  b.className = tone ? 'is-' + tone : '';
  b.classList.remove('flashed');
  void b.offsetWidth;
  b.classList.add('flashed');
}

export function field(label, input, suffix) {
  return el('div.field', [el('label', label), input, suffix && el('span.dim', { style: { fontSize: 'var(--t-mm)' } }, suffix)]);
}

export function numInput(value, opts = {}) {
  return el('input', { type: 'number', value: String(value), ...opts });
}

export function slider(value, { min = 0, max = 30, step = 1, onInput, fmt = v => v + 'd' } = {}) {
  const out = el('output', fmt(value));
  const input = el('input', {
    type: 'range', min, max, step, value: String(value),
    oninput: e => { out.textContent = fmt(+e.target.value); onInput?.(+e.target.value); }
  });
  return { node: el('div.field', [input, out]), input, out };
}

export function select(options, { value, onChange } = {}) {
  return el('select', {
    onchange: e => onChange?.(e.target.value),
    value
  }, options.map(o => el('option', {
    value: o.v ?? o, selected: (o.v ?? o) === value
  }, o.l ?? o)));
}

/** Legend row. items: [[label, className|cssColor, shape]] */
export function legend(items) {
  return el('div.legend', items.map(([label, tone, shape = 'box']) => {
    const color = tone.startsWith('--') ? `var(${tone})` : tone;
    const sw = shape === 'hatch'
      ? el('i.sw.sw--hatch', { style: { color, width: '11px', height: '11px', display: 'block' } })
      : shape === 'ring'
        ? el('i.sw.sw--ring', { style: { color, width: '10px', height: '10px', display: 'block' } })
        : el('i.sw', { style: { background: color } });
    return el('span', [sw, label]);
  }));
}

/* ── SVG scaffolding shared by every chart ──────────────────── */

/**
 * A linear scale. dom = [min,max] of data, rng = [min,max] of pixels.
 */
export function scale(dom, rng) {
  const [d0, d1] = dom, [r0, r1] = rng;
  const span = d1 - d0 || 1;
  const f = v => r0 + ((v - d0) / span) * (r1 - r0);
  f.invert = p => d0 + ((p - r0) / (r1 - r0 || 1)) * span;
  f.domain = dom; f.range = rng;
  return f;
}

export function niceTicks(min, max, count = 5) {
  const span = (max - min) || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw))));
  const norm = raw / mag;
  const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Build an SVG path from [x,y] points. */
export function polyline(pts) {
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
}

/** Path length, for the stroke-dash draw-in animation. */
export function pathLen(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  try { return p.getTotalLength(); } catch { return 1200; }
}

/** A drawn line that animates itself in. */
export function drawLine(d, color, { width = 1.8, delay = 0, dash = null, animate = true } = {}) {
  const len = animate ? pathLen(d) : 0;
  return svg('path', {
    class: 'c-line' + (animate ? ' draw' : ''),
    d, stroke: color,
    'stroke-width': width,
    'stroke-dasharray': dash || undefined,
    style: animate ? { '--len': len, '--d': delay + 'ms' } : {}
  });
}
