/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — logic instruments
   Relationship types, lags, out-of-sequence protocols, constraints.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, days, prefersStill, altTable } from '../dom.js';
import { fig, ctlBar, tabs, readout, setReadout, slider, legend } from './kit.js';

/* ═══════════════════════════════════════════════════════════════
   1 · RELATIONSHIP LAB
   Four types, one lag slider, and the successor moves as you drag.
   The point it makes: the SAME lag means four different things.
   ═══════════════════════════════════════════════════════════════ */

export function relationships(props = {}) {
  const DA = props.durA ?? 10;
  const DB = props.durB ?? 6;
  const DAY = 17;            // px per day
  const X0 = 92, Y_A = 26, Y_B = 74, BH = 22;
  const W = X0 + DAY * 30 + 20, H = 118;

  let type = props.type || 'FS';
  let lag = props.lag ?? 0;

  const gB = svg('g');
  const gLink = svg('g');
  const gAnno = svg('g');

  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, [
    // day grid
    svg('g', Array.from({ length: 31 }, (_, i) => svg('line', {
      class: i % 5 === 0 ? 'g-grid-m' : 'g-grid',
      x1: X0 + i * DAY, y1: 12, x2: X0 + i * DAY, y2: H - 14
    }))),
    svg('g', Array.from({ length: 7 }, (_, i) => svg('text', {
      x: X0 + i * 5 * DAY + 2, y: 9,
      class: 'g-axis', 'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--p-400)'
    }, 'D' + (i * 5)))),
    svg('text', { x: 8, y: Y_A + 15, class: 'g-lbl', 'font-size': '9.5', fill: 'var(--p-200)' }, 'Activity A'),
    svg('text', { x: 8, y: Y_A + 15 + 12, class: 'g-lbl-d', 'font-size': '8', fill: 'var(--p-400)' }, DA + ' days'),
    svg('text', { x: 8, y: Y_B + 15, class: 'g-lbl', 'font-size': '9.5', fill: 'var(--p-200)' }, 'Activity B'),
    svg('text', { x: 8, y: Y_B + 15 + 12, class: 'g-lbl-d', 'font-size': '8', fill: 'var(--p-400)' }, DB + ' days'),
    svg('rect', { x: X0, y: Y_A, width: DA * DAY, height: BH, rx: 2, fill: 'var(--bar-plan)' }),
    svg('text', {
      x: X0 + DA * DAY / 2, y: Y_A + 15, 'text-anchor': 'middle',
      'font-family': 'var(--f-data)', 'font-size': '9', fill: 'var(--p-100)'
    }, 'A'),
    gB, gLink, gAnno
  ]);

  const ro = readout([
    ['Relationship', 'FS'],
    ['Lag', '0d'],
    ['B starts', 'Day 10'],
    ['B finishes', 'Day 15'],
    ['Reads as', '—', 'ink']
  ]);

  const RULES = {
    FS: {
      es: () => DA + lag,
      say: () => `B cannot start until A has finished${lagPhrase()}.`,
      note: 'The default, and the only relationship an arrow diagram could express. If in doubt, use it.'
    },
    SS: {
      es: () => 0 + lag,
      say: () => `B cannot start until A has started${lagPhrase()}.`,
      note: 'Used to overlap two activities that genuinely run together — pipe-laying following trench excavation down the same run.'
    },
    FF: {
      es: () => DA + lag - DB,
      say: () => `B cannot finish until A has finished${lagPhrase()}.`,
      note: 'Constrains the END of B. B can start whenever it likes; it simply cannot complete before A does.'
    },
    SF: {
      es: () => 0 + lag - DB,
      say: () => `B cannot finish until A has started${lagPhrase()}.`,
      note: 'Almost always a mistake. Reserve it for genuine hand-over cases — an old system running until the new one is switched on.'
    }
  };

  function lagPhrase() {
    if (lag === 0) return '';
    return lag > 0 ? `, plus a ${lag}-day lag` : `, minus ${Math.abs(lag)} days`;
  }

  function draw() {
    const r = RULES[type];
    const es = r.es();
    const ef = es + DB - 1;

    gB.replaceChildren();
    gLink.replaceChildren();
    gAnno.replaceChildren();

    const bx = X0 + es * DAY;
    const bw = DB * DAY;
    gB.append(svg('rect', {
      x: bx, y: Y_B, width: bw, height: BH, rx: 2,
      fill: 'var(--ink)',
      style: prefersStill() ? {} : { transition: 'x 320ms cubic-bezier(.2,.7,.2,1)' }
    }));
    gB.append(svg('text', {
      x: bx + bw / 2, y: Y_B + 15, 'text-anchor': 'middle',
      'font-family': 'var(--f-data)', 'font-size': '9', fill: 'var(--g-950)', 'font-weight': '600'
    }, 'B'));

    // the dependency arrow, drawn from the constrained end of A to the
    // constrained end of B — so the picture shows WHICH ends are tied
    const aStart = X0, aEnd = X0 + DA * DAY;
    const from = (type === 'SS' || type === 'SF') ? aStart : aEnd;
    const to = (type === 'FF' || type === 'SF') ? bx + bw : bx;
    const midY = (Y_A + BH + Y_B) / 2;

    gLink.append(svg('path', {
      d: `M ${from} ${Y_A + BH} V ${midY} H ${to} V ${Y_B}`,
      fill: 'none', stroke: 'var(--employer)', 'stroke-width': 1.4,
      'marker-end': 'url(#relArrow)'
    }));
    gLink.append(svg('circle', { cx: from, cy: Y_A + BH, r: 2.4, fill: 'var(--employer)' }));

    // the lag itself, shown as a measured gap
    if (lag !== 0) {
      const lagFrom = (type === 'SS' || type === 'SF') ? aStart : aEnd;
      const lagTo = lagFrom + lag * DAY;
      const y = midY - 9;
      gAnno.append(svg('line', {
        x1: Math.min(lagFrom, lagTo), y1: y, x2: Math.max(lagFrom, lagTo), y2: y,
        stroke: lag > 0 ? 'var(--employer)' : 'var(--critical)', 'stroke-width': 1,
        'stroke-dasharray': '2 2'
      }));
      gAnno.append(svg('text', {
        x: (lagFrom + lagTo) / 2, y: y - 3, 'text-anchor': 'middle',
        'font-family': 'var(--f-data)', 'font-size': '8',
        fill: lag > 0 ? 'var(--employer)' : 'var(--critical)'
      }, (lag > 0 ? '+' : '') + lag + 'd lag'));
    }

    setReadout(ro, 0, type + (lag ? (lag > 0 ? '+' : '') + lag : ''));
    setReadout(ro, 1, days(lag, { sign: true }), lag < 0 ? 'crit' : lag > 0 ? 'emp' : null);
    setReadout(ro, 2, 'Day ' + es);
    setReadout(ro, 3, 'Day ' + ef);
    setReadout(ro, 4, type, 'ink');

    sayEl.replaceChildren(r.say());
    noteEl.replaceChildren(r.note);
    if (lag < 0) {
      warn.hidden = false;
    } else warn.hidden = true;
  }

  const sayEl = el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--p-100)', margin: '0 0 4px' } });
  const noteEl = el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--p-300)', lineHeight: '1.55' } });
  const warn = el('div.callout.callout--warn', { hidden: true, style: { marginTop: 'var(--s3)' } }, [
    el('span.callout__l', 'Negative lag'),
    el('p', 'A negative lag says the successor may start before the predecessor is far enough along to allow it. There are very few scenarios where that is honest in a forward-looking programme, and it is the first thing an opposing analyst will pull on. Model the overlap with a start-to-start relationship instead.')
  ]);

  const lagCtl = slider(lag, {
    min: -5, max: 10, step: 1,
    fmt: v => (v > 0 ? '+' : '') + v + 'd',
    onInput: v => { lag = v; draw(); }
  });

  const typeTabs = tabs(['FS', 'SS', 'FF', 'SF'], (i, t) => { type = t; draw(); },
    ['FS', 'SS', 'FF', 'SF'].indexOf(type));

  // the arrow marker lives in the board itself
  board.insertBefore(svg('defs', svg('marker', {
    id: 'relArrow', viewBox: '0 0 8 8', refX: 6, refY: 4,
    markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'
  }, svg('path', { d: 'M 0 1 L 7 4 L 0 7 z', fill: 'var(--employer)' }))), board.firstChild);

  draw();

  return fig(
    props.title || 'The four relationships',
    'Drag the lag. Watch which END of B is tied.',
    [
      el('div.gantt', el('div.scroll-x', board)),
      el('div', { style: { marginTop: 'var(--s4)' } }, [sayEl, noteEl, warn])
    ],
    props.note,
    {
      before: [ctlBar([
        el('span.ctl__lbl', 'Type'), typeTabs,
        el('span.ctl__sp'),
        el('span.ctl__lbl', 'Lag'), lagCtl.node
      ], true)],
      extras: [ro]
    }
  );
}

