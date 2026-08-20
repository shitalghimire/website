/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — widget registry
   Lesson JSON names a widget; this maps the name to a function that
   returns a DOM node. Every lesson has one. No exceptions.
   ═══════════════════════════════════════════════════════════════ */

import { ctx } from './app.js';
import { el, frag, num, rs, rsScale, pct, pctPlain, fitCanvas, cssVar, clamp, dataTable, mulberry32, shuffle, announce } from './util.js';
import { CandleChart, chartPanel } from './chart/candles.js';
import { sma, ema, rsi, macd, trendAt } from './chart/indicators.js';
import { scan } from './chart/patterns.js';
import * as money from './money.js';
import { candles as loadCandles } from './data.js';
import { md, table as mdTable, inline } from './render.js';

/* ── small shared pieces ────────────────────────────────────── */

function frame(title, sub, body, note) {
  return el('div.widget', [
    (title || sub) && el('div.widget__head', [
      title && el('span.chart__t', title),
      sub && el('span.chart__sub', sub)
    ]),
    el('div.widget__body', body),
    note && el('p.widget__note', note)
  ]);
}

function tabs(items, onPick) {
  const bar = el('div.tabs', { role: 'tablist' });
  const btns = items.map((t, i) => {
    const b = el('button', {
      role: 'tab', type: 'button',
      'aria-selected': String(i === 0),
      onclick: () => {
        btns.forEach(x => x.setAttribute('aria-selected', 'false'));
        b.setAttribute('aria-selected', 'true');
        onPick(i, t);
      }
    }, t);
    return b;
  });
  bar.append(...btns);
  return bar;
}

function field(label, input) {
  return el('div.field', [el('label', label), input]);
}

function numInput(value, opts = {}) {
  return el('input', { type: 'number', value: String(value), ...opts });
}

/** An async widget: renders a placeholder, swaps in the real thing. */
function lazy(promise, build) {
  const host = el('div', el('p.widget__note', 'Loading chart data…'));
  promise.then(data => {
    try { host.replaceChildren(build(data)); }
    catch (e) { console.error(e); host.replaceChildren(el('p.widget__note', 'This chart could not be drawn.')); }
  }).catch(() => host.replaceChildren(el('p.widget__note', 'Chart data unavailable.')));
  return host;
}

/* ══════════════════════════════════════════════════════════════
   1 · candle-chart
   ══════════════════════════════════════════════════════════════ */

function candleChart(props) {
  const { symbol = 'UPPER', bars = 90, mode = 'normal', overlays = [], highlightPattern, seasonality } = props;

  if (mode === 'anatomy') return candleAnatomy(props);

  return lazy(loadCandles(symbol), series => {
    const data = series.candles.slice(-bars);
    const { panel, body } = chartPanel({
      title: `${series.symbol} · ${series.name}`,
      sub: `${data.length} sessions · daily`,
      illustrative: series.source === 'illustrative'
    });

    const ov = [];
    const closes = data.map(c => c.c);
    for (const o of overlays) {
      if (o.type === 'sma') ov.push({ values: sma(closes, o.n), color: o.n <= 20 ? cssVar('--ma-fast') : cssVar('--ma-slow'), label: `SMA ${o.n}` });
      if (o.type === 'ema') ov.push({ values: ema(closes, o.n), color: cssVar('--ma-slow'), label: `EMA ${o.n}` });
    }

    let highlight = null;
    if (highlightPattern) {
      const found = scan(data, ctx.patterns).filter(f => f.key === highlightPattern);
      if (found.length) {
        const f = found[Math.floor(found.length / 2)];
        highlight = { from: f.from, to: f.to, label: ctx.patterns[f.key].name };
      }
    }

    const chart = new CandleChart(body, { data, height: 320, volume: true, overlays: ov, highlight });
    chart.setData(data);

    const legend = ov.length ? el('div.legend', ov.map(o =>
      el('span', [el('i', { style: { background: o.color } }), o.label]))) : null;

    if (legend || seasonality) panel.append(el('div.chart__foot', [legend, seasonality && seasonalStrip()]));
    return panel;
  });
}

/** The wet/dry generation shape that makes hydropower quarters incomparable. */
function seasonalStrip() {
  const months = ['Shr', 'Bhd', 'Asw', 'Kar', 'Man', 'Pou', 'Mag', 'Fal', 'Cha', 'Bai', 'Jes', 'Ash'];
  const plf = [0.95, 0.98, 0.88, 0.62, 0.40, 0.28, 0.22, 0.20, 0.24, 0.38, 0.60, 0.88];
  return el('div', { style: { display: 'flex', gap: '3px', alignItems: 'flex-end', height: '34px' },
    role: 'img', 'aria-label': 'Monthly plant load factor: near full in the monsoon, around 20% in the dry season.' },
    plf.map((v, i) => el('span', {
      title: `${months[i]} — PLF ${(v * 100).toFixed(0)}%`,
      style: {
        width: '9px', height: (v * 30) + 'px', display: 'block',
        background: v > 0.6 ? 'var(--bull)' : v > 0.35 ? 'var(--signal)' : 'var(--bear-dim)'
      }
    })));
}

/** One enormous candle with live O/H/L/C inputs and a "who won?" drill. */
function candleAnatomy() {
  let o = 230, h = 244, l = 226, c = 237;
  const cv = el('canvas', { role: 'img' });
  const host = el('div', { style: { position: 'relative' } }, cv);
  const readout = el('div.legend', { style: { marginTop: 'var(--s3)' } });

  function draw() {
    const W = host.clientWidth || 600, H = 300;
    const ctx2 = fitCanvas(cv, W, H);
    const lo = Math.min(o, h, l, c) - 4, hi = Math.max(o, h, l, c) + 4;
    const Y = v => 30 + (1 - (v - lo) / (hi - lo)) * (H - 70);
    const cx = W * 0.36;
    const up = c >= o;
    const col = up ? cssVar('--bull') : cssVar('--bear');

    ctx2.clearRect(0, 0, W, H);
    ctx2.strokeStyle = col; ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.moveTo(cx, Y(h)); ctx2.lineTo(cx, Y(l)); ctx2.stroke();

    const bw = 52, top = Y(Math.max(o, c)), bot = Y(Math.min(o, c));
    if (up) { ctx2.lineWidth = 2; ctx2.strokeRect(cx - bw / 2, top, bw, Math.max(2, bot - top)); }
    else { ctx2.fillStyle = col; ctx2.fillRect(cx - bw / 2, top, bw, Math.max(2, bot - top)); }

    // callouts
    ctx2.font = '500 10px "Martian Mono", monospace';
    ctx2.strokeStyle = cssVar('--ink-600'); ctx2.lineWidth = 1;
    const call = (v, label, side) => {
      const y = Y(v);
      const x2 = side === 'r' ? cx + bw / 2 + 60 : cx - bw / 2 - 60;
      ctx2.beginPath();
      ctx2.moveTo(side === 'r' ? cx + bw / 2 + 2 : cx - bw / 2 - 2, y);
      ctx2.lineTo(x2, y); ctx2.stroke();
      ctx2.fillStyle = cssVar('--paper-3');
      ctx2.textAlign = side === 'r' ? 'left' : 'right';
      ctx2.textBaseline = 'middle';
      ctx2.fillText(`${label} ${num(v)}`, side === 'r' ? x2 + 4 : x2 - 4, y);
    };
    call(h, 'HIGH', 'r'); call(l, 'LOW', 'r');
    call(o, 'OPEN', 'l'); call(c, 'CLOSE', 'l');

    // body / wick brackets
    ctx2.fillStyle = cssVar('--signal');
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'top';
    ctx2.fillText('BODY', cx, (top + bot) / 2 - 5);

    cv.setAttribute('aria-label',
      `A candle with open ${o}, high ${h}, low ${l}, close ${c}. ` +
      `${up ? 'Bullish — drawn hollow.' : 'Bearish — drawn filled.'}`);

    const range = h - l, body = Math.abs(c - o);
    readout.replaceChildren(
      el('span', `Body ${((body / range) * 100).toFixed(0)}% of range`),
      el('span', `Upper wick ${(((h - Math.max(o, c)) / range) * 100).toFixed(0)}%`),
      el('span', `Lower wick ${(((Math.min(o, c) - l) / range) * 100).toFixed(0)}%`),
      el('span', { class: up ? 'up' : 'down' }, up ? 'Bullish — hollow' : 'Bearish — filled')
    );
  }

  const inputs = el('div.fields', [
    field('Open', numInput(o, { step: '0.1', oninput: e => { o = +e.target.value; draw(); } })),
    field('High', numInput(h, { step: '0.1', oninput: e => { h = +e.target.value; draw(); } })),
    field('Low', numInput(l, { step: '0.1', oninput: e => { l = +e.target.value; draw(); } })),
    field('Close', numInput(c, { step: '0.1', oninput: e => { c = +e.target.value; draw(); } }))
  ]);

  const verdict = el('p.widget__note');
  const drill = el('div.row', [
    el('button.btn.btn--sm', {
      onclick: () => {
        const r = Math.random;
        o = 200 + Math.round(r() * 60);
        const rng = 4 + r() * 18;
        h = o + r() * rng; l = o - r() * rng;
        c = l + r() * (h - l);
        [o, h, l, c] = [o, h, l, c].map(v => Math.round(v * 100) / 100);
        h = Math.max(h, o, c); l = Math.min(l, o, c);
        inputs.querySelectorAll('input').forEach((inp, i) => inp.value = [o, h, l, c][i]);
        verdict.textContent = 'Who won this day?';
        draw();
      }
    }, '↻ Randomise'),
    ...['Buyers', 'Sellers', 'Nobody'].map(who => el('button.btn.btn--sm', {
      onclick: () => {
        const body = Math.abs(c - o), range = Math.max(1e-9, h - l);
        const truth = body / range < 0.18 ? 'Nobody' : (c > o ? 'Buyers' : 'Sellers');
        const right = who === truth;
        verdict.textContent = (right ? '✓ Correct. ' : '✗ Not this time. ') +
          (truth === 'Nobody'
            ? `The body is only ${((body / range) * 100).toFixed(0)}% of the range — the session settled almost nothing, however far price travelled.`
            : `The body is ${((body / range) * 100).toFixed(0)}% of the range and the close is ${c > o ? 'above' : 'below'} the open, so ${truth.toLowerCase()} finished in control.`);
        verdict.style.color = right ? 'var(--bull)' : 'var(--bear)';
      }
    }, who))
  ]);

  requestAnimationFrame(draw);
  window.addEventListener('resize', draw);

  return frame('Anatomy of one candle', 'Change the numbers and watch it redraw',
    [host, readout, el('hr.rule'), inputs, el('div', { style: { marginTop: 'var(--s4)' } }, drill), verdict],
    'Four numbers make a candle: open, high, low, close. The body is the settled result; the wicks are ground taken and given back.');
}

