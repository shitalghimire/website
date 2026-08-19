/* ═══════════════════════════════════════════════════════════════
   PAPER FLOOR — the trading simulator
   Real commission, real SEBON fee, real DP charge, real CGT, real
   T+2, and real EDIS. Get these exactly right or the game teaches
   the wrong thing. Every rejection message names the rule it broke.
   ═══════════════════════════════════════════════════════════════ */

import { el, num, rs, pct, pctPlain, announce, mulberry32, clamp, fmtDate } from '../util.js';
import { CandleChart } from '../chart/candles.js';
import { candles as loadCandles } from '../data.js';
import * as money from '../money.js';
import * as state from '../state.js';

const UNIVERSE = ['NABIL', 'NMB', 'SANIMA', 'UPPER', 'API', 'NHPC', 'CBBL', 'THIN'];

const SCENARIOS = [
  { id: 'first-steps', name: 'First Steps', days: 60, capital: 100000, regime: 'calm',
    goal: 'Complete 5 round trips', teaches: 'Order mechanics, T+2, EDIS' },
  { id: 'churn', name: 'The Cost of Churn', days: 40, capital: 100000, regime: 'calm',
    goal: 'Beat buy-and-hold of the benchmark', teaches: 'Costs and CGT destroy overtrading' },
  { id: 'euphoria', name: 'Euphoria', days: 90, capital: 500000, regime: 'boom',
    goal: 'Finish above your starting capital', teaches: 'The bubble — most players lose here' },
  { id: 'winter', name: 'The Long Winter', days: 90, capital: 500000, regime: 'bust',
    goal: 'Lose less than 49.5%', teaches: 'Drawdown and position sizing' },
  { id: 'grind', name: 'The Grind', days: 90, capital: 500000, regime: 'grind',
    goal: 'Beat the benchmark', teaches: 'Real conditions' }
];

let cleanup = null;

