/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — canvas candlestick renderer
   One canvas, requestAnimationFrame, never per-candle DOM nodes.
   Up candles are HOLLOW, down candles FILLED — shape carries the
   signal, so meaning is never encoded in colour alone.
   ═══════════════════════════════════════════════════════════════ */

import { el, fitCanvas, cssVar, num, dataTable, prefersReducedMotion, clamp } from '../util.js';

const PAD = { l: 8, r: 56, t: 10, b: 22 };

export class CandleChart {
  /**
   * @param {object} opts
   *   data     – [{d,o,h,l,c,v,circuit?}]
   *   height   – css px
   *   volume   – draw the volume panel
   *   overlays – [{ values:[…], color, width, label }]
   *   panels   – [{ type:'rsi'|'macd'|'hist', … }]
   *   marks    – [{ i, side:'buy'|'sell', label }]
   *   flags    – [{ i, label }]  small pennants above the axis
   *   highlight– { from, to, label }  boxed region
   */
  constructor(container, opts = {}) {
    this.o = Object.assign({
      data: [], height: 320, volume: true, overlays: [], panels: [],
      marks: [], flags: [], highlight: null, crosshair: true,
      showAxis: true, maxBars: 0, hollow: true, barMin: 3
    }, opts);

    this.host = container;
    this.canvas = el('canvas.chart__canvas', { role: 'img' });
    this.tip = el('div.tip', { style: { display: 'none' } });
    this.host.append(this.canvas, this.tip);

    this.offset = 0;                 // pan, in bars from the right
    this.hover = -1;
    this.reveal = 1;                 // 0..1 for the candle-print animation
    this._bind();
    this.resize();
  }

  setData(data, { keepView = false } = {}) {
    this.o.data = data || [];
    if (!keepView) { this.offset = 0; this.hover = -1; }
    this.draw();
    this._describe();
  }

  setOverlays(ov) { this.o.overlays = ov || []; this.draw(); }
  setMarks(m) { this.o.marks = m || []; this.draw(); }

  _bind() {
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    if (this.o.crosshair) {
      this.canvas.addEventListener('pointermove', e => {
        const r = this.canvas.getBoundingClientRect();
        this.hover = this._barAt(e.clientX - r.left);
        this.draw();
        this._tip(e.clientX - r.left, e.clientY - r.top);
      });
      this.canvas.addEventListener('pointerleave', () => {
        this.hover = -1; this.tip.style.display = 'none'; this.draw();
      });
    }

    // touch pan for narrow screens
    let dragX = null, startOffset = 0;
    this.canvas.addEventListener('pointerdown', e => {
      dragX = e.clientX; startOffset = this.offset;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointerup', () => { dragX = null; });
    this.canvas.addEventListener('pointercancel', () => { dragX = null; });
    this.canvas.addEventListener('pointermove', e => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      if (Math.abs(dx) < 4) return;
      const bw = this._barW();
      this.offset = clamp(startOffset + Math.round(dx / bw), 0, Math.max(0, this.o.data.length - 10));
      this.draw();
    });
  }

  destroy() { window.removeEventListener('resize', this._onResize); }

  resize() {
    const w = this.host.clientWidth || 640;
    this.w = w;
    this.h = this.o.height;
    this.ctx = fitCanvas(this.canvas, w, this.h);
    this.draw();
  }

  /* ── geometry ───────────────────────────────────────────── */

  get _plotH() {
    const volH = this.o.volume ? Math.round(this.h * 0.17) : 0;
    const panelH = this.o.panels.length ? Math.round(this.h * 0.2) * this.o.panels.length : 0;
    return this.h - PAD.t - PAD.b - volH - panelH;
  }

  _visible() {
    const d = this.o.data;
    if (!d.length) return { from: 0, to: 0, slice: [] };
    const cap = this.o.maxBars || Math.max(10, Math.floor((this.w - PAD.l - PAD.r) / this.o.barMin / 1.6));
    // `to` must never exceed the data length. An earlier Math.max(10, …) here
    // forced a ten-bar window even on shorter series, so every draw loop read
    // past the end of the array — which crashed the dashboard for any learner
    // whose equity curve had fewer than ten sessions, i.e. every new one.
    const to = Math.min(d.length, Math.max(1, d.length - this.offset));
    const from = Math.max(0, to - cap);
    return { from, to, slice: d.slice(from, to) };
  }

  _barW() {
    const { slice } = this._visible();
    return (this.w - PAD.l - PAD.r) / Math.max(1, slice.length);
  }

  _barAt(x) {
    const { from, slice } = this._visible();
    const bw = this._barW();
    const i = Math.floor((x - PAD.l) / bw);
    return (i >= 0 && i < slice.length) ? from + i : -1;
  }

  /* ── draw ───────────────────────────────────────────────── */

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);