/* ══════════════════════════════════════════════════════════════
   2 · tax-comparison-table
   ══════════════════════════════════════════════════════════════ */

function taxComparison() {
  const fees = ctx.fees;
  let gain = 40000, days = 200, type = 'individual';

  const out = el('div');

  function paint() {
    const now = money.cgt({ netBeforeTax: gain, costBasis: 0, holdingDays: days, investorType: type, fees });
    const before = money.cgtPrevious({ gain, holdingDays: days, investorType: type, fees });
    const diff = now.tax - before.tax;

    out.replaceChildren(
      el('div.scroll-x', el('table.table', [
        el('thead', el('tr', [
          el('th', { scope: 'col' }, 'Regime'),
          el('th', { scope: 'col' }, 'Applies'),
          el('th.n', { scope: 'col' }, 'Rate'),
          el('th.n', { scope: 'col' }, 'Tax on this gain')
        ])),
        el('tbody', [
          el('tr', [
            el('td', 'Before 17 Jul 2026'),
            el('td', `to ${fees.cgt.previous.until}`),
            el('td.n', pctPlain(before.rate, 1)),
            el('td.n', rs(before.tax))
          ]),
          el('tr', [
            el('td', el('strong', 'From 17 Jul 2026')),
            el('td', 'current'),
            el('td.n', el('strong', pctPlain(now.rate, 1))),
            el('td.n', el('strong', rs(now.tax)))
          ])
        ])
      ])),
      el('div.callout', {
        class: 'callout ' + (diff > 0 ? 'callout--danger' : 'callout--info'),
        style: { marginTop: 'var(--s4)' }
      }, [
        el('span.callout__l', diff > 0 ? 'What the change costs you' : 'No change for this case'),
        el('p', diff > 0
          ? `This change costs you ${rs(diff)} on this trade. The holding period is ${num(days, 0)} days, which is ` +
            `${days > 365 ? 'more than 365 — long-term' : '365 or fewer — short-term'}, so the rate went from ` +
            `${pctPlain(before.rate, 1)} to ${pctPlain(now.rate, 1)}.`
          : `Institutional CGT stayed at ${pctPlain(now.rate, 1)} through the July 2026 change.`)
      ]),
      el('p.asof', `Rates as at ${fees.asOf}. CGT is withheld at source and is a final tax.`)
    );
  }

  const controls = el('div.fields', { style: { marginBottom: 'var(--s4)' } }, [
    field('Gain (Rs.)', numInput(gain, { step: '1000', min: '0', oninput: e => { gain = Math.max(0, +e.target.value); paint(); } })),
    field('Held (days)', numInput(days, { step: '1', min: '0', oninput: e => { days = Math.max(0, +e.target.value); paint(); } })),
    field('Investor', el('select', {
      onchange: e => { type = e.target.value; paint(); }
    }, [el('option', { value: 'individual' }, 'Individual'), el('option', { value: 'institution' }, 'Institution')]))
  ]);

  paint();
  return frame('Capital gains tax — before and after 17 July 2026', 'Enter a gain and a holding period',
    [controls, out]);
}

/* ══════════════════════════════════════════════════════════════
   3 · cost-calculator  (slab mode + break-even mode)
   ══════════════════════════════════════════════════════════════ */

function costCalculator(props = {}) {
  const fees = ctx.fees;
  let mode = props.mode === 'breakeven' ? 1 : 0;
  let value = 250000;              // slab mode
  let qty = 200, price = 496.10;   // break-even mode
  let sell = 520;

  const body = el('div');
  const bar = tabs(['Slab & cost', 'Break-even'], i => { mode = i; paint(); });

  function paint() { mode === 0 ? paintSlab() : paintBE(); }

  function paintSlab() {
    const cost = money.tradeCost({ qty: 1, price: value, side: 'buy', fees });
    const effective = (cost.commission + cost.sebon + cost.dp) / value;

    const cv = el('canvas', { role: 'img', 'aria-label': 'Effective cost as a percentage of transaction value, stepping down at each of the four slab boundaries.' });
    const host = el('div', cv);

    const draw = () => {
      const W = host.clientWidth || 600, H = 150;
      const c2 = fitCanvas(cv, W, H);
      c2.clearRect(0, 0, W, H);
      const maxV = 20000000;
      const X = v => 30 + (Math.log10(Math.max(1000, v)) - 3) / (Math.log10(maxV) - 3) * (W - 60);
      const pts = [];
      for (let lv = 3; lv <= Math.log10(maxV); lv += 0.01) {
        const v = Math.pow(10, lv);
        const t = money.tradeCost({ qty: 1, price: v, side: 'buy', fees });
        pts.push([X(v), (t.commission + t.sebon + t.dp) / v]);
      }
      const hiY = Math.max(...pts.map(p => p[1]));
      const Y = r => 14 + (r / (hiY * 1.05)) * (H - 40);

      c2.strokeStyle = cssVar('--grid'); c2.lineWidth = 1;
      c2.beginPath(); c2.moveTo(30, H - 22); c2.lineTo(W - 30, H - 22); c2.stroke();

      c2.strokeStyle = cssVar('--bull'); c2.lineWidth = 1.6;
      c2.beginPath();
      pts.forEach((p, i) => i ? c2.lineTo(p[0], Y(p[1])) : c2.moveTo(p[0], Y(p[1])));
      c2.stroke();

      // the four slab boundaries
      c2.setLineDash([2, 3]);
      for (const s of fees.commissionSlabs) {
        if (s.max === null) continue;
        c2.strokeStyle = cssVar('--signal'); c2.lineWidth = 1;
        const x = X(s.max);
        c2.beginPath(); c2.moveTo(x, 10); c2.lineTo(x, H - 22); c2.stroke();
      }
      c2.setLineDash([]);

      // where the learner is
      const x = X(value);
      c2.fillStyle = cssVar('--signal');
      c2.beginPath(); c2.arc(x, Y(effective), 4, 0, Math.PI * 2); c2.fill();
      c2.font = '500 10px "Martian Mono", monospace';
      c2.fillStyle = cssVar('--paper-3'); c2.textAlign = 'left'; c2.textBaseline = 'top';
      c2.fillText('Rs. 1k', 30, H - 18);
      c2.textAlign = 'right';
      c2.fillText('Rs. 2 crore', W - 30, H - 18);
    };
    requestAnimationFrame(draw);

    body.replaceChildren(
      bar,
      el('div', { style: { marginTop: 'var(--s4)' } }, [
        el('div.spread', [
          el('span.kicker', 'Transaction value'),
          el('span.num', { style: { fontSize: 'var(--t-md)', fontWeight: 600 } }, rs(value))
        ]),
        el('input', {
          type: 'range', min: '3', max: '7.3', step: '0.01',
          value: String(Math.log10(value)),
          'aria-label': 'Transaction value',
          oninput: e => { value = Math.round(Math.pow(10, +e.target.value)); paintSlab(); }
        })
      ]),
      host,
      el('div.calc', { style: { marginTop: 'var(--s4)' } }, [
        row('Slab', cost.slab.label),
        row('Commission rate', pctPlain(cost.slab.rate, 3)),
        row('Commission', rs(cost.commission)),
        row(`SEBON fee (${pctPlain(fees.sebonEquity, 3)})`, rs(cost.sebon)),
        row('DP charge (flat)', rs(cost.dp)),
        row('Total cost to buy', rs(cost.total), true),
        row('Effective cost', pctPlain(effective, 3) + ' of the trade', true)
      ]),
      el('p.asof', `Fee schedule as at ${fees.asOf}`)
    );
  }

  function paintBE() {
    const be = money.breakEven({ qty, price, fees });
    const rt = money.roundTrip({ qty, buyPrice: price, sellPrice: sell, holdingDays: 200, fees });
    const win = rt.profit >= 0;

    body.replaceChildren(
      bar,
      el('div.fields', { style: { marginTop: 'var(--s4)' } }, [
        field('Quantity (kitta)', numInput(qty, { min: '1', step: '10', oninput: e => { qty = Math.max(1, +e.target.value); paintBE(); } })),
        field('Buy price (Rs.)', numInput(price, { step: '0.1', min: '1', oninput: e => { price = Math.max(1, +e.target.value); paintBE(); } }))
      ]),
      el('div.calc', { style: { marginTop: 'var(--s4)' } }, [
        row('Gross', rs(qty * price)),
        row('Commission', rs(be.buy.commission)),
        row('SEBON fee', rs(be.buy.sebon)),
        row('DP charge', rs(be.buy.dp)),
        row('Total cost to buy', rs(be.buy.total), true),
        row('WACC per share', rs(be.wacc, 4)),
        row('Break-even price', rs(be.price), true),
        row('Move needed', pct(be.movePct), true)
      ]),
      el('div', { style: { marginTop: 'var(--s5)' } }, [
        el('div.spread', [
          el('span.kicker', 'Drag your sell price'),
          el('span.num', { style: { fontSize: 'var(--t-md)', fontWeight: 600 } }, rs(sell))
        ]),
        el('input', {
          type: 'range',
          min: String(Math.round(price * 0.85)), max: String(Math.round(price * 1.3)), step: '0.1',
          value: String(sell), 'aria-label': 'Sell price',
          oninput: e => { sell = +e.target.value; paintBE(); }
        }),
        el('div', {
          style: {
            marginTop: 'var(--s3)', padding: 'var(--s3) var(--s4)',
            borderLeft: '3px solid ' + (win ? 'var(--bull)' : 'var(--bear)'),
            background: win ? 'var(--bull-wash)' : 'var(--bear-wash)',
            fontFamily: 'var(--f-data)', fontSize: 'var(--t-xs)'
          }
        }, [
          el('div', { class: win ? 'up' : 'down', style: { fontSize: 'var(--t-md)', fontWeight: 600 } },
            (win ? '+' : '') + rs(rt.profit).replace('Rs. ', 'Rs. ')),
          el('div.dim', { style: { marginTop: '4px' } },
            `Return ${pct(rt.returnPct)} · price moved ${pct(rt.priceMovePct)} · ` +
            `${pct(rt.frictionPct)} of it went to friction${rt.tax.tax > 0 ? ` · CGT ${rs(rt.tax.tax)} (${rt.tax.band})` : ''}`)
        ])
      ])
    );
  }

  function row(l, v, total) {
    return el('div', { class: 'calc__row' + (total ? ' calc__row--total' : '') }, [el('span', l), el('b', v)]);
  }

  paint();
  return frame('The cost of a trade', 'Every rupee, from fees.json', body);
}

