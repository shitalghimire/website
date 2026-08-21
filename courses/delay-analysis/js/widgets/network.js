/* ═══════════════════════════════════════════════════════════════
   DRAWING OFFICE — precedence diagram

   An activity-on-node network that runs its own forward and
   backward pass in front of you, one column at a time, so the
   arithmetic stops being a black box.

   The box follows the layout in Keane & Caletka Figure 2.5:

       ┌──────────────────────────────────┐
       │ ACT      OD        TF            │
       │ Description                      │
       ├──────────────────────────────────┤
       │ ES                            EF │
       │ LS                            LF │
       └──────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════ */

import { el, svg, add, d2, days, prefersStill, altTable, say } from '../dom.js';
import { run } from '../cpm.js';
import { fig, ctlBar, tabs, readout } from './kit.js';

const BW = 168, BH = 66;        // box
const GX = 54,  GY = 22;        // gaps
const PAD = 14;

/* ── layout: column = longest chain from a start, row = free lane ── */
function layout(res) {
  const { acts, byId, order } = res;
  const depth = new Map();
  for (const id of order) {
    const a = byId.get(id);
    const d = a.pred.length
      ? Math.max(...a.pred.map(p => (depth.get(p.id) ?? -1) + 1))
      : 0;
    depth.set(id, d);
  }
  const cols = new Map();
  for (const [id, d] of depth) {
    if (!cols.has(d)) cols.set(d, []);
    cols.get(d).push(id);
  }
  // keep each column in the order its members appear in the source list,
  // so a hand-authored network draws the way its author laid it out
  const idx = new Map(acts.map((a, i) => [a.id, i]));
  for (const list of cols.values()) list.sort((a, b) => idx.get(a) - idx.get(b));

  const maxRows = Math.max(...[...cols.values()].map(c => c.length));
  const pos = new Map();
  for (const [d, list] of cols) {
    const offset = (maxRows - list.length) / 2;
    list.forEach((id, r) => {
      pos.set(id, {
        x: PAD + d * (BW + GX),
        y: PAD + (r + offset) * (BH + GY),
        col: d, row: r
      });
    });
  }
  return {
    pos,
    cols: [...cols.keys()].sort((a, b) => a - b).map(d => cols.get(d)),
    w: PAD * 2 + cols.size * BW + (cols.size - 1) * GX,
    h: PAD * 2 + maxRows * BH + (maxRows - 1) * GY
  };
}

/* ── orthogonal link path ───────────────────────────────────── */
function linkPath(A, B, type) {
  const sx = A.x + BW, sy = A.y + BH / 2;
  const ex = B.x,      ey = B.y + BH / 2;
  if (type === 'SS') {
    const x = A.x - 12;
    return `M ${A.x} ${sy} H ${x} V ${ey} H ${ex}`;
  }
  if (type === 'FF') {
    const x = Math.max(sx, B.x + BW) + 14;
    return `M ${sx} ${sy} H ${x} V ${ey} H ${B.x + BW}`;
  }
  if (Math.abs(sy - ey) < 2) return `M ${sx} ${sy} H ${ex}`;
  const mid = sx + GX / 2;
  return `M ${sx} ${sy} H ${mid} V ${ey} H ${ex}`;
}

/**
 * props:
 *   net        Act[]                 the network
 *   start      ISO date              project start
 *   mode       'dates' | 'days'      how event times read
 *   phase      'idle'|'forward'|'backward'|'float'|'all'  starting phase
 *   autoplay   boolean
 *   title/sub/note
 */
