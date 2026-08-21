/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — disruption and earned-value instruments
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, days, pct, money, n0, altTable, prefersStill, clamp } from '../dom.js';
import { fig, ctlBar, tabs, readout, setReadout, slider, legend, scale, polyline, drawLine, niceTicks, field, numInput } from './kit.js';

/* ═══════════════════════════════════════════════════════════════
   1 · MEASURED MILE
   Pick the control period. Everything downstream recalculates.
   The lesson it teaches by force: your answer depends entirely on
   which weeks you called "unimpacted".
   ═══════════════════════════════════════════════════════════════ */

export function measuredMile(props = {}) {
  // weekly output (units) and hours expended
  const wk = props.weeks || [
    { w: 1, out: 120, hrs: 480 }, { w: 2, out: 210, hrs: 480 }, { w: 3, out: 268, hrs: 480 },
    { w: 4, out: 272, hrs: 480 }, { w: 5, out: 275, hrs: 480 }, { w: 6, out: 270, hrs: 480 },
    { w: 7, out: 264, hrs: 520 }, { w: 8, out: 198, hrs: 620 }, { w: 9, out: 152, hrs: 700 },
    { w: 10, out: 140, hrs: 760 }, { w: 11, out: 148, hrs: 780 }, { w: 12, out: 166, hrs: 720 },
    { w: 13, out: 205, hrs: 640 }, { w: 14, out: 252, hrs: 540 }, { w: 15, out: 266, hrs: 500 }
  ];
  let ctrl = [2, 5];      // inclusive week indices (0-based)

  const W = 860, H = 280, M = { t: 18, r: 54, b: 40, l: 54 };
  const x = scale([0, wk.length - 1], [M.l, W - M.r]);
  const maxProd = Math.max(...wk.map(d => d.out / d.hrs)) * 1.15;
  const y = scale([0, maxProd], [H - M.b, M.t]);

  const gBand = svg('g');
  const gLine = svg('g');
  const gRef = svg('g');
  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });

  const ro = readout([
    ['Measured mile', '—', 'slack'],
    ['Impacted rate', '—', 'crit'],
    ['Efficiency', '—'],
    ['Hours lost', '—', 'crit'],
    ['At £42/hr', '—', 'emp']
  ]);

  function build() {
    board.replaceChildren();
    const g = svg('g');

    for (const t of niceTicks(0, maxProd, 5)) {
      g.append(svg('line.c-grid', { x1: M.l, y1: y(t), x2: W - M.r, y2: y(t) }));
      g.append(svg('text.c-tick', { x: M.l - 7, y: y(t) + 3, 'text-anchor': 'end' }, t.toFixed(2)));
    }
    g.append(svg('text.c-tick', { x: M.l - 7, y: M.t - 5, 'text-anchor': 'end', fill: 'var(--p-300)' }, 'units/hr'));

    // control band
    gBand.replaceChildren(svg('rect.c-band', {
      x: x(ctrl[0]) - 8, y: M.t, width: x(ctrl[1]) - x(ctrl[0]) + 16, height: H - M.b - M.t,
      fill: 'var(--slack)', opacity: .12
    }));
    gBand.append(svg('text.c-note', {
      x: (x(ctrl[0]) + x(ctrl[1])) / 2, y: M.t + 11, 'text-anchor': 'middle', fill: 'var(--slack)'
    }, 'MEASURED MILE'));
    g.append(gBand);

    // productivity line
    const pts = wk.map((d, i) => [x(i), y(d.out / d.hrs)]);
    gLine.replaceChildren(drawLine(polyline(pts), 'var(--p-200)', { animate: !prefersStill() }));
    wk.forEach((d, i) => {
      const inBand = i >= ctrl[0] && i <= ctrl[1];
      gLine.append(svg('circle.c-dot', {
        cx: pts[i][0], cy: pts[i][1], r: inBand ? 3.4 : 2.6,
        fill: inBand ? 'var(--slack)' : 'var(--p-300)'
      }, svg('title', `Week ${d.w}: ${d.out} units in ${d.hrs} hrs = ${(d.out / d.hrs).toFixed(3)} units/hr`)));
      if (i % 2 === 0) g.append(svg('text.c-tick', { x: pts[i][0], y: H - M.b + 14, 'text-anchor': 'middle' }, 'W' + d.w));
    });
    g.append(gLine);

    // the measured-mile reference rate, extended across the whole chart
    const band = wk.slice(ctrl[0], ctrl[1] + 1);
    const mmOut = band.reduce((a, d) => a + d.out, 0);
    const mmHrs = band.reduce((a, d) => a + d.hrs, 0);
    const mmRate = mmOut / mmHrs;
    gRef.replaceChildren(svg('line', {
      x1: M.l, y1: y(mmRate), x2: W - M.r, y2: y(mmRate),
      stroke: 'var(--slack)', 'stroke-width': 1.3, 'stroke-dasharray': '5 3'
    }));
    gRef.append(svg('text.c-note', {
      x: W - M.r + 4, y: y(mmRate) + 3, fill: 'var(--slack)'
    }, mmRate.toFixed(3)));
    g.append(gRef);

    board.append(g);

    // arithmetic
    const impacted = wk.filter((_, i) => i < ctrl[0] || i > ctrl[1]);
    const impOut = impacted.reduce((a, d) => a + d.out, 0);
    const impHrs = impacted.reduce((a, d) => a + d.hrs, 0);
    const impRate = impOut / impHrs;
    const shouldHave = impOut / mmRate;
    const lost = impHrs - shouldHave;
    const eff = impRate / mmRate;

    setReadout(ro, 0, mmRate.toFixed(3) + ' u/h', 'slack');
    setReadout(ro, 1, impRate.toFixed(3) + ' u/h', 'crit');
    setReadout(ro, 2, pct(eff, 0), eff < 0.8 ? 'crit' : null);
    setReadout(ro, 3, n0(lost) + ' hrs', 'crit');
    setReadout(ro, 4, money(lost * 42), 'emp');

    working.replaceChildren(
      el('div.calc', [
        row('Measured mile — output', n0(mmOut) + ' units'),
        row('Measured mile — hours', n0(mmHrs) + ' hrs'),
        row('Measured mile — productivity', mmRate.toFixed(4) + ' units/hr', 'total'),
        row('Impacted periods — output', n0(impOut) + ' units', 'sub'),
        row('Impacted periods — hours actually spent', n0(impHrs) + ' hrs', 'sub'),
        row('Hours that output SHOULD have taken', n0(shouldHave) + ' hrs', 'sub'),
        row('Hours lost to disruption', n0(lost) + ' hrs', 'total'),
        row('Loss at £42/hr all-in', money(lost * 42), 'total')
      ])
    );
  }

  function row(l, v, kind) {
    return el('div', { class: 'calc__row' + (kind ? ' calc__row--' + kind : '') }, [el('span', l), el('b', v)]);
  }

  const working = el('div', { style: { marginTop: 'var(--s4)' } });

  const from = slider(ctrl[0], {
    min: 0, max: wk.length - 2, fmt: v => 'W' + wk[v].w,
    onInput: v => { ctrl[0] = Math.min(v, ctrl[1] - 1); build(); }
  });
  const to = slider(ctrl[1], {
    min: 1, max: wk.length - 1, fmt: v => 'W' + wk[v].w,
    onInput: v => { ctrl[1] = Math.max(v, ctrl[0] + 1); build(); }
  });

  build();

  return fig(
    props.title || 'The measured mile',
    'Choose the unimpacted period. Everything else follows from it.',
    [el('div.chart', el('div.scroll-x', board)), working],
    props.note || 'Move the band into the disrupted weeks and watch the loss collapse. That sensitivity is the whole argument against this method and the whole reason it must be justified from the records rather than chosen for its answer. Compare like with like: avoid the learning curve at the start, and never use tender rates as the control — they may never have been achievable.',
    { before: [ctlBar([
        el('span.ctl__lbl', 'Control period from'), from.node,
        el('span.ctl__lbl', 'to'), to.node
      ], true)], extras: [ro, altTable('Weekly productivity',
        ['Week', 'Output (units)', 'Hours', 'Units/hr'],
        wk.map(d => [d.w, d.out, d.hrs, (d.out / d.hrs).toFixed(3)]))] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   2 · EARNED VALUE
   BCWS, BCWP, ACWP and the two indices, live.
   ═══════════════════════════════════════════════════════════════ */

export function earnedValue(props = {}) {
  let bcws = props.bcws ?? 55, bcwp = props.bcwp ?? 45, acwp = props.acwp ?? 37;
  const bac = props.bac ?? 100;

  const W = 720, H = 250, M = { t: 18, r: 96, b: 34, l: 52 };
  const months = 12;
  const now = 6;
  const x = scale([0, months], [M.l, W - M.r]);
  const y = scale([0, bac * 1.05], [H - M.b, M.t]);

  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' });
  const ro = readout([
    ['Schedule variance', '—', 'crit'],
    ['Cost variance', '—', 'slack'],
    ['SPI', '—'],
    ['CPI', '—'],
    ['Estimate at completion', '—', 'ink']
  ]);

  function curve(end, k) {
    // an S-curve through `end` at month `now`
    const pts = [];
    for (let i = 0; i <= months; i++) {
      const t = i / months;
      const s = 1 / (1 + Math.exp(-9 * (t - 0.5)));
      const s0 = 1 / (1 + Math.exp(-9 * (now / months - 0.5)));
      pts.push([x(i), y(i <= now ? (s / s0) * end : end + (s - s0) / (1 - s0) * (bac * k - end))]);
    }
    return pts;
  }

  function build() {
    board.replaceChildren();
    const g = svg('g');
    for (const t of niceTicks(0, bac, 5)) {
      g.append(svg('line.c-grid', { x1: M.l, y1: y(t), x2: W - M.r, y2: y(t) }));
      g.append(svg('text.c-tick', { x: M.l - 7, y: y(t) + 3, 'text-anchor': 'end' }, '£' + t + 'm'));
    }
    for (let i = 0; i <= months; i += 2) {
      g.append(svg('text.c-tick', { x: x(i), y: H - M.b + 14, 'text-anchor': 'middle' }, 'M' + i));
    }

    // data date
    g.append(svg('line', {
      x1: x(now), y1: M.t, x2: x(now), y2: H - M.b,
      stroke: 'var(--today)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3'
    }));
    g.append(svg('text.c-note', { x: x(now) + 4, y: M.t + 9, fill: 'var(--today)' }, 'DATA DATE'));

    const series = [
      { n: 'BCWS — planned value', v: bcws, tone: 'p-200', k: 1 },
      { n: 'BCWP — earned value', v: bcwp, tone: 'slack', k: 1 },
      { n: 'ACWP — actual cost', v: acwp, tone: 'critical', k: bcwp ? (acwp / bcwp) : 1 }
    ];
    series.forEach((s, i) => {
      const pts = curve(s.v, s.k);
      const upTo = pts.slice(0, now + 1);
      const after = pts.slice(now);
      g.append(drawLine(polyline(upTo), `var(--${s.tone})`, { delay: i * 200, animate: !prefersStill() }));
      g.append(svg('path', {
        d: polyline(after), fill: 'none', stroke: `var(--${s.tone})`,
        'stroke-width': 1.4, 'stroke-dasharray': '3 3', opacity: .45
      }));
      g.append(svg('circle.c-dot', { cx: pts[now][0], cy: pts[now][1], r: 3.4, fill: `var(--${s.tone})` }));
      g.append(svg('text', {
        x: W - M.r + 5, y: pts[now][1] + 3,
        'font-family': 'var(--f-data)', 'font-size': '8', fill: `var(--${s.tone})`
      }, s.n.split(' —')[0]));
    });

    board.append(g);

    const sv = bcwp - bcws, cv = bcwp - acwp;
    const spi = bcws ? bcwp / bcws : 0;
    const cpi = acwp ? bcwp / acwp : 0;
    const eac = cpi ? acwp + (bac - bcwp) / cpi : bac;

    setReadout(ro, 0, money(sv, '£') + 'm', sv < 0 ? 'crit' : 'slack');
    setReadout(ro, 1, money(cv, '£') + 'm', cv < 0 ? 'crit' : 'slack');
    setReadout(ro, 2, spi.toFixed(2), spi < 1 ? 'crit' : 'slack');
    setReadout(ro, 3, cpi.toFixed(2), cpi < 1 ? 'crit' : 'slack');
    setReadout(ro, 4, '£' + eac.toFixed(0) + 'm', eac > bac ? 'crit' : 'ink');

    verdict.replaceChildren(
      spi < 1 && cpi > 1
        ? 'Under budget and behind programme — and the two are related. The underspend is not efficiency; it is work that has not been done yet. This is exactly the situation a cost report alone would report as good news.'
        : spi >= 1 && cpi >= 1
          ? 'Ahead on both. Rare, and worth checking that the earned value is being claimed honestly rather than optimistically.'
          : spi < 1 && cpi < 1
            ? 'Behind and over. Once CPI falls below one it very rarely returns — savings on remaining work almost never offset an overrun without cutting scope or quality.'
            : 'Ahead of programme but over budget: the schedule has been bought with money, which is what acceleration looks like on a cost report.'
    );
  }

  const verdict = el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--p-100)', marginTop: 'var(--s4)', lineHeight: '1.55' } });

  const mk = (label, get, set, max) => {
    const s = slider(get(), { min: 0, max, step: 1, fmt: v => '£' + v + 'm', onInput: v => { set(v); build(); } });
    return el('div.field', [el('label', label), s.node]);
  };

  build();

  return fig(
    props.title || 'Earned value',
    'Three numbers, two indices, one honest picture',
    [el('div.chart', el('div.scroll-x', board)), verdict],
    props.note || 'Schedule performance measured in money is a blunt instrument — it cannot tell you WHICH activities are late, and a project can show SPI near 1.00 while its critical path is in ruins. Use it to spot a trend early, then go to the programme to find out what the trend is made of.',
    { before: [ctlBar([
        mk('Planned (BCWS)', () => bcws, v => bcws = v, bac),
        mk('Earned (BCWP)', () => bcwp, v => bcwp = v, bac),
        mk('Actual (ACWP)', () => acwp, v => acwp = v, bac)
      ], true)], extras: [ro] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   3 · DISRUPTION CALCULATOR
   Planned crew and output against actual. Efficiency, hours lost.
   ═══════════════════════════════════════════════════════════════ */

export function disruptionCalc(props = {}) {
  let pUnits = 100, pHours = 16, aUnits = 100, aHours = 32, rate = 38;

  const out = el('div');
  const ro = readout([
    ['Planned productivity', '—'],
    ['Actual productivity', '—'],
    ['Efficiency', '—', 'crit'],
    ['Hours lost per 100 units', '—', 'crit'],
    ['Cost of the loss', '—', 'emp']
  ]);

  function calc() {
    const pProd = pUnits / pHours;
    const aProd = aUnits / aHours;
    const eff = aProd / pProd;
    const lost = aHours - pHours;

    setReadout(ro, 0, pProd.toFixed(2) + ' u/h');
    setReadout(ro, 1, aProd.toFixed(2) + ' u/h');
    setReadout(ro, 2, pct(eff, 0), eff < 1 ? 'crit' : 'slack');
    setReadout(ro, 3, n0(lost) + ' hrs', lost > 0 ? 'crit' : 'slack');
    setReadout(ro, 4, money(lost * rate), 'emp');

    out.replaceChildren(el('div.calc', [
      r('Planned', `${pUnits} units in ${pHours} hours`),
      r('Actual', `${aUnits} units in ${aHours} hours`),
      r('Efficiency = planned productivity ÷ actual productivity', pct(eff, 0), 'total'),
      r('Hours lost', `${n0(lost)} hrs`, 'sub'),
      r(`At £${rate}/hr all-in`, money(lost * rate), 'total')
    ]));

    note.replaceChildren(
      eff >= 1
        ? 'No loss of efficiency. Whatever else went wrong, it did not show up as productivity.'
        : `Every 100 units now costs ${n0(lost)} hours more than allowed. Establishing that the loss occurred is only a third of the job — you must still show the disruptive factor was an employer risk, and that it caused this and not something else.`
    );
  }

  function r(l, v, kind) {
    return el('div', { class: 'calc__row' + (kind ? ' calc__row--' + kind : '') }, [el('span', l), el('b', v)]);
  }

  const note = el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--p-300)', marginTop: 'var(--s3)', lineHeight: '1.6' } });

  const inp = (label, get, set, suffix) => field(label,
    numInput(get(), { min: 1, oninput: e => { set(Math.max(1, +e.target.value || 1)); calc(); } }), suffix);

  calc();

  return fig(
    props.title || 'Calculating disruption',
    'Input against output — nothing more complicated than that',
    [out, note],
    props.note || 'Efficiency is a ratio of planned to actual productivity. Productivity is output per unit of input. The terms get used interchangeably on site and they are not the same thing, which matters the moment somebody has to price the difference.',
    { before: [ctlBar([
        inp('Planned units', () => pUnits, v => pUnits = v),
        inp('in hours', () => pHours, v => pHours = v),
        inp('Actual units', () => aUnits, v => aUnits = v),
        inp('in hours', () => aHours, v => aHours = v),
        inp('Rate £/hr', () => rate, v => rate = v)
      ], true)], extras: [ro] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   4 · ACCELERATION — what the delay WOULD have been
   The month-to-month update analysis, drawn.
   ═══════════════════════════════════════════════════════════════ */

export function accelerationChart(props = {}) {
  const data = props.data || ACCEL;
  const W = 840, H = 280, M = { t: 20, r: 20, b: 52, l: 52 };
  const x = scale([0, data.labels.length - 1], [M.l, W - M.r]);
  const maxV = Math.max(...data.would, ...data.reported) * 1.12;
  const y = scale([0, maxV], [H - M.b, M.t]);

  const g = svg('g');
  for (const t of niceTicks(0, maxV, 5)) {
    g.append(svg('line.c-grid', { x1: M.l, y1: y(t), x2: W - M.r, y2: y(t) }));
    g.append(svg('text.c-tick', { x: M.l - 7, y: y(t) + 3, 'text-anchor': 'end' }, String(t)));
  }
  g.append(svg('text.c-tick', { x: M.l - 7, y: M.t - 5, 'text-anchor': 'end', fill: 'var(--p-300)' }, 'days late'));

  const bw = (W - M.r - M.l) / data.labels.length * 0.38;
  data.labels.forEach((l, i) => {
    const wv = data.would[i], rv = data.reported[i];
    g.append(svg('rect', {
      class: prefersStill() ? '' : 'bar-grow',
      x: x(i) - bw - 1, y: y(wv), width: bw, height: (H - M.b) - y(wv), rx: 1,
      fill: 'url(#hatchGreyA)', stroke: 'var(--p-300)', 'stroke-width': .7,
      style: { '--i': String(i), transformBox: 'fill-box', transformOrigin: 'bottom' }
    }, svg('title', `${l}: ${wv} days would have been reported without re-sequencing`)));
    g.append(svg('rect', {
      class: prefersStill() ? '' : 'bar-grow',
      x: x(i) + 1, y: y(rv), width: bw, height: (H - M.b) - y(rv), rx: 1,
      fill: 'var(--critical)',
      style: { '--i': String(i), transformBox: 'fill-box', transformOrigin: 'bottom' }
    }, svg('title', `${l}: ${rv} days actually reported`)));
    if (i % 2 === 0) {
      g.append(svg('text.c-tick', {
        x: x(i), y: H - M.b + 16, 'text-anchor': 'end',
        transform: `rotate(-40 ${x(i)} ${H - M.b + 16})`
      }, l));
    }
    // the recovery, called out
    if (wv - rv > 0) {
      g.append(svg('text', {
        x: x(i) - bw / 2 - 1, y: y(wv) - 4, 'text-anchor': 'middle',
        'font-family': 'var(--f-data)', 'font-size': '7.5', fill: 'var(--slack)'
      }, '−' + (wv - rv)));
    }
  });

  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, [
    svg('defs', svg('pattern', {
      id: 'hatchGreyA', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    }, svg('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'var(--p-400)', 'stroke-width': 1.4 }))),
    g
  ]);

  const total = data.would.reduce((a, b, i) => a + (b - data.reported[i]), 0);

  return fig(
    props.title || 'Demonstrating acceleration',
    'What the delay would have been, against what was reported',
    [el('div.chart', el('div.scroll-x', board)),
     el('div.chart__legend', [
       el('span', [el('i', { style: { background: 'var(--p-400)' } }), 'Would have been reported — original logic, actual progress']),
       el('span', [el('i', { style: { background: 'var(--critical)' } }), 'Actually reported at the time'])
     ])],
    props.note || `The hatched bars are built by importing each month's real progress into the LAST agreed programme, before any re-sequencing. The gap between the pair is time the contractor recovered by changing how it built, not by building faster — and across these updates it comes to roughly ${total} days.`,
    { extras: [altTable('Month-to-month update analysis', ['Update', 'Would have been reported', 'Actually reported', 'Recovered'],
        data.labels.map((l, i) => [l, data.would[i] + 'd', data.reported[i] + 'd', (data.would[i] - data.reported[i]) + 'd']))] }
  );
}

const ACCEL = {
  labels: ['UP10', 'UP10/11', 'UP10/12', 'UP10/13', 'UP10/14', 'UP15', 'UP15/16', 'UP15/17',
    'UP15/18', 'UP15/19', 'UP15/20', 'UP15/21', 'UP15/22', 'UP15/23', 'UP15/24', 'UP15/25'],
  would:    [393, 424, 454, 466, 473, 515, 518, 521, 564, 543, 571, 603, 630, 597, 590, 567],
  reported: [393, 403, 430, 431, 431, 513, 513, 513, 513, 612, 612, 514, 514, 514, 528, 556]
};