/* ══════════════════════════════════════════════════════════════
   4 · order-book-demo
   ══════════════════════════════════════════════════════════════ */

function orderBookDemo() {
  const rules = ctx.rules;
  const ltp = 236.00, prevClose = 230.00;
  const rnd = mulberry32(4711);

  let bids = [
    { p: 235.50, q: 620 }, { p: 235.00, q: 1400 }, { p: 234.50, q: 900 },
    { p: 234.00, q: 620 }, { p: 233.50, q: 2100 }
  ];
  let asks = [
    { p: 236.50, q: 480 }, { p: 237.00, q: 1150 }, { p: 237.50, q: 780 },
    { p: 238.00, q: 1900 }, { p: 238.50, q: 640 }
  ];

  const bookNode = el('div');
  const msg = el('div');
  let mine = null;

  function paint() {
    const maxQ = Math.max(...bids.map(b => b.q), ...asks.map(a => a.q));
    const side = (rows, kind) => el('div', rows.map(r => {
      const isMine = mine && mine.side === kind && Math.abs(mine.p - r.p) < 0.005;
      return el('div', {
        style: {
          position: 'relative', padding: '5px 8px', fontFamily: 'var(--f-data)',
          fontSize: 'var(--t-cap)', borderBottom: '1px solid var(--ink-700)',
          display: 'flex', justifyContent: 'space-between', gap: '8px',
          outline: isMine ? '1px solid var(--signal)' : 'none'
        }
      }, [
        el('span', {
          style: {
            position: 'absolute', inset: kind === 'buy' ? '0 0 0 auto' : '0 auto 0 0',
            width: (r.q / maxQ * 62) + '%',
            background: kind === 'buy' ? 'var(--bull-wash)' : 'var(--bear-wash)'
          }
        }),
        el('span', { class: kind === 'buy' ? 'up' : 'down', style: { position: 'relative' } }, num(r.p)),
        el('span', { style: { position: 'relative', color: 'var(--paper-2)' } }, num(r.q, 0))
      ]);
    }));

    bookNode.replaceChildren(el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 'var(--s3)' } }, [
      el('div', [el('span.kicker', { style: { display: 'block', marginBottom: '4px' } }, 'Bids — buyers'), side(bids, 'buy')]),
      el('div', [el('span.kicker', { style: { display: 'block', marginBottom: '4px' } }, 'Asks — sellers'), side(asks, 'sell')])
    ]));
  }

  let side = 'buy', qty = 200, prc = 234.00;

  function place() {
    const v = money.validateOrder({ price: prc, prevClose, ltp, rules });
    if (!v.ok) {
      msg.replaceChildren(el('div.callout.callout--danger', [
        el('span.callout__l', 'Order rejected'),
        el('p', v.msg)
      ]));
      return;
    }
    mine = { side, p: prc, q: qty };

    // would it fill?
    const book = side === 'buy' ? asks : bids;
    const crossing = book.filter(r => side === 'buy' ? r.p <= prc : r.p >= prc);
    const available = crossing.reduce((a, r) => a + r.q, 0);

    if (available >= qty) {
      msg.replaceChildren(el('div.callout', { class: 'callout callout--info', style: { borderLeftColor: 'var(--bull)' } }, [
        el('span.callout__l', { style: { color: 'var(--bull)' } }, 'Filled'),
        el('p', `All ${num(qty, 0)} kitta executed immediately — there was enough resting on the other side at your price or better.`)
      ]));
    } else if (available > 0) {
      msg.replaceChildren(el('div.callout.callout--warn', [
        el('span.callout__l', 'Partially executed'),
        el('p', `${num(available, 0)} of ${num(qty, 0)} kitta filled. The remaining ${num(qty - available, 0)} stay live in the book. ` +
                `If they fill tomorrow instead, you settle twice — and pay the Rs. ${ctx.fees.dpCharge} DP charge twice.`)
      ]));
    } else {
      // resting: work out the queue position
      const level = (side === 'buy' ? bids : asks).find(r => Math.abs(r.p - prc) < 0.005);
      const ahead = level ? level.q : 0;
      const rank = level ? 4 : 1;
      if (level) level.q += qty; else {
        (side === 'buy' ? bids : asks).push({ p: prc, q: qty });
        bids.sort((a, b) => b.p - a.p); asks.sort((a, b) => a.p - b.p);
      }
      msg.replaceChildren(el('div.callout.callout--info', [
        el('span.callout__l', 'Resting in the book'),
        el('p', ahead
          ? `You are #${rank} in the queue at Rs. ${num(prc)} — ${num(ahead, 0)} kitta ahead of you. ` +
            `Matching is by price then time, so everyone who arrived at this price before you fills first. Every share.`
          : `Your order opened a new price level at Rs. ${num(prc)}. Nothing is ahead of you here, but nothing is crossing it either.`)
      ]));
    }
    paint();
  }

  const ticket = el('div', { style: { display: 'grid', gap: 'var(--s3)' } }, [
    el('div.pf__side', [
      el('button.btn.on.buy', {
        onclick: e => {
          side = 'buy';
          e.currentTarget.classList.add('on', 'buy');
          e.currentTarget.nextSibling.classList.remove('on', 'sell');
        }
      }, 'BUY'),
      el('button.btn', {
        onclick: e => {
          side = 'sell';
          e.currentTarget.classList.add('on', 'sell');
          e.currentTarget.previousSibling.classList.remove('on', 'buy');
        }
      }, 'SELL')
    ]),
    el('div.fields', [
      field('Quantity', numInput(qty, { min: '10', step: '10', oninput: e => qty = Math.max(10, +e.target.value) })),
      field('Rate (Rs.)', numInput(prc, { step: '0.1', oninput: e => prc = +e.target.value }))
    ]),
    el('button.btn.btn--primary', { onclick: place }, 'Place order')
  ]);

  paint();

  return frame('Order book — place one and see what happens',
    `LTP Rs. ${num(ltp)} · prev close Rs. ${num(prevClose)}`,
    [
      el('div.callout.callout--info', { style: { marginBottom: 'var(--s4)' } }, [
        el('span.callout__l', 'Two limits apply at once'),
        el('p', `Daily circuit ±${pctPlain(rules.dailyCircuit.limit, 0)} of the previous close → Rs. ${num(prevClose * 0.85)}–${num(prevClose * 1.15)}. ` +
                `Order band ±${pctPlain(rules.orderPriceBand.band, 0)} of the last traded price → Rs. ${num(ltp * 0.97)}–${num(ltp * 1.03)}. ` +
                `Try Rs. 210 and see which one stops you.`)
      ]),
      bookNode,
      el('hr.rule'),
      ticket,
      el('div', { style: { marginTop: 'var(--s4)' } }, msg)
    ]);
}

/* ══════════════════════════════════════════════════════════════
   5 · settlement-timeline
   ══════════════════════════════════════════════════════════════ */

function settlementTimeline() {
  let day = 0, thursday = false;
  const out = el('div');

  const LANES = {
    buy: [
      ['You place a buy order in TMS. It executes. Cash is debited by your broker.', ''],
      ['Nothing for you to do. The clearing process runs.', ''],
      ['Shares are credited to your Demat account. You own them.', '']
    ],
    sell: [
      ['You place a sell order in TMS. It executes and shows in your trade book.', ''],
      ['YOU MUST ACT — open MeroShare → My EDIS → select the sale → enter your Demat PIN → submit.', 'act'],
      ['Shares leave your Demat. Funds settle net of commission, SEBON fee, DP charge and CGT.', '']
    ]
  };

  function paint() {
    const labels = thursday
      ? ['Thu 20 Aug (T)', 'Fri 21 Aug (T+1)', 'Mon 24 Aug (T+2)']
      : ['Mon (T)', 'Tue (T+1)', 'Wed (T+2)'];

    out.replaceChildren(
      el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'var(--ink-700)', border: 'var(--hairline)' } },
        labels.map((lab, i) => el('button', {
          style: {
            background: i === day ? 'var(--ink-750)' : 'var(--ink-850)',
            padding: 'var(--s3)', fontFamily: 'var(--f-data)', fontSize: 'var(--t-cap)',
            color: i === day ? 'var(--signal)' : 'var(--paper-3)', minHeight: '44px'
          },
          'aria-pressed': String(i === day),
          onclick: () => { day = i; paint(); }
        }, lab))),

      el('div', { style: { marginTop: 'var(--s4)', display: 'grid', gap: 'var(--s3)' } }, [
        lane('BUY', LANES.buy[day]),
        lane('SELL', LANES.sell[day])
      ]),

      thursday && day === 2 && el('div.callout.callout--nepse', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Why Monday'),
        el('p', 'Settlement counts trading days, not calendar days. Saturday and Sunday are market holidays since ' +
                'NEPSE moved to a Monday–Friday week in April 2026, so a Thursday sale settles on Monday. ' +
                'If you needed that money on Saturday, you were wrong by three days.')
      ])
    );
  }

  function lane(title, [text, flag]) {
    const act = flag === 'act';
    return el('div', {
      style: {
        borderLeft: '3px solid ' + (act ? 'var(--signal)' : title === 'BUY' ? 'var(--bull-dim)' : 'var(--bear-dim)'),
        background: act ? 'var(--signal-wash)' : 'var(--ink-850)',
        padding: 'var(--s3) var(--s4)'
      }
    }, [
      el('span.callout__l', { style: act ? { color: 'var(--signal)' } : {} }, title),
      el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--paper-2)' } }, text)
    ]);
  }

  paint();

  return frame('T, T+1, T+2 — what happens on each day', 'Click a day',
    [
      el('div.row', { style: { marginBottom: 'var(--s4)' } }, [
        el('button.btn.btn--sm', {
          onclick: e => { thursday = !thursday; e.currentTarget.textContent = thursday ? 'Showing: Thursday sale' : 'Showing: mid-week sale'; paint(); }
        }, 'Showing: mid-week sale')
      ]),
      out
    ],
    'The sell lane has a step the buy lane does not. That step is why new sellers get caught.');
}

/* ══════════════════════════════════════════════════════════════
   6 · pattern-gallery
   ══════════════════════════════════════════════════════════════ */

