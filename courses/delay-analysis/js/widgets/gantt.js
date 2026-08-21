/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — bar chart / time-scaled logic diagram

   One renderer serves every programme drawing in the course:
   as-planned, as-built, impacted, collapsed, and the as-planned
   versus as-built comparison.

   A deliberate rule runs through it: FLOAT IS NEVER DRAWN SOLID.
   Float is the absence of constraint, not work, so it appears as a
   hatched tail. Anyone reading the chart can tell at a glance what
   is effort and what is only permission to be late.
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, d2, days, toDate, dayDiff, addDays, altTable, prefersStill } from '../dom.js';
import { fig, scale, legend } from './kit.js';

const ROW = 24, GAP = 4, LEFT = 178, TOP = 30, RIGHT = 16, BOT = 26;

const CLASS = {
  plan: 'g-plan', built: 'g-built', crit: 'g-crit', slack: 'g-slack',
  emp: 'g-emp', con: 'g-con', neu: 'g-neu', idle: 'g-idle'
};

/**
 * props:
 *   start     ISO             chart window start
 *   end       ISO             chart window end (or use `weeks`)
 *   rows      [{ label, sub, bars, milestone, float, group }]
 *     bars    [{ s, f, kind, label, gap }]   s/f are ISO dates
 *     float   { s, f }                       hatched tail
 *   markers   [{ at, label, kind }]          'cd' contract date, 'dd' data date
 *   unit      'week' | 'month'
 */
