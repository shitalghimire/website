/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — THE EQUITY CURVE
   Every meaningful action appends an event. Events group into sessions,
   and each session prints one candle using the SAME renderer as the real
   price charts. By Module 9 the learner can read their own chart.
   ═══════════════════════════════════════════════════════════════ */

import { CandleChart } from './chart/candles.js';
import { sma } from './chart/indicators.js';
import * as state from './state.js';
import { el, num, cssVar, fmtDate } from './util.js';

const SESSION_GAP = 30 * 60 * 1000;   // 30 minutes

/**
 * Group events into sessions and turn each into an OHLC candle.
 *   open  = cumulative XP at session start
 *   close = cumulative XP at session end
 *   high / low = the extremes reached inside the session
 *   volume = number of events
 */
export function buildCandles(events, levels = []) {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const sessions = [];
  let cur = null;

  for (const e of sorted) {
    if (!cur || e.t - cur.lastT > SESSION_GAP) {
      cur = { events: [], startT: e.t, lastT: e.t };
      sessions.push(cur);
    }
    cur.events.push(e);
    cur.lastT = e.t;
  }

  const rankFloor = xp => {
    let floor = 0;
    for (const l of levels) if (xp >= l.rankXp) floor = l.rankXp;
    return floor;
  };

  let cum = 0;
  const out = [];

  for (const s of sessions) {
    const open = cum;
    let hi = cum, lo = cum;
    let bossPassed = false;

    for (const e of s.events) {
      cum += e.value || 0;
      // a bad session is instructive, not punishing: cap the decline at 40%
      const floor = Math.max(rankFloor(open), open * 0.6);
      if (cum < floor) cum = floor;
      if (cum < 0) cum = 0;
      if (cum > hi) hi = cum;
      if (cum < lo) lo = cum;
      if (e.kind === 'quiz' && e.boss) bossPassed = true;
    }

    const d = new Date(s.startT);
    out.push({
      d: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      o: open, h: hi, l: lo, c: cum,
      v: s.events.length,
      boss: bossPassed,
      t: s.startT
    });
  }

  // A passed boss quiz GAPS THE CHART UP — the next candle opens above the
  // previous close. Learners notice and ask why, which is the whole point.
  for (let i = 1; i < out.length; i++) {
    if (out[i - 1].boss) {
      const gap = Math.max(20, out[i - 1].c * 0.04);
      out[i].o += gap;
      out[i].h = Math.max(out[i].h, out[i].o);
      out[i].c += gap;
      for (let k = i; k < out.length; k++) if (k > i) { out[k].o += gap; out[k].c += gap; out[k].h += gap; out[k].l += gap; }
    }
  }

  return out;
}

/** Rank changes become small pennants on the chart. */
function rankFlags(candles, levels) {
  const flags = [];
  for (const l of levels) {
    if (!l.rankXp) continue;
    const i = candles.findIndex(c => c.c >= l.rankXp);
    if (i >= 0) flags.push({ i, label: l.rank });
  }
  return flags;
}

/**
 * @param {object} opts
 *   height, showStats, showMA, compact
 *   onMaReveal – called the first time the 5-session MA is shown, so the
 *                dashboard can surface the Module 11 callback.
 */
export function equityCurve(opts = {}) {
  const {
    height = 300, showStats = true, showMA = null, compact = false,
    levels = [], illustrative = false
  } = opts;

  const s = state.load();
  const candles = buildCandles(s.equityEvents, levels);
  const host = el('div.equity');

  if (candles.length < 2) {
    host.append(el('div.equity__empty', [
      el('b', 'Your equity curve starts empty'),
      el('p', 'Finish a lesson and this chart prints its first candle. Pass a quiz and it gaps up. Fail one and it prints red.'),
      el('p.dim', { style: { marginTop: '12px', fontSize: '0.8125rem' } },
        'By Module 9 you will be able to read it — that is the idea.')
    ]));
    return { node: host, chart: null };
  }

  const body = el('div', { style: { position: 'relative' } });
  host.append(body);

  // the 5-session moving average appears once the learner reaches Module 11
  const reachedMA = showMA ?? state.lessonDone('11.1');
  const overlays = [];
  if (reachedMA && candles.length >= 5) {
    overlays.push({
      values: sma(candles.map(c => c.c), 5),
      color: cssVar('--ma-fast'),
      width: 1.4,
      label: 'MA(5)'
    });
  }

  const chart = new CandleChart(body, {
    data: candles,
    height,
    volume: !compact,
    overlays,
    flags: compact ? [] : rankFlags(candles, levels),
    showAxis: !compact,
    crosshair: !compact
  });
  chart.setData(candles);

  if (showStats) {
    const first = candles[0], last = candles[candles.length - 1];
    const greens = candles.filter(c => c.c >= c.o).length;
    const reds = candles.length - greens;
    let peak = -Infinity, mdd = 0;
    for (const c of candles) { if (c.c > peak) peak = c.c; mdd = Math.max(mdd, (peak - c.c) / (peak || 1)); }

    host.append(el('div.equity__stats', [
      stat('Sessions', num(candles.length, 0)),
      stat('Green', num(greens, 0), 'up'),
      stat('Red', num(reds, 0), reds ? 'down' : 'dim'),
      stat('Peak XP', num(peak, 0)),
      stat('Max drawdown', (mdd * 100).toFixed(1) + '%', mdd > 0 ? 'down' : 'dim')
    ]));
  }

  if (reachedMA && !state.hasBadge('_ma-seen')) {
    state.grant('_ma-seen');
    host.append(el('p.widget__note', { style: { color: 'var(--signal)' } },
      'That amber line is a 5-session moving average — you have just learned what it is. Lesson 11.1.'));
  }

  return { node: host, chart, candles };
}