function patternGallery(props = {}) {
  const only = props.candles || null;      // 1, 2 or 3 — filter by size
  const entries = Object.entries(ctx.patterns).filter(([, p]) => !only || p.candles === only);

  const grid = el('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 'var(--s3)' }
  });

  for (const [key, p] of entries) {
    const cv = el('canvas', { role: 'img', 'aria-label': `${p.name} — ${p.rule}` });
    const host = el('div.panel', { style: { padding: 'var(--s3)' } }, [
      cv,
      el('div', { style: { marginTop: '6px' } }, [
        el('div', { style: { fontFamily: 'var(--f-data)', fontSize: 'var(--t-xs)', color: 'var(--paper)' } }, p.name),
        el('div', { lang: 'ne', class: 'np', style: { fontSize: 'var(--t-xs)', color: 'var(--signal)' } }, p.np),
        el('div.row', { style: { marginTop: '6px', gap: '6px' } }, [
          el('span.pill', { class: 'pill pill--' + (p.bias === 'bullish' ? 'bull' : p.bias === 'bearish' ? 'bear' : 'signal') }, p.bias),
          el('span.cs__rel', { title: `Reliability ${p.reliability} of 5`, role: 'img', 'aria-label': `Reliability ${p.reliability} of 5` },
            [1, 2, 3, 4, 5].map(i => el('i', { class: i <= p.reliability ? 'on' : '' })))
        ]),
        el('p', { style: { fontSize: '0.6875rem', color: 'var(--paper-3)', marginTop: '6px', lineHeight: 1.5 } }, p.rule)
      ])
    ]);
    grid.append(host);
    requestAnimationFrame(() => drawShape(cv, key, p));
  }

  return frame(`Pattern gallery${only ? ` — ${only}-candle` : ''}`, `${entries.length} patterns`, grid,
    'Reliability is a rough guide, not a probability. Every one of these is worth less on a counter that trades 400 shares a day.');
}

/** Draw an idealised example of a pattern. */
function drawShape(cv, key, p) {
  const W = cv.parentElement.clientWidth || 160, H = 84;
  const c2 = fitCanvas(cv, W, H);
  const shapes = idealShape(key, p.candles);
  const all = shapes.flatMap(s => [s.h, s.l]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.18 || 1;
  const Y = v => 8 + (1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (H - 16);
  const step = W / (shapes.length + 1);

  c2.clearRect(0, 0, W, H);
  shapes.forEach((s, i) => {
    const x = Math.round(step * (i + 1)) + 0.5;
    const up = s.c >= s.o;
    const col = up ? cssVar('--bull') : cssVar('--bear');
    c2.strokeStyle = col; c2.lineWidth = 1.2;
    c2.beginPath(); c2.moveTo(x, Y(s.h)); c2.lineTo(x, Y(s.l)); c2.stroke();
    const bw = Math.min(16, step * 0.5);
    const t = Y(Math.max(s.o, s.c)), b = Y(Math.min(s.o, s.c));
    if (up) c2.strokeRect(x - bw / 2, t, bw, Math.max(1.5, b - t));
    else { c2.fillStyle = col; c2.fillRect(x - bw / 2, t, bw, Math.max(1.5, b - t)); }
  });
}

function idealShape(key, n) {
  const S = {
    hammer: [{ o: 100, c: 103, h: 104, l: 88 }],
    hangingMan: [{ o: 100, c: 103, h: 104, l: 88 }],
    invertedHammer: [{ o: 100, c: 97, h: 112, l: 96 }],
    shootingStar: [{ o: 100, c: 97, h: 112, l: 96 }],
    doji: [{ o: 100, c: 100.2, h: 107, l: 93 }],
    longLeggedDoji: [{ o: 100, c: 100.2, h: 114, l: 86 }],
    dragonfly: [{ o: 100, c: 100.2, h: 101, l: 86 }],
    gravestone: [{ o: 100, c: 99.8, h: 114, l: 99 }],
    spinningTop: [{ o: 100, c: 102, h: 108, l: 94 }],
    marubozuBull: [{ o: 92, c: 108, h: 108.4, l: 91.6 }],
    marubozuBear: [{ o: 108, c: 92, h: 108.4, l: 91.6 }],
    bullishEngulfing: [{ o: 106, c: 99, h: 107, l: 98 }, { o: 97.5, c: 108, h: 109, l: 97 }],
    bearishEngulfing: [{ o: 94, c: 101, h: 102, l: 93 }, { o: 102.5, c: 92, h: 103, l: 91 }],
    bullishHarami: [{ o: 110, c: 96, h: 111, l: 95 }, { o: 99, c: 104, h: 105, l: 98 }],
    bearishHarami: [{ o: 90, c: 104, h: 105, l: 89 }, { o: 101, c: 96, h: 102, l: 95 }],
    haramiCross: [{ o: 90, c: 104, h: 105, l: 89 }, { o: 99, c: 99.2, h: 102, l: 96 }],
    piercingLine: [{ o: 108, c: 96, h: 109, l: 95 }, { o: 93, c: 103, h: 104, l: 92 }],
    darkCloudCover: [{ o: 92, c: 104, h: 105, l: 91 }, { o: 107, c: 97, h: 108, l: 96 }],
    tweezerTop: [{ o: 96, c: 104, h: 106, l: 95 }, { o: 103, c: 97, h: 106, l: 96 }],
    tweezerBottom: [{ o: 104, c: 96, h: 105, l: 94 }, { o: 97, c: 103, h: 104, l: 94 }],
    morningStar: [{ o: 110, c: 98, h: 111, l: 97 }, { o: 96, c: 95, h: 97, l: 93 }, { o: 97, c: 106, h: 107, l: 96 }],
    eveningStar: [{ o: 90, c: 102, h: 103, l: 89 }, { o: 104, c: 105, h: 107, l: 103 }, { o: 103, c: 94, h: 104, l: 93 }],
    threeWhiteSoldiers: [{ o: 90, c: 96, h: 97, l: 89 }, { o: 94, c: 101, h: 102, l: 93 }, { o: 99, c: 106, h: 107, l: 98 }],
    threeBlackCrows: [{ o: 110, c: 104, h: 111, l: 103 }, { o: 106, c: 99, h: 107, l: 98 }, { o: 101, c: 94, h: 102, l: 93 }]
  };
  return S[key] || Array.from({ length: n }, (_, i) => ({ o: 100, c: 102, h: 104, l: 98 }));
}

/* ══════════════════════════════════════════════════════════════
   7 · ratio-explorer
   ══════════════════════════════════════════════════════════════ */

function ratioExplorer(props = {}) {
  const mode0 = props.mode === 'bonus' ? 1 : 0;
  const body = el('div');
  let mode = mode0;
  const bar = tabs(['Bank scatter — P/E vs ROE', 'Bonus adjustment'], i => { mode = i; paint(); });

  function paint() { mode === 0 ? scatter() : bonus(); }

  function scatter() {
    const banks = ctx.securities.banks;
    const cv = el('canvas', { role: 'img', 'aria-label': 'Scatter of price-to-earnings against return on equity for 19 Nepali commercial banks. NICA sits alone far right at the bottom with a P/E of 343 and an ROE of 0.88 percent.' });
    const host = el('div', { style: { position: 'relative' } }, cv);
    const info = el('p.widget__note', 'Hover a dot for the full row.');

    const draw = () => {
      const W = host.clientWidth || 640, H = 330;
      const c2 = fitCanvas(cv, W, H);
      const L = 44, R = 12, T = 14, B = 30;
      const X = pe => L + (Math.log10(clamp(pe, 5, 400)) - Math.log10(5)) / (Math.log10(400) - Math.log10(5)) * (W - L - R);
      const Y = roe => T + (1 - (clamp(roe, -0.03, 0.16) + 0.03) / 0.19) * (H - T - B);

      c2.clearRect(0, 0, W, H);
      // quadrants around the sector median
      const medX = X(ctx.securities.sectorMedianPE), medY = Y(0.10);
      c2.fillStyle = 'rgba(49,208,170,0.05)'; c2.fillRect(L, T, medX - L, medY - T);
      c2.fillStyle = 'rgba(240,82,109,0.05)'; c2.fillRect(medX, medY, W - R - medX, H - B - medY);

      c2.strokeStyle = cssVar('--grid'); c2.setLineDash([2, 3]); c2.lineWidth = 1;
      c2.beginPath(); c2.moveTo(medX, T); c2.lineTo(medX, H - B); c2.stroke();
      c2.beginPath(); c2.moveTo(L, medY); c2.lineTo(W - R, medY); c2.stroke();
      c2.setLineDash([]);

      c2.font = '500 9px "Martian Mono", monospace';
      c2.fillStyle = cssVar('--paper-4');
      c2.textAlign = 'left'; c2.textBaseline = 'top';
      c2.fillText('CHEAP & PROFITABLE', L + 4, T + 3);
      c2.textAlign = 'right'; c2.textBaseline = 'bottom';
      c2.fillText('EXPENSIVE & WEAK', W - R - 4, H - B - 3);

      // axes
      c2.fillStyle = cssVar('--axis'); c2.textAlign = 'center'; c2.textBaseline = 'top';
      for (const pe of [7, 15, 30, 100, 343]) c2.fillText(pe + '×', X(pe), H - B + 5);
      c2.textAlign = 'right'; c2.textBaseline = 'middle';
      for (const r of [0, 0.05, 0.10, 0.15]) c2.fillText((r * 100).toFixed(0) + '%', L - 6, Y(r));

      for (const b of banks) {
        const x = X(b.pe), y = Y(b.roe);
        const good = b.roe >= 0.10 && b.pe <= ctx.securities.sectorMedianPE + 4;
        c2.fillStyle = b.eps < 0 ? cssVar('--paper-4') : good ? cssVar('--bull') : b.pe > 28 ? cssVar('--bear') : cssVar('--paper-3');
        c2.beginPath(); c2.arc(x, y, b.s === 'NICA' ? 6 : 4.5, 0, Math.PI * 2); c2.fill();
        c2.font = '500 9px "Martian Mono", monospace';
        c2.fillStyle = cssVar('--paper-3'); c2.textAlign = 'left'; c2.textBaseline = 'middle';
        c2.fillText(b.s, x + 7, y);
      }
    };
    requestAnimationFrame(draw);

    body.replaceChildren(bar, el('div', { style: { marginTop: 'var(--s4)' } }, host), info,
      el('div.scroll-x', { style: { marginTop: 'var(--s4)', maxHeight: '260px', overflowY: 'auto' } },
        el('table.table', [
          el('thead', el('tr', [
            el('th', { scope: 'col' }, 'Bank'),
            el('th.n', { scope: 'col' }, 'P/E'),
            el('th.n', { scope: 'col' }, 'LTP'),
            el('th.n', { scope: 'col' }, 'EPS'),
            el('th.n', { scope: 'col' }, 'ROE')
          ])),
          el('tbody', banks.map(b => el('tr', [
            el('td', `${b.s} — ${b.n}`),
            el('td.n', b.eps < 0 ? 'n/m' : num(b.pe) + '×'),
            el('td.n', num(b.ltp)),
            el('td.n', { class: b.eps < 0 ? 'down' : '' }, num(b.eps)),
            el('td.n', { class: b.roe >= 0.10 ? 'up' : b.roe < 0.04 ? 'down' : '' }, pctPlain(b.roe, 2))
          ])))
        ])),
      el('p.asof', `Fundamentals as at ${ctx.securities.asOf}. Sector median P/E ${ctx.securities.sectorMedianPE}×. ` +
        `Prices are illustrative — check NepseAlpha, Merolagani or Sharesansar for live data.`));
  }

  function bonus() {
    const years = [
      { y: '2079/80', profit: 216.0, shares: 6.00, bonus: 0 },
      { y: '2080/81', profit: 237.6, shares: 7.20, bonus: 0.20 },
      { y: '2081/82', profit: 259.2, shares: 8.64, bonus: 0.20 }
    ];
    const latest = years[years.length - 1].shares;
    const rows = years.map(r => {
      const reported = r.profit / r.shares * 10;             // crore → Rs. per share
      const adjusted = r.profit / latest * 10;
      return { ...r, reported, adjusted };
    });

    const barChart = (key, colour, label) => {
      const maxV = Math.max(...rows.map(r => Math.max(r.reported, r.adjusted)));
      return el('div', [
        el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, label),
        el('div', { style: { display: 'flex', gap: 'var(--s3)', alignItems: 'flex-end', height: '130px' } },
          rows.map(r => el('div', { style: { flex: 1, textAlign: 'center' } }, [
            el('div', {
              style: {
                height: (r[key] / maxV * 100) + 'px', background: colour,
                marginBottom: '6px', borderRadius: '2px 2px 0 0'
              },
              title: `${r.y} — Rs. ${r[key].toFixed(2)}`
            }),
            el('div', { style: { fontFamily: 'var(--f-data)', fontSize: 'var(--t-cap)', color: 'var(--paper-2)' } }, 'Rs. ' + r[key].toFixed(2)),
            el('div', { style: { fontFamily: 'var(--f-data)', fontSize: '0.625rem', color: 'var(--paper-4)' } }, r.y)
          ])))
      ]);
    };

    body.replaceChildren(bar,
      el('div', { style: { marginTop: 'var(--s4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 'var(--s5)' } }, [
        barChart('reported', 'var(--bear-dim)', 'Reported EPS'),
        barChart('adjusted', 'var(--bull-dim)', 'Bonus-adjusted EPS')
      ]),
      el('div.callout.callout--warn', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Same company. Same profits. One chart tells you to sell.'),
        el('p', 'Reported EPS falls 36 → 33 → 30 and looks like a company in decline. Adjusted for two 20% bonus ' +
                'issues it reads 25 → 27.50 → 30 — profit grew 10% a year, every year. Divide every pre-bonus ' +
                'figure by (1 + bonus ratio) before you compare years.')
      ]),
      el('p.asof', 'Illustrative bank. The arithmetic is the point, not the company.'));
  }

  paint();
  return frame('Ratio explorer', 'Real Q2 2082/83 figures', body);
}

/* ══════════════════════════════════════════════════════════════
   8 · sector-treemap
   ══════════════════════════════════════════════════════════════ */

function sectorTreemap() {
  const sectors = ctx.securities.sectors;
  const total = ctx.securities.totalListedCompanies;
  const host = el('div', {
    style: { display: 'flex', flexWrap: 'wrap', gap: '2px' },
    role: 'img',
    'aria-label': `Sector composition of ${total} listed companies. ` +
      sectors.map(s => `${s.name} ${s.count}`).join(', ') + '.'
  });

  const palette = ['--bull', '--ma-slow', '--signal', '--paper-3', '--bull-dim', '--paper-4'];
  sectors.forEach((s, i) => {
    const area = Math.sqrt(s.share) * 100;
    host.append(el('div', {
      style: {
        flex: `1 1 ${Math.max(80, area * 3.4)}px`,
        minHeight: Math.max(48, area * 2.6) + 'px',
        background: `color-mix(in srgb, var(${palette[i % palette.length]}) 22%, var(--ink-850))`,
        border: '1px solid var(--ink-700)',
        padding: 'var(--s2) var(--s3)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      },
      title: `${s.name} — ${s.count} companies (${(s.share * 100).toFixed(1)}%)`
    }, [
      el('span', { style: { fontFamily: 'var(--f-data)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--paper-2)', lineHeight: 1.3 } }, s.name),
      el('span', { style: { fontFamily: 'var(--f-data)', fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--paper)' } },
        `${s.count} · ${(s.share * 100).toFixed(1)}%`)
    ]));
  });

  return frame(`Sector composition — ${total} listed companies`, `as at ${ctx.securities.asOf}`,
    [host,
      el('div.callout.callout--warn', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Company count is not market weight'),
        el('p', 'Hydropower is 91 of 271 companies — a third of the exchange by count. It is nowhere near a third ' +
                'by market capitalisation. The 19 commercial banks are 7% of the count and dominate the cap-weighted index. ' +
                'When the news says "NEPSE rose", it is mostly telling you what the banks did.')
      ])
    ]);
}

/* ══════════════════════════════════════════════════════════════
   9 · position-sizer
   ══════════════════════════════════════════════════════════════ */

function positionSizer() {
  let account = 400000, riskPct = 0.015, entry = 320, stop = 296;
  const out = el('div');

  function paint() {
    const r = money.positionSize({ account, riskPct, entry, stop });
    const cost = r.qty ? money.tradeCost({ qty: r.qty, price: entry, side: 'buy', fees: ctx.fees }) : null;
    out.replaceChildren(
      el('div.calc', [
        row('Rupee risk', `${rs(r.rupeeRisk)}  (${pctPlain(riskPct, 1)} of the account)`),
        row('Risk per share', rs(r.perShare)),
        row('Position size', r.qty ? `${num(r.qty, 0)} kitta` : 'stop must sit below entry', true),
        row('Cost of the position', cost ? rs(cost.total) : '—'),
        row('Account exposure', pctPlain(r.exposurePct, 1), true)
      ]),
      r.qty > 0 && el('div.callout.callout--info', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Read those last two rows together'),
        el('p', `The position costs ${rs(cost.total)} — ${pctPlain(r.exposurePct, 0)} of the account — but risks only ` +
                `${rs(r.rupeeRisk)}, which is ${pctPlain(riskPct, 1)}. Size is derived from the stop. It is never chosen first.`)
      ]),
      el('div.callout.callout--nepse', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'NEPSE has no stop-loss order type'),
        el('p', 'You cannot leave a resting instruction that triggers on a price. Your stop is a decision you execute ' +
                'manually, and if a stock gaps or locks at the −15% circuit you may not get out at your price at all. ' +
                'That makes the size — the one part you fully control — the primary risk tool.')
      ])
    );
  }

  function row(l, v, t) {
    return el('div', { class: 'calc__row' + (t ? ' calc__row--total' : '') }, [el('span', l), el('b', v)]);
  }

  const controls = el('div.fields', { style: { marginBottom: 'var(--s4)' } }, [
    field('Account (Rs.)', numInput(account, { step: '10000', min: '1000', oninput: e => { account = +e.target.value; paint(); } })),
    field('Risk per trade (%)', numInput(1.5, { step: '0.1', min: '0.1', max: '5', oninput: e => { riskPct = +e.target.value / 100; paint(); } })),
    field('Entry (Rs.)', numInput(entry, { step: '0.5', oninput: e => { entry = +e.target.value; paint(); } })),
    field('Stop (Rs.)', numInput(stop, { step: '0.5', oninput: e => { stop = +e.target.value; paint(); } }))
  ]);

  paint();
  return frame('Position sizer', 'Size comes from the stop', [controls, out]);
}

