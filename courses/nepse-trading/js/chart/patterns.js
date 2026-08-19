/* ═══════════════════════════════════════════════════════════════
   FLOORSHEET — candlestick pattern detectors
   Real detectors, so patterns are FOUND in real series rather than
   hand-tagged. This is what makes Candle Sensei feel alive.
   ═══════════════════════════════════════════════════════════════ */

import { trendAt } from './indicators.js';

const body  = c => Math.abs(c.c - c.o);
const range = c => Math.max(1e-9, c.h - c.l);
const upper = c => c.h - Math.max(c.o, c.c);
const lower = c => Math.min(c.o, c.c) - c.l;
const bull  = c => c.c > c.o;
const bear  = c => c.c < c.o;
const mid   = c => (c.o + c.c) / 2;

/* ── single candle ──────────────────────────────────────────── */

export const marubozuBull = ([c]) =>
  bull(c) && body(c) >= 0.90 * range(c) &&
  upper(c) <= 0.05 * range(c) && lower(c) <= 0.05 * range(c);

export const marubozuBear = ([c]) =>
  bear(c) && body(c) >= 0.90 * range(c) &&
  upper(c) <= 0.05 * range(c) && lower(c) <= 0.05 * range(c);

export const doji = ([c]) =>
  body(c) <= 0.05 * range(c) && upper(c) > 0.10 * range(c) && lower(c) > 0.10 * range(c);

export const longLeggedDoji = ([c]) =>
  body(c) <= 0.05 * range(c) && upper(c) >= 0.30 * range(c) && lower(c) >= 0.30 * range(c);

export const dragonfly = ([c], t) =>
  t === 'down' && body(c) <= 0.05 * range(c) &&
  lower(c) >= 0.60 * range(c) && upper(c) <= 0.10 * range(c);

export const gravestone = ([c], t) =>
  t === 'up' && body(c) <= 0.05 * range(c) &&
  upper(c) >= 0.60 * range(c) && lower(c) <= 0.10 * range(c);

export const spinningTop = ([c]) => {
  const b = body(c) / range(c);
  if (b <= 0.05 || b > 0.30) return false;
  const centre = (mid(c) - c.l) / range(c);
  return centre > 0.32 && centre < 0.68 &&
    upper(c) > 0.15 * range(c) && lower(c) > 0.15 * range(c);
};

export const hammer = ([c], t) =>
  t === 'down' &&
  lower(c) >= 2 * body(c) &&
  upper(c) <= 0.10 * range(c) &&
  body(c) > 0.03 * range(c) &&                       // exclude near-doji
  (Math.min(c.o, c.c) - c.l) / range(c) >= 0.55;     // body in the upper third

export const hangingMan = ([c], t) =>
  t === 'up' &&
  lower(c) >= 2 * body(c) &&
  upper(c) <= 0.10 * range(c) &&
  body(c) > 0.03 * range(c) &&
  (Math.min(c.o, c.c) - c.l) / range(c) >= 0.55;

export const invertedHammer = ([c], t) =>
  t === 'down' &&
  upper(c) >= 2 * body(c) &&
  lower(c) <= 0.10 * range(c) &&
  body(c) > 0.03 * range(c) &&
  (c.h - Math.max(c.o, c.c)) / range(c) >= 0.55;

export const shootingStar = ([c], t) =>
  t === 'up' &&
  upper(c) >= 2 * body(c) &&
  lower(c) <= 0.10 * range(c) &&
  body(c) > 0.03 * range(c) &&
  (c.h - Math.max(c.o, c.c)) / range(c) >= 0.55;

/* ── two candles ────────────────────────────────────────────── */

export const bullishEngulfing = ([a, b], t) =>
  t === 'down' && bear(a) && bull(b) &&
  b.c >= a.o && b.o <= a.c && body(b) > body(a);

export const bearishEngulfing = ([a, b], t) =>
  t === 'up' && bull(a) && bear(b) &&
  b.o >= a.c && b.c <= a.o && body(b) > body(a);

export const bullishHarami = ([a, b], t) =>
  t === 'down' && bear(a) && body(a) > 0.5 * range(a) &&
  Math.max(b.o, b.c) < a.o && Math.min(b.o, b.c) > a.c &&
  body(b) < 0.5 * body(a) && body(b) > 0.05 * range(b);

export const bearishHarami = ([a, b], t) =>
  t === 'up' && bull(a) && body(a) > 0.5 * range(a) &&
  Math.max(b.o, b.c) < a.c && Math.min(b.o, b.c) > a.o &&
  body(b) < 0.5 * body(a) && body(b) > 0.05 * range(b);

