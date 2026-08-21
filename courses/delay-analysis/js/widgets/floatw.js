/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — float instruments
   Anatomy, ownership, deterioration, and the float map.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, days, d2, altTable, prefersStill } from '../dom.js';
import { fig, ctlBar, tabs, readout, setReadout, slider, legend, scale, polyline, drawLine, niceTicks } from './kit.js';

/* ═══════════════════════════════════════════════════════════════
   1 · FLOAT ANATOMY
   Total, free, and terminal float on one drawing. Drag an activity
   and watch which kind you are actually spending.
   ═══════════════════════════════════════════════════════════════ */

export function floatAnatomy(props = {}) {
  const DAY = 15, X0 = 118, TOP = 24, ROW = 26, W = X0 + DAY * 40 + 24;
  // A → B → D, with C parallel to B. Contract date sits past the finish,
  // so terminal float exists and can be talked about.
  const DUR = { A: 8, B: 6, C: 4, D: 7 };
  const CONTRACT = 30;
  let slip = 0;                      // days C is delayed by the learner

  const H = TOP + 4 * ROW + 46;
  const gBody = svg('g');
  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, [
    svg('g', Array.from({ length: 41 }, (_, i) => svg('line', {
      class: i % 5 === 0 ? 'g-grid-m' : 'g-grid',
      x1: X0 + i * DAY, y1: TOP - 10, x2: X0 + i * DAY, y2: H - 30
    }))),
    svg('g', Array.from({ length: 9 }, (_, i) => svg('text', {
      x: X0 + i * 5 * DAY + 2, y: TOP - 14,
      'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--p-400)'
    }, 'D' + (i * 5)))),
    gBody
  ]);

  const ro = readout([
    ['C — total float', '—', 'slack'],
    ['C — free float', '—', 'slack'],
    ['Terminal float', '—', 'ink'],
    ['Completion', '—']
  ]);

  function model() {
    const A = { s: 0, d: DUR.A };
    const B = { s: A.s + A.d, d: DUR.B };
    const C = { s: A.s + A.d + slip, d: DUR.C };
    const D = { s: Math.max(B.s + B.d, C.s + C.d), d: DUR.D };
    const finish = D.s + D.d;
    // C's late finish is bounded by D's start
    const cLF = D.s;
    const cTF = cLF - (C.s + C.d);
    const cFF = D.s - (C.s + C.d);
    return { A, B, C, D, finish, cTF, cFF, terminal: CONTRACT - finish };
  }

  function draw() {
    const m = model();
    gBody.replaceChildren();

    const bars = [
      { k: 'A', y: TOP, o: m.A, crit: true },
      { k: 'B', y: TOP + ROW, o: m.B, crit: true },
      { k: 'C', y: TOP + ROW * 2, o: m.C, crit: false },
      { k: 'D', y: TOP + ROW * 3, o: m.D, crit: true }
    ];

    for (const b of bars) {
      gBody.append(svg('text', {
        x: 8, y: b.y + 14, 'font-family': 'var(--f-ui)', 'font-size': '9.5', fill: 'var(--p-200)'
      }, `Activity ${b.k}`));
      gBody.append(svg('text', {
        x: 62, y: b.y + 14, 'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--p-400)'
      }, b.o.d + 'd'));

      gBody.append(svg('rect', {
        x: X0 + b.o.s * DAY, y: b.y, width: b.o.d * DAY, height: 18, rx: 2,
        fill: b.crit ? 'var(--critical)' : 'var(--ink)',
        style: prefersStill() ? {} : { transition: 'x 260ms cubic-bezier(.2,.7,.2,1)' }
      }));
      gBody.append(svg('text', {
        x: X0 + b.o.s * DAY + b.o.d * DAY / 2, y: b.y + 13, 'text-anchor': 'middle',
        'font-family': 'var(--f-data)', 'font-size': '8.5', fill: 'var(--g-950)', 'font-weight': '600'
      }, b.k));
    }

    // C's float, hatched
    if (m.cTF > 0) {
      const fx = X0 + (m.C.s + m.C.d) * DAY;
      gBody.append(svg('rect', {
        x: fx, y: TOP + ROW * 2 + 3, width: m.cTF * DAY, height: 12,
        fill: 'url(#hatchSlack)', stroke: 'var(--slack-dim)', 'stroke-width': .8
      }));
      if (m.cTF * DAY > 30) {
        gBody.append(svg('text', {
          x: fx + m.cTF * DAY / 2, y: TOP + ROW * 2 + 12, 'text-anchor': 'middle',
          'font-family': 'var(--f-data)', 'font-size': '7.5', fill: 'var(--slack)'
        }, m.cTF + 'd float'));
      }
    }

    // terminal float between calculated finish and contract date
    const fEnd = X0 + m.finish * DAY;
    const cEnd = X0 + CONTRACT * DAY;
    if (m.terminal > 0) {
      gBody.append(svg('rect', {
        x: fEnd, y: TOP + ROW * 3 + 3, width: m.terminal * DAY, height: 12,
        fill: 'url(#hatchSlack)', stroke: 'var(--slack-dim)', 'stroke-width': .8, opacity: .8
      }));
      gBody.append(svg('text', {
        x: (fEnd + cEnd) / 2, y: TOP + ROW * 3 + 30, 'text-anchor': 'middle',
        'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--slack)'
      }, `terminal float ${m.terminal}d`));
    } else if (m.terminal < 0) {
      gBody.append(svg('rect', {
        x: cEnd, y: TOP + ROW * 3 + 3, width: -m.terminal * DAY, height: 12,
        fill: 'var(--critical-wash)', stroke: 'var(--critical)', 'stroke-width': .8
      }));
      gBody.append(svg('text', {
        x: (fEnd + cEnd) / 2, y: TOP + ROW * 3 + 30, 'text-anchor': 'middle',
        'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--critical)'
      }, `${-m.terminal}d LATE`));
    }

    // planned completion + contract date
    gBody.append(svg('line', {
      x1: fEnd, y1: TOP - 10, x2: fEnd, y2: H - 30,
      stroke: 'var(--ink)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3'
    }));
    gBody.append(svg('text', {
      x: fEnd + 3, y: H - 18, 'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--ink)'
    }, 'planned completion'));
    gBody.append(svg('line', {
      x1: cEnd, y1: TOP - 10, x2: cEnd, y2: H - 30, stroke: 'var(--p-200)', 'stroke-width': 1.4
    }));
    gBody.append(svg('text', {
      x: cEnd + 3, y: TOP - 14, 'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--p-200)'
    }, 'contract date'));

    setReadout(ro, 0, days(m.cTF), m.cTF > 0 ? 'slack' : 'crit');
    setReadout(ro, 1, days(m.cFF), m.cFF > 0 ? 'slack' : 'crit');
    setReadout(ro, 2, days(m.terminal, { sign: m.terminal < 0 }), m.terminal >= 0 ? 'ink' : 'crit');
    setReadout(ro, 3, 'Day ' + m.finish, m.finish > CONTRACT ? 'crit' : null);

    verdict.replaceChildren(
      m.cTF > 0
        ? `Activity C has ${m.cTF} days of float left. Delaying it further costs the project nothing yet — but it costs C its contingency, and it will need scaffolding, a crane or a gang on site for longer.`
        : m.cTF === 0
          ? 'Activity C has run out of float. It is now critical: one more day and the completion date moves.'
          : `Activity C is ${-m.cTF} days beyond its late finish. It is now driving the completion date, and the project is ${m.finish - CONTRACT > 0 ? (m.finish - CONTRACT) + ' days late' : 'still inside the contract date'}.`
    );
  }

  const verdict = el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--p-100)', marginTop: 'var(--s4)', lineHeight: '1.55' } });

  const s = slider(0, {
    min: 0, max: 16, step: 1, fmt: v => v + 'd',
    onInput: v => { slip = v; draw(); }
  });

  board.insertBefore(svg('defs', svg('pattern', {
    id: 'hatchSlack', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
  }, svg('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'var(--slack)', 'stroke-width': 1.6, opacity: .6 }))), board.firstChild);

  draw();

  return fig(
    props.title || 'Three kinds of float, one drawing',
    'Delay activity C and watch which one you spend',
    [el('div.gantt', el('div.scroll-x', board)), verdict],
    props.note || 'Total float is measured to the completion date. Free float is measured to the next activity — spend that and you have taken the contingency away from your successor, not from the project. Terminal float is the gap between planned completion and the contract date, and it is the one every argument about float OWNERSHIP is really about.',
    { before: [ctlBar([el('span.ctl__lbl', 'Delay activity C by'), s.node], true)], extras: [ro] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   2 · WHO OWNS THE FLOAT
   Three positions, and what each does to the same facts.
   ═══════════════════════════════════════════════════════════════ */

export function floatOwnership(props = {}) {
  const POS = [
    {
      k: 'contractor', n: 'The contractor owns it',
      basis: 'The contractor prepared the programme, sequenced the work, and carries the risk of a fixed completion date. The float is a by-product of its own planning, so it is its own contingency.',
      effect: 'An employer risk event that eats float earns an extension of time, because the contractor must be put back where it was — with its contingency intact.',
      form: 'NEC3 clause 63.3 measures delay against PLANNED completion, not contract completion. Under an unamended NEC3 there is no real argument: the contractor owns it.',
      tone: 'contractor'
    },
    {
      k: 'employer', n: 'The employer owns it',
      basis: 'The employer bought a 24-month contract period and priced the preliminaries against it. So long as changed work does not push past the contract date, the employer is entitled to use the time it paid for.',
      effect: 'No extension of time until float on the affected path falls below zero. Float consumed by the employer is simply time being used.',
      form: 'This position has a hole in it. If the employer owned the float it would need a say in how much float the programme contained and how it was managed — an intolerable intrusion into the contractor’s means and methods, or a wholesale transfer of completion risk back to the employer.',
      tone: 'employer'
    },
    {
      k: 'project', n: 'The project owns it — first come, first served',
      basis: 'Where the contract is silent, float is a shared commodity available to whoever needs it first. Neither party has exclusive use.',
      effect: 'An extension of time is granted only once the employer delay drives total float on the affected paths below zero. If a party suffers financially from the other consuming float, that is dealt with in money rather than time.',
      form: 'This is the SCL Protocol’s position and the prevailing view in most US standard forms. Ascon v McAlpine went a step further and apportioned the benefit of the float between the parties that used it, rather than letting the main contractor allocate it where it suited.',
      tone: 'ink'
    }
  ];

  let pick = 2;
  const out = el('div');

  function paint() {
    const p = POS[pick];
    out.replaceChildren(
      el('div.callout', { class: 'callout--' + (p.tone === 'ink' ? 'law' : p.tone === 'employer' ? 'protocol' : 'site') }, [
        el('span.callout__l', 'The argument'),
        el('p', p.basis)
      ]),
      el('div.callout', { style: { marginTop: 'var(--s3)' } }, [
        el('span.callout__l', 'What follows for entitlement'),
        el('p', p.effect)
      ]),
      el('div.callout', { style: { marginTop: 'var(--s3)' } }, [
        el('span.callout__l', 'Where it stands'),
        el('p', p.form)
      ])
    );
    btns.forEach((b, i) => b.setAttribute('aria-selected', String(i === pick)));
  }

  const btns = POS.map((p, i) => el('button', {
    type: 'button', role: 'tab', aria: { selected: String(i === pick) },
    onclick: () => { pick = i; paint(); }
  }, p.n));

  paint();

  return fig(
    props.title || 'Who owns the float?',
    'Three positions that lead to three different extensions of time',
    [el('div.tabs', { role: 'tablist', style: { marginBottom: 'var(--s4)' } }, btns), out],
    props.note || 'The first question is always what the contract says. Most say nothing at all, which is exactly why the argument exists — and why the drafting of a single clause can be worth more than any analysis.'
  );
}

/* ═══════════════════════════════════════════════════════════════
   3 · FLOAT DETERIORATION CHART
   Total float per area, month by month. The case-study drawing that
   shows two areas competing for dominance.
   ═══════════════════════════════════════════════════════════════ */

export function floatDeterioration(props = {}) {
  const series = props.series || DETERIORATION;
  const labels = props.labels || PERIODS;
  const W = 880, H = 300;
  const M = { t: 18, r: 118, b: 40, l: 52 };

  const all = series.flatMap(s => s.v).filter(v => v !== null);
  const yMin = Math.min(...all, 0), yMax = Math.max(...all, 0);
  const x = scale([0, labels.length - 1], [M.l, W - M.r]);
  const y = scale([yMin - 12, yMax + 12], [H - M.b, M.t]);

  const g = svg('g');

  // gridlines
  for (const t of niceTicks(yMin - 12, yMax + 12, 6)) {
    g.append(svg('line', { class: t === 0 ? 'c-zero' : 'c-grid', x1: M.l, y1: y(t), x2: W - M.r, y2: y(t) }));
    g.append(svg('text.c-tick', { x: M.l - 7, y: y(t) + 3, 'text-anchor': 'end' }, String(t)));
  }
  labels.forEach((l, i) => {
    if (i % 2 === 0 || labels.length < 10) {
      g.append(svg('text.c-tick', {
        x: x(i), y: H - M.b + 14, 'text-anchor': 'middle'
      }, l));
    }
    g.append(svg('line.c-grid', { x1: x(i), y1: M.t, x2: x(i), y2: H - M.b }));
  });
  g.append(svg('text.c-tick', {
    x: M.l - 7, y: M.t - 6, 'text-anchor': 'end', fill: 'var(--p-300)'
  }, 'float (d)'));

  // series
  series.forEach((s, si) => {
    const pts = s.v.map((v, i) => (v === null ? null : [x(i), y(v)])).filter(Boolean);
    const d = polyline(pts);
    g.append(drawLine(d, `var(--${s.tone})`, { delay: si * 220, animate: !prefersStill() }));
    pts.forEach(p => g.append(svg('circle.c-dot', { cx: p[0], cy: p[1], r: 2.6, fill: `var(--${s.tone})` })));
    // right-hand label instead of a legend key, so the eye never has to hunt
    const last = pts[pts.length - 1];
    g.append(svg('text', {
      x: last[0] + 8, y: last[1] + 3,
      'font-family': 'var(--f-data)', 'font-size': '8.5', fill: `var(--${s.tone})`
    }, s.n));
  });

  // the contract completion line at float = 0
  g.append(svg('text.c-note', { x: W - M.r - 4, y: y(0) - 5, 'text-anchor': 'end' },
    'contract completion — float 0'));

  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, g);

  const alt = altTable('Total float by area, per monthly update',
    ['Update', ...series.map(s => s.n)],
    labels.map((l, i) => [l, ...series.map(s => (s.v[i] === null ? '—' : s.v[i] + 'd'))]));

  return fig(
    props.title || 'Float deterioration',
    props.sub || 'Total float on each area, update by update',
    el('div.chart', el('div.scroll-x', board)),
    props.note || 'Two areas trading places is the signature of concurrent critical paths. The line furthest below zero is the most critical path at that moment — but a line just above it is near-critical, and near-critical paths become critical the moment anything touches them.',
    { extras: [alt] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   4 · FLOAT MAP
   Every activity, every update, float value in a cell. Filter to the
   driving activities and the as-built critical path emerges.
   ═══════════════════════════════════════════════════════════════ */

export function floatMap(props = {}) {
  const data = props.data || FLOATMAP;
  let onlyDriving = false;

  const host = el('div.fmap');

  function heat(v) {
    if (v === null || v === undefined) return 'f-none';
    if (v === '*') return 'f-done';
    if (v >= 0) return 'f0';
    const a = Math.abs(v);
    if (a < 20) return 'f1';
    if (a < 45) return 'f2';
    if (a < 70) return 'f3';
    if (a < 110) return 'f4';
    return 'f5';
  }

  function paint() {
    const head = el('tr', [
      el('th', { scope: 'col' }, 'Activity'),
      ...data.periods.map(p => el('th', { scope: 'col' }, p))
    ]);

    const body = [];
    for (const grp of data.groups) {
      body.push(el('tr.grp', { class: 'grp grp--' + grp.tone },
        el('th', { colspan: data.periods.length + 1, scope: 'colgroup' }, grp.name)));
      for (const row of grp.rows) {
        if (onlyDriving && !row.f.some((_, i) => (row.drive || []).includes(i))) continue;
        body.push(el('tr', [
          el('th', { scope: 'row' }, [el('em', row.id + ' '), row.n]),
          ...row.f.map((v, i) => {
            const driving = (row.drive || []).includes(i);
            return el('td', {
              class: heat(v) + (driving ? ' is-driving' : ''),
              title: `${row.n} · ${data.periods[i]} · ${v === '*' ? 'complete' : v === null ? 'not yet in programme' : v + 'd float'}${driving ? ' · DRIVING' : ''}`
            }, v === '*' ? '✓' : v === null ? '·' : String(v));
          })
        ]));
      }
    }
    host.replaceChildren(el('table', [el('thead', head), el('tbody', body)]));
  }

  const t = tabs(['All activities', 'Driving only'], i => { onlyDriving = i === 1; paint(); }, 0);
  paint();

  const alt = altTable('Float map: total float per activity per update',
    ['Activity', ...data.periods],
    data.groups.flatMap(g => g.rows.map(r => [g.name + ' — ' + r.n, ...r.f.map(v => (v === '*' ? 'complete' : v === null ? 'n/a' : v + 'd'))])));

  return fig(
    props.title || 'Float map',
    'Every activity, every update. Outlined cells are driving.',
    host,
    props.note || 'An activity is DRIVING when two things are true at once: it sits on the longest path, and it is in progress or due to start inside that update window. Activities with more negative float that fail the second test are usually held there by a finish-no-later-than constraint and must be discounted, not chased.',
    { before: [ctlBar([el('span.ctl__lbl', 'Show'), t,
        el('span.ctl__sp'),
        legend([['float ≥ 0', '--slack'], ['−1 to −45', 'rgba(240,90,54,.25)'], ['−45 to −110', 'rgba(240,90,54,.5)'], ['worse', 'rgba(240,90,54,.8)']])
      ], true)], extras: [alt], flush: true }
  );
}

/* ═══════════════════════════════════════════════════════════════
   5 · CRITICALITY PROFILE
   What proportion of the remaining work is critical, month by month.
   A blunt but honest measure of how much contingency is left.
   ═══════════════════════════════════════════════════════════════ */

export function criticalityProfile(props = {}) {
  const v = props.values || [15, 17, 20, 26, 33, 45, 42, 40, 38, 41, 44, 47];
  const labels = props.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const W = 780, H = 240, M = { t: 16, r: 20, b: 34, l: 46 };
  const x = scale([0, labels.length - 1], [M.l, W - M.r]);
  const y = scale([0, 50], [H - M.b, M.t]);

  const g = svg('g');
  for (const t of [0, 10, 20, 30, 40, 50]) {
    g.append(svg('line.c-grid', { x1: M.l, y1: y(t), x2: W - M.r, y2: y(t) }));
    g.append(svg('text.c-tick', { x: M.l - 7, y: y(t) + 3, 'text-anchor': 'end' }, t + '%'));
  }
  const bw = (W - M.r - M.l) / labels.length * 0.62;
  v.forEach((val, i) => {
    const h = (H - M.b) - y(val);
    g.append(svg('rect', {
      class: prefersStill() ? '' : 'bar-grow',
      x: x(i) - bw / 2, y: y(val), width: bw, height: h, rx: 1.5,
      fill: val > 40 ? 'var(--critical)' : val > 25 ? 'var(--employer)' : 'var(--slack)',
      style: { '--i': String(i), transformBox: 'fill-box', transformOrigin: 'bottom' }
    }, svg('title', `${labels[i]}: ${val}% of remaining activities critical`)));
    g.append(svg('text.c-tick', { x: x(i), y: H - M.b + 14, 'text-anchor': 'middle' }, labels[i]));
  });

  return fig(
    props.title || 'Criticality profile',
    'Share of remaining activities that are critical',
    el('div.chart', el('div.scroll-x', svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, g))),
    props.note || 'This says nothing about how late the project is — only how little slack is left anywhere in it. When nearly half the remaining work is critical, there is almost no path left to re-sequence through, and acceleration stops being a lever you can pull.',
    { extras: [altTable('Criticality profile', ['Month', 'Critical %'], labels.map((l, i) => [l, v[i] + '%']))] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA — the airport terminal case study, from Chapter 6
   ═══════════════════════════════════════════════════════════════ */

const PERIODS = ['1006', '1106', '1206', '0107', '0207', '0307', '0407', '0507', '0607',
  '0707', '0807', '0907', '1007', '1107', '1207', '0108'];

const DETERIORATION = [
  { n: 'Terminal Building', tone: 'employer',
    v: [-28, -23, -40, -33, -14, -62, -57, -56, -70, -74, -85, -90, -90, -108, -121, -121] },
  { n: 'Control Tower', tone: 'contractor',
    v: [0, -7, -11, -16, -27, -31, -31, -31, -59, -61, -71, -81, -103, -167, -118, -123] },
  { n: 'Runway Extension', tone: 'slack',
    v: [-5, -6, -8, -10, -12, -18, -22, -26, -30, -38, -45, -45, null, null, null, null] }
];

const FLOATMAP = {
  periods: PERIODS,
  groups: [
    {
      name: 'Concurrent critical path 1 — Terminal Building', tone: 'tb',
      rows: [
        { id: 'C1B115030', n: 'Protection works to existing fuel line 42–46/A–B', f: [-15, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], drive: [0] },
        { id: 'C1B215570', n: 'Construct 1st lift wall grid 41–43/A–B', f: [-15, -6, -42, null, null, null, null, null, null, null, null, null, null, null, null, null], drive: [1] },
        { id: 'C1B328220', n: 'Construct ground beams grade level 35–43/A–D', f: [-15, -23, -60, -53, null, null, null, null, null, null, null, null, null, null, null, null], drive: [2] },
        { id: 'C1B544210', n: 'E&M 1st fix conduit/cabling 2nd level 35–43/E–J', f: [-8, -18, -40, -33, 37, 23, -42, -40, -46, -38, null, null, null, null, null, null], drive: [6] },
        { id: 'C1B545210', n: 'E&M 1st fix conduit/cabling 2nd level 43–46/E–J', f: [24, 24, 28, 13, 4, -2, -42, -47, -67, null, null, null, null, null, null, null], drive: [6] },
        { id: 'C1B644010', n: 'Blockwork to 2nd level walls grid 35–43/E–J', f: [-8, -18, -40, -33, 37, 23, -42, -41, null, null, null, null, null, null, null, null], drive: [6] },
        { id: 'C1B644210', n: 'Plaster walls/ceilings 2nd level grid 35–43/E–J', f: [-8, -18, -40, -33, -14, -42, -42, -42, null, null, null, null, null, null, null, null], drive: [7] },
        { id: 'C1B534210', n: 'E&M 1st fix conduit/cabling 1st level 35–43/E–J', f: [-27, -21, -32, -36, -49, -57, -57, -50, -70, -74, -85, -90, -90, null, null, null], drive: [8, 9] },
        { id: 'C1B733056', n: 'Lath & plaster ceiling 1st level 35–46/J–RA', f: ['*', '*', '*', '*', '*', -37, -43, -35, -48, -55, -105, null, -69, -108, null, null], drive: [10] },
        { id: 'C1B730090', n: 'Final decoration to 1st level', f: [-27, -23, -40, -33, -14, -62, -57, -56, -70, -74, -85, -90, -90, -108, -120, null], drive: [13, 14] },
        { id: 'C1B715059', n: 'Fix acoustic ceiling lower level', f: ['*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', -81, -74, -97, -121, null], drive: [14] }
      ]
    },
    {
      name: 'Concurrent critical path 2 — Control Tower', tone: 'ct',
      rows: [
        { id: 'C11400017', n: 'Submit & obtain approval, 1st shop drawings', f: [17, 2, -64, -65, -73, -74, null, null, null, null, null, null, null, null, null, null], drive: [2, 3] },
        { id: 'C11400018', n: 'Manufacture & deliver 1st shipment to site', f: [17, 2, -64, -65, -73, -74, -81, -81, -86, -50, -49, -75, null, null, null, null], drive: [4, 5] },
        { id: 'C1C3A0210', n: 'Construct 2 lift columns 4th–5th level control tower', f: [0, -7, -11, -16, -33, -85, null, null, null, null, null, null, null, null, null, null], drive: [4, 5] },
        { id: 'C1C4F0045', n: 'Fix curtain wall to control tower VCR level', f: ['*', '*', '*', '*', '*', -31, -31, -31, -47, -49, -63, -74, -145, -167, null, null], drive: [12, 13] },
        { id: 'C1C560010', n: 'E&M 1st fix services installation to control tower', f: [10, 3, -1, -6, -19, -27, -23, -30, -54, -51, -71, -95, -144, -167, -120, null], drive: [] },
        { id: 'C1C660020', n: 'Plaster control tower walls internally', f: [6, -1, -5, -10, -27, -26, -22, -14, -25, -45, -69, -71, -134, -167, null, null], drive: [] },
        { id: 'C1C860050', n: 'Install, test & commission tower equipment', f: [0, -7, -11, -16, -27, -31, -31, -31, -59, -61, -71, -81, -145, -167, -118, -109], drive: [14, 15] },
        { id: 'C1C900099', n: 'New control tower operational', f: [0, -7, -11, -16, -27, -31, -31, -31, -59, -61, -71, -81, -103, -119, -118, -123], drive: [15] }
      ]
    }
  ]
};

export { PERIODS, DETERIORATION, FLOATMAP };