/* ══════════════════════════════════════════════════════════════
   10 · drawdown-table
   ══════════════════════════════════════════════════════════════ */

function drawdownTable() {
  let loss = 0.30;
  const cv = el('canvas', { role: 'img', 'aria-label': 'Curve of loss against the gain required to recover it. Gentle to 25 percent, then vertical.' });
  const host = el('div', { style: { position: 'relative' } }, cv);
  const read = el('div.calc');

  function draw() {
    const W = host.clientWidth || 620, H = 240;
    const c2 = fitCanvas(cv, W, H);
    const L = 44, R = 14, T = 12, B = 28;
    const X = l => L + l / 0.9 * (W - L - R);
    const Y = g => T + (1 - clamp(g, 0, 9) / 9) * (H - T - B);

    c2.clearRect(0, 0, W, H);
    // survivable / structural shading
    c2.fillStyle = 'rgba(255,182,39,0.09)'; c2.fillRect(L, T, X(0.25) - L, H - T - B);
    c2.fillStyle = 'rgba(240,82,109,0.09)'; c2.fillRect(X(0.5), T, W - R - X(0.5), H - T - B);

    c2.strokeStyle = cssVar('--grid'); c2.lineWidth = 1;
    for (const g of [0, 1, 2, 4, 9]) {
      const y = Math.round(Y(g)) + .5;
      c2.beginPath(); c2.moveTo(L, y); c2.lineTo(W - R, y); c2.stroke();
      c2.font = '500 9px "Martian Mono", monospace'; c2.fillStyle = cssVar('--axis');
      c2.textAlign = 'right'; c2.textBaseline = 'middle';
      c2.fillText((g * 100) + '%', L - 6, y);
    }
    c2.textAlign = 'center'; c2.textBaseline = 'top';
    for (const l of [0.1, 0.25, 0.5, 0.75, 0.9]) c2.fillText((l * 100) + '%', X(l), H - B + 4);

    c2.strokeStyle = cssVar('--bear'); c2.lineWidth = 1.8;
    c2.beginPath();
    for (let l = 0; l <= 0.9; l += 0.005) {
      const g = money.recoveryFor(l);
      const x = X(l), y = Y(g);
      l === 0 ? c2.moveTo(x, y) : c2.lineTo(x, y);
    }
    c2.stroke();

    const g = money.recoveryFor(loss);
    c2.fillStyle = cssVar('--signal');
    c2.beginPath(); c2.arc(X(loss), Y(g), 5, 0, Math.PI * 2); c2.fill();

    const years = Math.log(1 / (1 - loss)) / Math.log(1.15);
    read.replaceChildren(
      rowc('Loss', pctPlain(loss, 1)),
      rowc('Gain required to recover', pctPlain(g, 1), true),
      rowc('Years to recover at 15% a year', years.toFixed(1) + ' years'),
      rowc('Verdict', loss <= 0.25 ? 'Survivable — you are on the flat part' : loss <= 0.5 ? 'Serious' : 'Structural — this is the steep part', true)
    );
  }
  function rowc(l, v, t) {
    return el('div', { class: 'calc__row' + (t ? ' calc__row--total' : '') }, [el('span', l), el('b', v)]);
  }

  const slider = el('input', {
    type: 'range', min: '1', max: '90', step: '1', value: '30',
    'aria-label': 'Loss percentage',
    oninput: e => { loss = +e.target.value / 100; draw(); }
  });

  requestAnimationFrame(draw);
  window.addEventListener('resize', draw);

  return frame('The maths of ruin', 'G = L / (1 − L)',
    [host, slider, read,
      el('div.callout.callout--nepse', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'This is not theoretical'),
        el('p', 'The NEPSE index fell from 3,198.60 to 1,615 — a 49.5% drawdown needing +98.1% to recover. ' +
                'Three years later it has managed +63.7%, to 2,643.83, and still needs another +21.0% to reclaim the high. ' +
                'That is a diversified basket. Individual stocks fell far more.')
      ])
    ]);
}