export default {
  id: 'paper-floor',
  title: 'Paper Floor',
  blurb: 'Rs. 1,00,000 of virtual capital, real fees, real T+2, real EDIS.',
  unlockedByModule: 5,
  modes: ['simulator'],

  mount(container, ctx) {
    const fees = ctx.data.fees;
    const rules = ctx.data.rules;
    let series = {};

    /* ── run state ────────────────────────────────────────── */
    let sc = null;                 // active scenario
    let day = 0;                   // index into the window
    let cash = 0;
    let lots = {};                 // sym → [{qty, cost, day}]  FIFO
    let orders = [];               // live day orders
    let settleQ = [];              // pending settlement
    let fills = [];                // for the chart marks
    let costsPaid = { commission: 0, sebon: 0, dp: 0, cgt: 0, penalty: 0 };
    let tradeLog = [];
    let equity = [];               // daily mark-to-market
    let selected = 'NABIL';
    let side = 'buy';
    let edisDue = null;            // { sym, qty, dueDay }
    let running = false;
    let behaviours = {};

    const stage = el('div');
    container.replaceChildren(stage);
    renderPicker();

    /* ── scenario picker ──────────────────────────────────── */

    function renderPicker() {
      const saved = state.load().simulator;
      stage.replaceChildren(
        el('div.callout.callout--info', { style: { marginBottom: 'var(--s5)' } }, [
          el('span.callout__l', 'Everything here costs what it costs in the real market'),
          el('p', 'Slab commission, 0.015% SEBON fee, Rs. 25 DP charge per company per settlement, capital gains tax ' +
                  'withheld on sale at 10% short-term or 7.5% long-term, T+2 settlement in trading days, and EDIS ' +
                  'authorisation you must click on T+1. Skip the EDIS and you will be penalised, exactly as you would be.')
        ]),
        saved ? el('div.panel', { style: { marginBottom: 'var(--s4)' } }, [
          el('span.kicker', 'Saved run'),
          el('p', { style: { margin: 'var(--s2) 0 var(--s3)' } },
            `${saved.scenarioName} — day ${saved.day + 1}, portfolio ${rs(saved.value)}`),
          el('div.row', [
            el('button.btn.btn--primary', { onclick: () => resume(saved) }, 'Resume run'),
            el('button.btn', { onclick: () => { const s = state.load(); s.simulator = null; state.save(s); renderPicker(); } }, 'Discard')
          ])
        ]) : null,
        el('div.pf__scen', SCENARIOS.map(s => el('button.pf__scencard', { onclick: () => begin(s) }, [
          el('h4', s.name),
          el('p', s.teaches),
          el('dl', [
            el('dt', 'Capital'), el('dd', rs(s.capital, 0)),
            el('dt', 'Days'), el('dd', num(s.days, 0)),
            el('dt', 'Goal'), el('dd', s.goal)
          ])
        ]))),
        el('p.widget__note', { style: { marginTop: 'var(--s4)' } },
          'Price series are illustrative and deterministic — the same run produces the same market every time. ' +
          'The Euphoria and Long Winter scenarios follow the shape of NEPSE\'s real 2021 peak and 2023 trough ' +
          '(3,198.60 → 1,615, −49.5%), applied to illustrative counters.')
      );
    }

    /* ── build the scenario market ────────────────────────── */

    async function begin(scenario) {
      sc = scenario;
      stage.replaceChildren(el('p.dim', { style: { padding: 'var(--s7)', textAlign: 'center' } }, 'Loading the market…'));
      const loaded = await Promise.all(UNIVERSE.map(s => loadCandles(s).then(d => [s, d]).catch(() => null)));
      series = {};
      for (const r of loaded) if (r) series[r[0]] = r[1];

      // window + regime shaping, deterministic per scenario
      const rnd = mulberry32(hash(sc.id));
      const total = Object.values(series)[0].candles.length;
      const startIdx = Math.max(0, Math.min(total - sc.days - 12, 20 + Math.floor(rnd() * 60)));

      market = {};
      for (const [sym, d] of Object.entries(series)) {
        const win = d.candles.slice(startIdx, startIdx + sc.days + 11).map(c => ({ ...c }));
        applyRegime(win, sc.regime, sym);
        market[sym] = win;
      }

      day = 0;
      cash = sc.capital;
      lots = {}; orders = []; settleQ = []; fills = []; tradeLog = []; equity = [];
      costsPaid = { commission: 0, sebon: 0, dp: 0, cgt: 0, penalty: 0 };
      edisDue = null; behaviours = {};
      running = true;
      selected = 'NABIL'; side = 'buy';
      benchStart = benchmark(0);
      renderRun();
      announce(`${sc.name} started. ${rs(sc.capital)} of virtual capital, ${sc.days} trading days.`);
    }

    function resume(saved) {
      begin(SCENARIOS.find(s => s.id === saved.scenarioId) || SCENARIOS[0]).then(() => {
        day = saved.day; cash = saved.cash; lots = saved.lots; settleQ = saved.settleQ || [];
        costsPaid = saved.costsPaid; tradeLog = saved.tradeLog || []; equity = saved.equity || [];
        edisDue = saved.edisDue || null; fills = saved.fills || [];
        renderRun();
      });
    }

    let market = {};
    let benchStart = 100;

    /** Shape the window to the scenario's regime, deterministically. */
    function applyRegime(win, regime, sym) {
      const n = win.length;
      const f = i => {
        const t = i / Math.max(1, n - 1);
        switch (regime) {
          case 'boom': return Math.exp(t * 0.62);                       // a genuine run
          case 'bust': return Math.exp(-t * 0.68);                      // −49.5% over the window
          case 'grind': return Math.exp(t * 0.14);
          default: return 1;
        }
      };
      for (let i = 0; i < n; i++) {
        const k = f(i);
        win[i].o *= k; win[i].h *= k; win[i].l *= k; win[i].c *= k;
        win[i].o = r2(win[i].o); win[i].h = r2(win[i].h); win[i].l = r2(win[i].l); win[i].c = r2(win[i].c);
        if (i) win[i].pc = win[i - 1].c;
      }
    }
    const r2 = x => Math.round(x * 100) / 100;
    const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

    /** Equal-weighted benchmark of the universe, normalised to 100. */
    function benchmark(d) {
      const vals = Object.values(market).map(w => w[Math.min(d, w.length - 1)].c / w[0].c);
      return (vals.reduce((a, b) => a + b, 0) / vals.length) * 100;
    }

    /* ── the day loop ─────────────────────────────────────── */

    function advance() {
      if (!running) return;

      // 1 · resting orders match against the new day
      const d = day + 1;
      if (d >= sc.days) return finish();

      for (const o of [...orders]) {
        const bar = market[o.sym][d];
        const dayVol = bar.v || 100000;
        const cap = Math.max(10, Math.floor(dayVol * 0.08));    // the liquidity trap, without a lecture
        let fillQty = 0;
        if (o.side === 'buy' && bar.l <= o.price) fillQty = Math.min(o.remaining, cap);
        if (o.side === 'sell' && bar.h >= o.price) fillQty = Math.min(o.remaining, cap);

        if (fillQty > 0) {
          execute(o, fillQty, d);
          if (o.remaining <= 0) orders = orders.filter(x => x !== o);
        }
      }

      // 2 · day orders expire at the close, exactly like NEPSE
      const expired = orders.filter(o => o.placedDay < d);
      if (expired.length) {
        toast(`${expired.length} order${expired.length === 1 ? '' : 's'} expired unfilled at the close. NEPSE orders are day orders — there is no good-till-cancelled, so you must place them again.`);
        orders = orders.filter(o => o.placedDay >= d);
      }

      // 3 · EDIS deadline
      if (edisDue && d > edisDue.dueDay) {
        costsPaid.penalty += 500;
        cash -= 500;
        behaviours.missedEdis = (behaviours.missedEdis || 0) + 1;
        toast(`EDIS not authorised in time. The sale has gone to AUCTION SETTLEMENT: NEPSE buys the shares in the ` +
              `market to deliver to your buyer and charges you the difference plus a penalty — Rs. 500 here. ` +
              `Your broker may also restrict your account. This is the single most common way a new Nepali seller loses money.`, 'bear');
        edisDue = null;
      }

      // 4 · settlement queue advances
      settleQ = settleQ.filter(s => {
        if (d >= s.settleDay) {
          if (s.kind === 'buy') { (lots[s.sym] ||= []).push({ qty: s.qty, cost: s.wacc, day: d }); }
          else { cash += s.net; }
          return false;
        }
        return true;
      });

      day = d;
      equity.push(portfolioValue());
      save();
      renderRun();
    }

    function execute(o, qty, d) {
      const price = o.price;
      if (o.side === 'buy') {
        const c = money.tradeCost({ qty, price, side: 'buy', fees });
        if (c.total > cash) { toast('Fill skipped — insufficient cash for the full cost including fees.'); return; }
        cash -= c.total;
        costsPaid.commission += c.commission; costsPaid.sebon += c.sebon; costsPaid.dp += c.dp;
        settleQ.push({ kind: 'buy', sym: o.sym, qty, wacc: c.wacc, settleDay: d + 2 });
        tradeLog.push({ d, sym: o.sym, side: 'buy', qty, price, cost: c.total });
        fills.push({ i: d, side: 'buy', price, sym: o.sym });
        toast(`Bought ${num(qty, 0)} ${o.sym} @ Rs. ${num(price)} — total ${rs(c.total)} (commission ${rs(c.commission)}, SEBON ${rs(c.sebon)}, DP ${rs(c.dp)}). Shares credit on T+2.`, 'bull');
      } else {
        const sellLots = lots[o.sym] || [];
        let remaining = qty, basis = 0, oldestDay = d;
        for (const lot of sellLots) {                       // FIFO
          if (remaining <= 0) break;
          const take = Math.min(lot.qty, remaining);
          basis += take * lot.cost;
          oldestDay = Math.min(oldestDay, lot.day);
          lot.qty -= take; remaining -= take;
        }
        lots[o.sym] = sellLots.filter(l => l.qty > 0);
        const c = money.tradeCost({ qty, price, side: 'sell', fees });
        const heldDays = Math.max(1, (d - oldestDay) * 1.4);   // trading days → calendar days
        const tax = money.cgt({ netBeforeTax: c.netBeforeTax, costBasis: basis, holdingDays: heldDays, fees });
        costsPaid.commission += c.commission; costsPaid.sebon += c.sebon; costsPaid.dp += c.dp; costsPaid.cgt += tax.tax;
        settleQ.push({ kind: 'sell', sym: o.sym, qty, net: c.netBeforeTax - tax.tax, settleDay: d + 2 });
        edisDue = { sym: o.sym, qty, dueDay: d + 1 };
        tradeLog.push({ d, sym: o.sym, side: 'sell', qty, price, net: c.netBeforeTax - tax.tax, gain: tax.gain, heldDays });
        fills.push({ i: d, side: 'sell', price, sym: o.sym });
        toast(`Sold ${num(qty, 0)} ${o.sym} @ Rs. ${num(price)}. Gain ${rs(tax.gain)}, CGT ${rs(tax.tax)} (${tax.band}). ` +
              `You must authorise EDIS by the end of tomorrow.`, 'bull');
      }
      o.remaining -= qty;
      if (o.remaining > 0) {
        behaviours.partialFill = (behaviours.partialFill || 0) + 1;
        toast(`Partially executed — ${num(o.remaining, 0)} kitta still live. Your order was larger than 8% of the day's ` +
              `volume on this counter. If the rest fills tomorrow you settle twice and pay the Rs. ${fees.dpCharge} DP charge twice.`, 'warn');
      }
    }

    function placeOrder(sym, sideV, qty, price) {
      const bar = market[sym][day];
      const prev = day > 0 ? market[sym][day - 1].c : bar.o;
      const v = money.validateOrder({ price, prevClose: prev, ltp: bar.c, rules });
      if (!v.ok) return toast(v.msg, 'bear');
      if (qty < 10 || qty % 10 !== 0) return toast('Rejected — minimum lot is 10 kitta, in multiples of 10.', 'bear');

      if (sideV === 'buy') {
        const est = money.tradeCost({ qty, price, side: 'buy', fees });
        if (est.total > cash) return toast(`Rejected — insufficient funds. This order needs ${rs(est.total)} including fees; you have ${rs(cash)}. NEPSE gives you no margin.`, 'bear');
      } else {
        const held = (lots[sym] || []).reduce((a, l) => a + l.qty, 0);
        if (qty > held) return toast(`Rejected — you hold ${num(held, 0)} kitta of ${sym} in settled form. You cannot sell shares that have not yet settled into your Demat, which is exactly why intraday trading does not exist on NEPSE.`, 'bear');
      }
      orders.push({ sym, side: sideV, qty, remaining: qty, price, placedDay: day });
      toast(`Order placed: ${sideV.toUpperCase()} ${num(qty, 0)} ${sym} @ Rs. ${num(price)}. It rests until it fills or expires at today's close.`);
      renderRun();
    }

    function authoriseEdis() {
      if (!edisDue) return;
      toast(`EDIS authorised for ${num(edisDue.qty, 0)} ${edisDue.sym}. Shares blocked for delivery; funds settle on T+2.`, 'bull');
      edisDue = null;
      renderRun();
    }

    /* ── valuation ────────────────────────────────────────── */

    function holdingsValue() {
      let v = 0;
      for (const [sym, ls] of Object.entries(lots)) {
        const q = ls.reduce((a, l) => a + l.qty, 0);
        if (q) v += q * market[sym][day].c;
      }
      // shares still settling are yours economically
      for (const s of settleQ) if (s.kind === 'buy') v += s.qty * market[s.sym][day].c;
      return v;
    }
    function pendingCash() { return settleQ.filter(s => s.kind === 'sell').reduce((a, s) => a + s.net, 0); }
    function portfolioValue() { return cash + holdingsValue() + pendingCash(); }

    /* ── render ───────────────────────────────────────────── */

    let toastNode = el('div');

    function toast(msg, kind = 'info') {
      toastNode.replaceChildren(el('div', {
        class: kind === 'bear' ? 'pf__reject' : kind === 'warn' ? 'pf__edis' : 'td__toast td__toast--ok',
        style: kind === 'info' ? { borderLeftColor: 'var(--paper-3)', background: 'var(--ink-850)' } : {}
      }, msg));
      announce(msg);
    }

    function renderRun() {
      const bar = market[selected][day];
      const prev = day > 0 ? market[selected][day - 1].c : bar.o;
      const held = (lots[selected] || []).reduce((a, l) => a + l.qty, 0);
      const value = portfolioValue();
      const pnl = value - sc.capital;
      const bench = benchmark(day) / benchStart * 100 - 100;

      const qtyInput = el('input', { type: 'number', value: '100', min: '10', step: '10' });
      const rateInput = el('input', { type: 'number', value: String(bar.c), step: '0.1' });

      const preview = el('div.pf__preview');
      const updatePreview = () => {
        const q = +qtyInput.value || 0, p = +rateInput.value || 0;
        if (!q || !p) return preview.replaceChildren();
        if (side === 'buy') {
          const c = money.tradeCost({ qty: q, price: p, side: 'buy', fees });
          preview.replaceChildren(
            row('Gross', rs(c.gross)), row(`Commission (${pctPlain(c.slab.rate, 2)})`, rs(c.commission)),
            row('SEBON fee', rs(c.sebon)), row('DP charge', rs(c.dp)),
            row('Total cost', rs(c.total), true), row('WACC per share', rs(c.wacc)));
        } else {
          const c = money.tradeCost({ qty: q, price: p, side: 'sell', fees });
          const ls = lots[selected] || [];
          let basis = 0, rem = q, oldest = day;
          for (const l of ls) { if (rem <= 0) break; const t = Math.min(l.qty, rem); basis += t * l.cost; oldest = Math.min(oldest, l.day); rem -= t; }
          const tax = money.cgt({ netBeforeTax: c.netBeforeTax, costBasis: basis, holdingDays: Math.max(1, (day - oldest) * 1.4), fees });
          preview.replaceChildren(
            row('Gross', rs(c.gross)), row('Commission', rs(c.commission)),
            row('SEBON fee', rs(c.sebon)), row('DP charge', rs(c.dp)),
            row('Net before tax', rs(c.netBeforeTax)),
            row(`CGT (${tax.band})`, rs(tax.tax)),
            row('Net proceeds', rs(c.netBeforeTax - tax.tax), true));
        }
      };
      const row = (l, v, t) => el('div', { class: 'r' + (t ? ' t' : '') }, [el('span', l), el('b', v)]);
      qtyInput.addEventListener('input', updatePreview);
      rateInput.addEventListener('input', updatePreview);

      /* left terminal */
      const left = el('div.pf__term', [
        el('div.pf__cash', [
          el('div', [el('span.hud__l', 'Cash'), el('div.hud__v', rs(cash, 0))]),
          el('div', [el('span.hud__l', 'Holdings'), el('div.hud__v', rs(holdingsValue(), 0))]),
          el('div', [el('span.hud__l', 'Portfolio'), el('div.hud__v', rs(value, 0))]),
          el('div', [el('span.hud__l', 'P&L'), el('div', { class: 'hud__v ' + (pnl >= 0 ? 'up' : 'down') }, (pnl >= 0 ? '+' : '') + rs(pnl, 0))])
        ]),

        el('div.pf__day', [
          el('span.kicker', `Day ${day + 1} / ${sc.days}`),
          el('button.btn.btn--primary', { onclick: advance, disabled: !!edisDue },
            edisDue ? 'Authorise EDIS first' : '▶ Next day  (Space)')
        ]),

        edisDue && el('div.pf__edis', [
          el('span.callout__l', { style: { color: 'var(--signal)' } }, 'ACTION REQUIRED — EDIS'),
          el('p', { style: { fontSize: 'var(--t-xs)', margin: '4px 0 8px' } },
            `You sold ${num(edisDue.qty, 0)} ${edisDue.sym}. Authorise delivery by the end of tomorrow or the trade fails to auction settlement.`),
          el('button.btn.btn--sm.btn--primary', { onclick: authoriseEdis }, 'Authorise EDIS')
        ]),

        el('div.pf__ticket', [
          el('span.kicker', 'Order ticket'),
          el('div.field', [el('label', 'Symbol'),
            el('select', {
              onchange: e => { selected = e.target.value; renderRun(); }
            }, UNIVERSE.map(s => el('option', { value: s, selected: s === selected }, `${s} — ${num(market[s][day].c)}`)))]),
          el('div.pf__side', [
            el('button', { class: 'btn' + (side === 'buy' ? ' on buy' : ''), onclick: () => { side = 'buy'; renderRun(); } }, 'BUY'),
            el('button', { class: 'btn' + (side === 'sell' ? ' on sell' : ''), onclick: () => { side = 'sell'; renderRun(); } }, 'SELL')
          ]),
          el('div.fields', [
            el('div.field', [el('label', 'Quantity (kitta)'), qtyInput]),
            el('div.field', [el('label', 'Rate (Rs.)'), rateInput])
          ]),
          el('p.widget__note', { style: { padding: 0 } },
            `LTP ${num(bar.c)} · circuit ${num(prev * 0.85)}–${num(prev * 1.15)} · band ${num(bar.c * 0.97)}–${num(bar.c * 1.03)}`),
          preview,
          el('button.btn.btn--primary', {
            onclick: () => placeOrder(selected, side, +qtyInput.value, +rateInput.value)
          }, 'Place order')
        ]),

        orders.length ? el('div', [
          el('span.kicker', { style: { display: 'block', margin: 'var(--s3) 0 var(--s2)' } }, 'Open orders'),
          el('div.pf__list', orders.map(o => el('div.pf__row', [
            el('b', `${o.side.toUpperCase()} ${num(o.remaining, 0)} ${o.sym} @ ${num(o.price)}`),
            el('button.btn.btn--sm', { onclick: () => { orders = orders.filter(x => x !== o); renderRun(); } }, 'Cancel')
          ])))
        ]) : null,

        Object.keys(lots).some(s => lots[s].some(l => l.qty > 0)) ? el('div', [
          el('span.kicker', { style: { display: 'block', margin: 'var(--s3) 0 var(--s2)' } }, 'Holdings'),
          el('div.pf__list', Object.entries(lots).filter(([, ls]) => ls.some(l => l.qty > 0)).map(([sym, ls]) => {
            const q = ls.reduce((a, l) => a + l.qty, 0);
            const w = money.wacc(ls.filter(l => l.qty > 0));
            const mkt = market[sym][day].c;
            const up = mkt >= w;
            return el('div.pf__row', [
              el('b', `${sym} · ${num(q, 0)} kitta`),
              el('span', { class: up ? 'up' : 'down' }, `WACC ${num(w)} → ${num(mkt)} (${pct((mkt - w) / w)})`)
            ]);
          }))
        ]) : null,

        settleQ.length ? el('div', [
          el('span.kicker', { style: { display: 'block', margin: 'var(--s3) 0 var(--s2)' } }, 'Settlement queue'),
          el('div.pf__list', settleQ.map(s => el('div.pf__row', [
            el('b', s.kind === 'buy' ? `${num(s.qty, 0)} ${s.sym} arriving` : `${rs(s.net)} arriving`),
            el('span.dim', `settles day ${s.settleDay + 1}`)
          ])))
        ]) : null
      ]);

      /* right chart */
      const chartHost = el('div');
      const right = el('div', [
        el('div.chart', [
          el('div.chart__head', [
            el('span.chart__t', `${selected} · ${series[selected].name}`),
            el('span.chart__sub', `Day ${day + 1} · benchmark ${pct(bench / 100)}`)
          ]),
          chartHost
        ]),
        el('p.widget__note', 'Your fills are marked with triangles. Prices are illustrative and deterministic.')
      ]);

      stage.replaceChildren(
        el('div.row', { style: { marginBottom: 'var(--s3)' } }, [
          el('span.pill.pill--signal', sc.name),
          el('span.pill', sc.goal),
          el('button.btn.btn--sm', { onclick: () => { if (confirm('Abandon this run? Progress is saved but the run ends.')) finish(); } }, 'End run')
        ]),
        toastNode,
        el('div.pf', [left, right])
      );

      const view = market[selected].slice(0, day + 1);
      const chart = new CandleChart(chartHost, {
        data: view, height: 340, volume: true,
        marks: fills.filter(f => f.sym === selected)
      });
      chart.setData(view);
      updatePreview();
    }

    function save() {
      const s = state.load();
      s.simulator = {
        scenarioId: sc.id, scenarioName: sc.name, day, cash, lots, settleQ, costsPaid,
        tradeLog, equity, edisDue, fills, value: portfolioValue()
      };
      state.save(s);
    }

    /* ── the end-of-run report — where the learning lands ── */

    function finish() {
      running = false;
      const value = portfolioValue();
      const ret = (value - sc.capital) / sc.capital;
      const bench = benchmark(day) / benchStart - 1;
      const totalCosts = costsPaid.commission + costsPaid.sebon + costsPaid.dp + costsPaid.cgt + costsPaid.penalty;

      const sells = tradeLog.filter(t => t.side === 'sell');
      const wins = sells.filter(t => (t.gain || 0) > 0).length;
      const winRate = sells.length ? wins / sells.length : 0;
      const avgHold = sells.length ? sells.reduce((a, t) => a + t.heldDays, 0) / sells.length : 0;
      const grossGain = sells.reduce((a, t) => a + Math.max(0, t.gain || 0), 0);

      let peak = -Infinity, mdd = 0;
      for (const v of equity) { if (v > peak) peak = v; mdd = Math.max(mdd, (peak - v) / (peak || 1)); }

      // two named behaviours, each linked to the lesson that addresses it
      const named = [];
      if (avgHold > 0 && avgHold < 20 && totalCosts > grossGain * 0.5)
        named.push([`Your average holding period was ${avgHold.toFixed(0)} days — you paid ${rs(totalCosts)} in costs to earn ${rs(grossGain)} of gross gains.`, '#/m/7/l/4']);
      if (behaviours.missedEdis)
        named.push([`You missed EDIS ${behaviours.missedEdis} time${behaviours.missedEdis === 1 ? '' : 's'} and paid ${rs(costsPaid.penalty)} in auction penalties.`, '#/m/6/l/2']);
      if (behaviours.partialFill >= 2)
        named.push([`${behaviours.partialFill} of your orders filled only partially — you were repeatedly larger than 8% of the day's volume.`, '#/m/10/l/4']);
      if (mdd > 0.2)
        named.push([`Your largest drawdown was ${pctPlain(mdd, 1)}, which needs a ${pctPlain(money.recoveryFor(mdd), 1)} gain to recover.`, '#/m/14/l/4']);
      if (tradeLog.length > sc.days / 3)
        named.push([`You placed ${tradeLog.length} trades in ${sc.days} sessions. Every one of them paid commission twice over a round trip.`, '#/m/7/l/1']);
      if (!named.length && sells.length)
        named.push([`You held for an average of ${avgHold.toFixed(0)} days and kept costs to ${pctPlain(totalCosts / sc.capital, 2)} of capital.`, '#/m/16/l/4']);

      // goals and badges
      let goalMet = false;
      if (sc.id === 'first-steps') goalMet = sells.length >= 5;
      else if (sc.id === 'churn' || sc.id === 'grind') goalMet = ret > bench;
      else if (sc.id === 'euphoria') { goalMet = value > sc.capital; if (goalMet) state.grant('survived-euphoria'); }
      else if (sc.id === 'winter') goalMet = ret > -0.495;

      const worstTrade = sells.reduce((w, t) => (t.gain ?? 0) < (w?.gain ?? Infinity) ? t : w, null);
      if (sells.length && (!worstTrade || (worstTrade.gain ?? 0) > -0.10 * sc.capital)) state.grant('paper-hands');

      const scoreV = Math.max(0, Math.round(1000 + ret * 4000 + (goalMet ? 500 : 0)));
      const rec = ctx.onEnd({ score: scoreV, accuracy: winRate, meta: { scenario: sc.id, return: ret } });
      if (ret > bench) state.pushEvent({ kind: 'game', id: 'paper-floor', value: state.XP.beatIndex, best: false });
      state.pushEvent({ kind: 'game', id: 'paper-floor', value: state.XP.scenarioComplete, best: false });

      const s = state.load(); s.simulator = null; state.save(s);

      stage.replaceChildren(
        el('div.result', [
          el('div.result__score', { class: 'result__score ' + (ret >= 0 ? 'up' : 'down') }, pct(ret)),
          el('div.result__l', `${sc.name} — ${goalMet ? 'goal met' : 'goal missed'}`),
          el('div.result__grid', [
            rc('Final value', rs(value, 0)),
            rc('Started with', rs(sc.capital, 0)),
            rc('Benchmark', pct(bench)),
            rc('vs benchmark', pct(ret - bench)),
            rc('Trades', num(tradeLog.length, 0)),
            rc('Win rate', sells.length ? pctPlain(winRate, 0) : '—'),
            rc('Avg hold', sells.length ? avgHold.toFixed(0) + ' d' : '—'),
            rc('Max drawdown', pctPlain(mdd, 1))
          ])
        ]),

        el('div.panel', { style: { marginTop: 'var(--s4)' } }, [
          el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'What it cost you'),
          el('div.calc', [
            crow('Broker commission', rs(costsPaid.commission)),
            crow('SEBON fee', rs(costsPaid.sebon)),
            crow('DP charges', rs(costsPaid.dp)),
            crow('Capital gains tax withheld', rs(costsPaid.cgt)),
            costsPaid.penalty ? crow('Auction settlement penalties', rs(costsPaid.penalty)) : null,
            crow('Total friction', rs(totalCosts), true),
            crow('As a share of starting capital', pctPlain(totalCosts / sc.capital, 2), true)
          ])
        ]),

        named.length ? el('div.panel', { style: { marginTop: 'var(--s4)' } }, [
          el('span.kicker', { style: { display: 'block', marginBottom: 'var(--s3)' } }, 'What the run says about how you traded'),
          el('div.weak', named.slice(0, 3).map(([text, href]) => el('a', { href }, [
            el('span', { style: { color: 'var(--paper)' } }, text),
            el('span', 'lesson →')
          ])))
        ]) : null,

        el('div.row', { style: { marginTop: 'var(--s5)', justifyContent: 'center' } }, [
          el('button.btn.btn--primary', { onclick: renderPicker }, 'Another scenario'),
          el('a.btn', { href: '#/games' }, 'All games')
        ])
      );
      announce(`Run complete. Return ${(ret * 100).toFixed(1)} percent against a benchmark of ${(bench * 100).toFixed(1)} percent.`);
    }
    const rc = (l, v) => el('div.result__cell', [el('span.hud__l', l), el('span.hud__v', v)]);
    const crow = (l, v, t) => el('div', { class: 'calc__row' + (t ? ' calc__row--total' : '') }, [el('span', l), el('b', v)]);

    const onKey = e => {
      if (!running) return;
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        e.preventDefault();
        if (!edisDue) advance();
      }
      if (e.key === 'e' && edisDue) authoriseEdis();
    };
    window.addEventListener('keydown', onKey);
    cleanup = () => { running = false; window.removeEventListener('keydown', onKey); };
  },

  unmount() { cleanup?.(); cleanup = null; }
};