export function network(props = {}) {
  const source = props.net || [];
  const useDates = props.mode !== 'days' && !!props.start;
  let res;
  try {
    res = run(source, { start: props.start, mustFinish: props.mustFinish });
  } catch (err) {
    return fig(props.title || 'Network', null,
      el('p.dim', { style: { fontSize: 'var(--t-xs)' } }, 'This network could not be calculated: ' + err.message));
  }

  const L = layout(res);
  const cells = new Map();          // id -> { es, ef, ls, lf, tf, node }
  let phase = props.phase || 'idle';
  let timer = null;

  /* ── build the drawing ────────────────────────────────────── */
  const defs = svg('defs', [
    svg('marker', {
      id: 'nArrow', viewBox: '0 0 8 8', refX: 7, refY: 4,
      markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse'
    }, svg('path.net-arrow', { d: 'M 0 1 L 7 4 L 0 7 z' })),
    svg('marker', {
      id: 'nArrowC', viewBox: '0 0 8 8', refX: 7, refY: 4,
      markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse'
    }, svg('path.net-arrow.is-crit', { d: 'M 0 1 L 7 4 L 0 7 z' })),
    svg('linearGradient', { id: 'sweepGrad', x1: '0', x2: '1' }, [
      svg('stop', { offset: '0', 'stop-color': 'var(--ink)', 'stop-opacity': '0' }),
      svg('stop', { offset: '1', 'stop-color': 'var(--ink)', 'stop-opacity': '.35' })
    ])
  ]);

  const gLinks = svg('g');
  const gNodes = svg('g');
  const gSweep = svg('g', { opacity: 0 });

  const board = svg('svg', {
    viewBox: `0 0 ${L.w} ${L.h}`,
    role: 'img',
    'aria-label': 'Precedence network diagram. A data table follows.'
  }, [defs, gLinks, gSweep, gNodes]);

  /* links */
  const linkEls = [];
  for (const a of res.acts) {
    const B = L.pos.get(a.id);
    for (const p of a.pred) {
      const A = L.pos.get(p.id);
      if (!A) continue;
      const path = svg('path.net-link', {
        d: linkPath(A, B, p.type),
        'marker-end': 'url(#nArrow)'
      });
      path.dataset.from = p.id;
      path.dataset.to = a.id;
      if (p.type !== 'FS' || p.lag) {
        const mx = A.x + BW + GX / 2;
        const my = (A.y + B.y) / 2 + BH / 2;
        gLinks.append(svg('text', {
          x: mx, y: my - 4, 'text-anchor': 'middle',
          class: 'net-node', fill: 'var(--p-400)',
          'font-size': '7', 'font-family': 'var(--f-data)'
        }, p.type + (p.lag ? (p.lag > 0 ? '+' : '') + p.lag : '')));
      }
      gLinks.append(path);
      linkEls.push({ el: path, from: p.id, to: a.id });
    }
  }

  /* nodes */
  for (const a of res.acts) {
    const P = L.pos.get(a.id);
    const g = svg('g.net-node', { transform: `translate(${P.x} ${P.y})` });
    g.dataset.id = a.id;

    const isMs = a.milestone || a.dur === 0;
    g.append(svg('rect.body', { x: 0, y: 0, width: BW, height: BH, rx: 2 }));
    g.append(svg('rect.divider', { x: 1, y: 32, width: BW - 2, height: 1 }));

    g.append(svg('text.nid', { x: 8, y: 12 }, a.id));
    g.append(svg('text.ndur', { x: BW / 2, y: 12, 'text-anchor': 'middle' },
      isMs ? 'MILESTONE' : a.dur + 'd'));

    const tf = svg('text.ntf', { x: BW - 8, y: 12, 'text-anchor': 'end' }, '');
    g.append(tf);

    g.append(svg('text.ndesc', { x: 8, y: 26 }, clip(a.desc, 27)));

    const esT = svg('text.nval.pending', { x: 8, y: 46 }, '—');
    const efT = svg('text.nval.pending', { x: BW - 8, y: 46, 'text-anchor': 'end' }, '—');
    const lsT = svg('text.nval.pending', { x: 8, y: 59 }, '—');
    const lfT = svg('text.nval.pending', { x: BW - 8, y: 59, 'text-anchor': 'end' }, '—');
    g.append(esT, efT, lsT, lfT);

    // faint row labels so nobody has to guess which line is which
    g.append(svg('text.nlbl', { x: BW / 2, y: 46, 'text-anchor': 'middle' }, 'EARLY'));
    g.append(svg('text.nlbl', { x: BW / 2, y: 59, 'text-anchor': 'middle' }, 'LATE'));

    gNodes.append(g);
    cells.set(a.id, { g, esT, efT, lsT, lfT, tf, act: a });
  }

  /* sweep bar */
  const sweepRect = svg('rect.net-sweep-glow', { x: 0, y: 0, width: 46, height: L.h });
  const sweepLine = svg('line.net-sweep', { x1: 46, y1: 0, x2: 46, y2: L.h });
  gSweep.append(sweepRect, sweepLine);

  /* ── painting ─────────────────────────────────────────────── */
  const fmt = v => (useDates ? d2(addD(props.start, v)) : 'D' + v);
  function addD(s, n) {
    const d = new Date(s + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function setVal(t, text, animate) {
    t.textContent = text;
    t.classList.remove('pending');
    if (animate && !prefersStill()) {
      t.classList.remove('just-in');
      void t.getBBox;
      t.classList.add('just-in');
    }
  }

  function clearAll() {
    for (const c of cells.values()) {
      for (const t of [c.esT, c.efT, c.lsT, c.lfT]) { t.textContent = '—'; t.classList.add('pending'); }
      c.tf.textContent = '';
      c.g.classList.remove('is-crit', 'is-lit');
    }
    for (const l of linkEls) l.el.classList.remove('is-crit', 'is-driving');
    gSweep.setAttribute('opacity', '0');
  }

  function paintForwardCol(ci, animate) {
    for (const id of L.cols[ci]) {
      const c = cells.get(id), a = c.act;
      setVal(c.esT, fmt(a.es), animate);
      setVal(c.efT, fmt(a.ef), animate);
      c.g.classList.add('is-lit');
      for (const d of (a.drivers || [])) {
        const link = linkEls.find(l => l.from === d && l.to === id);
        link?.el.classList.add('is-driving');
      }
    }
  }

  function paintBackwardCol(ci, animate) {
    for (const id of L.cols[ci]) {
      const c = cells.get(id), a = c.act;
      setVal(c.lsT, fmt(a.ls), animate);
      setVal(c.lfT, fmt(a.lf), animate);
      c.g.classList.add('is-lit');
    }
  }

  function paintFloat() {
    for (const c of cells.values()) {
      const a = c.act;
      c.tf.textContent = 'TF ' + days(a.tf, { sign: a.tf < 0 });
      c.g.classList.toggle('is-crit', res.longest.has(a.id));
      c.g.classList.remove('is-lit');
    }
    for (const l of linkEls) {
      const critLink = res.longest.has(l.from) && res.longest.has(l.to) &&
        (res.byId.get(l.to).drivers || []).includes(l.from);
      l.el.classList.toggle('is-crit', critLink);
      l.el.setAttribute('marker-end', critLink ? 'url(#nArrowC)' : 'url(#nArrow)');
    }
  }

  function paintAll() {
    clearAll();
    L.cols.forEach((_, i) => { paintForwardCol(i, false); paintBackwardCol(i, false); });
    for (const c of cells.values()) c.g.classList.remove('is-lit');
    paintFloat();
  }

  /* ── the run ──────────────────────────────────────────────── */
  function stop() { if (timer) { clearTimeout(timer); timer = null; } }

  function sweepTo(x, ms) {
    if (prefersStill()) { gSweep.setAttribute('opacity', '0'); return; }
    gSweep.setAttribute('opacity', '1');
    gSweep.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.2,1)`;
    gSweep.style.transform = `translateX(${x}px)`;
  }

  function play(which) {
    stop();
    const still = prefersStill();
    const step = still ? 0 : 460;
    phase = which;
    setPhaseChips();

    if (which === 'all') { paintAll(); return; }

    clearAll();
    if (which === 'forward' || which === 'both') {
      let i = 0;
      const tick = () => {
        if (i >= L.cols.length) {
          if (which === 'both') { timer = setTimeout(() => runBack(), step); }
          else { gSweep.setAttribute('opacity', '0'); paintFloatSoft(); }
          return;
        }
        const x = PAD + i * (BW + GX);
        sweepTo(x - 46 + BW, step * .8);
        paintForwardCol(i, true);
        i++;
        timer = setTimeout(tick, step);
      };
      if (still) { L.cols.forEach((_, j) => paintForwardCol(j, false)); paintFloatSoft(); }
      else tick();
      return;
    }
    if (which === 'backward') {
      L.cols.forEach((_, j) => paintForwardCol(j, false));
      runBack();
    }
  }

  function runBack() {
    const still = prefersStill();
    const step = still ? 0 : 460;
    if (still) {
      L.cols.forEach((_, j) => paintBackwardCol(j, false));
      paintFloat();
      return;
    }
    let i = L.cols.length - 1;
    const tick = () => {
      if (i < 0) {
        gSweep.setAttribute('opacity', '0');
        timer = setTimeout(() => { paintFloat(); say('Backward pass complete. Critical path highlighted.'); }, 260);
        return;
      }
      const x = PAD + i * (BW + GX);
      sweepTo(x - 46 + BW, step * .8);
      paintBackwardCol(i, true);
      i--;
      timer = setTimeout(tick, step);
    };
    tick();
  }

  function paintFloatSoft() {
    // after a forward pass alone, no float exists yet — that is the point
    for (const c of cells.values()) { c.tf.textContent = ''; c.g.classList.remove('is-lit'); }
  }

  /* ── controls ─────────────────────────────────────────────── */
  const phaseBtns = [
    ['idle', 'Clear'],
    ['forward', 'Forward pass'],
    ['backward', 'Backward pass'],
    ['all', 'Float + critical path']
  ];
  const chips = phaseBtns.map(([k, label]) =>
    el('button', {
      type: 'button', role: 'tab',
      aria: { selected: String(k === phase) },
      onclick: () => { k === 'idle' ? (stop(), clearAll(), phase = 'idle', setPhaseChips()) : play(k); }
    }, label)
  );
  function setPhaseChips() {
    chips.forEach((b, i) => b.setAttribute('aria-selected', String(phaseBtns[i][0] === phase)));
  }

  const bar = ctlBar([
    el('span.ctl__lbl', 'Run the pass'),
    el('div.tabs', { role: 'tablist' }, chips),
    el('span.ctl__sp'),
    el('button.btn.btn--sm', {
      type: 'button',
      onclick: () => play('both')
    }, '▶ Both passes')
  ]);

  /* ── readout ──────────────────────────────────────────────── */
  const critList = res.acts.filter(a => res.longest.has(a.id)).map(a => a.id).join(' → ');
  const ro = readout([
    ['Activities', String(res.acts.length)],
    ['Project duration', (res.finishDay + 1) + 'd'],
    ['Finish', useDates ? d2(res.finishDate) : 'Day ' + res.finishDay, 'ink'],
    ['Least float', days(res.minFloat, { sign: res.minFloat < 0 }), res.minFloat < 0 ? 'crit' : 'slack'],
    ['On critical path', String(res.longest.size)]
  ]);

  /* ── accessible table ─────────────────────────────────────── */
  const alt = altTable(
    'Network calculation: early and late event times, total and free float',
    ['Activity', 'Description', 'Duration', 'Early start', 'Early finish', 'Late start', 'Late finish', 'Total float', 'Free float'],
    res.acts.map(a => [
      a.id, a.desc, a.dur + 'd',
      useDates ? d2(a.esD) : a.es, useDates ? d2(a.efD) : a.ef,
      useDates ? d2(a.lsD) : a.ls, useDates ? d2(a.lfD) : a.lf,
      a.tf + 'd', a.ff + 'd'
    ])
  );

  const body = el('div.net', el('div.scroll-x', board));
  const node = fig(
    props.title || 'Precedence network',
    props.sub || (useDates ? 'Activity-on-node · 7-day calendar' : 'Activity-on-node'),
    body,
    props.note || `Critical path: ${critList}. Each box carries its own arithmetic — the early row comes from the forward pass, the late row from the backward pass, and total float is simply the gap between them.`,
    { extras: [bar, ro, alt] }
  );

  if (props.phase === 'all') paintAll();
  else if (props.autoplay !== false) {
    // hold until the drawing is actually on screen, so the animation is
    // not spent while the learner is three screens above it
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        setTimeout(() => play('both'), 240);
      }
    }, { threshold: 0.25 });
    io.observe(node);
    node._teardown = () => { io.disconnect(); stop(); };
  }

  return node;
}

function clip(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