/* ══════════════════════════════════════════════════════════════
   11 · index-history
   ══════════════════════════════════════════════════════════════ */

function indexHistory(props = {}) {
  const H = ctx.index;
  const bubble = props.mode === 'bubble';
  const ms = bubble ? H.milestones.filter(m => m.date >= '2019') : H.milestones;

  const cv = el('canvas', { role: 'img' });
  const host = el('div', { style: { position: 'relative' } }, cv);
  const note = el('div.callout.callout--info', { style: { marginTop: 'var(--s4)' } });
  let hoverIdx = ms.length - 1;

  // interpolate between milestones with mild deterministic noise, so the shape
  // is honest between the marked points
  const pts = [];
  const rnd = mulberry32(90210);
  for (let i = 0; i < ms.length - 1; i++) {
    const a = ms[i], b = ms[i + 1];
    const steps = 26;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const base = a.value + (b.value - a.value) * t;
      const wob = Math.sin(t * Math.PI * 3 + i) * (Math.abs(b.value - a.value) * 0.045) + (rnd() - 0.5) * base * 0.014;
      pts.push({ v: base + wob, m: k === 0 ? i : -1 });
    }
  }
  pts.push({ v: ms[ms.length - 1].value, m: ms.length - 1 });

  function draw() {
    const W = host.clientWidth || 640, Hh = 300;
    const c2 = fitCanvas(cv, W, Hh);
    const L = 46, R = 12, T = 16, B = 28;
    const lo = 0, hi = Math.max(...pts.map(p => p.v)) * 1.08;
    const X = i => L + (i / (pts.length - 1)) * (W - L - R);
    const Y = v => T + (1 - (v - lo) / (hi - lo)) * (Hh - T - B);

    c2.clearRect(0, 0, W, Hh);

    // shaded bubble stages
    if (bubble && H.stages) {
      H.stages.forEach((st, si) => {
        const i0 = ms.findIndex(m => m.date >= st.from);
        const i1 = ms.findIndex(m => m.date >= st.to);
        const a = X(Math.max(0, i0) * 26), b = X(Math.min(pts.length - 1, (i1 < 0 ? ms.length - 1 : i1) * 26));
        c2.fillStyle = `rgba(${si % 2 ? '240,82,109' : '49,208,170'},0.06)`;
        c2.fillRect(a, T, b - a, Hh - T - B);
        c2.font = '500 9px "Martian Mono", monospace';
        c2.fillStyle = cssVar('--paper-4'); c2.textAlign = 'left'; c2.textBaseline = 'top';
        c2.save(); c2.translate(a + 4, T + 4); c2.fillText(st.label, 0, 0); c2.restore();
      });
    }

    c2.strokeStyle = cssVar('--grid'); c2.lineWidth = 1;
    c2.font = '500 9px "Martian Mono", monospace';
    c2.fillStyle = cssVar('--axis'); c2.textAlign = 'right'; c2.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = lo + (hi - lo) * k / 4;
      const y = Math.round(Y(v)) + .5;
      c2.beginPath(); c2.moveTo(L, y); c2.lineTo(W - R, y); c2.stroke();
      c2.fillText(num(v, 0), L - 6, y);
    }

    // area
    const grad = c2.createLinearGradient(0, T, 0, Hh - B);
    grad.addColorStop(0, 'rgba(49,208,170,0.28)');
    grad.addColorStop(1, 'rgba(49,208,170,0.01)');
    c2.beginPath();
    c2.moveTo(X(0), Y(pts[0].v));
    pts.forEach((p, i) => c2.lineTo(X(i), Y(p.v)));
    c2.lineTo(X(pts.length - 1), Hh - B); c2.lineTo(X(0), Hh - B); c2.closePath();
    c2.fillStyle = grad; c2.fill();

    c2.beginPath();
    pts.forEach((p, i) => i ? c2.lineTo(X(i), Y(p.v)) : c2.moveTo(X(i), Y(p.v)));
    c2.strokeStyle = cssVar('--bull'); c2.lineWidth = 1.6; c2.stroke();

    // milestone dots
    pts.forEach((p, i) => {
      if (p.m < 0) return;
      const isPeak = ms[p.m].value === 3198.60;
      c2.fillStyle = isPeak ? cssVar('--bear') : cssVar('--signal');
      c2.beginPath(); c2.arc(X(i), Y(p.v), isPeak ? 5 : 3.2, 0, Math.PI * 2); c2.fill();
    });

    cv.setAttribute('aria-label',
      `NEPSE index from ${ms[0].date} to ${ms[ms.length - 1].date}. ` +
      `All-time high 3,198.60 on 18 August 2021; trough 1,615 in 2023; ${H.current.index} today, still 17.3% below the high.`);
  }

  function showNote(i) {
    const m = ms[i];
    note.replaceChildren(
      el('span.callout__l', m.date),
      el('p', [el('strong', num(m.value, 2)), ' — ', m.note])
    );
  }

  host.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    const W = r.width, L = 46, R = 12;
    const i = clamp(Math.round(((e.clientX - r.left - L) / (W - L - R)) * (pts.length - 1)), 0, pts.length - 1);
    const nearest = Math.round(i / 26);
    if (nearest !== hoverIdx && ms[nearest]) { hoverIdx = nearest; showNote(nearest); }
  });

  requestAnimationFrame(draw);
  window.addEventListener('resize', draw);
  showNote(ms.length - 1);

  return frame(
    bubble ? 'The shape of a bubble — NEPSE 2019 to today' : 'NEPSE index, 1994 to today',
    'Hover the chart',
    [host, note,
      el('p.widget__note', 'Milestone values are verified. The line between marked points is illustrative — ' +
        'it shows the shape, not a daily record.'),
      el('div.statrow', { style: { marginTop: 'var(--s4)' } }, [
        el('div.stat', [el('span.stat__l', 'Today'), el('span.stat__v', num(H.current.index, 2)), el('span.stat__s', H.current.asOf)]),
        el('div.stat', [el('span.stat__l', 'All-time high'), el('span.stat__v', num(H.current.allTimeHigh, 2)), el('span.stat__s', '18 Aug 2021')]),
        el('div.stat', [el('span.stat__l', 'Still below'), el('span.stat__v.down', pct(H.current.belowHighPct, 1)), el('span.stat__s', 'five years on')]),
        el('div.stat', [el('span.stat__l', 'Market cap'), el('span.stat__v', '4.547'), el('span.stat__s', 'Rs. trillion')])
      ])
    ]);
}

/* ══════════════════════════════════════════════════════════════
   generic helpers used across many lessons
   ══════════════════════════════════════════════════════════════ */

/** A static table straight from lesson JSON. */
function staticTable(props) {
  return frame(props.title, props.sub, mdTable(props), props.note);
}

/** A numbered flow of steps, each with a cost or a timing. */
function flow(props) {
  return frame(props.title, props.sub,
    el('div.lessons', (props.steps || []).map((s, i) => el('div.lrow', { style: { cursor: 'default' } }, [
      el('span.lrow__n', String(i + 1).padStart(2, '0')),
      el('div', [
        el('div.lrow__t', { style: { color: 'var(--paper)' } }, s.t),
        s.d && el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--paper-3)', marginTop: '3px' } }, s.d)
      ]),
      s.meta && el('span.lrow__m', s.meta)
    ]))),
    props.note);
}

/** Two things side by side, with a verdict. */
function compare(props) {
  return frame(props.title, props.sub, [
    el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 'var(--s4)' } },
      (props.sides || []).map(s => el('div.panel', { style: { background: 'var(--ink-800)' } }, [
        el('span.kicker', s.k),
        el('h4', { style: { margin: '6px 0 var(--s3)' } }, s.t),
        el('div.calc', (s.rows || []).map(r =>
          el('div.calc__row', [el('span', r[0]), el('b', r[1])])))
      ]))),
    props.verdict && el('div.callout.callout--warn', { style: { marginTop: 'var(--s4)' } }, [
      el('span.callout__l', 'Read it properly'),
      md(props.verdict)
    ])
  ], props.note);
}

/** Clickable role map: click a node to see what it does and cannot do. */
function orgMap(props) {
  const nodes = props.nodes || [];
  const detail = el('div.callout.callout--info', { style: { marginTop: 'var(--s4)' } });
  const pick = n => detail.replaceChildren(
    el('span.callout__l', n.t),
    el('p', n.does),
    el('p', { style: { color: 'var(--bear)' } }, el('em', 'Cannot help you with: ' + n.cannot))
  );
  const grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 'var(--s2)' } },
    nodes.map(n => el('button.btn', { onclick: () => pick(n), style: { flexDirection: 'column', minHeight: '64px' } }, [
      el('span', { style: { fontWeight: 600 } }, n.k),
      el('span', { style: { fontSize: '0.625rem', color: 'var(--paper-4)', textTransform: 'none', letterSpacing: 0 } }, n.t)
    ])));
  if (nodes.length) pick(nodes[0]);
  return frame(props.title || 'Who does what', 'Click any box', [grid, detail], props.note);
}