    const { from, to, slice } = this._visible();
    if (!slice.length) return;

    const C = {
      grid: cssVar('--grid'), axis: cssVar('--axis'),
      bull: cssVar('--bull'), bear: cssVar('--bear'),
      vol: cssVar('--volume'), signal: cssVar('--signal'),
      paper3: cssVar('--paper-3'), ink600: cssVar('--ink-600'), ink700: cssVar('--ink-700')
    };

    // price extent, including any overlay values in view
    let lo = Infinity, hi = -Infinity;
    for (const c of slice) { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; }
    for (const ov of this.o.overlays) {
      for (let i = from; i < to; i++) {
        const v = ov.values[i];
        if (v == null || Number.isNaN(v)) continue;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
    }
    const padv = (hi - lo) * 0.08 || 1;
    lo -= padv; hi += padv;

    const plotH = this._plotH;
    const y = p => PAD.t + (1 - (p - lo) / (hi - lo)) * plotH;
    const bw = this._barW();
    const x = i => PAD.l + (i - from) * bw + bw / 2;
    this._y = y; this._x = x; this._lo = lo; this._hi = hi;

    /* grid + price axis */
    ctx.save();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.font = '500 10px "Martian Mono", ui-monospace, monospace';
    ctx.fillStyle = C.axis; ctx.textBaseline = 'middle';
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const p = lo + (hi - lo) * i / ticks;
      const yy = Math.round(y(p)) + 0.5;
      ctx.beginPath(); ctx.moveTo(PAD.l, yy); ctx.lineTo(this.w - PAD.r, yy); ctx.stroke();
      if (this.o.showAxis) ctx.fillText(num(p, p > 999 ? 0 : 2), this.w - PAD.r + 6, yy);
    }
    ctx.restore();