export function gantt(props = {}) {
  const rows = props.rows || [];
  const start = props.start;
  const end = props.end || addDays(start, 120);
  const totalDays = Math.max(1, dayDiff(start, end));
  const unit = props.unit || (totalDays > 200 ? 'month' : 'week');

  const H = TOP + rows.length * (ROW + GAP) + BOT;
  const W = 900;
  const x = scale([0, totalDays], [LEFT, W - RIGHT]);
  const dx = isoDate => x(dayDiff(start, isoDate));

  const defs = svg('defs', [
    svg('pattern', {
      id: 'hatchSlack', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    }, svg('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'var(--slack)', 'stroke-width': 1.6, opacity: .55 })),
    svg('pattern', {
      id: 'hatchGrey', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    }, svg('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'var(--g-500)', 'stroke-width': 1.6 }))
  ]);

  const gGrid = svg('g');
  const gBars = svg('g');
  const gMark = svg('g');

  /* ── time axis ────────────────────────────────────────────── */
  const ticks = axisTicks(start, end, unit);
  for (const t of ticks) {
    const px = dx(t.at);
    gGrid.append(svg('line', {
      class: t.major ? 'g-grid-m' : 'g-grid',
      x1: px, y1: TOP - 8, x2: px, y2: H - BOT + 4
    }));
    gGrid.append(svg('text.g-axis', {
      x: px + 3, y: TOP - 12, 'text-anchor': 'start'
    }, t.label));
  }
  gGrid.append(svg('line.g-grid-m', { x1: LEFT, y1: TOP - 8, x2: W - RIGHT, y2: TOP - 8 }));

  /* ── rows ─────────────────────────────────────────────────── */
  rows.forEach((r, i) => {
    const y = TOP + i * (ROW + GAP);

    if (r.group) {
      gBars.append(svg('text', {
        x: 8, y: y + ROW / 2 + 3,
        class: 'g-lbl', 'font-weight': '600',
        fill: r.tone ? `var(--${r.tone})` : 'var(--p-100)',
        'letter-spacing': '.08em', 'font-size': '8.5'
      }, String(r.group).toUpperCase()));
      gBars.append(svg('line.g-grid-m', { x1: 8, y1: y + ROW - 1, x2: W - RIGHT, y2: y + ROW - 1 }));
      return;
    }

    // row label
    gBars.append(svg('text.g-lbl', { x: 8, y: y + (r.sub ? 10 : ROW / 2 + 3) }, clip(r.label, 26)));
    if (r.sub) gBars.append(svg('text.g-lbl-d', { x: 8, y: y + 21 }, clip(r.sub, 30)));

    // banded row background so the eye can track across
    if (i % 2 === 1) {
      gBars.append(svg('rect', {
        x: LEFT, y: y - GAP / 2, width: W - RIGHT - LEFT, height: ROW + GAP,
        fill: 'var(--g-800)', opacity: .5
      }));
    }

    // float tail first, so a bar always sits on top of it
    if (r.float) {
      const fx = dx(r.float.s), fw = Math.max(2, dx(r.float.f) - fx);
      gBars.append(svg('rect.g-float', {
        x: fx, y: y + 6, width: fw, height: ROW - 12, rx: 1,
        fill: 'url(#hatchSlack)', stroke: 'var(--slack-dim)', 'stroke-width': .8
      }));
    }

    // bars
    const bars = r.bars || [];
    const sub = bars.length > 1 && r.stack !== false;
    bars.forEach((b, bi) => {
      const bx = dx(b.s);
      const bw = Math.max(2.5, dx(addDays(b.f, 1)) - bx);
      const bh = sub ? (ROW - 6) / bars.length - 1 : ROW - 8;
      const by = sub ? y + 3 + bi * ((ROW - 6) / bars.length) : y + 4;

      if (b.milestone) {
        const cy = by + bh / 2, s = 5;
        gBars.append(svg('path.g-milestone', {
          d: `M ${bx} ${cy - s} L ${bx + s} ${cy} L ${bx} ${cy + s} L ${bx - s} ${cy} Z`
        }));
      } else {
        const rect = svg('rect', {
          class: (CLASS[b.kind] || 'g-plan') + (prefersStill() ? '' : ' bar-grow'),
          x: bx, y: by, width: bw, height: Math.max(4, bh), rx: 1.5,
          style: { '--i': String(i) }
        });
        if (b.hatch) { rect.setAttribute('fill', 'url(#hatchGrey)'); rect.setAttribute('class', 'bar-grow'); }
        if (b.title) rect.append(svg('title', b.title));
        gBars.append(rect);
      }

      if (b.label && bw > 26) {
        gBars.append(svg('text', {
          x: bx + bw / 2, y: by + bh / 2 + 3, 'text-anchor': 'middle',
          'font-family': 'var(--f-data)', 'font-size': '8',
          fill: 'var(--g-950)', 'font-weight': '600', 'pointer-events': 'none'
        }, b.label));
      } else if (b.label) {
        gBars.append(svg('text', {
          x: bx + bw + 5, y: by + bh / 2 + 3,
          'font-family': 'var(--f-data)', 'font-size': '8', fill: 'var(--p-300)'
        }, b.label));
      }
    });

    // periods of inactivity — the narrow connector the source text asks
    // an as-built bar to show between spells of real progress
    if (r.idle) {
      for (const g of r.idle) {
        const ix = dx(g.s), iw = Math.max(1, dx(addDays(g.f, 1)) - ix);
        gBars.append(svg('rect.g-idle', { x: ix, y: y + ROW / 2 - 1.5, width: iw, height: 3 }));
      }
    }
  });

  /* ── markers ──────────────────────────────────────────────── */
  for (const m of (props.markers || [])) {
    const mx = dx(m.at);
    gMark.append(svg('line', {
      class: m.kind === 'dd' ? 'g-datadate' : 'g-cd',
      x1: mx, y1: TOP - 8, x2: mx, y2: H - BOT + 8
    }));
    gMark.append(svg('text.g-cd-lbl', {
      x: mx + 4, y: H - BOT + 18,
      fill: m.kind === 'dd' ? 'var(--today)' : 'var(--p-200)'
    }, m.label));
  }

  const board = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label': (props.title || 'Programme') + '. A data table follows.'
  }, [defs, gGrid, gBars, gMark]);

  const alt = altTable(
    props.title || 'Programme',
    ['Activity', 'Bar', 'Start', 'Finish'],
    rows.filter(r => !r.group).flatMap(r =>
      (r.bars || []).map(b => [r.label, b.kind || 'plan', d2(b.s), d2(b.f)])
    )
  );

  return fig(props.title, props.sub,
    el('div.gantt', el('div.scroll-x', board)),
    props.note,
    { flush: false, extras: [props.legend !== false && legendFor(rows), alt].filter(Boolean) });
}

function legendFor(rows) {
  const kinds = new Set();
  let hasFloat = false;
  for (const r of rows) {
    if (r.float) hasFloat = true;
    for (const b of (r.bars || [])) if (b.kind) kinds.add(b.kind);
  }
  const LABELS = {
    plan: ['As-planned', '--bar-plan'], built: ['As-built', '--bar-built'],
    crit: ['Critical', '--critical'], slack: ['Non-critical', '--slack'],
    emp: ['Employer risk', '--employer'], con: ['Contractor risk', '--contractor'],
    neu: ['Neutral / concurrent', '--neutral'], idle: ['Inactive', '--g-600']
  };
  const items = [...kinds].map(k => LABELS[k]).filter(Boolean);
  if (hasFloat) items.push(['Total float', '--slack', 'hatch']);
  if (!items.length) return null;
  return el('div.ctl', legend(items.map(i => [i[0], i[1], i[2]])));
}

/* ── axis ticks ─────────────────────────────────────────────── */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function axisTicks(start, end, unit) {
  const out = [];
  const s = toDate(start), e = toDate(end);
  if (!s || !e) return out;

  if (unit === 'month') {
    const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
    while (d <= e) {
      const isoStr = d.toISOString().slice(0, 10);
      if (d >= s) {
        out.push({
          at: isoStr,
          label: MON[d.getUTCMonth()] + (d.getUTCMonth() === 0 || out.length === 0 ? ` ’${String(d.getUTCFullYear()).slice(2)}` : ''),
          major: d.getUTCMonth() === 0
        });
      }
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }

  // weeks, marked from the Monday on or before the start
  const d = new Date(s);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  let n = 0;
  while (d <= e) {
    if (d >= s) {
      out.push({
        at: d.toISOString().slice(0, 10),
        label: `${String(d.getUTCDate()).padStart(2, '0')} ${MON[d.getUTCMonth()]}`,
        major: n % 4 === 0
      });
    }
    d.setUTCDate(d.getUTCDate() + 7);
    n++;
  }
  return out;
}

function clip(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/* ═══════════════════════════════════════════════════════════════
   Convenience: draw a CPM result straight onto a bar chart, with
   each activity's total float as its hatched tail.
   ═══════════════════════════════════════════════════════════════ */

export function ganttFromNetwork(res, props = {}) {
  const rows = res.acts.map(a => ({
    label: a.desc,
    sub: a.id + ' · ' + a.dur + 'd' + (a.tf ? ' · TF ' + days(a.tf, { sign: a.tf < 0 }) : ''),
    bars: [{
      s: a.esD, f: a.efD,
      kind: a.milestone || a.dur === 0 ? 'plan' : (res.longest.has(a.id) ? 'crit' : 'slack'),
      milestone: a.milestone || a.dur === 0,
      title: `${a.id} ${a.desc} · ${d2(a.esD)} → ${d2(a.efD)} · TF ${a.tf}d`
    }],
    float: a.tf > 0 ? { s: addDays(a.efD, 1), f: a.lfD } : null
  }));
  return gantt({
    ...props,
    start: props.start || res.acts[0].esD,
    end: props.end || addDays(res.finishDate, 2),
    rows,
    markers: props.markers
  });
}