/** IPO allotment lottery — run a thousand draws and look at the distribution. */
function probability(props = {}) {
  let applicants = 500000, units = 100000;
  const out = el('div');

  function run() {
    const perApp = props.minUnits || ctx.fees.ipo.fixedPriceMinUnits;
    const winners = Math.min(applicants, Math.floor(units / perApp));
    const p = winners / applicants;
    // simulate 1,000 learners applying
    const rnd = mulberry32(20261);
    let hits = 0;
    for (let i = 0; i < 1000; i++) if (rnd() < p) hits++;
    out.replaceChildren(
      el('div.calc', [
        el('div.calc__row', [el('span', 'Units on offer'), el('b', num(units, 0))]),
        el('div.calc__row', [el('span', 'Valid applications'), el('b', num(applicants, 0))]),
        el('div.calc__row', [el('span', `Allottees at ${perApp} units each`), el('b', num(winners, 0))]),
        el('div.calc__row.calc__row--total', [el('span', 'Your chance'), el('b', pctPlain(p, 2))]),
        el('div.calc__row', [el('span', 'Out of 1,000 simulated applicants'), el('b', `${hits} were allotted`)])
      ]),
      el('div.callout.callout--nepse', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Applying for more does not help'),
        el('p', 'Nepali fixed-price allotment runs a computerised lottery in which every valid application has equal ' +
                'probability regardless of size. In a heavily oversubscribed issue the allotment is the minimum lot to ' +
                'as many applicants as possible. Applying for 100 units instead of 10 ties up ten times the money in ' +
                'ASBA blocking for exactly the same odds.')
      ])
    );
  }

  const controls = el('div.fields', { style: { marginBottom: 'var(--s4)' } }, [
    field('Units on offer', numInput(units, { step: '10000', min: '1000', oninput: e => { units = +e.target.value; run(); } })),
    field('Applications', numInput(applicants, { step: '10000', min: '1000', oninput: e => { applicants = +e.target.value; run(); } }))
  ]);

  run();
  return frame('The allotment lottery', 'Set the numbers and see the odds', [controls, out]);
}

/** Correlation heatmap — why five banks is one position. */
function correlation() {
  const names = ['Comm. Bank', 'Dev. Bank', 'Finance', 'Microfin.', 'Hydro', 'Life Ins.', 'Hotel'];
  // illustrative correlations, shaped the way NEPSE sectors actually behave
  const M = [
    [1.00, 0.91, 0.86, 0.74, 0.62, 0.71, 0.55],
    [0.91, 1.00, 0.88, 0.79, 0.64, 0.70, 0.54],
    [0.86, 0.88, 1.00, 0.81, 0.66, 0.68, 0.57],
    [0.74, 0.79, 0.81, 1.00, 0.58, 0.61, 0.49],
    [0.62, 0.64, 0.66, 0.58, 1.00, 0.55, 0.47],
    [0.71, 0.70, 0.68, 0.61, 0.55, 1.00, 0.52],
    [0.55, 0.54, 0.57, 0.49, 0.47, 0.52, 1.00]
  ];
  const cell = v => el('td', {
    style: {
      background: `color-mix(in srgb, var(--bear) ${Math.round(v * 55)}%, var(--ink-850))`,
      textAlign: 'center', fontFamily: 'var(--f-data)', fontSize: '0.625rem',
      color: v > 0.75 ? 'var(--paper)' : 'var(--paper-3)'
    }
  }, v.toFixed(2));

  return frame('Sector correlation', 'Illustrative — the shape is what matters', [
    el('div.scroll-x', el('table.table', [
      el('thead', el('tr', [el('th', ''), ...names.map(n => el('th', { scope: 'col', style: { fontSize: '0.5625rem' } }, n))])),
      el('tbody', M.map((row, i) => el('tr', [
        el('th', { scope: 'row', style: { fontFamily: 'var(--f-data)', fontSize: '0.625rem', whiteSpace: 'nowrap' } }, names[i]),
        ...row.map(cell)
      ])))
    ])),
    el('div.callout.callout--warn', { style: { marginTop: 'var(--s4)' } }, [
      el('span.callout__l', 'Five banks is one position'),
      el('p', 'Commercial banks, development banks and finance companies correlate at 0.86 to 0.91. They fund the same ' +
              'way, lend into the same economy, and respond to the same NRB circular on the same morning. Holding five ' +
              'of them feels diversified and is not. Hydropower at 0.62 is the genuine diversifier on NEPSE — which is ' +
              'awkward, because it is also the least liquid.')
    ])
  ]);
}

/** A dividend discount model with an honest sensitivity table. */
function ddm() {
  let div = 22, growth = 0.06, rate = 0.13;
  const out = el('div');

  function paint() {
    const rows = [];
    for (const r of [0.11, 0.12, 0.13, 0.14, 0.15]) {
      const row = [];
      for (const g of [0.04, 0.05, 0.06, 0.07, 0.08]) {
        row.push(r <= g ? '—' : num(div * (1 + g) / (r - g), 0));
      }
      rows.push([pctPlain(r, 0), ...row]);
    }
    const value = rate <= growth ? null : div * (1 + growth) / (rate - growth);
    out.replaceChildren(
      el('div.calc', [
        el('div.calc__row', [el('span', 'Cash dividend per share'), el('b', rs(div))]),
        el('div.calc__row', [el('span', 'Assumed growth'), el('b', pctPlain(growth, 1))]),
        el('div.calc__row', [el('span', 'Required return'), el('b', pctPlain(rate, 1))]),
        el('div.calc__row.calc__row--total', [el('span', 'Intrinsic value'),
          el('b', value ? rs(value) : 'undefined — growth must be below the required return')])
      ]),
      el('div.scroll-x', { style: { marginTop: 'var(--s4)' } }, el('table.table', [
        el('thead', el('tr', [el('th', 'Required ↓ / growth →'), ...['4%', '5%', '6%', '7%', '8%'].map(g => el('th.n', g))])),
        el('tbody', rows.map(r => el('tr', r.map((c, i) => el(i ? 'td' : 'th', { class: i ? 'n' : '' }, c)))))
      ])),
      el('div.callout.callout--warn', { style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', 'Look at the spread in that table'),
        el('p', 'Two assumptions you cannot verify move the answer by a factor of three. That is not a reason to skip ' +
                'the model — it is the reason to run it as a range and never as a number. And use the actual cash ' +
                'dividend, not the bonus component: bonus shares are not cash and cannot be spent.')
      ])
    );
  }

  const controls = el('div.fields', { style: { marginBottom: 'var(--s4)' } }, [
    field('Cash dividend (Rs.)', numInput(div, { step: '1', min: '0', oninput: e => { div = +e.target.value; paint(); } })),
    field('Growth (%)', numInput(6, { step: '0.5', oninput: e => { growth = +e.target.value / 100; paint(); } })),
    field('Required return (%)', numInput(13, { step: '0.5', oninput: e => { rate = +e.target.value / 100; paint(); } }))
  ]);

  paint();
  return frame('A simple dividend discount model', 'V = D₁ / (r − g)', [controls, out]);
}

/** Seven-column trade journal with CSV export. */
function journal() {
  const cols = ['Date', 'Symbol', 'Thesis (one line)', 'Entry', 'Stop', 'Size', 'Exit + outcome'];
  const rows = [
    ['2026-08-03', 'NMB', 'P/E 15 vs ROE 10.3 — cheapest coherent bank', '233.00', '214.00', '250', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '']
  ];
  const tbody = el('tbody');

  const paint = () => tbody.replaceChildren(...rows.map((r, ri) => el('tr', r.map((c, ci) =>
    el('td', el('input', {
      type: 'text', value: c,
      'aria-label': `${cols[ci]} row ${ri + 1}`,
      style: {
        width: '100%', background: 'transparent', border: 0,
        fontFamily: ci >= 3 && ci <= 5 ? 'var(--f-data)' : 'inherit',
        fontSize: 'var(--t-xs)', color: 'var(--paper-2)', padding: '2px'
      },
      oninput: e => { rows[ri][ci] = e.target.value; }
    }))))));
  paint();

  return frame('The trade journal', 'Seven columns. No more.', [
    el('div.scroll-x', el('table.table', [
      el('thead', el('tr', cols.map(c => el('th', { scope: 'col' }, c)))),
      tbody
    ])),
    el('div.row', { style: { marginTop: 'var(--s4)' } }, [
      el('button.btn.btn--sm', { onclick: () => { rows.push(['', '', '', '', '', '', '']); paint(); } }, '+ Add row'),
      el('button.btn.btn--sm', {
        onclick: () => {
          const csv = [cols, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
          const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
          const a = el('a', { href: url, download: 'trade-journal.csv' });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 800);
        }
      }, '↓ Export CSV')
    ])
  ], 'Seven columns is deliberate. Add an eighth and you will stop filling it in by week three.');
}

/** A rule builder that rejects unfalsifiable rules. */
function ruleBuilder() {
  const vague = ['good', 'strong', 'quality', 'promising', 'soon', 'cheap', 'undervalued', 'potential', 'bluechip', 'blue chip'];
  const verdict = el('div', { style: { marginTop: 'var(--s4)' } });
  const input = el('input', {
    type: 'text', placeholder: 'e.g. Buy when the 20-day SMA crosses above the 50-day and turnover exceeds Rs. 1 crore',
    style: { width: '100%' },
    'aria-label': 'Write a trading rule'
  });

  const check = () => {
    const t = input.value.trim();
    if (!t) { verdict.replaceChildren(); return; }
    const found = vague.filter(v => t.toLowerCase().includes(v));
    const hasNumber = /\d/.test(t);
    const ok = !found.length && hasNumber;
    verdict.replaceChildren(el('div.callout', { class: 'callout ' + (ok ? 'callout--info' : 'callout--danger') }, [
      el('span.callout__l', { style: ok ? { color: 'var(--bull)' } : {} }, ok ? '✓ Testable' : '✗ Not testable yet'),
      el('p', ok
        ? 'This rule names a condition you could check on a chart tomorrow morning, and two people reading it would ' +
          'act identically. That is the standard.'
        : found.length
          ? `"${found.join('", "')}" cannot be measured. Two people reading this rule would buy different stocks. ` +
            `Replace the adjective with a number and a source.`
          : 'There is no number in this rule. A rule you cannot check against data is a mood, not a system.')
    ]));
  };
  input.addEventListener('input', check);

  return frame('Write a rule you could actually follow', 'It rejects what it cannot test',
    [el('div.field', [el('label', 'Your rule'), input]), verdict],
    'A rule is testable when two people reading it would take the same action on the same chart.');
}