/* ═══════════════════════════════════════════════════════════════
   2 · OUT-OF-SEQUENCE: RETAINED LOGIC vs PROGRESS OVERRIDE
   The drywall/paint example. One toggle, two completion dates, and
   a setting most planners have never opened.
   ═══════════════════════════════════════════════════════════════ */

export function outOfSequence(props = {}) {
  const DAY = 26, X0 = 132, W = X0 + DAY * 16 + 30, H = 128;
  let mode = 'plan';   // plan | retained | override | fixed

  const gBody = svg('g');
  const board = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, [
    svg('g', Array.from({ length: 17 }, (_, i) => svg('line', {
      class: i % 5 === 0 ? 'g-grid-m' : 'g-grid',
      x1: X0 + i * DAY, y1: 16, x2: X0 + i * DAY, y2: H - 22
    }))),
    svg('g', Array.from({ length: 4 }, (_, i) => svg('text', {
      x: X0 + i * 5 * DAY + 2, y: 12,
      'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--p-400)'
    }, 'Day ' + (i * 5)))),
    gBody
  ]);

  const STATES = {
    plan: {
      label: 'As-planned',
      bars: [
        { y: 26, name: 'Drywall', done: 0, rem: 10, s: 0 },
        { y: 62, name: 'Paint', done: 0, rem: 5, s: 10 }
      ],
      finish: 15,
      say: 'The plan: paint follows drywall, finish-to-start. Fifteen days.',
      note: 'Ten days of drywall, then five of paint. Nothing overlaps.'
    },
    retained: {
      label: 'Retained logic',
      bars: [
        { y: 26, name: 'Drywall', done: 5, rem: 5, s: 0 },
        { y: 62, name: 'Paint', done: 2, rem: 3, s: 2, split: true }
      ],
      finish: 13,
      say: 'Retained logic: paint started out of sequence on day 3, but its remaining work still cannot finish until drywall does. Thirteen days.',
      note: 'The software keeps the dependency. Painting may have begun early in the areas that were boarded, but it cannot be one hundred per cent complete until the last sheet of drywall is up. This is the honest setting, and the one you almost always want.'
    },
    override: {
      label: 'Progress override',
      bars: [
        { y: 26, name: 'Drywall', done: 5, rem: 5, s: 0 },
        { y: 62, name: 'Paint', done: 2, rem: 3, s: 2, breaks: true }
      ],
      finish: 10,
      say: 'Progress override: the link is broken the moment paint starts early. Ten days — and paint finishes before drywall.',
      note: 'The programme now says painting completes on day 5 while drywall runs to day 10. That is not a schedule; it is a physical impossibility. Progress override quietly deletes the logic every time an activity starts out of sequence, and it will happily shave weeks off a completion date that nobody has actually earned.'
    },
    fixed: {
      label: 'Corrected logic',
      bars: [
        { y: 26, name: 'Drywall', done: 5, rem: 5, s: 0 },
        { y: 62, name: 'Paint', done: 2, rem: 3, s: 2, ff: true }
      ],
      finish: 13,
      say: 'Corrected: replace the finish-to-start link with finish-to-finish plus three days. Thirteen days, and it reflects how the work is really being built.',
      note: 'The proper repair for a sequence that has genuinely changed is not a calculation setting — it is better logic. Say what is actually true: paint finishes three days after drywall finishes.'
    }
  };

  function draw() {
    const st = STATES[mode];
    gBody.replaceChildren();

    for (const b of st.bars) {
      gBody.append(svg('text', {
        x: 8, y: b.y + 14, 'font-family': 'var(--f-ui)', 'font-size': '9.5', fill: 'var(--p-200)'
      }, b.name));

      const x = X0 + b.s * DAY;
      if (b.done > 0) {
        gBody.append(svg('rect', {
          x, y: b.y, width: b.done * DAY, height: 20, rx: 2, fill: 'var(--bar-built)'
        }));
        gBody.append(svg('text', {
          x: x + b.done * DAY / 2, y: b.y + 14, 'text-anchor': 'middle',
          'font-family': 'var(--f-data)', 'font-size': '7.5', fill: 'var(--g-950)'
        }, 'done'));
      }
      const rx = x + b.done * DAY;
      const gapDays = b.split ? (5 - (b.s + b.done)) : 0;
      const remX = b.split ? X0 + 5 * DAY : rx;

      if (b.split && gapDays > 0) {
        gBody.append(svg('rect', {
          x: rx, y: b.y + 8.5, width: gapDays * DAY, height: 3, fill: 'var(--g-600)'
        }));
      }
      gBody.append(svg('rect', {
        x: remX, y: b.y, width: b.rem * DAY, height: 20, rx: 2,
        fill: mode === 'override' && b.breaks ? 'var(--critical)' : 'var(--bar-plan)',
        stroke: mode === 'override' && b.breaks ? 'var(--critical)' : 'none'
      }));
      gBody.append(svg('text', {
        x: remX + b.rem * DAY / 2, y: b.y + 14, 'text-anchor': 'middle',
        'font-family': 'var(--f-data)', 'font-size': '7.5',
        fill: mode === 'override' && b.breaks ? 'var(--g-950)' : 'var(--p-200)'
      }, b.rem + 'd left'));
    }

    // the completion marker
    const fx = X0 + st.finish * DAY;
    gBody.append(svg('line', {
      x1: fx, y1: 18, x2: fx, y2: H - 24,
      stroke: mode === 'override' ? 'var(--critical)' : 'var(--ink)',
      'stroke-width': 1.4, 'stroke-dasharray': '4 3'
    }));
    gBody.append(svg('text', {
      x: fx - 4, y: H - 26, 'text-anchor': 'end',
      'font-family': 'var(--f-data)', 'font-size': '8.5',
      fill: mode === 'override' ? 'var(--critical)' : 'var(--ink)'
    }, st.finish + ' days'));

    setReadout(ro, 0, st.label);
    setReadout(ro, 1, st.finish + 'd', mode === 'override' ? 'crit' : 'ink');
    setReadout(ro, 2, mode === 'plan' ? '—' : days(st.finish - 15, { sign: true }),
      st.finish < 15 ? 'crit' : null);
    sayEl.replaceChildren(st.say);
    noteEl.replaceChildren(st.note);
  }

  const ro = readout([['Setting', '—'], ['Calculated duration', '—'], ['Against plan', '—']]);
  const sayEl = el('p', { style: { fontSize: 'var(--t-sm)', color: 'var(--p-100)', margin: '0 0 6px' } });
  const noteEl = el('p', { style: { fontSize: 'var(--t-xs)', color: 'var(--p-300)', lineHeight: '1.6' } });

  const t = tabs(['As-planned', 'Retained logic', 'Progress override', 'Corrected logic'],
    i => { mode = ['plan', 'retained', 'override', 'fixed'][i]; draw(); }, 0);

  draw();

  return fig(
    props.title || 'Out-of-sequence progress',
    'Paint started on day 3. Same facts, three answers.',
    [el('div.gantt', el('div.scroll-x', board)),
     el('div', { style: { marginTop: 'var(--s4)' } }, [sayEl, noteEl])],
    props.note || 'This setting is buried in an options menu in every major package, and it changes the completion date. Always check which protocol a programme was calculated under before you rely on a single date it produces.',
    { before: [ctlBar([el('span.ctl__lbl', 'Calculation'), t], true)], extras: [ro] }
  );
}