function stat(label, value, cls) {
  return el('div.equity__stat', [
    el('span', label),
    el('b', { class: cls || '' }, value)
  ]);
}

/**
 * A miniature sparkline of the curve, for the homepage-style course card
 * and the header. Draws closes only.
 */
export function equitySpark(width = 132, height = 30) {
  const s = state.load();
  const candles = buildCandles(s.equityEvents);
  const c = el('canvas', { width: width * 2, height: height * 2, style: { width: width + 'px', height: height + 'px' } });
  if (candles.length < 2) return c;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  const vals = candles.map(x => x.c);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = i => (i / (vals.length - 1)) * (width - 2) + 1;
  const y = v => height - 2 - ((v - lo) / Math.max(1e-9, hi - lo)) * (height - 4);
  ctx.strokeStyle = cssVar('--bull');
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  vals.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)));
  ctx.stroke();
  return c;
}

/**
 * The share image: 1200×630 PNG with the curve, rank, XP and wordmark.
 * This is the growth loop, so it has to be genuinely handsome.
 */
export function shareImage(levels) {
  const W = 1200, H = 630;
  const cv = el('canvas', { width: W, height: H });
  const ctx = cv.getContext('2d');
  const s = state.load();
  const candles = buildCandles(s.equityEvents, levels);
  const r = state.rankFor(levels, s.xp);

  ctx.fillStyle = '#07090C'; ctx.fillRect(0, 0, W, H);

  // faint teal bloom, matching the course ground
  const g = ctx.createRadialGradient(W * 0.78, -60, 20, W * 0.78, -60, 700);
  g.addColorStop(0, 'rgba(49,208,170,0.10)'); g.addColorStop(1, 'rgba(49,208,170,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#DC143C';
  ctx.font = '700 22px "Bricolage Grotesque", sans-serif';
  ctx.fillText('NEPSE', 64, 78);
  ctx.fillStyle = '#ECF1F6';
  ctx.fillText(' Trading Academy', 64 + ctx.measureText('NEPSE').width, 78);

  ctx.fillStyle = '#6C7C8C';
  ctx.font = '500 13px "Martian Mono", monospace';
  ctx.fillText('MY EQUITY CURVE', 64, 108);

  // the curve
  const px = 64, py = 150, pw = W - 128, ph = 320;
  if (candles.length >= 2) {
    let lo = Infinity, hi = -Infinity;
    for (const c of candles) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); }
    const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    const X = i => px + (i / Math.max(1, candles.length - 1)) * pw;
    const Y = v => py + ph - ((v - lo) / (hi - lo)) * ph;
    const bw = Math.max(2, Math.min(16, pw / candles.length * 0.6));

    ctx.strokeStyle = 'rgba(43,56,70,0.55)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = Math.round(py + (ph * i / 4)) + 0.5;
      ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke();
    }
    candles.forEach((c, i) => {
      const up = c.c >= c.o;
      ctx.strokeStyle = ctx.fillStyle = up ? '#31D0AA' : '#F0526D';
      ctx.lineWidth = 1.5;
      const cx = Math.round(X(i)) + 0.5;
      ctx.beginPath(); ctx.moveTo(cx, Y(c.h)); ctx.lineTo(cx, Y(c.l)); ctx.stroke();
      const t = Y(Math.max(c.o, c.c)), b = Y(Math.min(c.o, c.c));
      if (up) ctx.strokeRect(cx - bw / 2, t, bw, Math.max(1, b - t));
      else ctx.fillRect(cx - bw / 2, t, bw, Math.max(1, b - t));
    });
  }

  // stat strip
  const stats = [
    ['RANK', r.rank],
    ['TOTAL XP', num(s.xp, 0)],
    ['LESSONS', `${Object.keys(s.lessonsDone).length}`],
    ['STREAK', `${s.streakDays} day${s.streakDays === 1 ? '' : 's'}`]
  ];
  stats.forEach(([k, v], i) => {
    const x = 64 + i * ((W - 128) / 4);
    ctx.fillStyle = '#6C7C8C'; ctx.font = '500 12px "Martian Mono", monospace';
    ctx.fillText(k, x, 540);
    ctx.fillStyle = i === 0 ? '#FFB627' : '#ECF1F6';
    ctx.font = '600 26px "Martian Mono", monospace';
    ctx.fillText(String(v), x, 574);
  });

  ctx.fillStyle = '#43515F'; ctx.font = '500 11px "Martian Mono", monospace';
  ctx.fillText('EDUCATIONAL COURSE PROGRESS — NOT INVESTMENT ADVICE', 64, H - 28);
  const cr = '© 2026 SHITAL GHIMIRE';
  ctx.fillText(cr, W - 64 - ctx.measureText(cr).width, H - 28);

  return cv;
}