/** Days-to-exit calculator for the thin sectors. */
function exitCalc() {
  let position = 200000, dailyTurnover = 1200000, share = 0.10;
  const out = el('div');
  function paint() {
    const perDay = dailyTurnover * share;
    const days = perDay > 0 ? position / perDay : Infinity;
    out.replaceChildren(el('div.calc', [
      el('div.calc__row', [el('span', 'Your position'), el('b', rs(position))]),
      el('div.calc__row', [el('span', 'Counter\'s average daily turnover'), el('b', rs(dailyTurnover))]),
      el('div.calc__row', [el('span', `You can realistically be ${pctPlain(share, 0)} of a day's turnover`), el('b', rs(perDay))]),
      el('div.calc__row.calc__row--total', [el('span', 'Trading days to exit'),
        el('b', { class: days > 5 ? 'down' : days > 2 ? 'hi' : 'up' }, days.toFixed(1) + ' days')])
    ]),
      el('div.callout', {
        class: 'callout ' + (days > 5 ? 'callout--danger' : 'callout--info'), style: { marginTop: 'var(--s4)' }
      }, [
        el('span.callout__l', days > 5 ? 'You cannot get out of this quickly' : 'Exitable'),
        el('p', days > 5
          ? `At ${days.toFixed(1)} trading days to exit, any bad news reaches the price long before you reach the door. ` +
            `On a thin counter your stop is a wish. Size the position so you could leave in two days, or do not take it.`
          : `You could leave this position inside ${Math.ceil(days)} trading day${Math.ceil(days) === 1 ? '' : 's'} without ` +
            `being most of the volume yourself.`)
      ]));
  }
  const controls = el('div.fields', { style: { marginBottom: 'var(--s4)' } }, [
    field('Position (Rs.)', numInput(position, { step: '25000', oninput: e => { position = +e.target.value; paint(); } })),
    field('Daily turnover (Rs.)', numInput(dailyTurnover, { step: '100000', oninput: e => { dailyTurnover = +e.target.value; paint(); } }))
  ]);
  paint();
  return frame('Can you actually get out?', 'Days to exit at 10% of daily turnover', [controls, out]);
}

/** Expectancy / R-multiple calculator. */
function expectancy() {
  let winRate = 0.4, avgWin = 2, avgLoss = 1;
  const out = el('div');
  function paint() {
    const e = winRate * avgWin - (1 - winRate) * avgLoss;
    const need = avgLoss / (avgWin + avgLoss);
    out.replaceChildren(el('div.calc', [
      el('div.calc__row', [el('span', 'Win rate'), el('b', pctPlain(winRate, 0))]),
      el('div.calc__row', [el('span', 'Average win'), el('b', avgWin.toFixed(1) + 'R')]),
      el('div.calc__row', [el('span', 'Average loss'), el('b', avgLoss.toFixed(1) + 'R')]),
      el('div.calc__row.calc__row--total', [el('span', 'Expectancy per trade'),
        el('b', { class: e > 0 ? 'up' : 'down' }, (e > 0 ? '+' : '') + e.toFixed(2) + 'R')]),
      el('div.calc__row', [el('span', 'Win rate you need to break even'), el('b', pctPlain(need, 1))])
    ]),
      el('div.callout', { class: 'callout ' + (e > 0 ? 'callout--info' : 'callout--danger'), style: { marginTop: 'var(--s4)' } }, [
        el('span.callout__l', e > 0 ? 'This system makes money' : 'This system loses money'),
        el('p', e > 0
          ? `At ${pctPlain(winRate, 0)} winners and ${avgWin.toFixed(1)}:${avgLoss.toFixed(1)} reward-to-risk, you earn ` +
            `${e.toFixed(2)}R per trade on average. Over 100 trades risking Rs. 6,000 each, that is ${rs(e * 6000 * 100)}. ` +
            `Being wrong most of the time is survivable; being wrong expensively is not.`
          : `You need to be right ${pctPlain(need, 1)} of the time for this reward-to-risk to break even, and you are ` +
            `at ${pctPlain(winRate, 0)}. Either the winners must get bigger or the losers must get smaller.`)
      ]));
  }
  const controls = el('div.fields', { style: { marginBottom: 'var(--s4)' } }, [
    field('Win rate (%)', numInput(40, { step: '5', min: '0', max: '100', oninput: e => { winRate = +e.target.value / 100; paint(); } })),
    field('Average win (R)', numInput(2, { step: '0.1', min: '0.1', oninput: e => { avgWin = +e.target.value; paint(); } })),
    field('Average loss (R)', numInput(1, { step: '0.1', min: '0.1', oninput: e => { avgLoss = +e.target.value; paint(); } }))
  ]);
  paint();
  return frame('Expectancy', 'Why 40% winners can be profitable', [controls, out]);
}

/** Indicator playground — MAs, RSI and MACD on a real series. */
function indicatorLab(props = {}) {
  const symbol = props.symbol || 'NABIL';
  const show = props.show || 'ma';
  return lazy(loadCandles(symbol), series => {
    const data = series.candles.slice(-160);
    const closes = data.map(c => c.c);
    const { panel, body } = chartPanel({ title: `${series.symbol} · ${series.name}`, sub: 'daily', illustrative: true });

    const overlays = [], panels = [];
    if (show === 'ma') {
      overlays.push({ values: sma(closes, 20), color: cssVar('--ma-fast'), label: 'SMA 20' });
      overlays.push({ values: sma(closes, 50), color: cssVar('--ma-slow'), label: 'SMA 50' });
    }
    if (show === 'rsi') panels.push({ label: 'RSI 14', guides: [30, 70], min: 0, max: 100, series: [{ values: rsi(closes, 14), color: cssVar('--rsi-line') }] });
    if (show === 'macd') {
      const m = macd(closes);
      panels.push({
        label: 'MACD 12/26/9',
        series: [
          { values: m.hist, type: 'hist' },
          { values: m.line, color: cssVar('--ma-fast') },
          { values: m.signal, color: cssVar('--ma-slow') }
        ]
      });
    }

    const chart = new CandleChart(body, { data, height: show === 'ma' ? 320 : 380, volume: show === 'ma', overlays, panels });
    chart.setData(data);

    // honest crossover backtest
    let note = null;
    if (show === 'ma') {
      const f = sma(closes, 20), s = sma(closes, 50);
      let wins = 0, trades = 0, entry = null;
      for (let i = 1; i < closes.length; i++) {
        if (f[i] == null || s[i] == null || f[i - 1] == null || s[i - 1] == null) continue;
        const up = f[i] > s[i] && f[i - 1] <= s[i - 1];
        const dn = f[i] < s[i] && f[i - 1] >= s[i - 1];
        if (up && entry === null) entry = closes[i];
        else if (dn && entry !== null) { trades++; if (closes[i] > entry) wins++; entry = null; }
      }
      note = el('p.widget__note', trades
        ? `On this series the 20/50 cross produced ${trades} completed trades and ${wins} of them made money — ` +
          `a ${pctPlain(wins / trades, 0)} win rate, before any commission or tax. Confirmation, not a trigger.`
        : 'This series produced no completed 20/50 crossover trades — which is itself the lesson about how rare clean signals are.');
    }

    const legend = overlays.length ? el('div.legend', overlays.map(o =>
      el('span', [el('i', { style: { background: o.color } }), o.label]))) : null;
    if (legend) panel.append(el('div.chart__foot', legend));
    return frame(null, null, [panel, note].filter(Boolean));
  });
}

/** Three identical hammers in three different contexts — Lesson 9.5. */
function contextDrill() {
  const cases = [
    { label: 'A', ctxName: 'after a five-day decline into a level that has held twice before, on above-average volume', verdict: 'meaningful', why: 'A hammer needs a decline behind it and a reason for buyers to be waiting there. Both are present.' },
    { label: 'B', ctxName: 'in the middle of a two-week sideways drift, on average volume', verdict: 'noise', why: 'The same candle mid-range signals nothing. Nobody was trapped, so nobody has to buy back.' },
    { label: 'C', ctxName: 'after a three-week advance to a new high', verdict: 'bearish', why: 'Identical shape, opposite meaning. After an advance this is a hanging man — the first time in the trend that sellers broke price sharply below the open.' }
  ];
  const out = el('div');
  let answered = false;

  const paint = picked => {
    out.replaceChildren(...cases.map(c => {
      const chosen = picked === c.label;
      const right = c.verdict === 'meaningful';
      return el('button.gopt', {
        class: 'gopt' + (answered ? (right ? ' ok' : chosen ? ' no' : '') : ''),
        disabled: answered,
        style: { alignItems: 'flex-start', textAlign: 'left' },
        onclick: () => { answered = true; paint(c.label); }
      }, [
        el('span.gopt__k', c.label),
        el('div', [
          el('div', { style: { color: 'var(--paper)' } }, 'The identical hammer, ' + c.ctxName),
          answered && el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--paper-3)', marginTop: '6px' } },
            (right ? '✓ Correct — ' : '✗ ') + c.why)
        ])
      ]);
    }));
    if (answered) out.append(el('div.callout.callout--warn', { style: { marginTop: 'var(--s4)' } }, [
      el('span.callout__l', 'This is the whole of Lesson 9.5'),
      el('p', 'A candle has no meaning without its context. The shape is half the information; everything that came ' +
              'before it is the other half. This is the single most common mistake beginners make.')
    ]));
  };
  paint(null);

  return frame('Same candle, three contexts', 'Click the one where the hammer is a meaningful bullish signal', out);
}

/* ── registry ───────────────────────────────────────────────── */

export const WIDGETS = {
  'candle-chart': candleChart,
  'tax-comparison-table': taxComparison,
  'cost-calculator': costCalculator,
  'order-book-demo': orderBookDemo,
  'settlement-timeline': settlementTimeline,
  'pattern-gallery': patternGallery,
  'ratio-explorer': ratioExplorer,
  'sector-treemap': sectorTreemap,
  'position-sizer': positionSizer,
  'drawdown-table': drawdownTable,
  'index-history': indexHistory,
  // supporting cast
  'table': staticTable,
  'flow': flow,
  'compare': compare,
  'org-map': orgMap,
  'probability': probability,
  'correlation': correlation,
  'ddm': ddm,
  'journal': journal,
  'rule-builder': ruleBuilder,
  'exit-calc': exitCalc,
  'expectancy': expectancy,
  'indicator-lab': indicatorLab,
  'context-drill': contextDrill
};