/* ═══════════════════════════════════════════════════════════════
   3 · CONSTRAINT EFFECTS
   What each of the six date constraints actually does to float.
   ═══════════════════════════════════════════════════════════════ */

export function constraints(props = {}) {
  const ROWS = [
    { k: 'SNET', n: 'Start no earlier than', pass: 'Forward only',
      f: 'Pushes the early start right. Float on the path BEFORE it is consumed; float after it is untouched.',
      use: 'Access to a part of site; a long-lead delivery; an employer-furnished item.', risk: 'low' },
    { k: 'SNLT', n: 'Start no later than', pass: 'Backward only',
      f: 'Pulls the late start left. Creates negative float the moment the early start passes it.',
      use: 'An interim contractual milestone you must begin by.', risk: 'mid' },
    { k: 'FNET', n: 'Finish no earlier than', pass: 'Forward only',
      f: 'Pushes the early finish right without changing the duration — the activity sits with a tail.',
      use: 'A curing or drying period that cannot be shortened by resources.', risk: 'low' },
    { k: 'FNLT', n: 'Finish no later than', pass: 'Backward only',
      f: 'Pulls the late finish left. This is the classic source of a path showing more negative float than the project.',
      use: 'A sectional completion date.', risk: 'mid' },
    { k: 'MSO', n: 'Mandatory start on', pass: 'Both — overrides logic',
      f: 'Forces early AND late start to the date. Predecessor logic is ignored. Float upstream becomes fiction.',
      use: 'Almost never. If you think you need it, you need a milestone with proper logic instead.', risk: 'high' },
    { k: 'MFO', n: 'Mandatory finish on', pass: 'Both — overrides logic',
      f: 'Forces early AND late finish to the date, and will happily report zero float on a path that is weeks late.',
      use: 'Almost never.', risk: 'high' },
    { k: 'ZTF', n: 'Zero total float', pass: 'Backward',
      f: 'Sets late dates equal to early dates, so the activity reports zero float whatever the network says.',
      use: 'Nothing legitimate. It is the simplest way to sequester float and hide it from a reviewer.', risk: 'high' }
  ];

  let picked = 0;
  const detail = el('div');

  function paint() {
    const r = ROWS[picked];
    detail.replaceChildren(
      el('div.callout', {
        class: 'callout--' + (r.risk === 'high' ? 'warn' : r.risk === 'mid' ? 'protocol' : 'site')
      }, [
        el('span.callout__l', r.n + ' · affects the ' + r.pass.toLowerCase()),
        el('p', r.f),
        el('p', { style: { color: 'var(--p-300)' } }, [el('b', 'Legitimate use: '), r.use])
      ])
    );
    btns.forEach((b, i) => b.setAttribute('aria-selected', String(i === picked)));
  }

  const btns = ROWS.map((r, i) => el('button', {
    type: 'button', role: 'tab',
    aria: { selected: String(i === picked) },
    onclick: () => { picked = i; paint(); }
  }, r.k));

  paint();

  return fig(
    props.title || 'What each constraint does to float',
    'Six date constraints, plus the one that should never appear',
    [el('div.tabs', { role: 'tablist', style: { marginBottom: 'var(--s4)' } }, btns), detail],
    props.note || 'Constraints are useful and sometimes necessary. Over-use is the tell: a programme where dates are held by constraints rather than logic cannot calculate a sensible critical path, and cannot show you the effect of a change — which is the only reason to have built it.'
  );
}