    /* highlighted pattern region */
    if (this.o.highlight) {
      const { from: hf, to: ht, label } = this.o.highlight;
      if (ht >= from && hf < to) {
        const x0 = x(Math.max(hf, from)) - bw / 2 - 1;
        const x1 = x(Math.min(ht, to - 1)) + bw / 2 + 1;
        ctx.save();
        ctx.fillStyle = 'rgba(255,182,39,0.08)';
        ctx.fillRect(x0, PAD.t, x1 - x0, plotH);
        ctx.strokeStyle = C.signal; ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(x0) + .5, PAD.t + .5, Math.round(x1 - x0), Math.round(plotH) - 1);
        if (label) {
          ctx.font = '500 10px "Martian Mono", ui-monospace, monospace';
          ctx.fillStyle = C.signal; ctx.textBaseline = 'bottom';
          ctx.fillText(label, x0, PAD.t - 1);
        }
        ctx.restore();
      }
    }

    /* volume panel */
    if (this.o.volume) {
      const volTop = PAD.t + plotH + 8;
      const volH = Math.round(this.h * 0.17) - 8;
      let vmax = 0;
      for (const c of slice) if ((c.v || 0) > vmax) vmax = c.v || 0;
      ctx.save();
      for (let i = from; i < to; i++) {
        const c = this.o.data[i];
        const vh = vmax ? ((c.v || 0) / vmax) * volH : 0;
        ctx.fillStyle = c.c >= c.o ? 'rgba(49,208,170,0.28)' : 'rgba(240,82,109,0.28)';
        ctx.fillRect(x(i) - bw * 0.32, volTop + volH - vh, Math.max(1, bw * 0.64), vh);
      }
      ctx.restore();
    }

    /* the candles */
    const n = slice.length;
    const shown = this.reveal >= 1 ? n : Math.floor(n * this.reveal);
    ctx.save();
    ctx.lineWidth = 1;
    for (let k = 0; k < n; k++) {
      const i = from + k;
      const c = this.o.data[i];
      if (k >= shown) break;
      const up = c.c >= c.o;
      const col = up ? C.bull : C.bear;
      const cx = Math.round(x(i)) + 0.5;

      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(cx, y(c.h)); ctx.lineTo(cx, y(c.l)); ctx.stroke();

      const bodyTop = y(Math.max(c.o, c.c));
      const bodyBot = y(Math.min(c.o, c.c));
      const bwid = Math.max(1, Math.floor(bw * 0.62));
      const bx = Math.round(cx - bwid / 2) + 0.5;
      const bh = Math.max(1, bodyBot - bodyTop);

      if (up && this.o.hollow) {
        ctx.strokeRect(bx, Math.round(bodyTop) + 0.5, bwid, Math.round(bh));
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(bx, Math.round(bodyTop), bwid, Math.round(bh));
      }

      // a circuit day is drawn with a dashed cap — price stopped because it
      // was not allowed to move, and the chart should say so
      if (c.circuit) {
        ctx.save();
        ctx.setLineDash([2, 2]); ctx.strokeStyle = C.signal;
        const cy = Math.round(up ? bodyTop : bodyBot) + 0.5;
        ctx.beginPath(); ctx.moveTo(bx - 2, cy); ctx.lineTo(bx + bwid + 2, cy); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();

    /* overlays (moving averages etc.) */
    for (const ov of this.o.overlays) {
      ctx.save();
      ctx.strokeStyle = ov.color || C.signal;
      ctx.lineWidth = ov.width || 1.4;
      ctx.beginPath();
      let started = false;
      for (let i = from; i < to; i++) {
        const v = ov.values[i];
        if (v == null || Number.isNaN(v)) { started = false; continue; }
        const px = x(i), py = y(v);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* the learner's own fills */
    for (const m of this.o.marks) {
      if (m.i < from || m.i >= to) continue;
      const px = x(m.i), py = y(m.price ?? this.o.data[m.i].c);
      ctx.save();
      ctx.fillStyle = m.side === 'buy' ? C.bull : C.bear;
      ctx.beginPath();
      const s = 5, dir = m.side === 'buy' ? 1 : -1;
      ctx.moveTo(px, py + dir * -s * 1.6);
      ctx.lineTo(px - s, py + dir * -s * 3.2);
      ctx.lineTo(px + s, py + dir * -s * 3.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* rank pennants */
    for (const f of this.o.flags) {
      if (f.i < from || f.i >= to) continue;
      const px = Math.round(x(f.i)) + 0.5;
      ctx.save();
      ctx.strokeStyle = C.signal; ctx.fillStyle = C.signal; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, PAD.t + 2); ctx.lineTo(px, PAD.t + 16); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, PAD.t + 2); ctx.lineTo(px + 16, PAD.t + 6); ctx.lineTo(px, PAD.t + 10);
      ctx.closePath(); ctx.fill();
      if (f.label) {
        ctx.font = '500 9px "Martian Mono", ui-monospace, monospace';
        ctx.fillStyle = C.signal; ctx.textBaseline = 'top';
        ctx.fillText(f.label, px + 19, PAD.t + 1);
      }
      ctx.restore();
    }

    /* extra panels (RSI / MACD) */
    let py = PAD.t + plotH + (this.o.volume ? Math.round(this.h * 0.17) : 0);
    for (const p of this.o.panels) {
      const ph = Math.round(this.h * 0.2);
      this._panel(p, py, ph, from, to, x, C);
      py += ph;
    }

    /* crosshair */
    if (this.hover >= from && this.hover < to) {
      const cx = Math.round(x(this.hover)) + 0.5;
      ctx.save();
      ctx.strokeStyle = C.ink600; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, PAD.t); ctx.lineTo(cx, this.h - PAD.b); ctx.stroke();
      ctx.restore();
    }

    /* date axis */
    if (this.o.showAxis) {
      ctx.save();
      ctx.font = '500 9px "Martian Mono", ui-monospace, monospace';
      ctx.fillStyle = C.axis; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      const step = Math.max(1, Math.round(n / 6));
      for (let k = 0; k < n; k += step) {
        const i = from + k;
        const d = this.o.data[i].d;
        if (!d) continue;
        ctx.fillText(String(d).slice(2, 10).replace(/-/g, '.'), x(i), this.h - PAD.b + 4);
      }
      ctx.restore();
    }
  }

  _panel(p, top, h, from, to, x, C) {
    const ctx = this.ctx;
    const pad = 6;
    const inner = h - pad * 2;
    ctx.save();
    ctx.strokeStyle = C.ink700; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.l, top + .5); ctx.lineTo(this.w - PAD.r, top + .5); ctx.stroke();

    let lo = p.min, hi = p.max;
    if (lo == null || hi == null) {
      lo = Infinity; hi = -Infinity;
      for (const s of p.series) for (let i = from; i < to; i++) {
        const v = s.values[i];
        if (v == null || Number.isNaN(v)) continue;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      if (!Number.isFinite(lo)) { ctx.restore(); return; }
      const pd = (hi - lo) * 0.1 || 1; lo -= pd; hi += pd;
    }
    const yy = v => top + pad + (1 - (v - lo) / (hi - lo)) * inner;

    // guide lines (RSI 30/70)
    for (const g of (p.guides || [])) {
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.setLineDash([2, 3]);
      const gy = Math.round(yy(g)) + .5;
      ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(this.w - PAD.r, gy); ctx.stroke();
      ctx.font = '500 9px "Martian Mono", ui-monospace, monospace';
      ctx.fillStyle = C.axis; ctx.textBaseline = 'middle'; ctx.setLineDash([]);
      ctx.fillText(String(g), this.w - PAD.r + 6, gy);
      ctx.restore();
    }

    for (const s of p.series) {
      if (s.type === 'hist') {
        const zero = yy(0);
        for (let i = from; i < to; i++) {
          const v = s.values[i];
          if (v == null || Number.isNaN(v)) continue;
          ctx.fillStyle = v >= 0 ? 'rgba(49,208,170,0.55)' : 'rgba(240,82,109,0.55)';
          const yv = yy(v);
          ctx.fillRect(x(i) - 1.5, Math.min(zero, yv), 3, Math.abs(yv - zero) || 1);
        }
        continue;
      }
      ctx.strokeStyle = s.color || C.signal;
      ctx.lineWidth = s.width || 1.3;
      ctx.beginPath();
      let started = false;
      for (let i = from; i < to; i++) {
        const v = s.values[i];
        if (v == null || Number.isNaN(v)) { started = false; continue; }
        if (!started) { ctx.moveTo(x(i), yy(v)); started = true; } else ctx.lineTo(x(i), yy(v));
      }
      ctx.stroke();
    }

    if (p.label) {
      ctx.font = '500 9px "Martian Mono", ui-monospace, monospace';
      ctx.fillStyle = C.paper3; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillText(p.label, PAD.l + 2, top + 3);
    }
    ctx.restore();
  }

  _tip(px, py) {
    const c = this.o.data[this.hover];
    if (!c) { this.tip.style.display = 'none'; return; }
    const chg = c.pc != null ? (c.c - c.pc) / c.pc : null;
    const row = (k, v, cls) => `<div class="r"><span>${k}</span><b${cls ? ` class="${cls}"` : ''}>${v}</b></div>`;
    this.tip.innerHTML =
      `<div class="r"><b>${c.d || ''}</b></div>` +
      row('O', num(c.o)) + row('H', num(c.h)) + row('L', num(c.l)) +
      row('C', num(c.c), c.c >= c.o ? 'up' : 'down') +
      (c.v != null ? row('VOL', num(c.v, 0)) : '') +
      (chg != null ? row('CHG', (chg > 0 ? '+' : '') + (chg * 100).toFixed(2) + '%') : '') +
      (c.circuit ? `<div class="r"><span class="hi">CIRCUIT DAY</span></div>` : '') +
      (c.note ? `<div class="r"><span>${c.note}</span></div>` : '');
    this.tip.style.display = 'block';
    const w = this.tip.offsetWidth, h = this.tip.offsetHeight;
    this.tip.style.left = Math.min(Math.max(4, px + 12), this.w - w - 4) + 'px';
    this.tip.style.top = Math.min(Math.max(4, py - h - 10), this.h - h - 4) + 'px';
  }

  /** Animation #2 of exactly three: a new candle draws bottom-up. */
  printCandle() {
    if (prefersReducedMotion()) { this.reveal = 1; this.draw(); return; }
    this.reveal = Math.max(0, 1 - 1 / Math.max(1, this._visible().slice.length));
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 400);
      this.reveal = Math.max(this.reveal, k === 1 ? 1 : this.reveal + (1 - this.reveal) * k);
      this.draw();
      if (k < 1) requestAnimationFrame(step); else { this.reveal = 1; this.draw(); }
    };
    requestAnimationFrame(step);
  }

  /** Every chart carries a text alternative and a hidden data table. */
  _describe() {
    const d = this.o.data;
    if (!d.length) return;
    const first = d[0], last = d[d.length - 1];
    const chg = (last.c - first.c) / first.c;
    this.canvas.setAttribute('aria-label',
      `Candlestick chart, ${d.length} sessions from ${first.d || 'start'} to ${last.d || 'end'}. ` +
      `Opened at ${num(first.o)}, closed at ${num(last.c)}, ` +
      `${chg >= 0 ? 'up' : 'down'} ${Math.abs(chg * 100).toFixed(1)}% overall.`);
    this._table?.remove();
    this._table = dataTable(
      d.map(c => [c.d || '', num(c.o), num(c.h), num(c.l), num(c.c), num(c.v || 0, 0)]),
      ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'],
      'Chart data in table form'
    );
    this.host.append(this._table);
  }
}

/** Convenience: a titled chart panel with the illustrative stamp. */
export function chartPanel({ title, sub, height = 300, illustrative = true, foot }) {
  const body = el('div', { style: { position: 'relative' } });
  const panel = el('div.chart', [
    (title || sub) && el('div.chart__head', [
      title && el('span.chart__t', title),
      sub && el('span.chart__sub', sub)
    ]),
    body,
    foot && el('div.chart__foot', foot)
  ]);
  if (illustrative) body.append(el('span.chart__stamp', 'Illustrative data'));
  return { panel, body };
}