export const haramiCross = ([a, b]) =>
  body(a) > 0.5 * range(a) && body(b) <= 0.05 * range(b) &&
  Math.max(b.o, b.c) < Math.max(a.o, a.c) && Math.min(b.o, b.c) > Math.min(a.o, a.c);

export const piercingLine = ([a, b], t) =>
  t === 'down' && bear(a) && bull(b) &&
  b.o < a.l && b.c > mid(a) && b.c < a.o;

export const darkCloudCover = ([a, b], t) =>
  t === 'up' && bull(a) && bear(b) &&
  b.o > a.h && b.c < mid(a) && b.c > a.o;

export const tweezerTop = ([a, b], t) =>
  t === 'up' && bull(a) && bear(b) &&
  Math.abs(a.h - b.h) / a.h < 0.003 && body(a) > 0.2 * range(a);

export const tweezerBottom = ([a, b], t) =>
  t === 'down' && bear(a) && bull(b) &&
  Math.abs(a.l - b.l) / a.l < 0.003 && body(a) > 0.2 * range(a);

/* ── three candles ──────────────────────────────────────────── */

export const morningStar = ([a, b, c], t) =>
  t === 'down' &&
  bear(a) && body(a) > 0.5 * range(a) &&
  body(b) < 0.35 * body(a) && Math.max(b.o, b.c) < a.c &&
  bull(c) && c.c > mid(a);

export const eveningStar = ([a, b, c], t) =>
  t === 'up' &&
  bull(a) && body(a) > 0.5 * range(a) &&
  body(b) < 0.35 * body(a) && Math.min(b.o, b.c) > a.c &&
  bear(c) && c.c < mid(a);

export const threeWhiteSoldiers = ([a, b, c], t) =>
  t !== 'up' &&
  bull(a) && bull(b) && bull(c) &&
  body(a) > 0.5 * range(a) && body(b) > 0.5 * range(b) && body(c) > 0.5 * range(c) &&
  b.c > a.c && c.c > b.c &&
  b.o > a.o && b.o < a.c && c.o > b.o && c.o < b.c &&
  upper(b) < 0.25 * range(b) && upper(c) < 0.25 * range(c);

export const threeBlackCrows = ([a, b, c], t) =>
  t !== 'down' &&
  bear(a) && bear(b) && bear(c) &&
  body(a) > 0.5 * range(a) && body(b) > 0.5 * range(b) && body(c) > 0.5 * range(c) &&
  b.c < a.c && c.c < b.c &&
  b.o < a.o && b.o > a.c && c.o < b.o && c.o > b.c &&
  lower(b) < 0.25 * range(b) && lower(c) < 0.25 * range(c);

export const DETECTORS = {
  marubozuBull, marubozuBear, doji, longLeggedDoji, dragonfly, gravestone, spinningTop,
  hammer, hangingMan, invertedHammer, shootingStar,
  bullishEngulfing, bearishEngulfing, bullishHarami, bearishHarami, haramiCross,
  piercingLine, darkCloudCover, tweezerTop, tweezerBottom,
  morningStar, eveningStar, threeWhiteSoldiers, threeBlackCrows
};

/**
 * Scan a series for every pattern in the library.
 * Returns [{ key, at, from, to, n, trend }] where `to` is the last candle index.
 */
export function scan(candles, patterns, { minIndex = 12 } = {}) {
  const found = [];
  for (const [key, def] of Object.entries(patterns)) {
    const fn = DETECTORS[def.detect];
    if (!fn) continue;
    const n = def.candles;
    for (let i = Math.max(minIndex, n - 1); i < candles.length; i++) {
      const window = candles.slice(i - n + 1, i + 1);
      if (window.length !== n) continue;
      // Trend is measured on the candles BEFORE the pattern. Including the
      // pattern's own candle makes "requires: downtrend" unsatisfiable for
      // every bullish reversal shape — a hammer closes up, which is the point.
      const t = trendAt(candles, i - n);
      let ok = false;
      try { ok = !!fn(window, t); } catch { ok = false; }
      if (ok) found.push({ key, at: i, from: i - n + 1, to: i, n, trend: t });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

/** Everything found at one index, useful for "which of these applies?" */
export function patternsAt(candles, patterns, i) {
  return scan(candles, patterns, { minIndex: Math.max(0, i - 1) }).filter(f => f.to === i);
}
